// ============================================
// CAIXA
// ============================================

async function carregarCaixa() {
  const lista = await apiGet('/caixa');
  const tbody = document.querySelector('#tabela-caixa tbody');
  tbody.innerHTML = '';

  lista.forEach(c => {
    const tr = document.createElement('tr');
    const sinal = c.tipo === 'entrada' ? '+' : '-';
    tr.innerHTML = `
      <td>${c.id}</td>
      <td>${c.tipo}</td>
      <td>${c.descricao || '-'}</td>
      <td>${sinal} ${formatMoney(c.valor)}</td>
      <td>${c.forma_pagamento || '-'}</td>
      <td>${c.parcelas > 1 ? c.parcelas + 'x' : '1x'}</td>
      <td>${formatDate(c.data_mov)}</td>
      <td>
        <button class="btn-ver" onclick="verMovCaixa(${c.id})">Ver</button>
        <button onclick="excluirCaixa(${c.id})">Excluir</button>
      </td>`;
    tbody.appendChild(tr);
  });

  await carregarSaldoCaixa();
  await carregarResumoPagamentos();
  await carregarSessaoCaixa();
  await carregarHistoricoCaixa();
}

// ============================================
// SESSÃO DO CAIXA (ABRIR/FECHAR)
// ============================================

async function carregarSessaoCaixa() {
  const dados = await apiGet('/caixa/sessao-atual');
  const painel = document.getElementById('caixa-sessao-painel');
  if (!painel) return;

  if (!dados.aberto) {
    painel.innerHTML = `
      <div class="form-box" style="border-left:4px solid var(--cor-aviso);">
        <h2 style="display:flex; align-items:center; gap:8px;">
          <span style="width:10px; height:10px; border-radius:50%; background:var(--cor-aviso); display:inline-block;"></span>
          Caixa Fechado
        </h2>
        <p style="color:var(--cor-texto-suave); font-size:14px; margin-bottom:16px;">
          Nenhuma sessão em andamento. Abra o caixa para iniciar o dia.
        </p>
        <button onclick="abrirModalAbrirCaixa()">Abrir Caixa</button>
      </div>
    `;
    return;
  }

  const r = dados.resumo;
  painel.innerHTML = `
    <div class="form-box" style="border-left:4px solid var(--cor-sucesso);">
      <h2 style="display:flex; align-items:center; gap:8px;">
        <span style="width:10px; height:10px; border-radius:50%; background:var(--cor-sucesso); display:inline-block;"></span>
        Caixa Aberto
      </h2>
      <p style="color:var(--cor-texto-suave); font-size:13px; margin-bottom:16px;">
        Aberto em: <strong>${formatDate(dados.sessao.data_abertura)}</strong>
      </p>

      <div class="cards-grid" style="margin-bottom:16px;">
        <div class="card caixa"><h3>Valor Inicial</h3><p>${formatMoney(r.valor_inicial)}</p></div>
        <div class="card lucro"><h3>Entradas</h3><p>${formatMoney(r.entradas)}</p></div>
        <div class="card despesa"><h3>Saídas</h3><p>${formatMoney(r.saidas)}</p></div>
        <div class="card aviso"><h3>Esperado</h3><p>${formatMoney(r.esperado)}</p></div>
      </div>

      <div style="display:flex; gap:8px;">
        <button onclick="verExtrato(${dados.sessao.id})">Ver Extrato</button>
        <button onclick="abrirModalFecharCaixa(${dados.sessao.id}, ${r.esperado})" class="btn-secondary">Fechar Caixa</button>
      </div>
    </div>
  `;
}

function abrirModalAbrirCaixa() {
  document.getElementById('abrir-valor-inicial').value = '';
  document.getElementById('abrir-observacao').value = '';
  document.getElementById('modal-abrir-caixa').classList.add('active');
  setTimeout(() => document.getElementById('abrir-valor-inicial').focus(), 100);
}

function fecharModalAbrirCaixa() {
  document.getElementById('modal-abrir-caixa').classList.remove('active');
}

function abrirModalFecharCaixa(sessaoId, esperado) {
  document.getElementById('fechar-valor-contado').value = '';
  document.getElementById('fechar-observacao').value = '';
  document.getElementById('fechar-resumo').innerHTML = `
    <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
      <span>Valor esperado na gaveta:</span>
      <strong style="color:var(--cor-primaria-escura); font-size:16px;">${formatMoney(esperado)}</strong>
    </div>
    <small style="color:var(--cor-texto-suave); font-size:12px;">
      É o valor inicial + entradas − saídas desde a abertura.
    </small>
  `;
  document.getElementById('form-fechar-caixa').dataset.esperado = esperado;
  document.getElementById('modal-fechar-caixa').classList.add('active');
  setTimeout(() => document.getElementById('fechar-valor-contado').focus(), 100);
}

