async function carregarOrcamentos() {
  const lista = await apiGet('/orcamentos');
  const tbody = document.querySelector('#tabela-orcamentos tbody');
  tbody.innerHTML = '';
  lista.forEach(o => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${o.id}</td>
      <td>${o.cliente_nome || '-'}</td>
      <td>${o.descricao || '-'}</td>
      <td>${formatMoney(o.valor_total)}</td>
      <td>${o.status}</td>
      <td>
        <button class="edit" onclick="editarOrcamento(${o.id})">Editar</button>
        <button onclick="excluirOrcamento(${o.id})">Excluir</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

async function editarOrcamento(id) {
  const lista = await apiGet('/orcamentos');
  const o = lista.find(x => x.id === id);
  if (!o) return;
  document.getElementById('orcamento-id').value = o.id;
  document.getElementById('orcamento-cliente').value = o.cliente_id || '';
  document.getElementById('orcamento-descricao').value = o.descricao || '';
  document.getElementById('orcamento-valor').value = o.valor_total || 0;
  document.getElementById('orcamento-status').value = o.status || 'Pendente';
  document.getElementById('cancel-orcamento').style.display = 'inline-block';
}

async function excluirOrcamento(id) {
  if (!confirm('Excluir orçamento?')) return;
  await apiDelete('/orcamentos/' + id);
  carregarOrcamentos();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('form-orcamento').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('orcamento-id').value;
    const dados = {
      cliente_id: parseInt(document.getElementById('orcamento-cliente').value) || null,
      descricao: document.getElementById('orcamento-descricao').value,
      valor_total: parseFloat(document.getElementById('orcamento-valor').value) || 0,
      status: document.getElementById('orcamento-status').value,
      itens: []
    };
    if (id) await apiPut('/orcamentos/' + id, dados);
    else await apiPost('/orcamentos', dados);
    e.target.reset();
    document.getElementById('orcamento-id').value = '';
    document.getElementById('cancel-orcamento').style.display = 'none';
    carregarOrcamentos();
  });

  document.getElementById('cancel-orcamento').addEventListener('click', () => {
    document.getElementById('form-orcamento').reset();
    document.getElementById('orcamento-id').value = '';
    document.getElementById('cancel-orcamento').style.display = 'none';
  });
});
