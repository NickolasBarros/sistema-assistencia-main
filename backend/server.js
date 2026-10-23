const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const appPassword = process.env.APP_PASSWORD;

if (isProduction && !appPassword) {
  throw new Error('APP_PASSWORD precisa estar configurada em produção.');
}

const db = require('./database');

app.use(cors({
  origin: process.env.CORS_ORIGIN || (isProduction ? false : true)
}));

function safeCompare(value, expected) {
  const valueHash = crypto.createHash('sha256').update(value).digest();
  const expectedHash = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(valueHash, expectedHash);
}

function requireAppPassword(req, res, next) {
  if (req.path === '/health') return next();

  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Basic\s+(.+)$/i);
  if (match) {
    try {
      const credentials = Buffer.from(match[1], 'base64').toString('utf8');
      const separator = credentials.indexOf(':');
      const username = separator < 0 ? '' : credentials.slice(0, separator);
      const password = separator < 0 ? '' : credentials.slice(separator + 1);

      if (safeCompare(username, 'admin') && safeCompare(password, appPassword)) {
        return next();
      }
    } catch (err) {
      console.warn('Credenciais de acesso inválidas:', err.message);
    }
  }

  res.set('WWW-Authenticate', 'Basic realm="TechGest", charset="UTF-8"');
  return res.status(401).send('Acesso restrito.');
}

if (appPassword) app.use(requireAppPassword);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(express.json({ limit: '8mb' }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use('/api/busca', require('./routes/busca'));
app.use('/api/configuracoes', require('./routes/configuracoes'));
app.use('/api/midias', require('./routes/midias'));
app.use('/api/termosGarantia', require('./routes/termosGarantia'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/funcionarios', require('./routes/funcionarios'));
app.use('/api/produtos', require('./routes/produtos'));
app.use('/api/ordens', require('./routes/ordens'));
app.use('/api/vendas', require('./routes/vendas'));
app.use('/api/estoque', require('./routes/estoque'));
app.use('/api/caixa', require('./routes/caixa'));
app.use('/api/financeiro', require('./routes/financeiro'));
app.use('/api/despesasFixas', require('./routes/despesasFixas'));
app.use('/api/orcamentos', require('./routes/orcamentos'));
app.use('/api/relatorios', require('./routes/relatorios'));

const PORT = process.env.PORT || 3000;

db.ready
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor TechGest iniciado na porta ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Falha ao inicializar o banco de dados:', err);
    process.exitCode = 1;
  });