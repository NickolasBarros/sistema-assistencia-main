// ============================================
// ESTOQUE
// ============================================

async function carregarEstoque() {
  const lista = await apiGet('/estoque/movimentacoes');
  const tbody = document.querySelector('#tabela-estoque tbody');
  tbody.innerHTML = '';
  lista.forEach(m => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${m.id}</td>
      <td>${m.produto_nome || '-'}</td>
      <td>${m.funcionario_nome || '-'}</td>
      <td>${m.tipo}</td>
      <td>${m.quantidade}</td>
      <td>${formatDate(m.data_mov)}</td>`;
    tbody.appendChild(tr);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-estoque');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await apiPost('/estoque/movimentar', {
        produto_id: parseInt(document.getElementById('estoque-produto').value),
        funcionario_id: parseInt(document.getElementById('estoque-funcionario').value) || null,
        tipo: document.getElementById('estoque-tipo').value,
        quantidade: parseInt(document.getElementById('estoque-qtd').value),
        observacao: document.getElementById('estoque-obs').value
      });
      form.reset();
      carregarEstoque();
      carregarProdutos();
    } catch (err) {
      alert(err.message);
    }
  });
});