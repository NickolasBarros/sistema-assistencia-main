const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  db.all(
    `SELECT o.*, c.nome as cliente_nome FROM orcamentos o
     LEFT JOIN clientes c ON c.id = o.cliente_id
     ORDER BY o.id DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

router.post('/', (req, res) => {
  const { cliente_id, descricao, itens, valor_total, status } = req.body;
  db.run(
    'INSERT INTO orcamentos (cliente_id, descricao, itens, valor_total, status) VALUES (?,?,?,?,?)',
    [cliente_id, descricao, JSON.stringify(itens || []), valor_total, status || 'Pendente'],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

router.put('/:id', (req, res) => {
  const { cliente_id, descricao, itens, valor_total, status } = req.body;
  db.run(
    'UPDATE orcamentos SET cliente_id=?, descricao=?, itens=?, valor_total=?, status=? WHERE id=?',
    [cliente_id, descricao, JSON.stringify(itens || []), valor_total, status, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ atualizado: this.changes });
    }
  );
});

router.delete('/:id', (req, res) => {
  db.run('DELETE FROM orcamentos WHERE id=?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deletado: this.changes });
  });
});

module.exports = router;
