const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  db.all('SELECT * FROM clientes ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/:id', (req, res) => {
  db.get('SELECT * FROM clientes WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

router.post('/', (req, res) => {
  const { nome, telefone, email, cpf, endereco } = req.body;
  db.run(
    'INSERT INTO clientes (nome, telefone, email, cpf, endereco) VALUES (?,?,?,?,?)',
    [nome, telefone, email, cpf, endereco],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

router.put('/:id', (req, res) => {
  const { nome, telefone, email, cpf, endereco } = req.body;
  db.run(
    'UPDATE clientes SET nome=?, telefone=?, email=?, cpf=?, endereco=? WHERE id=?',
    [nome, telefone, email, cpf, endereco, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ atualizado: this.changes });
    }
  );
});

router.delete('/:id', (req, res) => {
  db.run('DELETE FROM clientes WHERE id=?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deletado: this.changes });
  });
});

module.exports = router;
