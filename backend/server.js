const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use('/api/busca', require('./routes/busca'));
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
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));