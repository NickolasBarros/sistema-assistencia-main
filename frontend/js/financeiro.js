// ============================================
// FINANCEIRO — EXTRATO COM FILTROS + ORDENAÇÃO + AUTO-REFRESH
// ============================================

let filtroAtual = {
  periodo: 'hoje',
  ordenar_por: 'auto',
  direcao: 'desc'
};

// ============================================
// CONTROLE DE AUTO-REFRESH
// ============================================

let autoRefreshAtivo = true;
let autoRefreshTimer = null;
let contadorSegundos = 0;
const INTERVALO_SEGUNDOS = 10;

// ============================================
// HELPERS DE DATA
// ============================================

function formatarDataISO(d) {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function calcularPeriodo(periodo) {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const dia = hoje.getDate();

  if (periodo === 'hoje') {
    const d = formatarDataISO(hoje);
    return { inicio: d, fim: d };
  }

  if (periodo === 'semana') {
    const diaSemana = hoje.getDay();
    const diff = diaSemana === 0 ? 6 : diaSemana - 1;
    const segunda = new Date(ano, mes, dia - diff);
    return { inicio: formatarDataISO(segunda), fim: formatarDataISO(hoje) };
  }

  if (periodo === 'mes') {
    const primeiro = new Date(ano, mes, 1);
    const ultimo = new Date(ano, mes + 1, 0);
    return { inicio: formatarDataISO(primeiro), fim: formatarDataISO(ultimo) };
  }

  if (periodo === 'ano') {
    const primeiro = new Date(ano, 0, 1);
    const ultimo = new Date(ano, 11, 31);
    return { inicio: formatarDataISO(primeiro), fim: formatarDataISO(ultimo) };
  }

  return { inicio: null, fim: null };
}

// ============================================
// ORDENAÇÃO ADAPTATIVA
// ============================================

function calcularOrdenacaoAdaptativa(periodo) {
  if (periodo === 'hoje') return { ordenar_por: 'data', direcao: 'desc', label: 'Por hora (mais recente primeiro)' };
  if (periodo === 'semana') return { ordenar_por: 'data', direcao: 'desc', label: 'Por dia + hora' };
  if (periodo === 'mes') return { ordenar_por: 'dia', direcao: 'desc', label: 'Por dia' };
  if (periodo === 'ano') return { ordenar_por: 'mes', direcao: 'desc', label: 'Por mês' };
  if (periodo === 'todos') return { ordenar_por: 'data', direcao: 'desc', label: 'Por data (mais recente primeiro)' };
  return { ordenar_por: 'data', direcao: 'desc', label: 'Por data' };
}

// ============================================
// APLICAR FILTROS
// ============================================

function aplicarFiltroPeriodo(periodo) {
  filtroAtual.periodo = periodo;

  document.querySelectorAll('.filtro-btn:not(.ordenar-btn)').forEach(b => {
    b.classList.toggle('active', b.dataset.periodo === periodo);
  });

  if (periodo !== 'custom' && periodo !== 'todos') {
    const range = calcularPeriodo(periodo);
    document.getElementById('filtro-data-inicio').value = range.inicio || '';
    document.getElementById('filtro-data-fim').value = range.fim || '';
  } else if (periodo === 'todos') {
    document.getElementById('filtro-data-inicio').value = '';
    document.getElementById('filtro-data-fim').value = '';
  }

  carregarExtrato();
}

function aplicarFiltroCustom() {
  filtroAtual.periodo = 'custom';
  document.querySelectorAll('.filtro-btn:not(.ordenar-btn)').forEach(b => b.classList.remove('active'));
  carregarExtrato();
}

function aplicarOrdenacao(ordem) {
  const btn = document.querySelector(`.ordenar-btn[data-ordem="${ordem}"]`);

  if (ordem === 'auto') {
    filtroAtual.ordenar_por = 'auto';
    filtroAtual.direcao = 'desc';

    document.querySelectorAll('.ordenar-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  } else {
    const jaAtivo = btn.classList.contains('active');
    const direcaoAtual = btn.dataset.dir || 'desc';

    if (jaAtivo) {
      btn.dataset.dir = direcaoAtual === 'desc' ? 'asc' : 'desc';
    } else {
      btn.dataset.dir = 'desc';
    }

    document.querySelectorAll('.ordenar-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    filtroAtual.ordenar_por = ordem;
    filtroAtual.direcao = btn.dataset.dir;
  }

  carregarExtrato();
}

// ============================================
// CARREGAR EXTRATO
// ============================================

async function carregarExtrato(silencioso = false) {
  const params = new URLSearchParams();

  const dataInicio = document.getElementById('filtro-data-inicio').value;
  const dataFim = document.getElementById('filtro-data-fim').value;
  const tipo = document.getElementById('filtro-tipo').value;
  const busca = document.getElementById('filtro-busca').value;

  if (dataInicio) params.append('data_inicio', dataInicio);
  if (dataFim) params.append('data_fim', dataFim);
  if (tipo && tipo !== 'todos') params.append('tipo', tipo);
  if (busca) params.append('busca', busca);

  let ordenarFinal, direcaoFinal, labelAtual;

  if (filtroAtual.ordenar_por === 'auto') {
    const auto = calcularOrdenacaoAdaptativa(filtroAtual.periodo);
    ordenarFinal = auto.ordenar_por;
    direcaoFinal = auto.direcao;
    labelAtual = auto.label;
  } else {
    ordenarFinal = filtroAtual.ordenar_por;
    direcaoFinal = filtroAtual.direcao;
    const nomes = { data: 'Data', valor: 'Valor', tipo: 'Tipo' };
    const setas = { asc: '↑ crescente', desc: '↓ decrescente' };
    labelAtual = `Por ${nomes[ordenarFinal] || ordenarFinal} ${setas[direcaoFinal] || ''}`;
  }

  params.append('ordenar_por', ordenarFinal);
  params.append('direcao', direcaoFinal);

  const label = document.getElementById('ordenacao-atual');
  if (label) label.textContent = '📊 ' + labelAtual;

  const query = params.toString();
  const url = '/financeiro/extrato' + (query ? '?' + query : '');

  try {
    const dados = await apiGet(url);

    document.getElementById('fin-total-receitas').textContent = formatMoney(dados.total_receitas);
    document.getElementById('fin-total-despesas').textContent = formatMoney(dados.total_despesas);
    document.getElementById('fin-total-saldo').textContent = formatMoney(dados.saldo);
    document.getElementById('fin-total-qtd').textContent = dados.quantidade;

    renderizarTabela(dados.transacoes);
  } catch (err) {
    if (!silencioso) {
      console.error('Erro ao carregar extrato:', err);
    }
  }
}

function renderizarTabela(transacoes) {
  const tbody = document.querySelector('#tabela-financeiro tbody');
  tbody.innerHTML = '';

  if (transacoes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--cor-texto-suave); font-style:italic; padding:20px;">Nenhuma transação no período selecionado</td></tr>';
    return;
  }

  transacoes.forEach(t => {
    const tr = document.createElement('tr');
    const cor = t.tipo === 'receita' ? 'var(--cor-sucesso)' : 'var(--cor-erro)';
    const sinal = t.tipo === 'receita' ? '+' : '-';

    tr.innerHTML = `
      <td>${t.id}</td>
      <td>${formatDate(t.data_mov)}</td>
      <td><span style="color:${cor}; font-weight:600; text-transform:capitalize;">${t.tipo}</span></td>
      <td>${t.descricao || '-'}</td>
      <td><strong style="color:${cor};">${sinal} ${formatMoney(t.valor)}</strong></td>
      <td><button onclick="excluirFinanceiro(${t.id})">Excluir</button></td>`;
    tbody.appendChild(tr);
  });
}

async function excluirFinanceiro(id) {
  if (!confirm('Excluir lançamento?')) return;
  await apiDelete('/financeiro/' + id);
  carregarExtrato();
}

async function carregarFinanceiro() {
  aplicarFiltroPeriodo('hoje');
}

// ============================================
// AUTO-REFRESH (TEMPO REAL)
// ============================================

function iniciarAutoRefresh() {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);

  autoRefreshTimer = setInterval(() => {
    if (!autoRefreshAtivo) return;

    contadorSegundos++;
    atualizarIndicador();

    if (contadorSegundos >= INTERVALO_SEGUNDOS) {
      contadorSegundos = 0;
      carregarExtrato(true);
    }
  }, 1000);
}

function atualizarIndicador() {
  const texto = document.getElementById('live-texto');
  const indicador = document.getElementById('live-indicator');
  if (!texto || !indicador) return;

  if (!autoRefreshAtivo) {
    texto.textContent = 'Pausado';
    indicador.classList.add('pausado');
    return;
  }

  indicador.classList.remove('pausado');
  const restantes = INTERVALO_SEGUNDOS - contadorSegundos;
  texto.textContent = `Ao vivo (${restantes}s)`;
}

function toggleAutoRefresh() {
  autoRefreshAtivo = !autoRefreshAtivo;
  contadorSegundos = 0;

  const btn = document.getElementById('btn-toggle-live');

  if (autoRefreshAtivo) {
    btn.textContent = '⏸ Pausar';
    btn.classList.add('active');
    atualizarIndicador();
  } else {
    btn.textContent = '▶ Retomar';
    btn.classList.remove('active');
    atualizarIndicador();
  }
}

// ============================================
// EVENTOS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-financeiro');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await apiPost('/financeiro', {
        tipo: document.getElementById('fin-tipo').value,
        descricao: document.getElementById('fin-descricao').value,
        valor: parseFloat(document.getElementById('fin-valor').value) || 0
      });
      form.reset();
      carregarExtrato();
    });
  }

  iniciarAutoRefresh();
  atualizarIndicador();
});

