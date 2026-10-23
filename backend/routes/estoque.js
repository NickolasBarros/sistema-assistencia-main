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

router.post('/movimentar', async (req, res) => {
  const { produto_id, funcionario_id, tipo, quantidade, observacao } = req.body;
  const id = Number(produto_id);
  const qtd = Number(quantidade);
  if (!Number.isInteger(id) || id < 1 || !Number.isInteger(qtd) || qtd < 1 || !['entrada', 'saida'].includes(tipo)) {
    return res.status(400).json({ error: 'Selecione um produto e informe uma quantidade inteira maior que zero.' });
  }
  try {
    const movimento = await db.transaction(async tx => {
      const produto = await tx.get('SELECT quantidade, tipo, ativo FROM produtos WHERE id = ?', [id]);
      if (!produto || !produto.ativo) {
        const error = new Error('Produto não encontrado ou arquivado.');
        error.status = 404;
        throw error;
      }
      if (produto.tipo !== 'produto') {
        const error = new Error('Serviços não possuem saldo de estoque para movimentar.');
        error.status = 400;
        throw error;
      }
      if (tipo === 'saida' && produto.quantidade < qtd) {
        const error = new Error(`Estoque insuficiente. Disponível: ${produto.quantidade}.`);
        error.status = 409;
        throw error;
      }
      const delta = tipo === 'entrada' ? qtd : -qtd;
      await tx.run('UPDATE produtos SET quantidade = quantidade + ? WHERE id = ?', [delta, id]);
      const registro = await tx.run(
        'INSERT INTO estoque_mov (produto_id, funcionario_id, tipo, quantidade, observacao) VALUES (?, ?, ?, ?, ?)',
        [id, funcionario_id || null, tipo, qtd, observacao || null]
      );
      return { id: registro.lastID, nova_quantidade: produto.quantidade + delta };
    });
    res.status(201).json(movimento);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Erro ao movimentar estoque:', err.message);
    res.status(500).json({ error: 'Não foi possível registrar a movimentação do estoque.' });
  }
});

module.exports = router;