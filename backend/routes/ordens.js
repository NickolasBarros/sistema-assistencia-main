const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  db.all(
    `SELECT o.*, c.nome as cliente_nome, f.nome as funcionario_nome
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

router.post('/', (req, res) => {
  const { cliente_id, funcionario_id, aparelho, marca, modelo, imei, numero_serie, defeito, servico_realizado, pecas_utilizadas, valor, status } = req.body;
  db.run(
    `INSERT INTO ordens (cliente_id, funcionario_id, aparelho, marca, modelo, imei, numero_serie, defeito, servico_realizado, pecas_utilizadas, valor, status, valor_pago, quitado)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,0)`,
    [cliente_id, funcionario_id, aparelho, marca, modelo, imei, numero_serie, defeito, servico_realizado, pecas_utilizadas, valor, status || 'Aberta'],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

router.put('/:id', (req, res) => {
  const { cliente_id, funcionario_id, aparelho, marca, modelo, imei, numero_serie, defeito, servico_realizado, pecas_utilizadas, valor, status } = req.body;
  const ordemId = req.params.id;

  db.run(
    `UPDATE ordens SET cliente_id=?, funcionario_id=?, aparelho=?, marca=?, modelo=?, imei=?, numero_serie=?, defeito=?, servico_realizado=?, pecas_utilizadas=?, valor=?, status=? WHERE id=?`,
    [cliente_id, funcionario_id, aparelho, marca, modelo, imei, numero_serie, defeito, servico_realizado, pecas_utilizadas, valor, status, ordemId],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ atualizado: this.changes });
    }
  );
});

// Listar pagamentos de uma OS
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

// Registrar um pagamento
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

// Excluir um pagamento
router.delete('/:id/pagamento/:pagamentoId', (req, res) => {
  const ordemId = req.params.id;
  const pagamentoId = req.params.pagamentoId;

  db.run('DELETE FROM os_pagamentos WHERE id=?', [pagamentoId], function (err) {
    if (err) return res.status(500).json({ error: err.message });

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

router.delete('/:id', (req, res) => {
  const ordemId = req.params.id;
  db.run('DELETE FROM os_pagamentos WHERE ordem_id=?', [ordemId]);
  db.run('DELETE FROM ordens WHERE id=?', [ordemId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deletado: this.changes });
  });
});

module.exports = router;