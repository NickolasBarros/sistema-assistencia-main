const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const databasePath = process.env.DATABASE_PATH || path.join(__dirname, 'database.db');
if (databasePath !== ':memory:') {
  fs.mkdirSync(path.dirname(path.resolve(databasePath)), { recursive: true });
}

const db = new sqlite3.Database(databasePath);

function run(sql) {
  return new Promise((resolve, reject) => {
    db.run(sql, err => err ? reject(err) : resolve());
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
  });
}

async function ensureColumn(table, column, definition) {
  const columns = await all(`PRAGMA table_info(${table})`);
  if (!columns.some(existing => existing.name === column)) {
    await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function initialize() {
  const schema = [
    `CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      telefone TEXT,
      email TEXT,
      cpf TEXT,
      endereco TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS funcionarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      cargo TEXT,
      telefone TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS produtos (
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
    )`,
    `CREATE TABLE IF NOT EXISTS ordens (
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
    )`,
    `CREATE TABLE IF NOT EXISTS caixa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL,
      descricao TEXT,
      valor REAL NOT NULL,
      forma_pagamento TEXT,
      parcelas INTEGER DEFAULT 1,
      data_mov DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS despesas_fixas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      descricao TEXT NOT NULL,
      valor REAL NOT NULL,
      dia_vencimento INTEGER,
      ativo INTEGER DEFAULT 1,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS vendas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER,
      funcionario_id INTEGER,
      itens TEXT,
      valor_total REAL DEFAULT 0,
      forma_pagamento TEXT,
      data_venda DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS vendas_aparelhos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venda_id INTEGER,
      produto_id INTEGER,
      imei TEXT,
      numero_serie TEXT,
      valor REAL
    )`,
    `CREATE TABLE IF NOT EXISTS estoque_mov (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id INTEGER,
      funcionario_id INTEGER,
      tipo TEXT,
      quantidade INTEGER,
      observacao TEXT,
      data_mov DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS financeiro (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT,
      descricao TEXT,
      valor REAL,
      referencia_tipo TEXT,
      referencia_id INTEGER,
      data_mov DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS orcamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER,
      descricao TEXT,
      itens TEXT,
      valor_total REAL DEFAULT 0,
      status TEXT DEFAULT 'Pendente',
      data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS os_pagamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ordem_id INTEGER NOT NULL,
      valor REAL NOT NULL,
      forma_pagamento TEXT,
      parcelas INTEGER DEFAULT 1,
      observacao TEXT,
      data_pagamento DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS configuracoes (
      chave TEXT PRIMARY KEY,
      valor TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS termos_garantia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      tempo_dias INTEGER DEFAULT 180,
      texto TEXT DEFAULT '',
      ativo INTEGER DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS caixa_sessoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data_abertura DATETIME DEFAULT CURRENT_TIMESTAMP,
      data_fechamento DATETIME,
      valor_inicial REAL DEFAULT 0,
      valor_contado REAL,
      valor_esperado REAL,
      diferenca REAL,
      observacao TEXT,
      status TEXT DEFAULT 'aberto'
    )`
  ];

  for (const statement of schema) await run(statement);

  await ensureColumn('ordens', 'mao_de_obra', "TEXT DEFAULT '[]'");
  await ensureColumn('ordens', 'produtos_vendidos', "TEXT DEFAULT '[]'");
  await ensureColumn('ordens', 'garantia_ate', 'DATETIME');
}

db.ready = initialize();

module.exports = db;
