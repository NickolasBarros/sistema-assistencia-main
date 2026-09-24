// ============================================
// BUSCA GLOBAL
// ============================================

let buscaDebounceTimer = null;

const ICONES_BUSCA = {
  clientes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  produtos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
  ordens: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  vendas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  funcionarios: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
};

const LABELS_BUSCA = {
  clientes: 'Clientes',
  produtos: 'Produtos e Serviços',
  ordens: 'Ordens de Serviço',
  vendas: 'Vendas',
  funcionarios: 'Funcionários'
};

function iniciarBuscaGlobal() {
  const input = document.getElementById('busca-global');
  const resultados = document.getElementById('busca-resultados');
  if (!input || !resultados) return;

  // Digitar → busca com debounce
  input.addEventListener('input', () => {
    clearTimeout(buscaDebounceTimer);
    buscaDebounceTimer = setTimeout(() => {
      executarBusca(input.value);
    }, 250);
  });

  // Enter → abre o primeiro resultado
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const primeiro = resultados.querySelector('.busca-item');
      if (primeiro) primeiro.click();
    }
    if (e.key === 'Escape') {
      input.value = '';
      resultados.classList.remove('active');
      input.blur();
    }
  });

  // Clicar fora → fecha
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.busca-container')) {
      resultados.classList.remove('active');
    }
  });

  // Atalho Ctrl+K
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });
}

async function executarBusca(termo) {
  const resultados = document.getElementById('busca-resultados');
  if (!resultados) return;

  termo = (termo || '').trim();

  if (termo.length < 2) {
    resultados.classList.remove('active');
    return;
  }

  try {
    const dados = await apiGet('/busca?q=' + encodeURIComponent(termo));
    renderizarResultados(dados, termo);
  } catch (err) {
    console.error('Erro na busca:', err);
  }
}

function renderizarResultados(dados, termo) {
  const div = document.getElementById('busca-resultados');
  div.innerHTML = '';

  let totalItens = 0;

  const grupos = ['clientes', 'ordens', 'produtos', 'vendas', 'funcionarios'];

  grupos.forEach(grupo => {
    const itens = dados[grupo] || [];
    if (itens.length === 0) return;

    totalItens += itens.length;

    const grupoDiv = document.createElement('div');
    grupoDiv.className = 'busca-grupo';

    grupoDiv.innerHTML = `
      <div class="busca-grupo-titulo">
        ${ICONES_BUSCA[grupo]}
        <span>${LABELS_BUSCA[grupo]}</span>
      </div>
    `;

    itens.forEach(item => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'busca-item';
      itemDiv.innerHTML = montarItem(grupo, item);
      itemDiv.onclick = () => navegarPara(grupo, item.id);
      grupoDiv.appendChild(itemDiv);
    });

    div.appendChild(grupoDiv);
  });

  if (totalItens === 0) {
    div.innerHTML = `<div class="busca-vazio">Nenhum resultado para "${termo}"</div>`;
  }

  div.classList.add('active');
}

function montarItem(grupo, item) {
  if (grupo === 'clientes') {
    return `
      <span class="item-label">${item.nome}</span>
      <span class="item-info">${item.telefone || ''}</span>
    `;
  }
  if (grupo === 'produtos') {
    return `
      <span class="item-label">${item.nome}</span>
      <span class="item-info">${item.tipo} · ${formatMoney(item.preco)}</span>
    `;
  }
  if (grupo === 'ordens') {
    return `
      <span class="item-label">OS #${item.id} — ${item.aparelho || 'Aparelho'} ${item.marca ? '| ' + item.marca : ''}</span>
      <span class="item-info">${item.cliente_nome || ''} · ${item.status}</span>
    `;
  }
  if (grupo === 'vendas') {
    return `
      <span class="item-label">Venda #${item.id} — ${item.cliente_nome || 'Sem cliente'}</span>
      <span class="item-info">${formatMoney(item.valor_total)}</span>
    `;
  }
  if (grupo === 'funcionarios') {
    return `
      <span class="item-label">${item.nome}</span>
      <span class="item-info">${item.cargo || ''}</span>
    `;
  }
  return '';
}

function navegarPara(grupo, id) {
  // Fecha o dropdown
  const resultados = document.getElementById('busca-resultados');
  if (resultados) resultados.classList.remove('active');

  const input = document.getElementById('busca-global');
  if (input) input.value = '';

  // Mapeia grupo → aba
  const mapAbas = {
    clientes: 'clientes',
    produtos: 'produtos',
    ordens: 'ordens',
    vendas: 'vendas',
    funcionarios: 'funcionarios'
  };

  const aba = mapAbas[grupo];
  if (!aba) return;

  // Clica no menu correspondente
  const btnMenu = document.querySelector(`.nav-item[data-view="${aba}"]`);
  if (btnMenu) btnMenu.click();

  // Abre o modal Ver (se a função existir)
  setTimeout(() => {
    if (grupo === 'clientes' && typeof verCliente === 'function') verCliente(id);
    if (grupo === 'produtos' && typeof verProduto === 'function') verProduto(id);
    if (grupo === 'ordens' && typeof verOrdem === 'function') verOrdem(id);
    if (grupo === 'vendas' && typeof verVenda === 'function') verVenda(id);
    if (grupo === 'funcionarios' && typeof verFuncionario === 'function') verFuncionario(id);
  }, 300);
}

// Inicia quando a página carregar
document.addEventListener('DOMContentLoaded', iniciarBuscaGlobal);