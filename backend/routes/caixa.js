const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  db.all('SELECT * FROM caixa ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/saldo', (req, res) => {
  db.get(
    `SELECT
      COALESCE(SUM(CASE WHEN tipo='entrada' THEN valor ELSE 0 END),0) as entradas,
      COALESCE(SUM(CASE WHEN tipo='saida' THEN valor ELSE 0 END),0) as saidas
     FROM caixa`,
    [],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      const entradas = row?.entradas || 0;
      const saidas = row?.saidas || 0;
      res.json({ entradas, saidas, saldo: entradas - saidas });
    }
  );
});

// Resumo por forma de pagamento (só entradas)
router.get('/resumo-pagamentos', (req, res) => {
  db.all(
    `SELECT
      COALESCE(forma_pagamento, 'Não informado') as forma_pagamento,
      COUNT(*) as quantidade,
      SUM(valor) as total,
      COALESCE(SUM(CASE WHEN parcelas > 1 THEN 1 ELSE 0 END), 0) as com_parcelas
     FROM caixa
     WHERE tipo = 'entrada'
     GROUP BY forma_pagamento`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

router.post('/', (req, res) => {
  const { tipo, descricao, valor, forma_pagamento, parcelas } = req.body;
  db.run(
    'INSERT INTO caixa (tipo, descricao, valor, forma_pagamento, parcelas) VALUES (?,?,?,?,?)',
    [tipo, descricao, valor, forma_pagamento || null, parcelas || 1],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

router.delete('/:id', (req, res) => {
  db.run('DELETE FROM caixa WHERE id=?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deletado: this.changes });
  });
});

module.exports = router;