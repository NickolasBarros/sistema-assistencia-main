// ============================================
// NAVEGAÇÃO DO SISTEMA
// ============================================

const titulos = {
  dashboard: 'Dashboard',
  clientes: 'Clientes',
  funcionarios: 'Funcionários',
  produtos: 'Produtos e Serviços',
  ordens: 'Ordens de Serviço (OS)',
  kanban: 'Kanban de Reparos',
  orcamentos: 'Orçamentos',
  vendas: 'Vendas',
  estoque: 'Estoque',
  caixa: 'Caixa',
  financeiro: 'Financeiro',
  despesasFixas: 'Despesas Fixas',
  relatorios: 'Relatórios',
  configuracoes: 'Configurações',
  calendario: 'Calendário Anual'
};

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');

    const view = btn.dataset.view;
    const secao = document.getElementById('view-' + view);
    if (secao) secao.classList.add('active');

    const titulo = document.getElementById('page-title');
    if (titulo) titulo.textContent = titulos[view] || 'TechGest';

    if (view === 'dashboard') carregarDashboard();
    if (view === 'clientes') carregarClientes();
    if (view === 'funcionarios') carregarFuncionarios();
    if (view === 'produtos') carregarProdutos();
    if (view === 'ordens') carregarOrdens();
    if (view === 'kanban') carregarKanban();
    if (view === 'orcamentos') carregarOrcamentos();
    if (view === 'vendas') carregarVendas();
    if (view === 'estoque') carregarEstoque();
    if (view === 'caixa') carregarCaixa();
    if (view === 'financeiro') carregarFinanceiro();
    if (view === 'despesasFixas') carregarDespesasFixas();
    if (view === 'configuracoes') carregarConfiguracoes();
    if (view === 'relatorios') carregarRelatorios();
  });
});

document.addEventListener('DOMContentLoaded', () => {
  carregarDashboard();
});