// ============================================
// EXPORTAR PDF
// ============================================

async function exportarPDF() {
  try {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('Biblioteca de PDF não carregou. Verifique sua conexão.');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Busca os dados atuais (com filtros aplicados)
    const params = new URLSearchParams();
    const dataInicio = document.getElementById('filtro-data-inicio').value;
    const dataFim = document.getElementById('filtro-data-fim').value;
    const tipo = document.getElementById('filtro-tipo').value;
    const busca = document.getElementById('filtro-busca').value;

    if (dataInicio) params.append('data_inicio', dataInicio);
    if (dataFim) params.append('data_fim', dataFim);
    if (tipo && tipo !== 'todos') params.append('tipo', tipo);
    if (busca) params.append('busca', busca);

    // Ordenação atual
    let ordenarFinal, direcaoFinal;
    if (filtroAtual.ordenar_por === 'auto') {
      const auto = calcularOrdenacaoAdaptativa(filtroAtual.periodo);
      ordenarFinal = auto.ordenar_por;
      direcaoFinal = auto.direcao;
    } else {
      ordenarFinal = filtroAtual.ordenar_por;
      direcaoFinal = filtroAtual.direcao;
    }
    params.append('ordenar_por', ordenarFinal);
    params.append('direcao', direcaoFinal);

    const dados = await apiGet('/financeiro/extrato?' + params.toString());
    const transacoes = dados.transacoes;

    // CABEÇALHO
    doc.setFillColor(0, 138, 125);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('TechGest', 15, 13);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Extrato Financeiro - Garagem Tech', 15, 20);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Extrato Financeiro', 195, 15, { align: 'right' });

    // INFO DO PERÍODO
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    let y = 40;

    doc.setFont(undefined, 'bold');
    doc.text('Periodo:', 15, y);
    doc.setFont(undefined, 'normal');
    let periodoTexto = '';
    if (filtroAtual.periodo === 'hoje') periodoTexto = 'Hoje';
    else if (filtroAtual.periodo === 'semana') periodoTexto = 'Ultima semana';
    else if (filtroAtual.periodo === 'mes') periodoTexto = 'Mes atual';
    else if (filtroAtual.periodo === 'ano') periodoTexto = 'Ano atual';
    else if (filtroAtual.periodo === 'todos') periodoTexto = 'Todos os lancamentos';
    else periodoTexto = 'Personalizado';

    let dataTexto = periodoTexto;
    if (dataInicio && dataFim) {
      dataTexto += ` (${dataInicio} a ${dataFim})`;
    }
    doc.text(dataTexto, 40, y);

    doc.setFont(undefined, 'bold');
    doc.text('Gerado em:', 120, y);
    doc.setFont(undefined, 'normal');
    doc.text(new Date().toLocaleString('pt-BR'), 155, y);

    y += 6;
    if (tipo !== 'todos') {
      doc.setFont(undefined, 'bold');
      doc.text('Tipo:', 15, y);
      doc.setFont(undefined, 'normal');
      doc.text(tipo === 'receita' ? 'Somente Receitas' : 'Somente Despesas', 40, y);
      y += 6;
    }
    if (busca) {
      doc.setFont(undefined, 'bold');
      doc.text('Busca:', 15, y);
      doc.setFont(undefined, 'normal');
      doc.text(busca, 40, y);
      y += 6;
    }

    // TOTAIS
    y += 4;
    doc.setFillColor(230, 245, 243);
    doc.rect(15, y - 5, 180, 7, 'F');
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.text('RESUMO', 15, y);
    y += 8;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text('Total de Receitas:', 15, y);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(formatMoney(dados.total_receitas), 60, y);
    doc.setTextColor(0, 0, 0);

    doc.setFont(undefined, 'normal');
    doc.text('Total de Despesas:', 110, y);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(239, 68, 68);
    doc.text(formatMoney(dados.total_despesas), 155, y);
    doc.setTextColor(0, 0, 0);
    y += 6;

    doc.setFont(undefined, 'normal');
    doc.text('Saldo do Periodo:', 15, y);
    doc.setFont(undefined, 'bold');
    const corSaldo = dados.saldo >= 0 ? [16, 185, 129] : [239, 68, 68];
    doc.setTextColor(corSaldo[0], corSaldo[1], corSaldo[2]);
    doc.text(formatMoney(dados.saldo), 60, y);
    doc.setTextColor(0, 0, 0);

    doc.setFont(undefined, 'normal');
    doc.text('Transacoes:', 110, y);
    doc.setFont(undefined, 'bold');
    doc.text(String(dados.quantidade), 155, y);

    // TABELA
    y += 12;
    doc.setFillColor(0, 138, 125);
    doc.setTextColor(255, 255, 255);
    doc.rect(15, y - 5, 180, 7, 'F');
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.text('TRANSACOES', 15, y);
    y += 8;

    // Cabeçalho da tabela
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(60, 60, 60);
    doc.rect(15, y - 4, 180, 6, 'F');
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Data', 17, y);
    doc.text('Tipo', 50, y);
    doc.text('Descricao', 80, y);
    doc.text('Valor', 175, y, { align: 'right' });
    y += 6;

    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');

    transacoes.forEach(t => {
      // Quebra de página
      if (y > 275) {
        doc.addPage();
        y = 20;
      }

      const dataStr = new Date(t.data_mov).toLocaleDateString('pt-BR');
      const tipoStr = t.tipo === 'receita' ? 'Receita' : 'Despesa';
      const desc = (t.descricao || '-').substring(0, 45);
      const valorStr = (t.tipo === 'receita' ? '+' : '-') + ' ' + formatMoney(t.valor);

      doc.setFontSize(9);
      doc.text(dataStr, 17, y);
      doc.text(tipoStr, 50, y);
      doc.text(desc, 80, y);

      if (t.tipo === 'receita') doc.setTextColor(16, 185, 129);
      else doc.setTextColor(239, 68, 68);

      doc.setFont(undefined, 'bold');
      doc.text(valorStr, 193, y, { align: 'right' });
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);

      y += 5;
    });

    // RODAPÉ
    const alturaPagina = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      'Documento gerado em ' + new Date().toLocaleString('pt-BR') + ' pelo sistema TechGest',
      105,
      alturaPagina - 10,
      { align: 'center' }
    );

    // Nome do arquivo
    const nomeArquivo = 'Extrato-' + filtroAtual.periodo + '-' + formatarDataISO(new Date()) + '.pdf';
    doc.save(nomeArquivo);

  } catch (err) {
    alert('Erro ao gerar PDF: ' + err.message);
    console.error(err);
  }
}

