// ============================================
// GRÁFICOS DO DASHBOARD
// ============================================

let tipoGraficoAtual = 'pizza';
let chartsInstanciados = {
  formas: null,
  lucro: null,
  entregas: null,
  produtos: null
};

// ============================================
// PALETA DE CORES
// ============================================

const CORES_PRIMARIAS = [
  '#008A7D', // verde-petróleo
  '#006B60',
  '#00A896',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899'
];

// ============================================
// CARREGAR E RENDERIZAR
// ============================================

async function carregarGraficos() {
  try {
    const dados = await apiGet('/relatorios/graficos');
    renderizarFormasPagamento(dados.formas_pagamento);
    renderizarLucro(dados.lucro);
    renderizarEntregas(dados.entregas_por_mes);
    renderizarTopProdutos(dados.top_produtos);
  } catch (err) {
    console.error('Erro ao carregar gráficos:', err);
  }
}

// ============================================
// GRÁFICO 1 — FORMAS DE PAGAMENTO
// ============================================

function renderizarFormasPagamento(formas) {
  const ctx = document.getElementById('grafico-formas');
  if (!ctx) return;

  if (chartsInstanciados.formas) {
    chartsInstanciados.formas.destroy();
  }

  if (!formas || formas.length === 0) {
    ctx.parentElement.innerHTML = '<div class="busca-vazio">Sem dados ainda</div>';
    return;
  }

  const labels = formas.map(f => f.forma);
  const values = formas.map(f => f.total);
  const cores = CORES_PRIMARIAS.slice(0, labels.length);

  chartsInstanciados.formas = new Chart(ctx, {
    type: tipoGraficoAtual === 'pizza' ? 'doughnut' : 'bar',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: tipoGraficoAtual === 'pizza' ? cores : cores[0],
        borderWidth: 0,
        borderRadius: tipoGraficoAtual === 'barra' ? 6 : 0
      }]
    },
    options: opcoesBase(tipoGraficoAtual, true)
  });
}

// ============================================
// GRÁFICO 2 — LUCRO
// ============================================

function renderizarLucro(lucro) {
  const ctx = document.getElementById('grafico-lucro');
  if (!ctx) return;

  if (chartsInstanciados.lucro) {
    chartsInstanciados.lucro.destroy();
  }

  const labels = ['Assistência', 'Vendas'];
  const values = [lucro.assistencia || 0, lucro.vendas || 0];
  const cores = [CORES_PRIMARIAS[0], CORES_PRIMARIAS[3]];

  chartsInstanciados.lucro = new Chart(ctx, {
    type: tipoGraficoAtual === 'pizza' ? 'doughnut' : 'bar',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: tipoGraficoAtual === 'pizza' ? cores : cores,
        borderWidth: 0,
        borderRadius: tipoGraficoAtual === 'barra' ? 6 : 0
      }]
    },
    options: opcoesBase(tipoGraficoAtual, true)
  });
}

// ============================================
// GRÁFICO 3 — ENTREGAS POR MÊS
// ============================================

function renderizarEntregas(meses) {
  const ctx = document.getElementById('grafico-entregas');
  if (!ctx) return;

  if (chartsInstanciados.entregas) {
    chartsInstanciados.entregas.destroy();
  }

  if (!meses || meses.length === 0) {
    ctx.parentElement.innerHTML = '<div class="busca-vazio">Nenhuma entrega nos últimos 6 meses</div>';
    return;
  }

  // Formata os meses: 2026-09 → Set/26
  const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const labels = meses.map(m => {
    const [ano, mes] = m.mes.split('-');
    return nomesMeses[parseInt(mes) - 1] + '/' + ano.slice(2);
  });
  const values = meses.map(m => m.quantidade);

  chartsInstanciados.entregas = new Chart(ctx, {
    type: 'bar', // sempre barra (não faz sentido pizza por mês)
    data: {
      labels: labels,
      datasets: [{
        label: 'Entregas',
        data: values,
        backgroundColor: CORES_PRIMARIAS[0],
        borderRadius: 6,
        borderWidth: 0
      }]
    },
    options: opcoesBarra()
  });
}

// ============================================
// GRÁFICO 4 — TOP PRODUTOS
// ============================================

function renderizarTopProdutos(produtos) {
  const ctx = document.getElementById('grafico-produtos');
  if (!ctx) return;

  if (chartsInstanciados.produtos) {
    chartsInstanciados.produtos.destroy();
  }

  if (!produtos || produtos.length === 0) {
    ctx.parentElement.innerHTML = '<div class="busca-vazio">Nenhum produto vendido ainda</div>';
    return;
  }

  const labels = produtos.map(p => p.nome);
  const values = produtos.map(p => p.total_qtd);
  const cores = CORES_PRIMARIAS.slice(0, labels.length);

  chartsInstanciados.produtos = new Chart(ctx, {
    type: tipoGraficoAtual === 'pizza' ? 'doughnut' : 'bar',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: tipoGraficoAtual === 'pizza' ? cores : CORES_PRIMARIAS[0],
        borderWidth: 0,
        borderRadius: tipoGraficoAtual === 'barra' ? 6 : 0
      }]
    },
    options: opcoesBase(tipoGraficoAtual, true)
  });
}

// ============================================
// OPÇÕES DOS GRÁFICOS
// ============================================

function opcoesBase(tipo, mostrarLegenda) {
  const textColor = getComputedStyle(document.body).getPropertyValue('--cor-texto').trim() || '#1f2937';

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: mostrarLegenda,
        position: tipo === 'pizza' ? 'bottom' : 'top',
        labels: {
          color: textColor,
          font: { size: 12 },
          padding: 12,
          usePointStyle: true
        }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const valor = ctx.parsed.y !== undefined ? ctx.parsed.y : ctx.parsed;
            return ctx.label + ': ' + formatMoney(valor);
          }
        }
      }
    }
  };
}

function opcoesBarra() {
  const textColor = getComputedStyle(document.body).getPropertyValue('--cor-texto').trim() || '#1f2937';
  const gridColor = getComputedStyle(document.body).getPropertyValue('--cor-borda').trim() || '#e5e7eb';

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => 'Entregas: ' + ctx.parsed.y
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: textColor, precision: 0 },
        grid: { color: gridColor }
      },
      x: {
        ticks: { color: textColor },
        grid: { display: false }
      }
    }
  };
}

// ============================================
// TROCAR TIPO DE GRÁFICO
// ============================================

function trocarTipoGrafico(tipo) {
  tipoGraficoAtual = tipo;

  document.getElementById('tipo-pizza').classList.toggle('active', tipo === 'pizza');
  document.getElementById('tipo-barra').classList.toggle('active', tipo === 'barra');

  carregarGraficos();
}

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Só carrega se o dashboard estiver visível
  const dash = document.getElementById('view-dashboard');
  if (dash && dash.classList.contains('active')) {
    setTimeout(carregarGraficos, 500);
  }
});

// Recarrega os gráficos quando volta para o Dashboard
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.nav-item[data-view="dashboard"]');
  if (btn) {
    setTimeout(carregarGraficos, 300);
  }
});