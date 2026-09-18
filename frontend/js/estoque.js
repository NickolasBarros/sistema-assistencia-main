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
      <td>${formatDate(m.data_mov)}</td>
      <td><button class="btn-ver" onclick="verMovimentacao(${m.id})">Ver</button></td>`;
    tbody.appendChild(tr);
  });
}

async function verMovimentacao(id) {
  const lista = await apiGet('/estoque/movimentacoes');
  const m = lista.find(x => x.id === id);
  if (!m) return;

  const html = `
    <div class="info-linha"><strong>ID</strong><span>${m.id}</span></div>
    <div class="info-linha"><strong>Produto</strong><span>${m.produto_nome || '-'}</span></div>
    <div class="info-linha"><strong>Funcionário</strong><span>${m.funcionario_nome || '-'}</span></div>
    <div class="info-linha"><strong>Tipo</strong><span>${m.tipo || '-'}</span></div>
    <div class="info-linha"><strong>Quantidade</strong><span>${m.quantidade}</span></div>
    <div class="info-linha"><strong>Observação</strong><span>${m.observacao || '-'}</span></div>
    <div class="info-linha"><strong>Data</strong><span>${formatDate(m.data_mov)}</span></div>
  `;

  abrirModalVer('Detalhes da Movimentação', html);
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