// ============================================
// EXPORTAR CSV
// ============================================

async function exportarCSV() {
  try {
    const params = new URLSearchParams();
    const dataInicio = document.getElementById('filtro-data-inicio').value;
    const dataFim = document.getElementById('filtro-data-fim').value;
    const tipo = document.getElementById('filtro-tipo').value;
    const busca = document.getElementById('filtro-busca').value;

    if (dataInicio) params.append('data_inicio', dataInicio);
    if (dataFim) params.append('data_fim', dataFim);
    if (tipo && tipo !== 'todos') params.append('tipo', tipo);
    if (busca) params.append('busca', busca);

    let ordenarFinal, direcaoFinal;
    if (filtroAtual.ordenar_por === 'auto') {
      const auto = calcularOrdenacaoAdaptativa(filtroAtual.periodo);
      ordenarFinal = auto.ordenar_por;
      direcaoFinal = auto.direcao;
    } else {
      ordenarFinal = filtroAtual.ordenar_por;
      direcaoFinal = filtroAtual.direcao;
    }
    params.append('ordenar_por', ordenarFinal);
    params.append('direcao', direcaoFinal);

    const dados = await apiGet('/financeiro/extrato?' + params.toString());
    const transacoes = dados.transacoes;

    // Monta o CSV
    const linhas = [];

    // Cabeçalho
    linhas.push('Data;Tipo;Descricao;Valor');
    linhas.push(';;;');

    // Linhas de dados
    transacoes.forEach(t => {
      const dataStr = new Date(t.data_mov).toLocaleDateString('pt-BR');
      const tipoStr = t.tipo === 'receita' ? 'Receita' : 'Despesa';
      const desc = (t.descricao || '').replace(/;/g, ','); // remove ponto-vírgula da descrição
      const valorStr = (t.valor || 0).toFixed(2).replace('.', ',');

      linhas.push(`${dataStr};${tipoStr};${desc};${valorStr}`);
    });

    // Totais
    linhas.push(';;;');
    linhas.push(`;;Total Receitas;${dados.total_receitas.toFixed(2).replace('.', ',')}`);
    linhas.push(`;;Total Despesas;${dados.total_despesas.toFixed(2).replace('.', ',')}`);
    linhas.push(`;;Saldo;${dados.saldo.toFixed(2).replace('.', ',')}`);

    const csv = linhas.join('\n');

    // Cria o arquivo e força download
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const nomeArquivo = 'Extrato-' + filtroAtual.periodo + '-' + formatarDataISO(new Date()) + '.csv';
    link.download = nomeArquivo;
    link.click();
    URL.revokeObjectURL(url);

  } catch (err) {
    alert('Erro ao gerar CSV: ' + err.message);
    console.error(err);
  }
}