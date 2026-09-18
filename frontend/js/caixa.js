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
}

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

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-caixa');
  if (!form) return;

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
});