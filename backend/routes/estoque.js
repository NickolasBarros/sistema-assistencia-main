const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/movimentacoes', (req, res) => {
  db.all(
    `SELECT m.*, p.nome as produto_nome, f.nome as funcionario_nome
     FROM estoque_mov m
     LEFT JOIN produtos p ON p.id = m.produto_id
     LEFT JOIN funcionarios f ON f.id = m.funcionario_id
     ORDER BY m.id DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

router.post('/movimentar', (req, res) => {
  const { produto_id, funcionario_id, tipo, quantidade, observacao } = req.body;
  if (!produto_id || !tipo || !quantidade) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }
  db.get('SELECT quantidade FROM produtos WHERE id=?', [produto_id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Produto não encontrado' });

    const novaQtd = tipo === 'entrada' ? row.quantidade + quantidade : row.quantidade - quantidade;
    if (novaQtd < 0) return res.status(400).json({ error: 'Estoque insuficiente' });

    db.run('UPDATE produtos SET quantidade=? WHERE id=?', [novaQtd, produto_id]);
    db.run(
      'INSERT INTO estoque_mov (produto_id, funcionario_id, tipo, quantidade, observacao) VALUES (?,?,?,?,?)',
      [produto_id, funcionario_id || null, tipo, quantidade, observacao],
      function (err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ id: this.lastID, nova_quantidade: novaQtd });
      }
    );
  });
});

module.exports = router;