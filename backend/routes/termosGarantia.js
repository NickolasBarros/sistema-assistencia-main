const express = require('express');
const router = express.Router();
const db = require('../database');

// Listar todos
router.get('/', (req, res) => {
  db.all('SELECT * FROM termos_garantia ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Buscar um específico
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM termos_garantia WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

// Criar
router.post('/', (req, res) => {
  const { nome, tempo_dias, texto, ativo } = req.body;
  db.run(
    'INSERT INTO termos_garantia (nome, tempo_dias, texto, ativo) VALUES (?, ?, ?, ?)',
    [nome, tempo_dias || 180, texto || '', ativo === undefined ? 1 : ativo],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// Atualizar
router.put('/:id', (req, res) => {
  const { nome, tempo_dias, texto, ativo } = req.body;
  db.run(
    'UPDATE termos_garantia SET nome=?, tempo_dias=?, texto=?, ativo=? WHERE id=?',
    [nome, tempo_dias, texto, ativo, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ atualizado: this.changes });
    }
  );
});

// Excluir
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM termos_garantia WHERE id=?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deletado: this.changes });
  });
});

module.exports = router;