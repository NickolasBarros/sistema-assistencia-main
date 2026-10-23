const { AsyncLocalStorage } = require('node:async_hooks');
const { Pool } = require('pg');
const crypto = require('node:crypto');
const converterSql = require('./postgres-sql');

const context = new AsyncLocalStorage();
const sslMode = (process.env.PGSSLMODE || 'verify-full').toLowerCase();
if (!['disable', 'require', 'verify-ca', 'verify-full'].includes(sslMode)) {
  throw new Error('PGSSLMODE inválido. Use disable, require, verify-ca ou verify-full.');
}
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslMode === 'disable' ? false : { rejectUnauthorized: sslMode !== 'require' },
  max: Number(process.env.PGPOOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

const domainSchema = [
  `CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, telefone TEXT, email TEXT, cpf TEXT, endereco TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS funcionarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, cargo TEXT, telefone TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, tipo TEXT NOT NULL, descricao TEXT, preco REAL DEFAULT 0,
    quantidade INTEGER DEFAULT 0, estoque_minimo INTEGER DEFAULT 0, funcionario_id INTEGER, imei TEXT, numero_serie TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP, ativo INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS ordens (
    id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER, funcionario_id INTEGER, aparelho TEXT, marca TEXT, modelo TEXT,
    imei TEXT, numero_serie TEXT, defeito TEXT, servico_realizado TEXT, pecas_utilizadas TEXT, valor REAL DEFAULT 0,
    valor_pago REAL DEFAULT 0, quitado INTEGER DEFAULT 0, status TEXT DEFAULT 'Aberta',
    data_entrada DATETIME DEFAULT CURRENT_TIMESTAMP, data_saida DATETIME, mao_de_obra TEXT DEFAULT '[]',
    produtos_vendidos TEXT DEFAULT '[]', garantia_ate DATETIME
  )`,
  `CREATE TABLE IF NOT EXISTS caixa (
    id INTEGER PRIMARY KEY AUTOINCREMENT, tipo TEXT NOT NULL, descricao TEXT, valor REAL NOT NULL,
    forma_pagamento TEXT, parcelas INTEGER DEFAULT 1, data_mov DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS despesas_fixas (
    id INTEGER PRIMARY KEY AUTOINCREMENT, descricao TEXT NOT NULL, valor REAL NOT NULL, dia_vencimento INTEGER,
    ativo INTEGER DEFAULT 1, criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS vendas (
    id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER, funcionario_id INTEGER, itens TEXT,
    valor_total REAL DEFAULT 0, forma_pagamento TEXT, data_venda DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS vendas_aparelhos (
    id INTEGER PRIMARY KEY AUTOINCREMENT, venda_id INTEGER, produto_id INTEGER, imei TEXT, numero_serie TEXT, valor REAL
  )`,
  `CREATE TABLE IF NOT EXISTS estoque_mov (
    id INTEGER PRIMARY KEY AUTOINCREMENT, produto_id INTEGER, funcionario_id INTEGER, tipo TEXT, quantidade INTEGER,
    observacao TEXT, data_mov DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS financeiro (
    id INTEGER PRIMARY KEY AUTOINCREMENT, tipo TEXT, descricao TEXT, valor REAL, referencia_tipo TEXT,
    referencia_id INTEGER, data_mov DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS orcamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER, descricao TEXT, itens TEXT, valor_total REAL DEFAULT 0,
    status TEXT DEFAULT 'Pendente', data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS os_pagamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT, ordem_id INTEGER NOT NULL, valor REAL NOT NULL, forma_pagamento TEXT,
    parcelas INTEGER DEFAULT 1, observacao TEXT, data_pagamento DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS os_status_historico (
    id INTEGER PRIMARY KEY AUTOINCREMENT, ordem_id INTEGER NOT NULL, status_anterior TEXT, status_novo TEXT NOT NULL,
    alterado_por TEXT, criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS configuracoes (chave TEXT PRIMARY KEY, valor TEXT)`,
  `CREATE TABLE IF NOT EXISTS termos_garantia (
    id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, tempo_dias INTEGER DEFAULT 180, texto TEXT DEFAULT '',
    ativo INTEGER DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS caixa_sessoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT, data_abertura DATETIME DEFAULT CURRENT_TIMESTAMP, data_fechamento DATETIME,
    valor_inicial REAL DEFAULT 0, valor_contado REAL, valor_esperado REAL, diferenca REAL, observacao TEXT,
    status TEXT DEFAULT 'aberto'
  )`,
  `CREATE TABLE IF NOT EXISTS modelos_documentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT, tipo TEXT NOT NULL CHECK (tipo IN ('os', 'garantia')),
    nome_original TEXT NOT NULL, nome_arquivo TEXT NOT NULL UNIQUE, criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS midias (
    id INTEGER PRIMARY KEY AUTOINCREMENT, entidade_tipo TEXT NOT NULL CHECK (entidade_tipo IN ('produto', 'ordem')),
    entidade_id INTEGER NOT NULL, mime_type TEXT NOT NULL, nome_arquivo TEXT NOT NULL UNIQUE,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
];
pool.on('error', error => console.error('Falha em conexão PostgreSQL ociosa:', error.message));

function executor() {
  return context.getStore()?.client || pool;
}

async function query(sql, params = []) {
  return executor().query(converterSql(sql), params);
}

function callbackArgs(sql, params, callback) {
  if (typeof params === 'function') return { params: [], callback: params };
  return { params: params || [], callback };
}

function run(sql, params, callback) {
  const args = callbackArgs(sql, params, callback);
  query(sql, args.params).then(result => {
    if (args.callback) args.callback.call({
      lastID: result.rows[0]?.id ?? null,
      changes: result.rowCount
    }, null);
  }).catch(error => args.callback ? args.callback(error) : console.error('Erro na consulta PostgreSQL:', error.message));
}

function all(sql, params, callback) {
  const args = callbackArgs(sql, params, callback);
  query(sql, args.params).then(result => args.callback?.(null, result.rows))
    .catch(error => args.callback?.(error));
}

function get(sql, params, callback) {
  const args = callbackArgs(sql, params, callback);
  query(sql, args.params).then(result => args.callback?.(null, result.rows[0]))
    .catch(error => args.callback?.(error));
}

async function runAsync(sql, params = []) {
  const result = await query(sql, params);
  return { lastID: result.rows[0]?.id ?? null, changes: result.rowCount };
}

async function getAsync(sql, params = []) {
  const result = await query(sql, params);
  return result.rows[0];
}

async function allAsync(sql, params = []) {
  const result = await query(sql, params);
  return result.rows;
}

async function transaction(work) {
  const client = context.getStore()?.client;
  if (!client) throw new Error('Transações PostgreSQL precisam de um contexto de assistência autenticado.');
  await client.query('BEGIN');
  try {
    const result = await work({
      run: async (sql, params = []) => {
        const response = await client.query(converterSql(sql), params);
        return { lastID: response.rows[0]?.id ?? null, changes: response.rowCount };
      },
      get: async (sql, params = []) => (await client.query(converterSql(sql), params)).rows[0],
      all: async (sql, params = []) => (await client.query(converterSql(sql), params)).rows
    });
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(rollbackError => {
      console.error('Falha ao reverter transação PostgreSQL:', rollbackError.message);
    });
    throw error;
  }
}

function quoteSchema(schema) {
  if (!/^techgest_[a-f0-9]{32}$/.test(schema)) throw new Error('Identificador de assistência inválido.');
  return `"${schema}"`;
}

async function initializeTenantSchema(client, schema) {
  await client.query(`SET search_path TO ${quoteSchema(schema)}, public`);
  for (const statement of domainSchema) await client.query(converterSql(statement));
  await client.query("ALTER TABLE ordens ADD COLUMN IF NOT EXISTS mao_de_obra TEXT DEFAULT '[]'");
  await client.query("ALTER TABLE ordens ADD COLUMN IF NOT EXISTS produtos_vendidos TEXT DEFAULT '[]'");
  await client.query('ALTER TABLE ordens ADD COLUMN IF NOT EXISTS garantia_ate TIMESTAMP');
  await client.query('ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ativo INTEGER NOT NULL DEFAULT 1');
  await client.query('CREATE INDEX IF NOT EXISTS idx_midias_entidade ON midias (entidade_tipo, entidade_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_os_status_historico_ordem ON os_status_historico (ordem_id, id)');
}

async function initialize() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.tenants (
      id BIGSERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      schema_name TEXT NOT NULL UNIQUE,
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.tenant_users (
      id BIGSERIAL PRIMARY KEY,
      tenant_id BIGINT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
      nome TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('owner', 'staff')),
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      trocar_senha BOOLEAN NOT NULL DEFAULT FALSE,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (email)
    )
  `);
  await pool.query('ALTER TABLE public.tenant_users ADD COLUMN IF NOT EXISTS trocar_senha BOOLEAN NOT NULL DEFAULT FALSE');
}

