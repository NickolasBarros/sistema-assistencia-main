const crypto = require('node:crypto');
const { promisify } = require('node:util');
const express = require('express');
const db = require('./database');
const { enforceRole } = require('./permissions');

const router = express.Router();
const protectedRouter = express.Router();
const scrypt = promisify(crypto.scrypt);
const tokenSecret = process.env.JWT_SECRET;
const tokenLifetimeSeconds = 8 * 60 * 60;
const cookieName = 'techgest_session';
const loginAttempts = new Map();
const maxLoginAttempts = 8;
const loginWindowMs = 15 * 60 * 1000;

if (db.isPostgres && (!tokenSecret || tokenSecret.length < 32)) {
  throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres aleatórios quando DATABASE_URL estiver configurada.');
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return scrypt(password, salt, 64).then(hash => ({
    salt,
    hash: hash.toString('hex')
  }));
}

function equalSafe(value, expected) {
  const left = Buffer.from(value || '');
  const right = Buffer.from(expected || '');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function makeToken(user) {
  const payload = Buffer.from(JSON.stringify({
    sub: String(user.id),
    tid: String(user.tenant_id),
    exp: Math.floor(Date.now() / 1000) + tokenLifetimeSeconds
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', tokenSecret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function parseToken(req) {
  const cookies = (req.headers.cookie || '').split(';');
  const cookie = cookies.map(value => value.trim()).find(value => value.startsWith(`${cookieName}=`));
  if (!cookie) return '';
  try { return decodeURIComponent(cookie.slice(cookieName.length + 1)); }
  catch { return ''; }
}

function readToken(token) {
  if (!token || !db.isPostgres) return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return null;
  const expected = crypto.createHmac('sha256', tokenSecret).update(payload).digest('base64url');
  if (!equalSafe(signature, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.sub || !data.tid || !Number.isInteger(data.exp) || data.exp <= Date.now() / 1000) return null;
    return data;
  } catch {
    return null;
  }
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${cookieName}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${tokenLifetimeSeconds}${secure}`);
}

function publicUser(user) {
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    role: user.role,
    empresa: user.tenant_name,
    mustChangePassword: Boolean(user.must_change_password)
  };
}

router.get('/status', (req, res) => {
  res.json({ authenticationRequired: db.isPostgres });
});

router.get('/session', async (req, res) => {
  if (!db.isPostgres) return res.json({ authenticationRequired: false, authenticated: true });
  const claims = readToken(parseToken(req));
  if (!claims) return res.status(401).json({ error: 'Sessão expirada ou inválida.' });
  try {
    const user = await db.findSessionUser(claims.sub, claims.tid);
    if (!user) return res.status(401).json({ error: 'Conta desativada ou não encontrada.' });
    res.json({ authenticationRequired: true, authenticated: true, user: publicUser(user) });
  } catch (error) {
    console.error('Falha ao validar sessão:', error.message);
    res.status(503).json({ error: 'Não foi possível validar a sessão agora.' });
  }
});

router.post('/login', async (req, res) => {
  if (!db.isPostgres) return res.status(404).json({ error: 'Autenticação SaaS não está habilitada neste ambiente.' });
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!email || email.length > 254 || !password || password.length > 1024) {
    return res.status(400).json({ error: 'Informe e-mail e senha válidos.' });
  }
  const clientIp = `${req.ip}:${email}`;
  const now = Date.now();
  for (const [ip, attempts] of loginAttempts) {
    if (attempts.resetAt <= now) loginAttempts.delete(ip);
  }
  const attempts = loginAttempts.get(clientIp);
  if (attempts && attempts.count >= maxLoginAttempts && attempts.resetAt > now) {
    return res.status(429).json({ error: 'Muitas tentativas de acesso. Aguarde 15 minutos antes de tentar novamente.' });
  }

  try {
    const user = await db.findUserByEmail(email);
    const candidate = await hashPassword(password, user?.password_salt || crypto.randomBytes(16).toString('hex'));
    if (!user || !user.user_active || !user.tenant_active || !equalSafe(candidate.hash, user.password_hash)) {
      const current = loginAttempts.get(clientIp);
      if (loginAttempts.size > 10000) loginAttempts.clear();
      loginAttempts.set(clientIp, {
        count: (current?.count || 0) + 1,
        resetAt: current?.resetAt > now ? current.resetAt : now + loginWindowMs
      });
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }
    loginAttempts.delete(clientIp);
    setSessionCookie(res, makeToken(user));
    res.json({ user: publicUser(user) });
  } catch (error) {
    console.error('Falha no login:', error.message);
    res.status(503).json({ error: 'Não foi possível iniciar a sessão agora.' });
  }
});

router.post('/logout', (req, res) => {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`);
  res.json({ logout: true });
});

protectedRouter.post('/change-password', async (req, res) => {
  if (!req.auth) return res.status(401).json({ error: 'Entre novamente para alterar sua senha.' });
  const currentPassword = String(req.body.currentPassword || '');
  const newPassword = String(req.body.newPassword || '');
  if (newPassword.length < 12 || newPassword.length > 1024) {
    return res.status(400).json({ error: 'A nova senha deve ter pelo menos 12 caracteres.' });
  }
  try {
    const user = await db.findUserCredentials(req.auth.id, req.auth.tenantId);
    if (!user) return res.status(401).json({ error: 'Conta não encontrada.' });
    const currentHash = await hashPassword(currentPassword, user.password_salt);
    if (!equalSafe(currentHash.hash, user.password_hash)) return res.status(401).json({ error: 'Senha atual incorreta.' });
    const next = await hashPassword(newPassword);
    await db.pool.query(
      'UPDATE public.tenant_users SET password_hash = $1, password_salt = $2, trocar_senha = FALSE WHERE id = $3 AND tenant_id = $4',
      [next.hash, next.salt, req.auth.id, req.auth.tenantId]
    );
    res.json({ atualizado: true });
  } catch (error) {
    console.error('Falha ao alterar senha:', error.message);
    res.status(500).json({ error: 'Não foi possível alterar a senha.' });
  }
});

function requirePlatformToken(req, res, next) {
  const expected = process.env.PLATFORM_ADMIN_TOKEN;
  const supplied = req.get('x-platform-admin-token') || '';
  if (!expected || expected.length < 32) {
    return res.status(503).json({ error: 'Provisionamento indisponível: configure PLATFORM_ADMIN_TOKEN com pelo menos 32 caracteres.' });
  }
  if (!equalSafe(supplied, expected)) return res.status(401).json({ error: 'Token de provisionamento inválido.' });
  next();
}

const platformRouter = express.Router();
platformRouter.post('/tenants', requirePlatformToken, async (req, res) => {
  if (!db.isPostgres) return res.status(503).json({ error: 'Provisionamento de empresas requer DATABASE_URL do PostgreSQL.' });
  const nome = String(req.body.nome || '').trim();
  const ownerName = String(req.body.ownerName || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!nome || nome.length > 120 || !ownerName || ownerName.length > 120 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'Informe nome da empresa, nome do responsável e e-mail válido.' });
  }
  const initialPassword = crypto.randomBytes(24).toString('base64url');
  try {
    const credentials = await hashPassword(initialPassword);
    const tenant = await db.provisionTenant({
      nome,
      ownerName,
      email,
      passwordHash: credentials.hash,
      passwordSalt: credentials.salt
    });
    res.status(201).json({
      tenantId: tenant.id,
      empresa: nome,
      responsavel: { nome: ownerName, email },
      senhaInicial: initialPassword,
      aviso: 'Copie a senha inicial agora e entregue-a ao responsável por canal seguro. Ela não será exibida novamente.'
    });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Já existe uma conta com esse e-mail nesta empresa.' });
    console.error('Falha ao provisionar assistência:', error.message);
    res.status(500).json({ error: 'Não foi possível criar a empresa.' });
  }
});

function requireAuthenticated(dbInstance) {
  return async (req, res, next) => {
    if (!dbInstance.isPostgres) return next();
    const claims = readToken(parseToken(req));
    if (!claims) return res.status(401).json({ error: 'Autenticação necessária.' });
    try {
      const user = await dbInstance.findSessionUser(claims.sub, claims.tid);
      if (!user) return res.status(401).json({ error: 'Sessão revogada ou conta desativada.' });
      req.auth = {
        id: user.id,
        tenantId: user.tenant_id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        tenantName: user.tenant_name
      };
      if (user.must_change_password && !(req.method === 'POST' && req.path === '/auth/change-password')) {
        return res.status(428).json({ error: 'Altere sua senha inicial antes de continuar.' });
      }
      return dbInstance.bindTenant(req, res, next, user.schema_name);
    } catch (error) {
      console.error('Falha ao autenticar solicitação:', error.message);
      return res.status(503).json({ error: 'Não foi possível validar a sessão agora.' });
    }
  };
}

module.exports = {
  router,
  protectedRouter,
  platformRouter,
  requireAuthenticated,
  enforceRole,
  hashPassword
};
