// ============================================
// VENDAS
// ============================================

let itensVenda = [];

function renderItensVenda() {
  const div = document.getElementById('venda-itens');
  if (!div) return;

  if (itensVenda.length === 0) {
    div.innerHTML = '<div class="vazio">Nenhum item adicionado</div>';
    const elTot = document.getElementById('venda-total');
    if (elTot) elTot.value = 0;
    return;
  }
  div.innerHTML = '';
  let total = 0;
  itensVenda.forEach((item, i) => {
    total += item.preco * item.quantidade;
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `${item.nome} — ${item.quantidade}x ${formatMoney(item.preco)} = <strong>${formatMoney(item.preco * item.quantidade)}</strong>
      <button type="button" onclick="removerItemVenda(${i})" style="float:right">x</button>`;
    div.appendChild(el);
  });
  document.getElementById('venda-total').value = total.toFixed(2);
}

function removerItemVenda(i) {
  itensVenda.splice(i, 1);
  renderItensVenda();
}

async function carregarVendas() {
  const lista = await apiGet('/vendas');
  const tbody = document.querySelector('#tabela-vendas tbody');
  tbody.innerHTML = '';
  lista.forEach(v => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${v.id}</td>
      <td>${v.cliente_nome || '-'}</td>
      <td>${formatMoney(v.valor_total)}</td>
      <td>${v.forma_pagamento || '-'}</td>
      <td>${formatDate(v.data_venda)}</td>
      <td>
        <button class="btn-ver" onclick="verVenda(${v.id})">Ver</button>
        <button onclick="excluirVenda(${v.id})">Excluir</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

async function verVenda(id) {
  const lista = await apiGet('/vendas');
  const v = lista.find(x => x.id === id);
  if (!v) return;

  let itensHTML = '<div class="vazio">Sem itens</div>';
  try {
    const itens = JSON.parse(v.itens || '[]');
    if (itens.length > 0) {
      itensHTML = itens.map(i =>
        `<div class="item">${i.nome || i.descricao || 'Item'} — ${i.quantidade}x ${formatMoney(i.preco)} = <strong>${formatMoney((i.preco || 0) * (i.quantidade || 1))}</strong></div>`
      ).join('');
    }
  } catch (e) { /* mantém o padrão */ }

  const html = `
    <div class="info-linha"><strong>Venda</strong><span>#${v.id}</span></div>
    <div class="info-linha"><strong>Cliente</strong><span>${v.cliente_nome || '-'}</span></div>
    <div class="info-linha"><strong>Funcionário</strong><span>${v.funcionario_nome || '-'}</span></div>
    <div class="info-linha"><strong>Valor total</strong><span>${formatMoney(v.valor_total)}</span></div>
    <div class="info-linha"><strong>Forma pagamento</strong><span>${v.forma_pagamento || '-'}</span></div>
    <div class="info-linha"><strong>Data</strong><span>${formatDate(v.data_venda)}</span></div>
    <div style="margin-top:16px;">
      <strong style="display:block; margin-bottom:8px; color:var(--cor-texto-suave); font-size:13px;">ITENS DA VENDA</strong>
      <div class="lista">${itensHTML}</div>
    </div>
  `;

  abrirModalVer('Detalhes da Venda', html);
}

async function excluirVenda(id) {
  if (!confirm('Excluir venda?')) return;
  await apiDelete('/vendas/' + id);
  carregarVendas();
}

document.addEventListener('DOMContentLoaded', () => {
  const btnAdd = document.getElementById('btn-add-item');
  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      const sel = document.getElementById('venda-produto');
      const opt = sel.options[sel.selectedIndex];
      const qtd = parseInt(document.getElementById('venda-qtd').value) || 1;
      if (!sel.value) return alert('Selecione um produto/serviço');

      itensVenda.push({
        produto_id: parseInt(sel.value),
        nome: opt.dataset.nome,
        preco: parseFloat(opt.dataset.preco),
        quantidade: qtd,
        imei: document.getElementById('venda-imei').value || null,
        numero_serie: document.getElementById('venda-serie').value || null
      });

      document.getElementById('venda-imei').value = '';
      document.getElementById('venda-serie').value = '';
      renderItensVenda();
    });
  }

  const form = document.getElementById('form-venda');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (itensVenda.length === 0) return alert('Adicione ao menos um item');

      const total = itensVenda.reduce((s, i) => s + i.preco * i.quantidade, 0);

      await apiPost('/vendas', {
        cliente_id: parseInt(document.getElementById('venda-cliente').value) || null,
        funcionario_id: parseInt(document.getElementById('venda-funcionario').value) || null,
        itens: itensVenda,
        valor_total: total,
        forma_pagamento: document.getElementById('venda-pagamento').value
      });

      itensVenda = [];
      renderItensVenda();
      form.reset();
      carregarVendas();
      carregarProdutos();
    });
  }

  renderItensVenda();
});