function fecharModalFecharCaixa() {
  document.getElementById('modal-fechar-caixa').classList.remove('active');
}

// ============================================
// HISTÓRICO DE FECHAMENTOS
// ============================================

async function carregarHistoricoCaixa() {
  const lista = await apiGet('/caixa/historico');
  const tbody = document.querySelector('#tabela-historico-caixa tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--cor-texto-suave); font-style:italic; padding:20px;">Nenhum fechamento registrado ainda</td></tr>';
    return;
  }

  lista.forEach(s => {
    const dif = s.diferenca || 0;
    let difTexto, difCor;
    if (Math.abs(dif) < 0.01) {
      difTexto = 'OK';
      difCor = 'var(--cor-sucesso)';
    } else if (dif > 0) {
      difTexto = '+' + formatMoney(dif);
      difCor = 'var(--cor-sucesso)';
    } else {
      difTexto = formatMoney(dif);
      difCor = 'var(--cor-erro)';
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.id}</td>
      <td>${formatDate(s.data_abertura)}</td>
      <td>${formatDate(s.data_fechamento)}</td>
      <td>${formatMoney(s.valor_inicial)}</td>
      <td>${formatMoney(s.valor_esperado)}</td>
      <td>${formatMoney(s.valor_contado)}</td>
      <td><strong style="color:${difCor};">${difTexto}</strong></td>
      <td><button class="btn-ver" onclick="verExtrato(${s.id})">Ver Extrato</button></td>`;
    tbody.appendChild(tr);
  });
}

// ============================================
// EXTRATO DE UMA SESSÃO
// ============================================

async function verExtrato(id) {
  try {
    const dados = await apiGet('/caixa/extrato/' + id);
    const s = dados.sessao;
    const movs = dados.movimentacoes || [];

    let movsHTML = '<div class="vazio">Nenhuma movimentação nesta sessão</div>';
    if (movs.length > 0) {
      movsHTML = movs.map(m => {
        const sinal = m.tipo === 'entrada' ? '+' : '−';
        const cor = m.tipo === 'entrada' ? 'var(--cor-sucesso)' : 'var(--cor-erro)';
        return `<div class="item">
          <strong>${formatDate(m.data_mov)}</strong> — 
          ${m.descricao || '-'} 
          <span style="color:${cor}; font-weight:600;">${sinal} ${formatMoney(m.valor)}</span>
          ${m.forma_pagamento ? `<small style="color:var(--cor-texto-suave);"> (${m.forma_pagamento}${m.parcelas > 1 ? ' ' + m.parcelas + 'x' : ''})</small>` : ''}
        </div>`;
      }).join('');
    }

    const dif = s.diferenca || 0;
    let difTexto = 'R$ 0,00', difCor = 'var(--cor-sucesso)';
    if (Math.abs(dif) >= 0.01) {
      difTexto = (dif > 0 ? '+' : '') + formatMoney(dif);
      difCor = dif > 0 ? 'var(--cor-sucesso)' : 'var(--cor-erro)';
    }

    const html = `
      <div class="info-linha"><strong>Sessão</strong><span>#${s.id}</span></div>
      <div class="info-linha"><strong>Abertura</strong><span>${formatDate(s.data_abertura)}</span></div>
      <div class="info-linha"><strong>Fechamento</strong><span>${formatDate(s.data_fechamento)}</span></div>
      <div class="info-linha"><strong>Valor inicial</strong><span>${formatMoney(s.valor_inicial)}</span></div>
      <div class="info-linha"><strong>Valor esperado</strong><span>${formatMoney(s.valor_esperado)}</span></div>
      <div class="info-linha"><strong>Valor contado</strong><span>${formatMoney(s.valor_contado)}</span></div>
      <div class="info-linha"><strong>Diferença</strong><span style="color:${difCor}; font-weight:700;">${difTexto}</span></div>
      <div class="info-linha"><strong>Observação</strong><span>${s.observacao || '-'}</span></div>
      <div style="margin-top:16px;">
        <strong style="display:block; margin-bottom:8px; color:var(--cor-texto-suave); font-size:13px; text-transform:uppercase;">Movimentações da Sessão</strong>
        <div class="lista">${movsHTML}</div>
      </div>
    `;

    abrirModalVer('Extrato da Sessão #' + s.id, html);
  } catch (err) {
    alert('Erro ao carregar extrato: ' + err.message);
  }
}

// ============================================
// RESTO (SALDO, RESUMO, VER MOV, EXCLUIR)
// ============================================

async function verMovCaixa(id) {
  const lista = await apiGet('/caixa');
  const c = lista.find(x => x.id === id);
  if (!c) return;

  const html = `
    <div class="info-linha"><strong>ID</strong><span>${c.id}</span></div>
    <div class="info-linha"><strong>Tipo</strong><span>${c.tipo || '-'}</span></div>
    <div class="info-linha"><strong>Descrição</strong><span>${c.descricao || '-'}</span></div>
    <div class="info-linha"><strong>Valor</strong><span>${formatMoney(c.valor)}</span></div>
    <div class="info-linha"><strong>Forma pagamento</strong><span>${c.forma_pagamento || '-'}</span></div>
    <div class="info-linha"><strong>Parcelas</strong><span>${c.parcelas > 1 ? c.parcelas + 'x' : '1x'}</span></div>
    <div class="info-linha"><strong>Data</strong><span>${formatDate(c.data_mov)}</span></div>
  `;

  abrirModalVer('Detalhes da Movimentação', html);
}

async function carregarSaldoCaixa() {
  const resumo = await apiGet('/caixa/saldo');
  const el1 = document.getElementById('caixa-saldo');
  const el2 = document.getElementById('caixa-entradas');
  const el3 = document.getElementById('caixa-saidas');
  if (el1) el1.textContent = formatMoney(resumo.saldo);
  if (el2) el2.textContent = formatMoney(resumo.entradas);
  if (el3) el3.textContent = formatMoney(resumo.saidas);
}

async function carregarResumoPagamentos() {
  const lista = await apiGet('/caixa/resumo-pagamentos');
  const div = document.getElementById('caixa-por-pagamento');
  if (!div) return;

  if (lista.length === 0) {
    div.innerHTML = '<div class="card"><h3>Nenhuma entrada</h3><p>R$ 0,00</p></div>';
    return;
  }

  div.innerHTML = lista.map(p => `
    <div class="card lucro">
      <h3>${p.forma_pagamento}</h3>
      <p>${formatMoney(p.total)}</p>
      <small style="color:var(--cor-texto-suave); font-size:12px;">
        ${p.quantidade} venda(s)${p.com_parcelas > 0 ? ' • ' + p.com_parcelas + ' parcelada(s)' : ''}
      </small>
    </div>
  `).join('');
}

async function excluirCaixa(id) {
  if (!confirm('Excluir movimentação do caixa?')) return;
  await apiDelete('/caixa/' + id);
  carregarCaixa();
}

// ============================================
// EVENTOS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-caixa');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const dados = {
        tipo: document.getElementById('caixa-tipo').value,
        descricao: document.getElementById('caixa-descricao').value,
        valor: parseFloat(document.getElementById('caixa-valor').value) || 0,
        forma_pagamento: document.getElementById('caixa-forma-pagamento').value || null,
        parcelas: parseInt(document.getElementById('caixa-parcelas').value) || 1
      };

      if (dados.valor <= 0) {
        alert('O valor deve ser maior que zero.');
        return;
      }

      await apiPost('/caixa', dados);
      form.reset();
      carregarCaixa();
    });
  }

  // Form de abrir caixa
  const formAbrir = document.getElementById('form-abrir-caixa');
  if (formAbrir) {
    formAbrir.addEventListener('submit', async (e) => {
      e.preventDefault();
      const dados = {
        valor_inicial: parseFloat(document.getElementById('abrir-valor-inicial').value) || 0,
        observacao: document.getElementById('abrir-observacao').value
      };
      await apiPost('/caixa/abrir', dados);
      fecharModalAbrirCaixa();
      carregarCaixa();
    });
  }

  // Form de fechar caixa
  const formFechar = document.getElementById('form-fechar-caixa');
  if (formFechar) {
    formFechar.addEventListener('submit', async (e) => {
      e.preventDefault();
      const contado = parseFloat(document.getElementById('fechar-valor-contado').value) || 0;
      const esperado = parseFloat(formFechar.dataset.esperado) || 0;
      const dif = contado - esperado;

      let msg = `Confirmar fechamento?\n\nEsperado: ${formatMoney(esperado)}\nContado: ${formatMoney(contado)}\nDiferença: ${formatMoney(dif)}`;
      if (!confirm(msg)) return;

      const dados = {
        valor_contado: contado,
        observacao: document.getElementById('fechar-observacao').value
      };
      await apiPost('/caixa/fechar', dados);
      fecharModalFecharCaixa();
      carregarCaixa();
    });
  }

  // Fechar modais ao clicar fora ou ESC
  ['modal-abrir-caixa', 'modal-fechar-caixa'].forEach(id => {
    const m = document.getElementById(id);
    if (m) {
      m.addEventListener('click', (e) => {
        if (e.target === m) m.classList.remove('active');
      });
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      fecharModalAbrirCaixa();
      fecharModalFecharCaixa();
    }
  });
});