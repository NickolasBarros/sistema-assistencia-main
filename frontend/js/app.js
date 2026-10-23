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

function organizarNavegacao() {
  const nav = document.querySelector('.sidebar nav');
  if (!nav) return;

  const grupos = [
    { titulo: 'Visão geral', views: ['dashboard'] },
    { titulo: 'Atendimento', views: ['clientes', 'ordens', 'kanban', 'orcamentos'] },
    { titulo: 'Catálogo e equipe', views: ['produtos', 'funcionarios'] },
    { titulo: 'Vendas e estoque', views: ['vendas', 'estoque'] },
    { titulo: 'Gestão financeira', views: ['caixa', 'financeiro', 'despesasFixas', 'relatorios'] },
    { titulo: 'Sistema', views: ['configuracoes'] }
  ];
  const views = new Map(Array.from(nav.querySelectorAll('.nav-item'), button => [button.dataset.view, button]));
  const agrupado = document.createDocumentFragment();

  grupos.forEach((grupo, index) => {
    const section = document.createElement('section');
    section.className = 'nav-group';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'nav-group-toggle';
    const expanded = index === 0;
    const itemsId = `nav-group-items-${index}`;
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute('aria-controls', itemsId);
    const label = document.createElement('span');
    label.textContent = grupo.titulo;
    const chevron = document.createElement('span');
    chevron.className = 'nav-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    toggle.append(label, chevron);

    const items = document.createElement('div');
    items.className = 'nav-group-items';
    items.id = itemsId;
    items.hidden = !expanded;
    grupo.views.forEach(view => {
      const button = views.get(view);
      if (button) items.appendChild(button);
    });
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      items.hidden = expanded;
    });
    section.append(toggle, items);
    agrupado.appendChild(section);
  });

  const settings = views.get('configuracoes');
  const brandGear = document.querySelector('.btn-configuracoes-topo svg');
  const settingsIcon = settings?.querySelector('svg');
  if (settingsIcon && brandGear) settingsIcon.replaceWith(brandGear.cloneNode(true));

  const siteGroup = document.createElement('section');
  siteGroup.className = 'nav-group nav-site-group';
  const siteLink = document.createElement('a');
  siteLink.className = 'nav-site-link';
  siteLink.href = 'https://site-techgest.onrender.com';
  siteLink.target = '_blank';
  siteLink.rel = 'noopener noreferrer';
  siteLink.innerHTML = '<span class="nav-site-icon" aria-hidden="true">↗</span><span>Site da TechGest</span>';
  siteGroup.appendChild(siteLink);
  agrupado.appendChild(siteGroup);
  nav.replaceChildren(agrupado);
}

organizarNavegacao();

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    navegarParaView(btn.dataset.view, btn);
  });
});

function navegarParaView(view, navAtiva = null) {
  const grupo = navAtiva?.closest('.nav-group');
  const grupoToggle = grupo?.querySelector('.nav-group-toggle');
  const grupoItems = grupo?.querySelector('.nav-group-items');
  if (grupoToggle && grupoItems) {
    grupoToggle.setAttribute('aria-expanded', 'true');
    grupoItems.hidden = false;
  }
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