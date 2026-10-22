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

const configuracoesNaSidebar = document.querySelector('.nav-item[data-view="configuracoes"]');
if (configuracoesNaSidebar) {
  const labelSistema = configuracoesNaSidebar.previousElementSibling;
  if (labelSistema && labelSistema.classList.contains('nav-section-label')) labelSistema.remove();
  configuracoesNaSidebar.remove();
}

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    navegarParaView(btn.dataset.view, btn);
  });
});

function navegarParaView(view, navAtiva = null) {
  document.querySelectorAll('.nav-item').forEach(button => button.classList.toggle('active', button === navAtiva));
  document.querySelectorAll('.view').forEach(section => section.classList.remove('active'));

  const section = document.getElementById('view-' + view);
  if (section) section.classList.add('active');

  const title = document.getElementById('page-title');
  if (title) title.textContent = titulos[view] || 'TechGest';

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
}

document.addEventListener('DOMContentLoaded', () => {
  carregarDashboard();

  document.querySelectorAll('[data-view-shortcut]').forEach(button => {
    button.addEventListener('click', () => {
      const view = button.dataset.viewShortcut;
      const navButton = document.querySelector(`.nav-item[data-view="${view}"]`);
      navegarParaView(view, navButton);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
});