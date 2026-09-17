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
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

router.post('/', (req, res) => {
  const { cliente_id, funcionario_id, itens, valor_total, forma_pagamento } = req.body;
  db.run(
    `INSERT INTO vendas (cliente_id, funcionario_id, itens, valor_total, forma_pagamento) VALUES (?,?,?,?,?)`,
    [cliente_id, funcionario_id || null, JSON.stringify(itens || []), valor_total, forma_pagamento],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      const vendaId = this.lastID;

      db.run(
        `INSERT INTO financeiro (tipo, descricao, valor, referencia_tipo, referencia_id) VALUES (?,?,?,?,?)`,
        ['receita', 'Venda #' + vendaId, valor_total, 'venda', vendaId]
      );

      db.run(
        `INSERT INTO caixa (tipo, descricao, valor, forma_pagamento, parcelas) VALUES (?,?,?,?,?)`,
        ['entrada', 'Venda #' + vendaId, valor_total, forma_pagamento || null, 1]
      );

      res.json({ id: vendaId });
    }
  );
});

router.delete('/:id', (req, res) => {
  const vendaId = req.params.id;
  db.run('DELETE FROM financeiro WHERE referencia_tipo=? AND referencia_id=?', ['venda', vendaId]);
  db.run('DELETE FROM vendas WHERE id=?', [vendaId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deletado: this.changes });
  });
});

module.exports = router;