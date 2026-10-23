const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  db.all(
    `SELECT p.*, f.nome as funcionario_nome,
            (SELECT id FROM midias m WHERE m.entidade_tipo = 'produto' AND m.entidade_id = p.id ORDER BY m.id LIMIT 1) as imagem_id
     FROM produtos p
     LEFT JOIN funcionarios f ON f.id = p.funcionario_id
     WHERE p.ativo = 1
     ORDER BY p.id DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Não foi possível carregar os produtos.' });
      res.json(rows);
    }
  );
});

router.post('/', async (req, res) => {
  const { nome, tipo, descricao, preco, quantidade, estoque_minimo, funcionario_id, imei, numero_serie } = req.body;
  const qtd = Number(quantidade || 0);
  if (!nome?.trim() || !['produto', 'servico'].includes(tipo)) return res.status(400).json({ error: 'Informe o nome e um tipo válido.' });
  if (!Number.isInteger(qtd) || qtd < 0) return res.status(400).json({ error: 'A quantidade em estoque deve ser um inteiro igual ou maior que zero.' });

  try {
    const produto = await db.transaction(async tx => {
      const inserido = await tx.run(
        `INSERT INTO produtos (nome, tipo, descricao, preco, quantidade, estoque_minimo, funcionario_id, imei, numero_serie)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [nome.trim(), tipo, descricao || null, Number(preco) || 0, qtd, Number(estoque_minimo) || 0, funcionario_id || null, imei || null, numero_serie || null]
      );
      if (tipo === 'produto' && qtd > 0) {
        await tx.run(
          `INSERT INTO estoque_mov (produto_id, tipo, quantidade, observacao)
           VALUES (?, 'entrada', ?, 'Estoque inicial do cadastro')`,
          [inserido.lastID, qtd]
        );
      }
      return inserido.lastID;
    });
    res.status(201).json({ id: produto });
  } catch (err) {
    console.error('Erro ao cadastrar produto:', err.message);
    res.status(500).json({ error: 'Não foi possível cadastrar o produto.' });
  }
});

