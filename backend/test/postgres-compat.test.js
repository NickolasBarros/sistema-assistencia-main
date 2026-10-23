const { test } = require('node:test');
const assert = require('node:assert/strict');
const converterSql = require('../postgres-sql');

test('converte parâmetros, tipos e geração de IDs para PostgreSQL sem alterar literais', () => {
  const sql = converterSql(
    "CREATE TABLE clientes (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, preco REAL, criado DATETIME DEFAULT CURRENT_TIMESTAMP)"
  );
  assert.match(sql, /id SERIAL PRIMARY KEY/);
  assert.match(sql, /preco DOUBLE PRECISION/);
  assert.match(sql, /criado TIMESTAMP/);

  assert.equal(
    converterSql("SELECT * FROM clientes WHERE nome = ? AND observacao = '?' AND detalhe = 'it''s ?' -- ?\nAND id = ?"),
    "SELECT * FROM clientes WHERE nome = $1 AND observacao = '?' AND detalhe = 'it''s ?' -- ?\nAND id = $2"
  );
});

test('adapta datas e retorna os IDs inseridos sem alterar tabelas sem coluna id', () => {
  assert.equal(
    converterSql("SELECT strftime('%Y-%m', data_saida), date('now', '-6 months'), date(data_mov)"),
    "SELECT TO_CHAR(data_saida::timestamp, 'YYYY-MM'), (CURRENT_DATE - INTERVAL '6 months')::date, (data_mov)::date"
  );
  assert.equal(
    converterSql('INSERT INTO vendas (itens) VALUES (?)'),
    'INSERT INTO vendas (itens) VALUES ($1) RETURNING id'
  );
  assert.equal(
    converterSql('INSERT INTO configuracoes (chave, valor) VALUES (?, ?)'),
    'INSERT INTO configuracoes (chave, valor) VALUES ($1, $2)'
  );
});
