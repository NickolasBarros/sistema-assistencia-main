const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const db = require('../database');

function criarErro(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function calcularGarantia(dataSaida, dias = 180) {
  const base = dataSaida ? new Date(dataSaida) : new Date();
  base.setDate(base.getDate() + dias);
  return base.toISOString();
}

function lerProdutosOS(valor) {
  let produtos;
  try {
    produtos = JSON.parse(valor || '[]');
  } catch {
    throw criarErro(409, 'A lista de produtos desta OS está inconsistente; o estoque não foi alterado.');
  }
  if (!Array.isArray(produtos)) throw criarErro(409, 'A lista de produtos desta OS está inconsistente; o estoque não foi alterado.');
  return produtos;
}

function quantidadesPorProduto(produtos) {
  const quantidades = new Map();
  produtos.forEach(item => {
    const id = Number(item.id || item.produto_id);
    const quantidade = Number(item.quantidade);
    if (!Number.isInteger(id) || id < 1 || !Number.isInteger(quantidade) || quantidade < 1) {
      throw criarErro(400, 'Há um produto ou uma quantidade inválida na OS.');
    }
    quantidades.set(id, (quantidades.get(id) || 0) + quantidade);
  });
  return quantidades;
}

async function atualizarEstoqueOS(tx, ordemId, produtosAntigos, produtosNovos) {
  const antigas = quantidadesPorProduto(produtosAntigos);
  const novas = quantidadesPorProduto(produtosNovos);
  const ids = new Set([...antigas.keys(), ...novas.keys()]);

  for (const id of ids) {
    const produto = await tx.get('SELECT id, nome, tipo, quantidade, ativo FROM produtos WHERE id = ?', [id]);
    const antiga = antigas.get(id) || 0;
    const nova = novas.get(id) || 0;
    if (!produto) {
      if (antiga || nova) throw criarErro(409, `O produto #${id} desta OS não está mais disponível no catálogo.`);
      continue;
    }
    if (produto.tipo !== 'produto') continue;

    const delta = antiga - nova;
    if (delta === 0) continue;
    if (delta < 0) {
      const saida = Math.abs(delta);
      if (!produto.ativo || Number(produto.quantidade) < saida) {
        throw criarErro(409, `Estoque insuficiente para "${produto.nome}". Disponível: ${produto.quantidade}.`);
      }
      const alterado = await tx.run(
        `UPDATE produtos SET quantidade = quantidade - ?
         WHERE id = ? AND ativo = 1 AND quantidade >= ?`,
        [saida, id, saida]
      );
      if (alterado.changes !== 1) throw criarErro(409, `Estoque de "${produto.nome}" mudou. Atualize os dados e tente novamente.`);
      await tx.run(
        `INSERT INTO estoque_mov (produto_id, tipo, quantidade, observacao)
         VALUES (?, 'saida', ?, ?)`,
        [id, saida, `Peça usada na OS #${ordemId}`]
      );
    } else {
      await tx.run('UPDATE produtos SET quantidade = quantidade + ? WHERE id = ?', [delta, id]);
      await tx.run(
        `INSERT INTO estoque_mov (produto_id, tipo, quantidade, observacao)
         VALUES (?, 'entrada', ?, ?)`,
        [id, delta, `Devolução de peça da OS #${ordemId}`]
      );
    }
  }
}

function responderErro(res, err, contexto) {
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error(`${contexto}:`, err.message);
  return res.status(500).json({ error: 'Não foi possível concluir a operação. Nenhuma alteração parcial foi aplicada.' });
}

router.get('/', (req, res) => {
  db.all(
    `SELECT o.*, c.nome as cliente_nome, c.telefone as cliente_telefone,
            f.nome as funcionario_nome,
            (SELECT COUNT(*) FROM midias m WHERE m.entidade_tipo = 'ordem' AND m.entidade_id = o.id) as total_imagens
     FROM ordens o
     LEFT JOIN clientes c ON c.id = o.cliente_id
     LEFT JOIN funcionarios f ON f.id = o.funcionario_id
     ORDER BY o.id DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Não foi possível carregar as ordens de serviço.' });
      res.json(rows);
    }
  );
});

router.post('/', async (req, res) => {
  const {
    cliente_id, funcionario_id, aparelho, marca, modelo, imei, numero_serie,
    defeito, servico_realizado, pecas_utilizadas, mao_de_obra, produtos_vendidos,
    valor, status, data_saida
  } = req.body;
  const clienteId = Number(cliente_id);
  const total = Number(valor || 0);
  if (!Number.isInteger(clienteId) || clienteId < 1) return res.status(400).json({ error: 'Selecione um cliente para abrir a OS.' });
  if (!Number.isFinite(total) || total < 0) return res.status(400).json({ error: 'O valor total da OS é inválido.' });

  let produtosNovos;
  try { produtosNovos = lerProdutosOS(produtos_vendidos); }
  catch (err) { return res.status(err.status).json({ error: err.message }); }

  const estado = status || 'Aberta';
  let dataSaidaFinal = null;
  let garantiaAte = null;
  if (estado === 'Entregue') {
    dataSaidaFinal = data_saida ? new Date(data_saida + 'T12:00:00').toISOString() : new Date().toISOString();
    garantiaAte = calcularGarantia(dataSaidaFinal, 180);
  }

  try {
    const ordem = await db.transaction(async tx => {
      const cliente = await tx.get('SELECT id FROM clientes WHERE id = ?', [clienteId]);
      if (!cliente) throw criarErro(404, 'Cliente não encontrado. Cadastre ou selecione um cliente válido.');
      const inserido = await tx.run(
        `INSERT INTO ordens
         (cliente_id, funcionario_id, aparelho, marca, modelo, imei, numero_serie, defeito, servico_realizado,
          pecas_utilizadas, mao_de_obra, produtos_vendidos, valor, status, valor_pago, quitado, data_saida, garantia_ate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
        [
          clienteId, funcionario_id || null, aparelho || null, marca || null, modelo || null, imei || null,
          numero_serie || null, defeito || null, servico_realizado || null, pecas_utilizadas || null,
          mao_de_obra || '[]', JSON.stringify(produtosNovos), total, estado, dataSaidaFinal, garantiaAte
        ]
      );
      await atualizarEstoqueOS(tx, inserido.lastID, [], estado === 'Cancelada' ? [] : produtosNovos);
      await tx.run(
        'INSERT INTO os_status_historico (ordem_id, status_anterior, status_novo, alterado_por) VALUES (?, ?, ?, ?)',
        [inserido.lastID, null, estado, req.auth?.nome || null]
      );
      return inserido.lastID;
    });
    res.status(201).json({ id: ordem });
  } catch (err) {
    responderErro(res, err, 'Erro ao criar ordem de serviço');
  }
});

