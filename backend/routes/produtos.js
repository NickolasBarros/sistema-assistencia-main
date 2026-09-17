const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  db.all(
    `SELECT p.*, f.nome as funcionario_nome
     FROM produtos p
     LEFT JOIN funcionarios f ON f.id = p.funcionario_id
     ORDER BY p.id DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

router.post('/', (req, res) => {
  const { nome, tipo, descricao, preco, quantidade, estoque_minimo, funcionario_id, imei, numero_serie } = req.body;
  db.run(
    `INSERT INTO produtos (nome, tipo, descricao, preco, quantidade, estoque_minimo, funcionario_id, imei, numero_serie)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [nome, tipo, descricao, preco, quantidade || 0, estoque_minimo || 0, funcionario_id || null, imei || null, numero_serie || null],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

router.put('/:id', (req, res) => {
  const { nome, tipo, descricao, preco, quantidade, estoque_minimo, funcionario_id, imei, numero_serie } = req.body;
  db.run(
    `UPDATE produtos SET nome=?, tipo=?, descricao=?, preco=?, quantidade=?, estoque_minimo=?, funcionario_id=?, imei=?, numero_serie=? WHERE id=?`,
    [nome, tipo, descricao, preco, quantidade, estoque_minimo, funcionario_id, imei, numero_serie, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ atualizado: this.changes });
    }
  );
});

router.delete('/:id', (req, res) => {
  db.run('DELETE FROM produtos WHERE id=?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deletado: this.changes });
  });
});

module.exports = router;