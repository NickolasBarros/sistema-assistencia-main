const express = require('express');
const router = express.Router();
const db = require('../database');

// Listar tudo (compatibilidade)
router.get('/', (req, res) => {
  db.all('SELECT * FROM financeiro ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ============================================
// EXTRATO COM FILTROS + ORDENAÇÃO ADAPTATIVA
// ============================================

router.get('/extrato', (req, res) => {
  const { data_inicio, data_fim, tipo, busca, ordenar_por, direcao } = req.query;

  const where = [];
  const params = [];

  if (data_inicio) {
    where.push('date(data_mov) >= date(?)');
    params.push(data_inicio);
  }
  if (data_fim) {
    where.push('date(data_mov) <= date(?)');
    params.push(data_fim);
  }
  if (tipo && tipo !== 'todos') {
    where.push('tipo = ?');
    params.push(tipo);
  }
  if (busca) {
    where.push('descricao LIKE ?');
    params.push('%' + busca + '%');
  }

  const whereSQL = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  // ============================================
  // ORDENAÇÃO
  // ============================================

  let orderSQL = 'ORDER BY data_mov DESC, id DESC';

  const dir = (direcao === 'asc') ? 'ASC' : 'DESC';

  if (ordenar_por === 'valor') {
    orderSQL = `ORDER BY valor ${dir}, data_mov DESC`;
  } else if (ordenar_por === 'tipo') {
    orderSQL = `ORDER BY tipo ${dir}, data_mov DESC`;
  } else if (ordenar_por === 'data') {
    orderSQL = `ORDER BY data_mov ${dir}, id ${dir}`;
  } else if (ordenar_por === 'mes') {
    orderSQL = `ORDER BY strftime('%Y-%m', data_mov) ${dir}, data_mov DESC`;
  } else if (ordenar_por === 'dia') {
    orderSQL = `ORDER BY date(data_mov) ${dir}, data_mov DESC`;
  }

  db.all(
    `SELECT * FROM financeiro ${whereSQL} ${orderSQL}`,
    params,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      let receitas = 0;
      let despesas = 0;
      rows.forEach(r => {
        if (r.tipo === 'receita') receitas += r.valor || 0;
        else if (r.tipo === 'despesa') despesas += r.valor || 0;
      });

      res.json({
        transacoes: rows,
        total_receitas: receitas,
        total_despesas: despesas,
        saldo: receitas - despesas,
        quantidade: rows.length
      });
    }
  );
});

// Criar lançamento
router.post('/', (req, res) => {
  const { tipo, descricao, valor, referencia_tipo, referencia_id } = req.body;
  db.run(
    'INSERT INTO financeiro (tipo, descricao, valor, referencia_tipo, referencia_id) VALUES (?,?,?,?,?)',
    [tipo, descricao, valor, referencia_tipo, referencia_id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

router.delete('/:id', (req, res) => {
  db.run('DELETE FROM financeiro WHERE id=?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deletado: this.changes });
  });
});

module.exports = router;