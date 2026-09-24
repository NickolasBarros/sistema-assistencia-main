const express = require('express');
const router = express.Router();
const db = require('../database');

// ============================================
// BUSCA GLOBAL
// ============================================

router.get('/', (req, res) => {
  const q = (req.query.q || '').trim();

  // Se digitar menos de 2 caracteres, não busca
  if (q.length < 2) {
    return res.json({
      clientes: [],
      produtos: [],
      ordens: [],
      vendas: [],
      funcionarios: []
    });
  }

  const like = '%' + q + '%';

  const results = {
    clientes: [],
    produtos: [],
    ordens: [],
    vendas: [],
    funcionarios: []
  };

  // Busca em paralelo
  db.all(
    'SELECT id, nome, telefone FROM clientes WHERE nome LIKE ? OR telefone LIKE ? OR cpf LIKE ? LIMIT 5',
    [like, like, like],
    (err, clientes) => {
      results.clientes = clientes || [];

      db.all(
        'SELECT id, nome, tipo, preco FROM produtos WHERE nome LIKE ? OR descricao LIKE ? OR imei LIKE ? LIMIT 5',
        [like, like, like],
        (err2, produtos) => {
          results.produtos = produtos || [];

          db.all(
            `SELECT o.id, o.aparelho, o.marca, o.imei, o.status, c.nome as cliente_nome
             FROM ordens o
             LEFT JOIN clientes c ON c.id = o.cliente_id
             WHERE o.aparelho LIKE ? OR o.imei LIKE ? OR o.numero_serie LIKE ?
                OR o.marca LIKE ? OR o.modelo LIKE ? OR c.nome LIKE ?
             LIMIT 5`,
            [like, like, like, like, like, like],
            (err3, ordens) => {
              results.ordens = ordens || [];

              db.all(
                `SELECT v.id, v.valor_total, v.forma_pagamento, c.nome as cliente_nome
                 FROM vendas v
                 LEFT JOIN clientes c ON c.id = v.cliente_id
                 WHERE c.nome LIKE ? OR v.forma_pagamento LIKE ?
                 LIMIT 5`,
                [like, like],
                (err4, vendas) => {
                  results.vendas = vendas || [];

                  db.all(
                    'SELECT id, nome, cargo FROM funcionarios WHERE nome LIKE ? OR cargo LIKE ? LIMIT 5',
                    [like, like],
                    (err5, funcionarios) => {
                      results.funcionarios = funcionarios || [];
                      res.json(results);
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});

module.exports = router;