router.put('/:id', async (req, res) => {
  const {
    cliente_id, funcionario_id, aparelho, marca, modelo, imei, numero_serie,
    defeito, servico_realizado, pecas_utilizadas, mao_de_obra, produtos_vendidos,
    valor, status, data_saida
  } = req.body;
  const clienteId = Number(cliente_id);
  const total = Number(valor || 0);
  if (!Number.isInteger(clienteId) || clienteId < 1) return res.status(400).json({ error: 'Selecione um cliente para a OS.' });
  if (!Number.isFinite(total) || total < 0) return res.status(400).json({ error: 'O valor total da OS é inválido.' });

  let produtosNovos;
  try { produtosNovos = lerProdutosOS(produtos_vendidos); }
  catch (err) { return res.status(err.status).json({ error: err.message }); }

  try {
    await db.transaction(async tx => {
      const antiga = await tx.get('SELECT * FROM ordens WHERE id = ?', [req.params.id]);
      if (!antiga) throw criarErro(404, 'OS não encontrada.');
      const cliente = await tx.get('SELECT id FROM clientes WHERE id = ?', [clienteId]);
      if (!cliente) throw criarErro(404, 'Cliente não encontrado.');
      if (total < Number(antiga.valor_pago || 0)) {
        throw criarErro(409, 'O valor total não pode ficar menor que o valor já pago nesta OS.');
      }

      let dataSaidaFinal = antiga.data_saida;
      let garantiaAte = antiga.garantia_ate;
      if (status === 'Entregue') {
        const baseData = data_saida
          ? new Date(data_saida + 'T12:00:00')
          : antiga.status === 'Entregue' && antiga.data_saida
            ? new Date(antiga.data_saida)
            : new Date();
        dataSaidaFinal = baseData.toISOString();
        garantiaAte = calcularGarantia(dataSaidaFinal, 180);
      } else if (status && status !== 'Entregue' && antiga.status === 'Entregue') {
        dataSaidaFinal = null;
        garantiaAte = null;
      }

      await tx.run(
        `UPDATE ordens
         SET cliente_id = ?, funcionario_id = ?, aparelho = ?, marca = ?, modelo = ?, imei = ?, numero_serie = ?,
             defeito = ?, servico_realizado = ?, pecas_utilizadas = ?, mao_de_obra = ?, produtos_vendidos = ?,
             valor = ?, status = ?, data_saida = ?, garantia_ate = ?
         WHERE id = ?`,
        [
          clienteId, funcionario_id || null, aparelho || null, marca || null, modelo || null, imei || null,
          numero_serie || null, defeito || null, servico_realizado || null, pecas_utilizadas || null,
          mao_de_obra || '[]', JSON.stringify(produtosNovos), total, status || antiga.status,
          dataSaidaFinal, garantiaAte, req.params.id
        ]
      );
      const novoStatus = status || antiga.status;
      if (novoStatus !== antiga.status) {
        await tx.run(
          'INSERT INTO os_status_historico (ordem_id, status_anterior, status_novo, alterado_por) VALUES (?, ?, ?, ?)',
          [req.params.id, antiga.status, novoStatus, req.auth?.nome || null]
        );
      }
      const produtosAntigos = antiga.status === 'Cancelada' ? [] : lerProdutosOS(antiga.produtos_vendidos);
      const produtosAtuais = novoStatus === 'Cancelada' ? [] : produtosNovos;
      await atualizarEstoqueOS(tx, Number(req.params.id), produtosAntigos, produtosAtuais);
      const pago = Number(antiga.valor_pago || 0);
      await tx.run('UPDATE ordens SET quitado = ? WHERE id = ?', [pago >= total ? 1 : 0, req.params.id]);
    });
    res.json({ atualizado: 1 });
  } catch (err) {
    responderErro(res, err, 'Erro ao atualizar ordem de serviço');
  }
});

