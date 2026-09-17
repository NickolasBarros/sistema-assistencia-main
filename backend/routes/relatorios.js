const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/resumo', (req, res) => {
  const result = {};

  db.get('SELECT COUNT(*) as total FROM clientes', [], (e1, r1) => {
    result.clientes = r1?.total || 0;

    db.get("SELECT COUNT(*) as total FROM ordens WHERE status NOT IN ('Entregue', 'Cancelada')", [], (e2, r2) => {
      result.ordens_abertas = r2?.total || 0;

      db.get('SELECT COUNT(*) as total FROM ordens', [], (e3, r3) => {
        result.ordens_total = r3?.total || 0;

        db.get("SELECT COALESCE(SUM(valor_total),0) as total FROM vendas", [], (e4, r4) => {
          result.vendas_total = r4?.total || 0;

          db.get(
            "SELECT COALESCE(SUM(CASE WHEN tipo='receita' THEN valor ELSE 0 END),0) as receitas, COALESCE(SUM(CASE WHEN tipo='despesa' THEN valor ELSE 0 END),0) as despesas FROM financeiro",
            [],
            (e5, r5) => {
              result.receitas = r5?.receitas || 0;
              result.despesas = r5?.despesas || 0;
              result.saldo = (r5?.receitas || 0) - (r5?.despesas || 0);

              db.get("SELECT COALESCE(SUM(valor),0) as total FROM ordens WHERE status = 'Entregue'", [], (e6, r6) => {
                result.lucro_assistencia = r6?.total || 0;
                result.lucro_vendas = result.vendas_total;
                result.lucro_total = result.lucro_assistencia + result.lucro_vendas;

                db.get(
                  `SELECT
                    COALESCE(SUM(CASE WHEN tipo='entrada' THEN valor ELSE 0 END),0) as entradas,
                    COALESCE(SUM(CASE WHEN tipo='saida' THEN valor ELSE 0 END),0) as saidas
                   FROM caixa`,
                  [],
                  (e7, r7) => {
                    result.caixa_entradas = r7?.entradas || 0;
                    result.caixa_saidas = r7?.saidas || 0;
                    result.caixa_saldo = (r7?.entradas || 0) - (r7?.saidas || 0);

                    db.all(
                      'SELECT id, nome, quantidade, estoque_minimo FROM produtos WHERE tipo=? AND quantidade <= estoque_minimo',
                      ['produto'],
                      (e8, r8) => {
                        result.estoque_baixo = r8 || [];
                        res.json(result);
                      }
                    );
                  }
                );
              });
            }
          );
        });
      });
    });
  });
});

router.get('/lucro-diario', (req, res) => {
  const hoje = new Date().toISOString().slice(0, 10);

  db.get(
    "SELECT COALESCE(SUM(valor),0) as total FROM ordens WHERE status = 'Entregue' AND date(data_saida) = ?",
    [hoje],
    (e1, r1) => {
      const assistencia = r1?.total || 0;

      db.get(
        "SELECT COALESCE(SUM(valor_total),0) as total FROM vendas WHERE date(data_venda) = ?",
        [hoje],
        (e2, r2) => {
          const vendas = r2?.total || 0;
          res.json({
            assistencia,
            vendas,
            total: assistencia + vendas
          });
        }
      );
    }
  );
});

module.exports = router;