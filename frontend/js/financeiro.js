async function carregarFinanceiro() {
  const lista = await apiGet('/financeiro');
  const tbody = document.querySelector('#tabela-financeiro tbody');
  tbody.innerHTML = '';
  lista.forEach(f => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${f.id}</td>
      <td>${f.tipo}</td>
      <td>${f.descricao || '-'}</td>
      <td>${formatMoney(f.valor)}</td>
      <td>${formatDate(f.data_mov)}</td>
      <td><button onclick="excluirFinanceiro(${f.id})">Excluir</button></td>`;
    tbody.appendChild(tr);
  });
}

async function excluirFinanceiro(id) {
  if (!confirm('Excluir lançamento?')) return;
  await apiDelete('/financeiro/' + id);
  carregarFinanceiro();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('form-financeiro').addEventListener('submit', async (e) => {
    e.preventDefault();
    await apiPost('/financeiro', {
      tipo: document.getElementById('fin-tipo').value,
      descricao: document.getElementById('fin-descricao').value,
      valor: parseFloat(document.getElementById('fin-valor').value)
    });
    e.target.reset();
    carregarFinanceiro();
  });
});
