const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const router = express.Router();
const db = require('../database');

const maxImageSize = 5 * 1024 * 1024;
const maxOrderImages = 5;
const maxProductImages = 5;
const imagePath = path.join(
  process.env.UPLOADS_PATH || path.join(path.dirname(path.resolve(process.env.DATABASE_PATH || path.join(__dirname, '..', 'database.db'))), 'uploads'),
  'images'
);
const formats = {
  'image/jpeg': { extension: '.jpg', matches: buffer => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  'image/png': { extension: '.png', matches: buffer => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/webp': { extension: '.webp', matches: buffer => buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' }
};

function imagemMuitoGrande(err, req, res, next) {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'A imagem deve ter no máximo 5 MB.' });
  next(err);
}

router.get('/entidade/:tipo/:entidadeId', (req, res) => {
  const { tipo } = req.params;
  if (!['produto', 'ordem'].includes(tipo)) return res.status(400).json({ error: 'Tipo de registro inválido.' });
  db.all(
    `SELECT id, entidade_tipo, entidade_id, mime_type, criado_em
     FROM midias WHERE entidade_tipo = ? AND entidade_id = ? ORDER BY id`,
    [tipo, req.params.entidadeId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Não foi possível carregar as imagens.' });
      res.json(rows);
    }
  );
});

router.post('/:tipo/:entidadeId', express.raw({
  type: ['image/jpeg', 'image/png', 'image/webp'],
  limit: maxImageSize
}), async (req, res) => {
  const { tipo, entidadeId } = req.params;
  if (!['produto', 'ordem'].includes(tipo)) return res.status(400).json({ error: 'Tipo de registro inválido.' });
  if (!/^[1-9]\d*$/.test(entidadeId)) return res.status(400).json({ error: 'Identificador de registro inválido.' });

  const formato = formats[req.get('content-type')?.split(';')[0].toLowerCase()];
  if (!formato || !Buffer.isBuffer(req.body) || !formato.matches(req.body)) {
    return res.status(400).json({ error: 'O arquivo não corresponde a uma imagem JPEG, PNG ou WebP válida.' });
  }

  const tabela = tipo === 'produto' ? 'produtos' : 'ordens';
  try {
    const registro = await db.getAsync(`SELECT id FROM ${tabela} WHERE id = ?`, [entidadeId]);
    if (!registro) return res.status(404).json({ error: `${tipo === 'produto' ? 'Produto' : 'Ordem de serviço'} não encontrada.` });

    const existentes = await db.getAsync(
      'SELECT COUNT(*) AS total FROM midias WHERE entidade_tipo = ? AND entidade_id = ?',
      [tipo, entidadeId]
    );
    const limite = tipo === 'ordem' ? maxOrderImages : maxProductImages;
    if (existentes.total >= limite) {
      return res.status(409).json({ error: `Este registro pode ter até ${limite} imagens.` });
    }

    await fs.promises.mkdir(imagePath, { recursive: true });
    const nomeArquivo = `${crypto.randomUUID()}${formato.extension}`;
    const destino = path.join(imagePath, nomeArquivo);
    await fs.promises.writeFile(destino, req.body, { flag: 'wx' });
    try {
      const inserido = await db.runAsync(
        'INSERT INTO midias (entidade_tipo, entidade_id, mime_type, nome_arquivo) VALUES (?, ?, ?, ?)',
        [tipo, entidadeId, req.get('content-type').split(';')[0].toLowerCase(), nomeArquivo]
      );
      res.status(201).json({ id: inserido.lastID, url: `/api/midias/${inserido.lastID}/arquivo` });
    } catch (err) {
      await fs.promises.unlink(destino).catch(unlinkError => {
        console.error('Falha ao limpar imagem sem registro:', unlinkError.message);
      });
      throw err;
    }
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT') return res.status(400).json({ error: 'Não foi possível associar a imagem ao registro.' });
    console.error('Erro ao armazenar imagem:', err.message);
    res.status(500).json({ error: 'Não foi possível armazenar a imagem.' });
  }
});

router.get('/:id/arquivo', (req, res) => {
  db.get('SELECT nome_arquivo, mime_type FROM midias WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Não foi possível localizar a imagem.' });
    if (!row) return res.status(404).json({ error: 'Imagem não encontrada.' });
    const destino = path.join(imagePath, path.basename(row.nome_arquivo));
    res.type(row.mime_type);
    res.set('Cache-Control', 'private, max-age=3600');
    res.sendFile(destino, sendError => {
      if (sendError && !res.headersSent) {
        if (sendError.code === 'ENOENT') return res.status(404).json({ error: 'Arquivo de imagem não encontrado.' });
        console.error('Erro ao servir imagem:', sendError.message);
        res.status(500).json({ error: 'Não foi possível exibir a imagem.' });
      }
    });
  });
});

router.delete('/:id', async (req, res) => {
  try {
    const midia = await db.getAsync('SELECT nome_arquivo FROM midias WHERE id = ?', [req.params.id]);
    if (!midia) return res.status(404).json({ error: 'Imagem não encontrada.' });
    await db.runAsync('DELETE FROM midias WHERE id = ?', [req.params.id]);
    try {
      await fs.promises.unlink(path.join(imagePath, path.basename(midia.nome_arquivo)));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    res.json({ deletada: true });
  } catch (err) {
    console.error('Erro ao excluir imagem:', err.message);
    res.status(500).json({ error: 'Não foi possível excluir a imagem.' });
  }
});

router.use(imagemMuitoGrande);
module.exports = router;
