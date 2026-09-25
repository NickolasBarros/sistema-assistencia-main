const express = require('express');
const router = express.Router();
const db = require('../database');

// ============================================
// LISTAR
// ============================================

router.get('/', (req, res) => {
  db.all(
    `SELECT o.*, c.nome as cliente_nome, c.telefone as cliente_telefone,
            f.nome as funcionario_nome
     FROM ordens o
     LEFT JOIN clientes c ON c.id = o.cliente_id
     LEFT JOIN funcionarios f ON f.id = o.funcionario_id
     ORDER BY o.id DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// ============================================
// CRIAR OS
// ============================================

router.post('/', (req, res) => {
  const { cliente_id, funcionario_id, aparelho, marca, modelo, imei, numero_serie, defeito, servico_realizado, pecas_utilizadas, valor, status } = req.body;

  const st = status || 'Aberta';
  let data_saida = null;
  let garantia_ate = null;

   if (st === 'Entregue') {
    data_saida = new Date().toISOString();
    const g = new Date();
    g.setDate(g.getDate() + 180);   // 180 dias = 6 meses (padrão)
    garantia_ate = g.toISOString();
  }

  db.run(
    `INSERT INTO ordens (cliente_id, funcionario_id, aparelho, marca, modelo, imei, numero_serie, defeito, servico_realizado, pecas_utilizadas, valor, status, valor_pago, quitado, data_saida, garantia_ate)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,0,?,?)`,
    [cliente_id, funcionario_id, aparelho, marca, modelo, imei, numero_serie, defeito, servico_realizado, pecas_utilizadas, valor, st, data_saida, garantia_ate],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      const ordemId = this.lastID;

      // Se já criou como "Entregue" e tem valor → lança no caixa e financeiro
      if (st === 'Entregue' && valor > 0) {
        db.run(
          `INSERT INTO caixa (tipo, descricao, valor, forma_pagamento, parcelas)
           VALUES (?,?,?,?,?)`,
          ['entrada', 'OS #' + ordemId + ' - ' + (aparelho || 'Serviço'), valor, 'Dinheiro', 1]
        );
        db.run(
          `INSERT INTO financeiro (tipo, descricao, valor, referencia_tipo, referencia_id)
           VALUES (?,?,?,?,?)`,
          ['receita', 'OS #' + ordemId + ' - ' + (aparelho || 'Serviço'), valor, 'ordem', ordemId]
        );
      }

      res.json({ id: ordemId });
    }
  );
});

// ============================================
// ATUALIZAR OS
// ============================================

router.put('/:id', (req, res) => {
  const { cliente_id, funcionario_id, aparelho, marca, modelo, imei, numero_serie, defeito, servico_realizado, pecas_utilizadas, valor, status } = req.body;
  const ordemId = req.params.id;

  db.get('SELECT status, data_saida, garantia_ate, valor FROM ordens WHERE id=?', [ordemId], (err, antiga) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!antiga) return res.status(404).json({ error: 'OS não encontrada' });

    let data_saida = antiga.data_saida;
    let garantia_ate = antiga.garantia_ate;

    // Mudou PARA Entregue
    if (status === 'Entregue' && antiga.status !== 'Entregue') {
      const agora = new Date();
      const fim = new Date();
      fim.setDate(fim.getDate() + 180);
      data_saida = agora.toISOString();
      garantia_ate = fim.toISOString();
    }

    // Saiu de Entregue
    if (status !== 'Entregue' && antiga.status === 'Entregue') {
      data_saida = null;
      garantia_ate = null;
    }

    db.run(
      `UPDATE ordens SET cliente_id=?, funcionario_id=?, aparelho=?, marca=?, modelo=?, imei=?, numero_serie=?, defeito=?, servico_realizado=?, pecas_utilizadas=?, valor=?, status=?, data_saida=?, garantia_ate=? WHERE id=?`,
      [cliente_id, funcionario_id, aparelho, marca, modelo, imei, numero_serie, defeito, servico_realizado, pecas_utilizadas, valor, status, data_saida, garantia_ate, ordemId],
      function (err2) {
        if (err2) return res.status(500).json({ error: err2.message });

        // Mudou PARA Entregue → lança no caixa/financeiro (só se ainda não tiver)
        if (status === 'Entregue' && antiga.status !== 'Entregue') {
          db.get(
            'SELECT COUNT(*) as total FROM os_pagamentos WHERE ordem_id=?',
            [ordemId],
            (err3, row) => {
              const temPagamento = (row?.total || 0) > 0;
              const valorLancar = valor || 0;

              // Se NÃO tem nenhum pagamento registrado e tem valor → lança
              if (!temPagamento && valorLancar > 0) {
                db.run(
                  `INSERT INTO caixa (tipo, descricao, valor, forma_pagamento, parcelas)
                   VALUES (?,?,?,?,?)`,
                  ['entrada', 'OS #' + ordemId + ' - ' + (aparelho || 'Serviço'), valorLancar, 'Dinheiro', 1]
                );
                db.run(
                  `INSERT INTO financeiro (tipo, descricao, valor, referencia_tipo, referencia_id)
                   VALUES (?,?,?,?,?)`,
                  ['receita', 'OS #' + ordemId + ' - ' + (aparelho || 'Serviço'), valorLancar, 'ordem', ordemId]
                );
              }
            }
          );
        }

        // Saiu de Entregue → remove lançamentos vinculados
        if (status !== 'Entregue' && antiga.status === 'Entregue') {
          db.run(`DELETE FROM caixa WHERE descricao LIKE ?`, ['OS #' + ordemId + ' - %']);
          db.run(`DELETE FROM financeiro WHERE referencia_tipo='ordem' AND referencia_id=?`, [ordemId]);
        }

        res.json({ atualizado: this.changes });
      }
    );
  });
});

// ============================================
// PAGAMENTOS
// ============================================

router.get('/:id/pagamentos', (req, res) => {
  db.all(
    'SELECT * FROM os_pagamentos WHERE ordem_id = ? ORDER BY id DESC',
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

router.post('/:id/pagamento', (req, res) => {
  const ordemId = req.params.id;
  const { valor, forma_pagamento, parcelas, observacao } = req.body;

  if (!valor || valor <= 0) {
    return res.status(400).json({ error: 'Valor inválido' });
  }

  db.get('SELECT valor, valor_pago FROM ordens WHERE id=?', [ordemId], (err, ordem) => {
    if (err || !ordem) return res.status(404).json({ error: 'OS não encontrada' });

    const valorPagoAtual = ordem.valor_pago || 0;
    const novoValorPago = valorPagoAtual + valor;
    const valorTotal = ordem.valor || 0;
    const quitado = novoValorPago >= valorTotal ? 1 : 0;

    db.run(
      `INSERT INTO os_pagamentos (ordem_id, valor, forma_pagamento, parcelas, observacao)
       VALUES (?,?,?,?,?)`,
      [ordemId, valor, forma_pagamento || null, parcelas || 1, observacao || null],
      function (err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        const pagamentoId = this.lastID;

        db.run(
          'UPDATE ordens SET valor_pago=?, quitado=? WHERE id=?',
          [novoValorPago, quitado, ordemId]
        );

        db.run(
          `INSERT INTO caixa (tipo, descricao, valor, forma_pagamento, parcelas)
           VALUES (?,?,?,?,?)`,
          ['entrada', 'Pagamento OS #' + ordemId, valor, forma_pagamento || null, parcelas || 1]
        );

        db.run(
          `INSERT INTO financeiro (tipo, descricao, valor, referencia_tipo, referencia_id)
           VALUES (?,?,?,?,?)`,
          ['receita', 'Pagamento OS #' + ordemId, valor, 'ordem_pagamento', pagamentoId]
        );

        res.json({
          id: pagamentoId,
          valor_pago: novoValorPago,
          quitado: quitado === 1
        });
      }
    );
  });
});

router.delete('/:id/pagamento/:pagamentoId', (req, res) => {
  const ordemId = req.params.id;
  const pagamentoId = req.params.pagamentoId;

  db.get('SELECT valor FROM os_pagamentos WHERE id=?', [pagamentoId], (err, pgto) => {
    if (err || !pgto) return res.status(404).json({ error: 'Pagamento não encontrado' });

    db.run('DELETE FROM os_pagamentos WHERE id=?', [pagamentoId], function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });

      // Remove do caixa o lançamento deste pagamento
      db.run(
        "DELETE FROM caixa WHERE tipo='entrada' AND descricao=? AND valor=?",
        ['Pagamento OS #' + ordemId, pgto.valor]
      );

      // Remove do financeiro
      db.run(
        "DELETE FROM financeiro WHERE referencia_tipo='ordem_pagamento' AND referencia_id=?",
        [pagamentoId]
      );

      // Recalcula valor pago
      db.get('SELECT COALESCE(SUM(valor),0) as total FROM os_pagamentos WHERE ordem_id=?', [ordemId], (err3, soma) => {
        const novoPago = soma?.total || 0;
        db.get('SELECT valor FROM ordens WHERE id=?', [ordemId], (err4, ordem) => {
          const quitado = novoPago >= (ordem?.valor || 0) ? 1 : 0;
          db.run('UPDATE ordens SET valor_pago=?, quitado=? WHERE id=?', [novoPago, quitado, ordemId]);
        });
      });

      res.json({ deletado: this.changes });
    });
  });
});

// ============================================
// EXCLUIR OS
// ============================================

router.delete('/:id', (req, res) => {
  const ordemId = req.params.id;

  // Remove tudo vinculado
  db.run('DELETE FROM os_pagamentos WHERE ordem_id=?', [ordemId]);
  db.run("DELETE FROM financeiro WHERE referencia_tipo='ordem' AND referencia_id=?", [ordemId]);
  db.run("DELETE FROM financeiro WHERE referencia_tipo='ordem_pagamento' AND referencia_id IN (SELECT id FROM os_pagamentos WHERE ordem_id=?)", [ordemId]);
  db.run("DELETE FROM caixa WHERE descricao LIKE ?", ['OS #' + ordemId + ' - %']);
  db.run("DELETE FROM caixa WHERE descricao LIKE ?", ['Pagamento OS #' + ordemId + '%']);

  db.run('DELETE FROM ordens WHERE id=?', [ordemId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deletado: this.changes });
  });
});

module.exports = router;