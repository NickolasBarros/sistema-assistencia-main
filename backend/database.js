const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'database.db'));

db.serialize(() => {
  // CLIENTES
  db.run(`CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    telefone TEXT,
    email TEXT,
    cpf TEXT,
    endereco TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // FUNCIONÁRIOS
  db.run(`CREATE TABLE IF NOT EXISTS funcionarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cargo TEXT,
    telefone TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // PRODUTOS E SERVIÇOS
  db.run(`CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL,
    descricao TEXT,
    preco REAL DEFAULT 0,
    quantidade INTEGER DEFAULT 0,
    estoque_minimo INTEGER DEFAULT 0,
    funcionario_id INTEGER,
    imei TEXT,
    numero_serie TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // ORDENS DE SERVIÇO
  db.run(`CREATE TABLE IF NOT EXISTS ordens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER,
    funcionario_id INTEGER,
    aparelho TEXT,
    marca TEXT,
    modelo TEXT,
    imei TEXT,
    numero_serie TEXT,
    defeito TEXT,
    servico_realizado TEXT,
    pecas_utilizadas TEXT,
    valor REAL DEFAULT 0,
    valor_pago REAL DEFAULT 0,
    quitado INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Aberta',
    data_entrada DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_saida DATETIME
  )`);

  // CAIXA (carteira da loja)
  db.run(`CREATE TABLE IF NOT EXISTS caixa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,
    descricao TEXT,
    valor REAL NOT NULL,
    forma_pagamento TEXT,
    parcelas INTEGER DEFAULT 1,
    data_mov DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // DESPESAS FIXAS
  db.run(`CREATE TABLE IF NOT EXISTS despesas_fixas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    descricao TEXT NOT NULL,
    valor REAL NOT NULL,
    dia_vencimento INTEGER,
    ativo INTEGER DEFAULT 1,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // VENDAS
  db.run(`CREATE TABLE IF NOT EXISTS vendas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER,
    funcionario_id INTEGER,
    itens TEXT,
    valor_total REAL DEFAULT 0,
    forma_pagamento TEXT,
    data_venda DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // VENDA DE APARELHOS (IMEI por venda)
  db.run(`CREATE TABLE IF NOT EXISTS vendas_aparelhos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venda_id INTEGER,
    produto_id INTEGER,
    imei TEXT,
    numero_serie TEXT,
    valor REAL
  )`);

  // MOVIMENTAÇÃO DE ESTOQUE
  db.run(`CREATE TABLE IF NOT EXISTS estoque_mov (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    produto_id INTEGER,
    funcionario_id INTEGER,
    tipo TEXT,
    quantidade INTEGER,
    observacao TEXT,
    data_mov DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // FINANCEIRO
  db.run(`CREATE TABLE IF NOT EXISTS financeiro (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT,
    descricao TEXT,
    valor REAL,
    referencia_tipo TEXT,
    referencia_id INTEGER,
    data_mov DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // ORÇAMENTOS
  db.run(`CREATE TABLE IF NOT EXISTS orcamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER,
    descricao TEXT,
    itens TEXT,
    valor_total REAL DEFAULT 0,
    status TEXT DEFAULT 'Pendente',
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // PAGAMENTOS DE OS (histórico)
  db.run(`CREATE TABLE IF NOT EXISTS os_pagamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ordem_id INTEGER NOT NULL,
    valor REAL NOT NULL,
    forma_pagamento TEXT,
    parcelas INTEGER DEFAULT 1,
    observacao TEXT,
    data_pagamento DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

module.exports = db;