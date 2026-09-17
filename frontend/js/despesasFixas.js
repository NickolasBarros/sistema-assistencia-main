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
      <td><button onclick="excluirDespesaFixa(${d.id})">Excluir</button></td>`;
    tbody.appendChild(tr);
  });
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