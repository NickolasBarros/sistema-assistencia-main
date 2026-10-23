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
      <td>${p.imagem_id ? `<img class="produto-miniatura" src="/api/midias/${p.imagem_id}/arquivo" alt="" loading="lazy">` : ''}${p.nome}</td>
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
    <div class="os-fotos" id="detalhe-produto-fotos"></div>
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
  try {
    await carregarMidias('produto', p.id, 'detalhe-produto-fotos');
  } catch (err) {
    console.error('Erro ao carregar imagens do produto:', err);
  }
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
  document.getElementById('produto-imagem').value = '';
  try {
    await carregarMidias('produto', p.id, 'produto-imagem-preview', true);
  } catch (err) {
    alert('Não foi possível carregar as fotos do produto: ' + err.message);
    return;
  }
  document.getElementById('cancel-produto').style.display = 'inline-block';
  abrirFormularioCadastro('form-produto', 'Editar Produto / Serviço');
}

async function excluirProduto(id) {
  if (!confirm('Excluir produto/serviço?')) return;
  try {
    await apiDelete('/produtos/' + id);
    await carregarProdutos();
  } catch (err) {
    alert(err.message);
  }
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
      opt.textContent = `${p.nome}${p.tipo === 'produto' ? ` (Estoque: ${p.quantidade})` : ''} - ${formatMoney(p.preco)}`;
      opt.dataset.preco = p.preco;
      opt.dataset.nome = p.nome;
      opt.dataset.tipo = p.tipo;
      opt.dataset.stock = p.quantidade;
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
    const imagens = Array.from(document.getElementById('produto-imagem').files);
    if (imagens.length > 5) return alert('Cada produto pode ter até 5 imagens.');
    try { validarArquivosImagem(imagens); }
    catch (err) { return alert(err.message); }
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

    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      let produtoId = Number(id);
      const imagensExistentes = id ? await apiGet(`/midias/entidade/produto/${id}`) : [];
      if (imagensExistentes.length + imagens.length > 5) throw new Error('Um produto pode ter no máximo 5 imagens. Remova fotos antigas antes de adicionar novas.');
      if (id) await apiPut('/produtos/' + id, dados);
      else {
        const criado = await apiPost('/produtos', dados);
        produtoId = criado.id;
        document.getElementById('produto-id').value = String(produtoId);
      }

      for (const imagem of imagens) await apiUpload(`/midias/produto/${produtoId}`, imagem);

      form.reset();
      document.getElementById('produto-id').value = '';
      document.getElementById('cancel-produto').style.display = 'none';
      document.getElementById('produto-imagem-preview').replaceChildren();
    } catch (err) {
      alert('Não foi possível salvar o produto ou suas imagens: ' + err.message);
      return;
    } finally {
      submit.disabled = false;
    }
    try {
      await carregarProdutos();
    } catch (err) {
      alert('Produto salvo, mas a lista não pôde ser atualizada: ' + err.message);
    }
  });

  const btnCancel = document.getElementById('cancel-produto');
  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      form.reset();
      document.getElementById('produto-id').value = '';
      btnCancel.style.display = 'none';
      document.getElementById('produto-imagem-preview').replaceChildren();
    });
  }

  document.getElementById('produto-imagem')?.addEventListener('change', async () => {
    const input = document.getElementById('produto-imagem');
    const imagens = Array.from(input.files);
    try {
      validarArquivosImagem(imagens);
      const id = document.getElementById('produto-id').value;
      const existentes = id ? await apiGet(`/midias/entidade/produto/${id}`) : [];
      if (existentes.length + imagens.length > 5) throw new Error('Um produto pode ter no máximo 5 imagens.');
      previewArquivosImagem(input, 'produto-imagem-preview');
    } catch (err) {
      input.value = '';
      previewArquivosImagem(input, 'produto-imagem-preview');
      alert(err.message);
    }
  });
});