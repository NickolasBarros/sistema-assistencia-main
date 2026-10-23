function enforceRole(req, res, next) {
  if (req.auth?.role !== 'staff') return next();
  const path = req.path;
  if (req.method === 'GET' && path === '/relatorios/resumo') return next();
  if (/^\/(caixa|financeiro|despesasFixas|relatorios)(\/|$)/.test(path) ||
      (/^\/(configuracoes|funcionarios|termosGarantia)(\/|$)/.test(path) && req.method !== 'GET') ||
      req.method === 'DELETE') {
    return res.status(403).json({ error: 'Seu perfil não tem permissão para esta ação.' });
  }
  next();
}

module.exports = { enforceRole };
