const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  db.all(
    `SELECT v.*, c.nome as cliente_nome, f.nome as funcionario_nome
     FROM vendas v
     LEFT JOIN clientes c ON c.id = v.cliente_id
     LEFT JOIN funcionarios f ON f.id = v.funcionario_id
     ORDER BY v.id DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Não foi possível carregar as vendas.' });
      res.json(rows);
    }
  );
});

router.post('/', async (req, res) => {
  const { cliente_id, funcionario_id, itens, forma_pagamento } = req.body;
  if (!Array.isArray(itens) || itens.length === 0 || itens.length > 100) {
    return res.status(400).json({ error: 'Adicione de 1 a 100 itens válidos à venda.' });
  }

  try {
    const venda = await db.transaction(async tx => {
      const itensValidados = [];
      const quantidadesProduto = new Map();
      let valorTotal = 0;

      for (const item of itens) {
        const produtoId = Number(item.produto_id);
        const quantidade = Number(item.quantidade);
        if (!Number.isInteger(produtoId) || produtoId < 1 || !Number.isInteger(quantidade) || quantidade < 1) {
          const error = new Error('Produto ou quantidade inválida na venda.');
          error.status = 400;
          throw error;
        }

        const produto = await tx.get('SELECT id, nome, tipo, preco, quantidade, ativo FROM produtos WHERE id = ?', [produtoId]);
        if (!produto) {
          const error = new Error(`Produto #${produtoId} não encontrado.`);
          error.status = 404;
          throw error;
        }
        if (!produto.ativo) {
          const error = new Error(`"${produto.nome}" está arquivado e não pode ser vendido.`);
          error.status = 409;
          throw error;
        }

        if (produto.tipo === 'produto') {
          const totalItem = (quantidadesProduto.get(produtoId) || 0) + quantidade;
          if (totalItem > produto.quantidade) {
            const error = new Error(`Estoque insuficiente para "${produto.nome}". Disponível: ${produto.quantidade}.`);
            error.status = 409;
            throw error;
          }
          quantidadesProduto.set(produtoId, totalItem);
        }

        const preco = Number(produto.preco) || 0;
        valorTotal += preco * quantidade;
        itensValidados.push({
          produto_id: produto.id,
          nome: produto.nome,
          tipo: produto.tipo,
          preco,
          quantidade,
          imei: item.imei || null,
          numero_serie: item.numero_serie || null
        });
      }

      const { lastID: vendaId } = await tx.run(
        `INSERT INTO vendas (cliente_id, funcionario_id, itens, valor_total, forma_pagamento)
         VALUES (?, ?, ?, ?, ?)`,
        [cliente_id || null, funcionario_id || null, JSON.stringify(itensValidados), valorTotal, forma_pagamento || null]
      );

      for (const [produtoId, quantidade] of quantidadesProduto) {
        const atualizacao = await tx.run(
          `UPDATE produtos SET quantidade = quantidade - ?
           WHERE id = ? AND tipo = 'produto' AND quantidade >= ?`,
          [quantidade, produtoId, quantidade]
        );
        if (atualizacao.changes !== 1) {
          const produto = await tx.get('SELECT nome, quantidade FROM produtos WHERE id = ?', [produtoId]);
          const error = new Error(`Estoque alterado durante a venda de "${produto?.nome || 'produto'}". Atualize a tela e tente novamente.`);
          error.status = 409;
          throw error;
        }
        await tx.run(
          `INSERT INTO estoque_mov (produto_id, tipo, quantidade, observacao)
           VALUES (?, 'saida', ?, ?)`,
          [produtoId, quantidade, `Venda #${vendaId}`]
        );
      }

      await tx.run(
        `INSERT INTO financeiro (tipo, descricao, valor, referencia_tipo, referencia_id)
         VALUES ('receita', ?, ?, 'venda', ?)`,
        [`Venda #${vendaId}`, valorTotal, vendaId]
      );
      await tx.run(
        `INSERT INTO caixa (tipo, descricao, valor, forma_pagamento, parcelas)
         VALUES ('entrada', ?, ?, ?, 1)`,
        [`Venda #${vendaId}`, valorTotal, forma_pagamento || null]
      );
      return { id: vendaId, valor_total: valorTotal };
    });

    res.status(201).json(venda);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Erro ao registrar venda:', err.message);
    res.status(500).json({ error: 'Não foi possível registrar a venda. Nenhuma alteração foi aplicada.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await db.transaction(async tx => {
      const venda = await tx.get('SELECT id, itens, valor_total FROM vendas WHERE id = ?', [req.params.id]);
      if (!venda) {
        const error = new Error('Venda não encontrada.');
        error.status = 404;
        throw error;
      }

      let itens;
      try {
        itens = JSON.parse(venda.itens || '[]');
      } catch {
        const error = new Error('Os itens da venda estão inconsistentes; não foi possível devolver o estoque automaticamente.');
        error.status = 409;
        throw error;
      }

      const devolucoes = new Map();
      for (const item of itens) {
        const quantidade = Number(item.quantidade);
        if (!Number.isInteger(quantidade) || quantidade < 1) {
          const error = new Error('A venda possui quantidades inconsistentes; nenhum dado foi alterado.');
          error.status = 409;
          throw error;
        }
        if (!item.produto_id) continue;
        const produto = await tx.get('SELECT id, tipo FROM produtos WHERE id = ?', [item.produto_id]);
        if (produto?.tipo === 'produto') {
          devolucoes.set(produto.id, (devolucoes.get(produto.id) || 0) + quantidade);
        }
      }

      for (const [produtoId, quantidade] of devolucoes) {
        await tx.run('UPDATE produtos SET quantidade = quantidade + ? WHERE id = ?', [quantidade, produtoId]);
        await tx.run(
          `INSERT INTO estoque_mov (produto_id, tipo, quantidade, observacao)
           VALUES (?, 'entrada', ?, ?)`,
          [produtoId, quantidade, `Estorno da venda #${venda.id}`]
        );
      }

      await tx.run('DELETE FROM financeiro WHERE referencia_tipo = ? AND referencia_id = ?', ['venda', venda.id]);
      await tx.run('DELETE FROM caixa WHERE descricao = ?', [`Venda #${venda.id}`]);
      await tx.run('DELETE FROM vendas WHERE id = ?', [venda.id]);
      return venda.id;
    });
    res.json({ deletado: deleted, estoque_reposto: true });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Erro ao excluir venda:', err.message);
    res.status(500).json({ error: 'Não foi possível excluir a venda e reverter suas movimentações.' });
  }
});

module.exports = router;
