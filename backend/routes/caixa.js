const express = require('express');
const router = express.Router();
const db = require('../database');

// ============================================
// MOVIMENTAÇÕES
// ============================================

router.get('/', (req, res) => {
  db.all('SELECT * FROM caixa ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/saldo', (req, res) => {
  db.get(
    `SELECT
      COALESCE(SUM(CASE WHEN tipo='entrada' THEN valor ELSE 0 END),0) as entradas,
      COALESCE(SUM(CASE WHEN tipo='saida' THEN valor ELSE 0 END),0) as saidas
     FROM caixa`,
    [],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      const entradas = row?.entradas || 0;
      const saidas = row?.saidas || 0;
      res.json({ entradas, saidas, saldo: entradas - saidas });
    }
  );
});

router.get('/resumo-pagamentos', (req, res) => {
  db.all(
    `SELECT
      COALESCE(forma_pagamento, 'Não informado') as forma_pagamento,
      COUNT(*) as quantidade,
      SUM(valor) as total,
      COALESCE(SUM(CASE WHEN parcelas > 1 THEN 1 ELSE 0 END), 0) as com_parcelas
     FROM caixa
     WHERE tipo = 'entrada'
     GROUP BY forma_pagamento`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

router.post('/', (req, res) => {
  const { tipo, descricao, valor, forma_pagamento, parcelas } = req.body;
  db.run(
    'INSERT INTO caixa (tipo, descricao, valor, forma_pagamento, parcelas) VALUES (?,?,?,?,?)',
    [tipo, descricao, valor, forma_pagamento || null, parcelas || 1],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

router.delete('/:id', (req, res) => {
  db.run('DELETE FROM caixa WHERE id=?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deletado: this.changes });
  });
});

// ============================================
// SESSÕES (ABRIR / FECHAR CAIXA)
// ============================================

// Status atual: retorna a sessão aberta, ou null
router.get('/sessao-atual', (req, res) => {
  db.get(
    "SELECT * FROM caixa_sessoes WHERE status = 'aberto' ORDER BY id DESC LIMIT 1",
    [],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });

      if (!row) {
        return res.json({ aberto: false });
      }

      // Calcula o esperado até agora
      db.get(
        `SELECT
          COALESCE(SUM(CASE WHEN tipo='entrada' THEN valor ELSE 0 END),0) as entradas,
          COALESCE(SUM(CASE WHEN tipo='saida' THEN valor ELSE 0 END),0) as saidas
         FROM caixa
         WHERE data_mov >= ?`,
        [row.data_abertura],
        (err2, somas) => {
          if (err2) return res.status(500).json({ error: err2.message });

          const entradas = somas?.entradas || 0;
          const saidas = somas?.saidas || 0;
          const esperado = (row.valor_inicial || 0) + entradas - saidas;

          res.json({
            aberto: true,
            sessao: row,
            resumo: {
              valor_inicial: row.valor_inicial || 0,
              entradas,
              saidas,
              esperado
            }
          });
        }
      );
    }
  );
});

// Abrir caixa
router.post('/abrir', (req, res) => {
  const { valor_inicial, observacao } = req.body;

  // Verifica se já tem caixa aberto
  db.get(
    "SELECT id FROM caixa_sessoes WHERE status = 'aberto' LIMIT 1",
    [],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (row) return res.status(400).json({ error: 'Já existe um caixa aberto' });

      db.run(
        "INSERT INTO caixa_sessoes (valor_inicial, observacao, status) VALUES (?,?, 'aberto')",
        [valor_inicial || 0, observacao || null],
        function (err2) {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json({ id: this.lastID });
        }
      );
    }
  );
});

// Fechar caixa
router.post('/fechar', (req, res) => {
  const { valor_contado, observacao } = req.body;

  db.get(
    "SELECT * FROM caixa_sessoes WHERE status = 'aberto' ORDER BY id DESC LIMIT 1",
    [],
    (err, sessao) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!sessao) return res.status(400).json({ error: 'Não há caixa aberto' });

      // Calcula o esperado
      db.get(
        `SELECT
          COALESCE(SUM(CASE WHEN tipo='entrada' THEN valor ELSE 0 END),0) as entradas,
          COALESCE(SUM(CASE WHEN tipo='saida' THEN valor ELSE 0 END),0) as saidas
         FROM caixa
         WHERE data_mov >= ?`,
        [sessao.data_abertura],
        (err2, somas) => {
          if (err2) return res.status(500).json({ error: err2.message });

          const entradas = somas?.entradas || 0;
          const saidas = somas?.saidas || 0;
          const esperado = (sessao.valor_inicial || 0) + entradas - saidas;
          const contado = parseFloat(valor_contado) || 0;
          const diferenca = contado - esperado;

          db.run(
            `UPDATE caixa_sessoes
             SET data_fechamento = CURRENT_TIMESTAMP,
                 valor_contado = ?,
                 valor_esperado = ?,
                 diferenca = ?,
                 observacao = ?,
                 status = 'fechado'
             WHERE id = ?`,
            [contado, esperado, diferenca, observacao || null, sessao.id],
            function (err3) {
              if (err3) return res.status(500).json({ error: err3.message });
              res.json({
                id: sessao.id,
                valor_inicial: sessao.valor_inicial,
                entradas,
                saidas,
                esperado,
                contado,
                diferenca
              });
            }
          );
        }
      );
    }
  );
});

// Histórico de sessões fechadas
router.get('/historico', (req, res) => {
  db.all(
    "SELECT * FROM caixa_sessoes WHERE status = 'fechado' ORDER BY id DESC LIMIT 50",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Extrato de uma sessão
router.get('/extrato/:id', (req, res) => {
  db.get(
    'SELECT * FROM caixa_sessoes WHERE id = ?',
    [req.params.id],
    (err, sessao) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!sessao) return res.status(404).json({ error: 'Sessão não encontrada' });

      const fim = sessao.data_fechamento || new Date().toISOString();

      db.all(
        `SELECT * FROM caixa
         WHERE data_mov >= ? AND data_mov <= ?
         ORDER BY data_mov ASC`,
        [sessao.data_abertura, fim],
        (err2, movs) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json({ sessao, movimentacoes: movs });
        }
      );
    }
  );
});

module.exports = router;