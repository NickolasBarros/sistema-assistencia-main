const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const db = require('../database');

const databasePath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'database.db');
const uploadPath = process.env.UPLOADS_PATH || path.join(path.dirname(path.resolve(databasePath)), 'uploads');
const maxFileSize = 5 * 1024 * 1024;

function erroBanco(res, err) {
  console.error('Erro ao acessar configurações:', err.message);
  return res.status(500).json({ error: 'Não foi possível acessar as configurações.' });
}

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
  let falhas = 0;

  chaves.forEach(chave => {
    db.run(
      `INSERT INTO configuracoes (chave, valor) VALUES (?, ?)
       ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor`,
      [chave, dados[chave]],
      function (err) {
        if (err) {
          falhas++;
          console.error('Erro ao salvar configuração ' + chave + ':', err.message);
        }
        processados++;
        if (processados === chaves.length) {
          if (falhas > 0) return res.status(500).json({ error: 'Uma ou mais configurações não puderam ser salvas.' });
          res.json({ atualizado: processados });
        }
      }
    );
  });
});

router.get('/modelos', (req, res) => {
  db.all('SELECT id, tipo, nome_original, criado_em FROM modelos_documentos ORDER BY id DESC', [], (err, rows) => {
    if (err) return erroBanco(res, err);
    res.json(rows);
  });
});

router.post('/modelos/:tipo', express.raw({ type: 'application/pdf', limit: maxFileSize }), async (req, res) => {
  const { tipo } = req.params;
  if (!['os', 'garantia'].includes(tipo)) {
    return res.status(400).json({ error: 'Tipo de modelo inválido.' });
  }

  let originalName;
  try {
    originalName = decodeURIComponent(req.get('x-file-name') || '').trim();
  } catch (err) {
    return res.status(400).json({ error: 'O nome do arquivo possui codificação inválida.' });
  }
  if (!originalName || !originalName.toLowerCase().endsWith('.pdf')) {
    return res.status(400).json({ error: 'Envie um arquivo PDF com nome válido.' });
  }

  if (!Buffer.isBuffer(req.body) || req.body.length < 5 || req.body.subarray(0, 5).toString() !== '%PDF-') {
    return res.status(400).json({ error: 'O arquivo enviado não é um PDF válido.' });
  }

  const fileName = `${crypto.randomUUID()}.pdf`;
  const filePath = path.join(uploadPath, fileName);

  try {
    await fs.promises.mkdir(uploadPath, { recursive: true });
    await fs.promises.writeFile(filePath, req.body, { flag: 'wx' });
  } catch (err) {
    console.error('Erro ao armazenar modelo PDF:', err.message);
    return res.status(500).json({ error: 'Não foi possível armazenar o arquivo enviado.' });
  }

  db.run(
    'INSERT INTO modelos_documentos (tipo, nome_original, nome_arquivo) VALUES (?, ?, ?)',
    [tipo, path.basename(originalName), fileName],
    function (err) {
      if (err) {
        fs.promises.unlink(filePath).catch(unlinkError => {
          console.error('Erro ao remover arquivo de modelo não registrado:', unlinkError.message);
        });
        return erroBanco(res, err);
      }
      res.status(201).json({ id: this.lastID, tipo, nome_original: path.basename(originalName) });
    }
  );
});

router.get('/modelos/:id/arquivo', (req, res) => {
  db.get('SELECT nome_original, nome_arquivo FROM modelos_documentos WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return erroBanco(res, err);
    if (!row) return res.status(404).json({ error: 'Modelo não encontrado.' });

    const filePath = path.join(uploadPath, path.basename(row.nome_arquivo));
    res.download(filePath, row.nome_original, errDownload => {
      if (errDownload && !res.headersSent) {
        if (errDownload.code === 'ENOENT') return res.status(404).json({ error: 'Arquivo do modelo não encontrado.' });
        console.error('Erro ao baixar modelo PDF:', errDownload.message);
        res.status(500).json({ error: 'Não foi possível baixar o arquivo.' });
      }
    });
  });
});

router.delete('/modelos/:id', (req, res) => {
  db.get('SELECT nome_arquivo FROM modelos_documentos WHERE id = ?', [req.params.id], async (err, row) => {
    if (err) return erroBanco(res, err);
    if (!row) return res.status(404).json({ error: 'Modelo não encontrado.' });

    db.run('DELETE FROM modelos_documentos WHERE id = ?', [req.params.id], async function (deleteErr) {
      if (deleteErr) return erroBanco(res, deleteErr);

      try {
        await fs.promises.unlink(path.join(uploadPath, path.basename(row.nome_arquivo)));
      } catch (fileErr) {
        if (fileErr.code !== 'ENOENT') {
          console.error('Erro ao excluir arquivo de modelo:', fileErr.message);
          return res.status(500).json({ error: 'O registro foi removido, mas o arquivo não pôde ser excluído.' });
        }
      }
      res.json({ deletado: this.changes });
    });
  });
});

router.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'O arquivo deve ter no máximo 5 MB.' });
  }
  next(err);
});

module.exports = router;