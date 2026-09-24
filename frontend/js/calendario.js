// ============================================
// CALENDÁRIO ANUAL (dentro de modal)
// ============================================

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

let calendarioDados = null;

// ============================================
// ABRIR / FECHAR MODAL
// ============================================

function abrirModalCalendario() {
  const modal = document.getElementById('modal-calendario');
  if (!modal) return;

  modal.classList.add('active');

  // Define o ano atual como padrão
  const select = document.getElementById('calendario-ano');
  if (select && !select.value) {
    select.value = new Date().getFullYear();
  }

  carregarCalendario();
}

function fecharModalCalendario() {
  const modal = document.getElementById('modal-calendario');
  if (modal) modal.classList.remove('active');
}

// ============================================
// CARREGAR
// ============================================

async function carregarCalendario() {
  const select = document.getElementById('calendario-ano');
  const ano = select ? parseInt(select.value) : new Date().getFullYear();

  try {
    calendarioDados = await apiGet('/relatorios/calendario?ano=' + ano);
    renderizarTotaisAno();
    renderizarMeses(ano);
  } catch (err) {
    console.error('Erro ao carregar calendário:', err);
  }
}

// ============================================
// TOTAIS DO ANO
// ============================================

function renderizarTotaisAno() {
  const div = document.getElementById('calendario-totais-ano');
  if (!div || !calendarioDados) return;

  const t = calendarioDados.totais_ano;
  const corSaldo = t.saldo >= 0 ? 'var(--cor-sucesso)' : 'var(--cor-erro)';

  div.innerHTML = `
    <span>Receitas: <strong style="color:var(--cor-sucesso);">${formatMoney(t.receitas)}</strong></span>
    <span>Despesas: <strong style="color:var(--cor-erro);">${formatMoney(t.despesas)}</strong></span>
    <span>Saldo: <strong style="color:${corSaldo};">${formatMoney(t.saldo)}</strong></span>
    <span>Entregas: <strong>${t.entregas}</strong></span>
  `;
}

// ============================================
// RENDERIZAR OS 12 MESES
// ============================================

function renderizarMeses(ano) {
  const container = document.getElementById('calendario-meses');
  if (!container) return;
  container.innerHTML = '';

  for (let mes = 0; mes < 12; mes++) {
    const mesDiv = document.createElement('div');
    mesDiv.className = 'calendario-mes';

    const keyMes = `${ano}-${String(mes + 1).padStart(2, '0')}`;
    const resumo = calendarioDados.totais_mensais[keyMes] || { receitas: 0, despesas: 0, entregas: 0, saldo: 0 };

    const corSaldo = resumo.saldo >= 0 ? 'valor-pos' : 'valor-neg';
    const sinalSaldo = resumo.saldo >= 0 ? '+' : '';

    mesDiv.innerHTML = `
      <div class="calendario-mes-header">
        <div class="calendario-mes-titulo">${NOMES_MESES[mes]}</div>
        <div class="calendario-mes-resumo">
          <div>Rec: <span class="valor-pos">${formatMoney(resumo.receitas)}</span></div>
          <div>Desp: <span class="valor-neg">${formatMoney(resumo.despesas)}</span></div>
          <div>Saldo: <span class="${corSaldo}">${sinalSaldo}${formatMoney(resumo.saldo)}</span></div>
          <div>Entregas: <strong>${resumo.entregas}</strong></div>
        </div>
      </div>
      <div class="calendario-semana">
        ${DIAS_SEMANA.map(d => `<span>${d}</span>`).join('')}
      </div>
      <div class="calendario-dias" id="dias-${ano}-${mes}"></div>
    `;

    container.appendChild(mesDiv);

    const diasContainer = mesDiv.querySelector(`#dias-${ano}-${mes}`);
    renderizarDiasDoMes(diasContainer, ano, mes);
  }

  // Legenda no final
  const legenda = document.createElement('div');
  legenda.className = 'calendario-legenda';
  legenda.style.gridColumn = '1 / -1';
  legenda.innerHTML = `
    <strong style="color:var(--cor-texto);">Legenda:</strong>
    <div class="calendario-legenda-item">
      <div class="calendario-legenda-cor" style="background:rgba(16, 185, 129, 0.4);"></div>
      <span>Dia com receita</span>
    </div>
    <div class="calendario-legenda-item">
      <div class="calendario-legenda-cor" style="background:rgba(239, 68, 68, 0.4);"></div>
      <span>Dia com despesa</span>
    </div>
    <div class="calendario-legenda-item">
      <div class="calendario-legenda-cor" style="background:var(--cor-primaria); border-radius:50%; width:8px; height:8px;"></div>
      <span>Dia com entrega de OS</span>
    </div>
    <div class="calendario-legenda-item">
      <div class="calendario-legenda-cor" style="border:2px solid var(--cor-primaria); background:transparent;"></div>
      <span>Hoje</span>
    </div>
  `;
  container.appendChild(legenda);
}

