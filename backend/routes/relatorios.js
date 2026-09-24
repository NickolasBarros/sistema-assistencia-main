const express = require('express');
const router = express.Router();
const db = require('../database');

// ============================================
// RESUMO GERAL (mantido)
// ============================================

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

// ============================================
// LUCRO DIÁRIO
// ============================================

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

// ============================================
// DADOS DOS GRÁFICOS
// ============================================

router.get('/graficos', (req, res) => {
  const resultado = {
    formas_pagamento: [],
    lucro: { assistencia: 0, vendas: 0 },
    entregas_por_mes: [],
    top_produtos: []
  };

  // 1. Vendas por forma de pagamento (a partir do caixa)
  db.all(
    `SELECT
      COALESCE(forma_pagamento, 'Não informado') as forma,
      COALESCE(SUM(valor), 0) as total,
      COUNT(*) as quantidade
     FROM caixa
     WHERE tipo = 'entrada'
     GROUP BY forma_pagamento
     ORDER BY total DESC`,
    [],
    (err, formas) => {
      resultado.formas_pagamento = formas || [];

      // 2. Lucro: Assistência vs Vendas
      db.get("SELECT COALESCE(SUM(valor),0) as total FROM ordens WHERE status = 'Entregue'", [], (e2, r2) => {
        resultado.lucro.assistencia = r2?.total || 0;

        db.get("SELECT COALESCE(SUM(valor_total),0) as total FROM vendas", [], (e3, r3) => {
          resultado.lucro.vendas = r3?.total || 0;

          // 3. Entregas dos últimos 6 meses
          db.all(
            `SELECT
              strftime('%Y-%m', data_saida) as mes,
              COUNT(*) as quantidade,
              COALESCE(SUM(valor), 0) as total
             FROM ordens
             WHERE status = 'Entregue'
               AND data_saida >= date('now', '-6 months')
             GROUP BY strftime('%Y-%m', data_saida)
             ORDER BY mes ASC`,
            [],
            (e4, meses) => {
              resultado.entregas_por_mes = meses || [];

              // 4. Top 5 produtos mais vendidos (por quantidade vendida)
              db.all(
                `SELECT nome, SUM(quantidade) as total_qtd, SUM(preco * quantidade) as total_valor
                 FROM (
                   SELECT
                     json_extract(value, '$.nome') as nome,
                     json_extract(value, '$.quantidade') as quantidade,
                     json_extract(value, '$.preco') as preco
                   FROM vendas, json_each(vendas.itens)
                 )
                 GROUP BY nome
                 ORDER BY total_qtd DESC
                 LIMIT 5`,
                [],
                (e5, produtos) => {
                  resultado.top_produtos = produtos || [];
                  res.json(resultado);
                }
              );
            }
          );
        });
      });
    }
  );
});

// ============================================
// CALENDÁRIO ANUAL
// ============================================

router.get('/calendario', (req, res) => {
  const ano = parseInt(req.query.ano) || new Date().getFullYear();

  const resultado = {
    ano: ano,
    dias: {},           // 'YYYY-MM-DD' → { receitas, despesas, entregas, saldo }
    totais_mensais: {}, // 'YYYY-MM' → { receitas, despesas, entregas, saldo }
    totais_ano: { receitas: 0, despesas: 0, entregas: 0, saldo: 0 }
  };

  const inicio = `${ano}-01-01`;
  const fim = `${ano}-12-31`;

  // 1. Buscar movimentações financeiras do ano
  db.all(
    `SELECT
      date(data_mov) as dia,
      COALESCE(SUM(CASE WHEN tipo='receita' THEN valor ELSE 0 END),0) as receitas,
      COALESCE(SUM(CASE WHEN tipo='despesa' THEN valor ELSE 0 END),0) as despesas
     FROM financeiro
     WHERE date(data_mov) BETWEEN date(?) AND date(?)
     GROUP BY date(data_mov)`,
    [inicio, fim],
    (err, finRows) => {
      if (err) return res.status(500).json({ error: err.message });

      // 2. Buscar OS entregues no ano
      db.all(
        `SELECT
          date(data_saida) as dia,
          COUNT(*) as entregas,
          COALESCE(SUM(valor),0) as total_os
         FROM ordens
         WHERE status = 'Entregue'
           AND date(data_saida) BETWEEN date(?) AND date(?)
         GROUP BY date(data_saida)`,
        [inicio, fim],
        (err2, osRows) => {
          if (err2) return res.status(500).json({ error: err2.message });

          // Inicializa todos os dias do ano
          const diasNoAno = ehBissexto(ano) ? 366 : 365;
          const dataBase = new Date(ano, 0, 1);

          for (let i = 0; i < diasNoAno; i++) {
            const d = new Date(dataBase);
            d.setDate(d.getDate() + i);
            const key = formatarISO(d);
            resultado.dias[key] = { receitas: 0, despesas: 0, entregas: 0, saldo: 0 };
          }

          // Preenche receitas/despesas
          finRows.forEach(r => {
            if (resultado.dias[r.dia]) {
              resultado.dias[r.dia].receitas = r.receitas;
              resultado.dias[r.dia].despesas = r.despesas;
            }
          });

          // Preenche entregas
          osRows.forEach(r => {
            if (resultado.dias[r.dia]) {
              resultado.dias[r.dia].entregas = r.entregas;
            }
          });

          // Calcula saldo de cada dia
          Object.keys(resultado.dias).forEach(k => {
            const d = resultado.dias[k];
            d.saldo = d.receitas - d.despesas;
          });

          // Agrega por mês
          for (let mes = 1; mes <= 12; mes++) {
            const keyMes = `${ano}-${String(mes).padStart(2, '0')}`;
            resultado.totais_mensais[keyMes] = { receitas: 0, despesas: 0, entregas: 0, saldo: 0 };
          }

          Object.keys(resultado.dias).forEach(k => {
            const mes = k.substring(0, 7);
            const d = resultado.dias[k];
            if (resultado.totais_mensais[mes]) {
              resultado.totais_mensais[mes].receitas += d.receitas;
              resultado.totais_mensais[mes].despesas += d.despesas;
              resultado.totais_mensais[mes].entregas += d.entregas;
              resultado.totais_mensais[mes].saldo += d.saldo;
            }

            resultado.totais_ano.receitas += d.receitas;
            resultado.totais_ano.despesas += d.despesas;
            resultado.totais_ano.entregas += d.entregas;
            resultado.totais_ano.saldo += d.saldo;
          });

          res.json(resultado);
        }
      );
    }
  );
});

function ehBissexto(ano) {
  return (ano % 4 === 0 && ano % 100 !== 0) || (ano % 400 === 0);
}

function formatarISO(d) {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

module.exports = router;