router.get('/:id/pagamentos', (req, res) => {
  db.all('SELECT * FROM os_pagamentos WHERE ordem_id = ? ORDER BY id DESC', [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Não foi possível carregar os pagamentos da OS.' });
    res.json(rows);
  });
});

router.get('/:id/historico', (req, res) => {
  db.get('SELECT id FROM ordens WHERE id = ?', [req.params.id], (ordemErr, ordem) => {
    if (ordemErr) return res.status(500).json({ error: 'Não foi possível validar a ordem de serviço.' });
    if (!ordem) return res.status(404).json({ error: 'OS não encontrada.' });
    db.all(
      'SELECT id, status_anterior, status_novo, alterado_por, criado_em FROM os_status_historico WHERE ordem_id = ? ORDER BY id ASC',
      [req.params.id],
      (err, rows) => {
        if (err) return res.status(500).json({ error: 'Não foi possível carregar a linha do tempo da OS.' });
        res.json(rows);
      }
    );
  });
});

router.post('/:id/pagamento', async (req, res) => {
  const valor = Number(req.body.valor);
  const forma = req.body.forma_pagamento || null;
  const parcelas = Number(req.body.parcelas) || 1;
  if (!Number.isFinite(valor) || valor <= 0) return res.status(400).json({ error: 'Informe um valor de pagamento maior que zero.' });
  if (!Number.isInteger(parcelas) || parcelas < 1) return res.status(400).json({ error: 'Quantidade de parcelas inválida.' });

  try {
    const pagamento = await db.transaction(async tx => {
      const ordem = await tx.get('SELECT valor, valor_pago FROM ordens WHERE id = ?', [req.params.id]);
      if (!ordem) throw criarErro(404, 'OS não encontrada.');
      const valorPago = Number(ordem.valor_pago || 0);
      const saldo = Math.max(0, Number(ordem.valor || 0) - valorPago);
      if (valor > saldo + 0.000001) throw criarErro(409, `O pagamento excede o saldo da OS (${saldo.toFixed(2)}).`);

      const inserido = await tx.run(
        'INSERT INTO os_pagamentos (ordem_id, valor, forma_pagamento, parcelas, observacao) VALUES (?, ?, ?, ?, ?)',
        [req.params.id, valor, forma, parcelas, req.body.observacao || null]
      );
      const totalPago = valorPago + valor;
      await tx.run('UPDATE ordens SET valor_pago = ?, quitado = ? WHERE id = ?', [totalPago, totalPago >= Number(ordem.valor || 0) ? 1 : 0, req.params.id]);
      await tx.run(
        'INSERT INTO caixa (tipo, descricao, valor, forma_pagamento, parcelas) VALUES (?, ?, ?, ?, ?)',
        ['entrada', `Pagamento OS #${req.params.id} - #${inserido.lastID}`, valor, forma, parcelas]
      );
      await tx.run(
        'INSERT INTO financeiro (tipo, descricao, valor, referencia_tipo, referencia_id) VALUES (?, ?, ?, ?, ?)',
        ['receita', `Pagamento OS #${req.params.id}`, valor, 'ordem_pagamento', inserido.lastID]
      );
      return { id: inserido.lastID, valor_pago: totalPago, quitado: totalPago >= Number(ordem.valor || 0) };
    });
    res.status(201).json(pagamento);
  } catch (err) {
    responderErro(res, err, 'Erro ao registrar pagamento da OS');
  }
});

