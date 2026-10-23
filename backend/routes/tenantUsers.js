const express = require('express');
const crypto = require('node:crypto');
const router = express.Router();
const db = require('../database');
const { hashPassword } = require('../auth');

router.use((req, res, next) => {
  if (req.auth?.role !== 'owner') return res.status(403).json({ error: 'Somente o responsável da empresa pode gerenciar acessos.' });
  next();
});

router.get('/', async (req, res) => {
  try {
    res.json(await db.listTenantUsers(req.auth.tenantId));
  } catch (error) {
    console.error('Falha ao listar usuários da empresa:', error.message);
    res.status(500).json({ error: 'Não foi possível carregar os acessos da equipe.' });
  }
});

router.post('/', async (req, res) => {
  const nome = String(req.body.nome || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!nome || nome.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'Informe nome e um e-mail válido para o colaborador.' });
  }
  const senhaInicial = crypto.randomBytes(24).toString('base64url');
  try {
    const credentials = await hashPassword(senhaInicial);
    const user = await db.addTenantUser(
      req.auth.tenantId,
      nome,
      email,
      credentials.hash,
      credentials.salt
    );
    res.status(201).json({
      ...user,
      senhaInicial,
      aviso: 'Copie a senha inicial agora e entregue-a ao colaborador por canal seguro.'
    });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Este e-mail já possui um acesso no TechGest.' });
    console.error('Falha ao criar acesso de colaborador:', error.message);
    res.status(500).json({ error: 'Não foi possível criar o acesso.' });
  }
});

router.delete('/:id', async (req, res) => {
  if (!/^\d+$/.test(req.params.id) || Number(req.params.id) === Number(req.auth.id)) {
    return res.status(400).json({ error: 'Selecione um acesso de colaborador válido.' });
  }
  try {
    const result = await db.pool.query(
      `UPDATE public.tenant_users SET ativo = FALSE
       WHERE id = $1 AND tenant_id = $2 AND role = 'staff' AND ativo = TRUE
       RETURNING id`,
      [req.params.id, req.auth.tenantId]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Acesso de colaborador não encontrado ou já desativado.' });
    res.json({ desativado: true });
  } catch (error) {
    console.error('Falha ao desativar acesso de colaborador:', error.message);
    res.status(500).json({ error: 'Não foi possível desativar o acesso.' });
  }
});

module.exports = router;