router.put('/:id', async (req, res) => {
  const { nome, tipo, descricao, preco, quantidade, estoque_minimo, funcionario_id, imei, numero_serie } = req.body;
  const novaQtd = Number(quantidade);
  if (!nome?.trim() || !['produto', 'servico'].includes(tipo)) return res.status(400).json({ error: 'Informe o nome e um tipo válido.' });
  if (!Number.isInteger(novaQtd) || novaQtd < 0) return res.status(400).json({ error: 'A quantidade em estoque deve ser um inteiro igual ou maior que zero.' });

  try {
    const atualizado = await db.transaction(async tx => {
      const anterior = await tx.get('SELECT id, tipo, quantidade FROM produtos WHERE id = ?', [req.params.id]);
      if (!anterior) {
        const error = new Error('Produto não encontrado.');
        error.status = 404;
        throw error;
      }
      if (anterior.tipo !== tipo) {
        const movimentos = await tx.get('SELECT COUNT(*) AS total FROM estoque_mov WHERE produto_id = ?', [req.params.id]);
        const vendas = await tx.all('SELECT itens FROM vendas');
        const ordens = await tx.all('SELECT produtos_vendidos FROM ordens');
        const referenciado = vendas.some(venda => {
          try { return JSON.parse(venda.itens || '[]').some(item => Number(item.produto_id) === Number(req.params.id)); }
          catch { return true; }
        }) || ordens.some(ordem => {
          try { return JSON.parse(ordem.produtos_vendidos || '[]').some(item => Number(item.id || item.produto_id) === Number(req.params.id)); }
          catch { return true; }
        });
        if (Number(anterior.quantidade) > 0 || movimentos.total || referenciado) {
          const error = new Error('O tipo do produto não pode ser alterado após iniciar o controle de estoque ou registrar vendas/OS.');
          error.status = 409;
          throw error;
        }
      }
      await tx.run(
        `UPDATE produtos
         SET nome = ?, tipo = ?, descricao = ?, preco = ?, quantidade = ?, estoque_minimo = ?, funcionario_id = ?, imei = ?, numero_serie = ?
         WHERE id = ?`,
        [nome.trim(), tipo, descricao || null, Number(preco) || 0, novaQtd, Number(estoque_minimo) || 0, funcionario_id || null, imei || null, numero_serie || null, req.params.id]
      );
      const diferenca = tipo === 'produto' ? novaQtd - (anterior.tipo === 'produto' ? Number(anterior.quantidade) : 0) : 0;
      if (diferenca !== 0) {
        await tx.run(
          `INSERT INTO estoque_mov (produto_id, tipo, quantidade, observacao)
           VALUES (?, ?, ?, 'Ajuste de saldo pelo cadastro do produto')`,
          [req.params.id, diferenca > 0 ? 'entrada' : 'saida', Math.abs(diferenca)]
        );
      }
      return true;
    });
    res.json({ atualizado });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Erro ao atualizar produto:', err.message);
    res.status(500).json({ error: 'Não foi possível atualizar o produto.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const removido = await db.transaction(async tx => {
      const produto = await tx.get('SELECT id, quantidade, ativo FROM produtos WHERE id = ?', [req.params.id]);
      if (!produto) {
        const error = new Error('Produto não encontrado.');
        error.status = 404;
        throw error;
      }
      const movimentos = await tx.get('SELECT COUNT(*) AS total FROM estoque_mov WHERE produto_id = ?', [req.params.id]);
      const vendas = await tx.all('SELECT itens FROM vendas');
      const ordens = await tx.all('SELECT produtos_vendidos FROM ordens');
      const temHistoricoVenda = vendas.some(venda => {
        try { return JSON.parse(venda.itens || '[]').some(item => Number(item.produto_id) === Number(req.params.id)); }
        catch { return true; }
      });
      const temHistoricoOrdem = ordens.some(ordem => {
        try { return JSON.parse(ordem.produtos_vendidos || '[]').some(item => Number(item.id || item.produto_id) === Number(req.params.id)); }
        catch { return true; }
      });
      if (movimentos.total || temHistoricoVenda || temHistoricoOrdem) {
        if (produto.quantidade > 0) {
          const error = new Error('O produto ainda tem unidades em estoque. Registre a saída/baixa antes de arquivá-lo.');
          error.status = 409;
          throw error;
        }
        await tx.run('UPDATE produtos SET ativo = 0 WHERE id = ?', [req.params.id]);
        return { arquivado: true, midias: [] };
      }
      const midias = await tx.all("SELECT nome_arquivo FROM midias WHERE entidade_tipo = 'produto' AND entidade_id = ?", [req.params.id]);
      await tx.run("DELETE FROM midias WHERE entidade_tipo = 'produto' AND entidade_id = ?", [req.params.id]);
      await tx.run('DELETE FROM produtos WHERE id = ?', [req.params.id]);
      return { arquivado: false, midias };
    });

    const pastaImagens = path.join(
      process.env.UPLOADS_PATH || path.join(path.dirname(path.resolve(process.env.DATABASE_PATH || path.join(__dirname, '..', 'database.db'))), 'uploads'),
      'images'
    );
    for (const midia of removido.midias) {
      try { await fs.promises.unlink(path.join(pastaImagens, path.basename(midia.nome_arquivo))); }
      catch (err) {
        if (err.code !== 'ENOENT') console.error('Falha ao limpar imagem do produto excluído:', err.message);
      }
    }
    res.json({ deletado: removido.arquivado ? 0 : 1, arquivado: removido.arquivado });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Erro ao excluir produto:', err.message);
    res.status(500).json({ error: 'Não foi possível excluir o produto.' });
  }
});

module.exports = router;
