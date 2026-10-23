const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  db.all('SELECT * FROM funcionarios ORDER BY nome', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/', (req, res) => {
  const { nome, cargo, telefone } = req.body;
  if (typeof nome !== 'string' || !nome.trim()) return res.status(400).json({ error: 'O nome do funcionário é obrigatório.' });
  db.run(
    'INSERT INTO funcionarios (nome, cargo, telefone) VALUES (?,?,?)',
    [nome.trim(), cargo || null, telefone || null],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

router.put('/:id', (req, res) => {
  const { nome, cargo, telefone } = req.body;
  if (typeof nome !== 'string' || !nome.trim()) return res.status(400).json({ error: 'O nome do funcionário é obrigatório.' });
  db.run(
    'UPDATE funcionarios SET nome=?, cargo=?, telefone=? WHERE id=?',
    [nome.trim(), cargo || null, telefone || null, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Funcionário não encontrado.' });
      res.json({ atualizado: this.changes });
    }
  );
});

router.delete('/:id', async (req, res) => {
  try {
    const deletado = await db.transaction(async tx => {
      const funcionario = await tx.get('SELECT id FROM funcionarios WHERE id = ?', [req.params.id]);
      if (!funcionario) {
        const error = new Error('Funcionário não encontrado.');
        error.status = 404;
        throw error;
      }
      const referencias = await tx.get(
        `SELECT
           (SELECT COUNT(*) FROM ordens WHERE funcionario_id = ?) +
           (SELECT COUNT(*) FROM vendas WHERE funcionario_id = ?) +
           (SELECT COUNT(*) FROM produtos WHERE funcionario_id = ?) +
           (SELECT COUNT(*) FROM estoque_mov WHERE funcionario_id = ?) AS total`,
        [req.params.id, req.params.id, req.params.id, req.params.id]
      );
      if (referencias.total) {
        const error = new Error('Este funcionário possui OS, vendas, produtos ou movimentações vinculadas. Edite o cadastro para manter o histórico.');
        error.status = 409;
        throw error;
      }
      return tx.run('DELETE FROM funcionarios WHERE id = ?', [req.params.id]);
    });
    res.json({ deletado: deletado.changes });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Erro ao excluir funcionário:', err.message);
    res.status(500).json({ error: 'Não foi possível excluir o funcionário.' });
  }
});

module.exports = router;