async function provisionTenant({ nome, ownerName, email, passwordHash, passwordSalt }) {
  const schema = `techgest_${crypto.randomBytes(16).toString('hex')}`;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tenant = await client.query(
      'INSERT INTO public.tenants (nome, schema_name) VALUES ($1, $2) RETURNING id',
      [nome, schema]
    );
    await client.query(`CREATE SCHEMA ${quoteSchema(schema)}`);
    await initializeTenantSchema(client, schema);
    await client.query(
      `INSERT INTO public.tenant_users (tenant_id, nome, email, password_hash, password_salt, role)
       VALUES ($1, $2, $3, $4, $5, 'owner', TRUE)`,
      [tenant.rows[0].id, ownerName, email.toLowerCase(), passwordHash, passwordSalt]
    );
    await client.query('COMMIT');
    return { id: tenant.rows[0].id, schema };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.query('RESET search_path').catch(() => {});
    client.release();
  }
}

async function findUserByEmail(email) {
  const result = await pool.query(
    `SELECT u.id, u.tenant_id, u.nome, u.email, u.password_hash, u.password_salt, u.role,
            u.ativo AS user_active, t.nome AS tenant_name, t.schema_name, t.ativo AS tenant_active
     FROM public.tenant_users u JOIN public.tenants t ON t.id = u.tenant_id
     WHERE lower(u.email) = lower($1)`,
    [email]
  );
  return result.rows[0];
}

