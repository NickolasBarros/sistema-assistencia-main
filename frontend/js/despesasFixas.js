// ============================================
// DESPESAS FIXAS
// ============================================

async function carregarDespesasFixas() {
  const lista = await apiGet('/despesasFixas');
  const tbody = document.querySelector('#tabela-despesas-fixas tbody');
  tbody.innerHTML = '';

  lista.forEach(d => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${d.id}</td>
      <td>${d.descricao}</td>
      <td>${formatMoney(d.valor)}</td>
      <td>Dia ${d.dia_vencimento || '-'}</td>
      <td>
        <button class="btn-ver" onclick="verDespesaFixa(${d.id})">Ver</button>
        <button onclick="excluirDespesaFixa(${d.id})">Excluir</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

async function verDespesaFixa(id) {
  const lista = await apiGet('/despesasFixas');
  const d = lista.find(x => x.id === id);
  if (!d) return;

  const html = `
    <div class="info-linha"><strong>ID</strong><span>${d.id}</span></div>
    <div class="info-linha"><strong>Descrição</strong><span>${d.descricao || '-'}</span></div>
    <div class="info-linha"><strong>Valor</strong><span>${formatMoney(d.valor)}</span></div>
    <div class="info-linha"><strong>Dia vencimento</strong><span>${d.dia_vencimento || '-'}</span></div>
    <div class="info-linha"><strong>Ativo</strong><span>${d.ativo ? 'Sim' : 'Não'}</span></div>
    <div class="info-linha"><strong>Criado em</strong><span>${formatDate(d.criado_em)}</span></div>
  `;

  abrirModalVer('Detalhes da Despesa Fixa', html);
}

async function excluirDespesaFixa(id) {
  if (!confirm('Excluir despesa fixa?')) return;
  await apiDelete('/despesasFixas/' + id);
  carregarDespesasFixas();
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-despesa-fixa');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = {
      descricao: document.getElementById('despesa-descricao').value,
      valor: parseFloat(document.getElementById('despesa-valor').value) || 0,
      dia_vencimento: parseInt(document.getElementById('despesa-dia').value) || null
    };

    await apiPost('/despesasFixas', dados);
    form.reset();
    carregarDespesasFixas();
  });
});