router.delete('/:id/pagamento/:pagamentoId', async (req, res) => {
  try {
    await db.transaction(async tx => {
      const pagamento = await tx.get('SELECT * FROM os_pagamentos WHERE id = ? AND ordem_id = ?', [req.params.pagamentoId, req.params.id]);
      if (!pagamento) throw criarErro(404, 'Pagamento não encontrado nesta OS.');
      await tx.run('DELETE FROM financeiro WHERE referencia_tipo = ? AND referencia_id = ?', ['ordem_pagamento', pagamento.id]);
      const lancamentoCaixa = await tx.get(
        'SELECT id FROM caixa WHERE descricao = ?',
        [`Pagamento OS #${req.params.id} - #${pagamento.id}`]
      ) || await tx.get(
        'SELECT id FROM caixa WHERE descricao = ? AND valor = ? ORDER BY id DESC LIMIT 1',
        [`Pagamento OS #${req.params.id}`, pagamento.valor]
      );
      if (lancamentoCaixa) await tx.run('DELETE FROM caixa WHERE id = ?', [lancamentoCaixa.id]);
      await tx.run('DELETE FROM os_pagamentos WHERE id = ?', [pagamento.id]);
      const soma = await tx.get('SELECT COALESCE(SUM(valor), 0) AS total FROM os_pagamentos WHERE ordem_id = ?', [req.params.id]);
      const ordem = await tx.get('SELECT valor FROM ordens WHERE id = ?', [req.params.id]);
      if (!ordem) throw criarErro(404, 'OS não encontrada.');
      await tx.run('UPDATE ordens SET valor_pago = ?, quitado = ? WHERE id = ?', [soma.total, soma.total >= Number(ordem.valor || 0) ? 1 : 0, req.params.id]);
    });
    res.json({ deletado: 1 });
  } catch (err) {
    responderErro(res, err, 'Erro ao excluir pagamento da OS');
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const arquivos = await db.transaction(async tx => {
      const ordem = await tx.get('SELECT id, status, produtos_vendidos FROM ordens WHERE id = ?', [req.params.id]);
      if (!ordem) throw criarErro(404, 'OS não encontrada.');
      const produtosUtilizados = ordem.status === 'Cancelada' ? [] : lerProdutosOS(ordem.produtos_vendidos);
      await atualizarEstoqueOS(tx, Number(req.params.id), produtosUtilizados, []);
      await tx.run(
        `DELETE FROM financeiro
         WHERE (referencia_tipo = 'ordem' AND referencia_id = ?)
            OR (referencia_tipo = 'ordem_pagamento' AND referencia_id IN
                (SELECT id FROM os_pagamentos WHERE ordem_id = ?))`,
        [req.params.id, req.params.id]
      );
      await tx.run('DELETE FROM caixa WHERE descricao LIKE ?', [`Pagamento OS #${req.params.id}%`]);
      await tx.run('DELETE FROM caixa WHERE descricao LIKE ?', [`OS #${req.params.id} - %`]);
      await tx.run('DELETE FROM os_pagamentos WHERE ordem_id = ?', [req.params.id]);
      await tx.run('DELETE FROM os_status_historico WHERE ordem_id = ?', [req.params.id]);
      const midias = await tx.all("SELECT nome_arquivo FROM midias WHERE entidade_tipo = 'ordem' AND entidade_id = ?", [req.params.id]);
      await tx.run("DELETE FROM midias WHERE entidade_tipo = 'ordem' AND entidade_id = ?", [req.params.id]);
      await tx.run('DELETE FROM ordens WHERE id = ?', [req.params.id]);
      return midias;
    });
    const pastaImagens = path.join(
      process.env.UPLOADS_PATH || path.join(path.dirname(path.resolve(process.env.DATABASE_PATH || path.join(__dirname, '..', 'database.db'))), 'uploads'),
      'images'
    );
    for (const arquivo of arquivos) {
      try { await fs.promises.unlink(path.join(pastaImagens, path.basename(arquivo.nome_arquivo))); }
      catch (err) {
        if (err.code !== 'ENOENT') console.error('Falha ao limpar imagem de OS excluída:', err.message);
      }
    }
    res.json({ deletado: 1, estoque_reposto: true });
  } catch (err) {
    responderErro(res, err, 'Erro ao excluir ordem de serviço');
  }
});

module.exports = router;