async function findSessionUser(userId, tenantId) {
  const result = await pool.query(
    `SELECT u.id, u.tenant_id, u.nome, u.email, u.role, u.trocar_senha AS must_change_password,
            t.nome AS tenant_name, t.schema_name
     FROM public.tenant_users u JOIN public.tenants t ON t.id = u.tenant_id
     WHERE u.id = $1 AND u.tenant_id = $2 AND u.ativo = TRUE AND t.ativo = TRUE`,
    [userId, tenantId]
  );
  return result.rows[0];
}

async function findUserCredentials(userId, tenantId) {
  const result = await pool.query(
    `SELECT id, tenant_id, email, password_hash, password_salt
     FROM public.tenant_users
     WHERE id = $1 AND tenant_id = $2 AND ativo = TRUE`,
    [userId, tenantId]
  );
  return result.rows[0];
}

async function addTenantUser(tenantId, name, email, passwordHash, passwordSalt, role = 'staff') {
  const result = await pool.query(
    `INSERT INTO public.tenant_users (tenant_id, nome, email, password_hash, password_salt, role, trocar_senha)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE) RETURNING id, nome, email, role`,
    [tenantId, name, email.toLowerCase(), passwordHash, passwordSalt, role]
  );
  return result.rows[0];
}

async function listTenantUsers(tenantId) {
  const result = await pool.query(
    `SELECT id, nome, email, role, ativo, criado_em
     FROM public.tenant_users WHERE tenant_id = $1 ORDER BY id`,
    [tenantId]
  );
  return result.rows;
}

async function bindTenant(req, res, next, schema) {
  let client;
  try {
    client = await pool.connect();
    await client.query(`SET search_path TO ${quoteSchema(schema)}, public`);
  } catch (error) {
    if (client) client.release();
    return next(error);
  }
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    client.query('RESET search_path')
      .then(() => client.release())
      .catch(error => {
        console.error('Falha ao restaurar search_path PostgreSQL:', error.message);
        client.release(error);
      });
  };
  res.once('finish', release);
  res.once('close', release);
  return context.run({ client, schema }, () => next());
}

module.exports = {
  ready: initialize(),
  isPostgres: true,
  run,
  get,
  all,
  runAsync,
  getAsync,
  allAsync,
  transaction,
  pool,
  provisionTenant,
  findUserByEmail,
  findSessionUser,
  findUserCredentials,
  addTenantUser,
  listTenantUsers,
  bindTenant
};
