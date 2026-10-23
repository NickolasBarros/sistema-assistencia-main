const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) app.set('trust proxy', 1);
const db = require('./database');
const auth = require('./auth');

app.use(cors({
  origin: process.env.CORS_ORIGIN || (isProduction ? false : true)
}));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(express.json({ limit: '8mb' }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use('/api/auth', auth.router);
app.use('/api/platform', auth.platformRouter);
app.use('/api', auth.requireAuthenticated(db));
app.use('/api', auth.enforceRole);
app.use('/api/auth', auth.protectedRouter);

app.use('/api/busca', require('./routes/busca'));
app.use('/api/tenant-users', require('./routes/tenantUsers'));
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