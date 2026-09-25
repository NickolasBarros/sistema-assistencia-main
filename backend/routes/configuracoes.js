const express = require('express');
const router = express.Router();
const db = require('../database');

// GET — retorna todas as configurações
router.get('/', (req, res) => {
  db.all('SELECT chave, valor FROM configuracoes', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const config = {};
    rows.forEach(r => { config[r.chave] = r.valor; });
    res.json(config);
  });
});

// PUT — atualiza múltiplas configurações de uma vez
router.put('/', (req, res) => {
  const dados = req.body; // { nome_loja: '...', slogan_loja: '...', ... }
  const chaves = Object.keys(dados);

  if (chaves.length === 0) {
    return res.json({ atualizado: 0 });
  }

  let processados = 0;

  chaves.forEach(chave => {
    db.run(
      `INSERT INTO configuracoes (chave, valor) VALUES (?, ?)
       ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor`,
      [chave, dados[chave]],
      function (err) {
        if (err) console.error('Erro ao salvar ' + chave + ':', err.message);
        processados++;
        if (processados === chaves.length) {
          res.json({ atualizado: processados });
        }
      }
    );
  });
});

module.exports = router;