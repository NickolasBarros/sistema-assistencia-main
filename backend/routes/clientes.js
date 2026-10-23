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
    if (!row) return res.status(404).json({ error: 'Cliente não encontrado.' });
    res.json(row);
  });
});

router.post('/', (req, res) => {
  const { nome, telefone, email, cpf, endereco } = req.body;
  if (typeof nome !== 'string' || !nome.trim()) return res.status(400).json({ error: 'O nome do cliente é obrigatório.' });
  db.run(
    'INSERT INTO clientes (nome, telefone, email, cpf, endereco) VALUES (?,?,?,?,?)',
    [nome.trim(), telefone || null, email || null, cpf || null, endereco || null],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID });
    }
  );
});

router.put('/:id', (req, res) => {
  const { nome, telefone, email, cpf, endereco } = req.body;
  if (typeof nome !== 'string' || !nome.trim()) return res.status(400).json({ error: 'O nome do cliente é obrigatório.' });
  db.run(
    'UPDATE clientes SET nome=?, telefone=?, email=?, cpf=?, endereco=? WHERE id=?',
    [nome.trim(), telefone || null, email || null, cpf || null, endereco || null, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Cliente não encontrado.' });
      res.json({ atualizado: this.changes });
    }
  );
});

router.delete('/:id', async (req, res) => {
  try {
    const deletado = await db.transaction(async tx => {
      const cliente = await tx.get('SELECT id FROM clientes WHERE id = ?', [req.params.id]);
      if (!cliente) {
        const error = new Error('Cliente não encontrado.');
        error.status = 404;
        throw error;
      }
      const referencias = await tx.get(
        `SELECT
           (SELECT COUNT(*) FROM ordens WHERE cliente_id = ?) +
           (SELECT COUNT(*) FROM vendas WHERE cliente_id = ?) +
           (SELECT COUNT(*) FROM orcamentos WHERE cliente_id = ?) AS total`,
        [req.params.id, req.params.id, req.params.id]
      );
      if (referencias.total > 0) {
        const error = new Error('Este cliente possui histórico de OS, vendas ou orçamentos. Edite o cadastro para preservar o histórico.');
        error.status = 409;
        throw error;
      }
      return tx.run('DELETE FROM clientes WHERE id = ?', [req.params.id]);
    });
    res.json({ deletado: deletado.changes });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Erro ao excluir cliente:', err.message);
    res.status(500).json({ error: 'Não foi possível excluir o cliente.' });
  }
});

module.exports = router;
