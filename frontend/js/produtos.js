// ============================================
// PRODUTOS E SERVIÇOS
// ============================================

async function carregarProdutos() {
  const lista = await apiGet('/produtos');
  const tbody = document.querySelector('#tabela-produtos tbody');
  tbody.innerHTML = '';
  lista.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.nome}</td>
      <td>${p.tipo}</td>
      <td>${formatMoney(p.preco)}</td>
      <td>${p.quantidade}</td>
      <td>${p.funcionario_nome || '-'}</td>
      <td>
        <button class="btn-ver" onclick="verProduto(${p.id})">Ver</button>
        <button class="edit" onclick="editarProduto(${p.id})">Editar</button>
        <button onclick="excluirProduto(${p.id})">Excluir</button>
      </td>`;
    tbody.appendChild(tr);
  });
  await atualizarSelectsProdutos();
}

async function verProduto(id) {
  const lista = await apiGet('/produtos');
  const p = lista.find(x => x.id === id);
  if (!p) return;

  const html = `
    <div class="info-linha"><strong>ID</strong><span>${p.id}</span></div>
    <div class="info-linha"><strong>Nome</strong><span>${p.nome || '-'}</span></div>
    <div class="info-linha"><strong>Tipo</strong><span>${p.tipo || '-'}</span></div>
    <div class="info-linha"><strong>Descrição</strong><span>${p.descricao || '-'}</span></div>
    <div class="info-linha"><strong>Preço</strong><span>${formatMoney(p.preco)}</span></div>
    <div class="info-linha"><strong>Quantidade</strong><span>${p.quantidade || 0}</span></div>
    <div class="info-linha"><strong>Estoque mínimo</strong><span>${p.estoque_minimo || 0}</span></div>
    <div class="info-linha"><strong>IMEI</strong><span>${p.imei || '-'}</span></div>
    <div class="info-linha"><strong>Nº Série</strong><span>${p.numero_serie || '-'}</span></div>
    <div class="info-linha"><strong>Funcionário</strong><span>${p.funcionario_nome || '-'}</span></div>
    <div class="info-linha"><strong>Cadastrado em</strong><span>${formatDate(p.criado_em)}</span></div>
  `;

  abrirModalVer('Detalhes do Produto/Serviço', html);
}

async function editarProduto(id) {
  const lista = await apiGet('/produtos');
  const p = lista.find(x => x.id === id);
  if (!p) return;
  document.getElementById('produto-id').value = p.id;
  document.getElementById('produto-nome').value = p.nome || '';
  document.getElementById('produto-tipo').value = p.tipo || 'produto';
  document.getElementById('produto-descricao').value = p.descricao || '';
  document.getElementById('produto-preco').value = p.preco || 0;
  document.getElementById('produto-quantidade').value = p.quantidade || 0;
  document.getElementById('produto-minimo').value = p.estoque_minimo || 0;
  document.getElementById('produto-imei').value = p.imei || '';
  document.getElementById('produto-serie').value = p.numero_serie || '';
  document.getElementById('produto-funcionario').value = p.funcionario_id || '';
  document.getElementById('cancel-produto').style.display = 'inline-block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function excluirProduto(id) {
  if (!confirm('Excluir produto/serviço?')) return;
  await apiDelete('/produtos/' + id);
  carregarProdutos();
}

async function atualizarSelectsProdutos() {
  const lista = await apiGet('/produtos');
  const s1 = document.getElementById('estoque-produto');
  const s2 = document.getElementById('venda-produto');

  if (s1) {
    s1.innerHTML = '<option value="">Selecione o produto...</option>';
    lista.filter(p => p.tipo === 'produto').forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.nome} (Qtd: ${p.quantidade})`;
      s1.appendChild(opt);
    });
  }

  if (s2) {
    s2.innerHTML = '<option value="">Selecione o item...</option>';
    lista.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.nome} - ${formatMoney(p.preco)}`;
      opt.dataset.preco = p.preco;
      opt.dataset.nome = p.nome;
      opt.dataset.tipo = p.tipo;
      s2.appendChild(opt);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-produto');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('produto-id').value;
    const dados = {
      nome: document.getElementById('produto-nome').value,
      tipo: document.getElementById('produto-tipo').value,
      descricao: document.getElementById('produto-descricao').value,
      preco: parseFloat(document.getElementById('produto-preco').value) || 0,
      quantidade: parseInt(document.getElementById('produto-quantidade').value) || 0,
      estoque_minimo: parseInt(document.getElementById('produto-minimo').value) || 0,
      imei: document.getElementById('produto-imei').value,
      numero_serie: document.getElementById('produto-serie').value,
      funcionario_id: parseInt(document.getElementById('produto-funcionario').value) || null
    };

    if (id) await apiPut('/produtos/' + id, dados);
    else await apiPost('/produtos', dados);

    form.reset();
    document.getElementById('produto-id').value = '';
    document.getElementById('cancel-produto').style.display = 'none';
    carregarProdutos();
  });

  const btnCancel = document.getElementById('cancel-produto');
  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      form.reset();
      document.getElementById('produto-id').value = '';
      btnCancel.style.display = 'none';
    });
  }
});