// ============================================
// RENDERIZAR OS DIAS DE UM MÊS
// ============================================

function renderizarDiasDoMes(container, ano, mes) {
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();

  const hoje = new Date();
  const ehMesAtual = hoje.getFullYear() === ano && hoje.getMonth() === mes;

  for (let i = 0; i < primeiroDia; i++) {
    const vazio = document.createElement('div');
    vazio.className = 'calendario-dia vazio';
    container.appendChild(vazio);
  }

  for (let dia = 1; dia <= ultimoDia; dia++) {
    const key = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const dadosDia = calendarioDados.dias[key] || { receitas: 0, despesas: 0, entregas: 0, saldo: 0 };

    const diaDiv = document.createElement('div');
    diaDiv.className = 'calendario-dia';
    diaDiv.dataset.data = key;

    if (ehMesAtual && hoje.getDate() === dia) {
      diaDiv.classList.add('hoje');
    }

    if (dadosDia.receitas > 0) diaDiv.classList.add('tem-receita');
    else if (dadosDia.despesas > 0) diaDiv.classList.add('tem-despesa');

    if (dadosDia.entregas > 0) diaDiv.classList.add('tem-entrega');

    diaDiv.innerHTML = `<span class="calendario-dia-numero">${dia}</span>`;

    diaDiv.onclick = () => abrirModalDia(key, dadosDia);

    container.appendChild(diaDiv);
  }
}

// ============================================
// MODAL DO DIA
// ============================================

function abrirModalDia(dataISO, dados) {
  const [ano, mes, dia] = dataISO.split('-');
  const dataFormatada = `${dia}/${mes}/${ano}`;

  document.getElementById('modal-dia-titulo').textContent = 'Dia ' + dataFormatada;

  const corSaldo = dados.saldo >= 0 ? 'var(--cor-sucesso)' : 'var(--cor-erro)';
  const sinalSaldo = dados.saldo >= 0 ? '+' : '';

  let conteudo = `
    <div class="info-linha"><strong>Data</strong><span>${dataFormatada}</span></div>
    <div class="info-linha"><strong>Receitas</strong><span style="color:var(--cor-sucesso); font-weight:700;">${formatMoney(dados.receitas)}</span></div>
    <div class="info-linha"><strong>Despesas</strong><span style="color:var(--cor-erro); font-weight:700;">${formatMoney(dados.despesas)}</span></div>
    <div class="info-linha"><strong>Saldo</strong><span style="color:${corSaldo}; font-weight:700;">${sinalSaldo}${formatMoney(dados.saldo)}</span></div>
    <div class="info-linha"><strong>Entregas de OS</strong><span>${dados.entregas}</span></div>
  `;

  if (dados.receitas === 0 && dados.despesas === 0 && dados.entregas === 0) {
    conteudo += '<p style="margin-top:16px; color:var(--cor-texto-suave); font-style:italic;">Nenhuma movimentação neste dia.</p>';
  }

  document.getElementById('modal-dia-conteudo').innerHTML = conteudo;
  document.getElementById('modal-dia').classList.add('active');
}

function fecharModalDia() {
  document.getElementById('modal-dia').classList.remove('active');
}

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Fecha modal-dia ao clicar fora
  const modalDia = document.getElementById('modal-dia');
  if (modalDia) {
    modalDia.addEventListener('click', (e) => {
      if (e.target === modalDia) fecharModalDia();
    });
  }

  // Fecha modal-calendario ao clicar fora
  const modalCal = document.getElementById('modal-calendario');
  if (modalCal) {
    modalCal.addEventListener('click', (e) => {
      if (e.target === modalCal) fecharModalCalendario();
    });
  }

  // ESC fecha os modais
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      fecharModalDia();
      // Só fecha o calendário se o dia não estiver aberto
      const diaAberto = document.getElementById('modal-dia').classList.contains('active');
      if (!diaAberto) fecharModalCalendario();
    }
  });
});