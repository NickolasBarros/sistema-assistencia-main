// ============================================
// CLIENTES
// ============================================

let clienteModalAtual = null;

async function carregarClientes() {
  const lista = await apiGet('/clientes');
  const tbody = document.querySelector('#tabela-clientes tbody');
  tbody.innerHTML = '';
  lista.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.id}</td>
      <td>${c.nome}</td>
      <td>${c.telefone || '-'}</td>
      <td>${c.email || '-'}</td>
      <td>
        <button class="btn-ver" onclick="verCliente(${c.id})">Ver</button>
        <button class="edit" onclick="editarCliente(${c.id})">Editar</button>
        <button onclick="excluirCliente(${c.id})">Excluir</button>
      </td>`;
    tbody.appendChild(tr);
  });
  await atualizarSelectsClientes();
}

async function verCliente(id) {
  try {
    const c = await apiGet('/clientes/' + id);
    clienteModalAtual = c.id;
    const conteudo = document.getElementById('modal-cliente-conteudo');
    conteudo.innerHTML = `
      <div class="info-linha"><strong>ID</strong><span>${c.id}</span></div>
      <div class="info-linha"><strong>Nome</strong><span>${c.nome || '-'}</span></div>
      <div class="info-linha"><strong>Telefone</strong><span>${c.telefone || '-'}</span></div>
      <div class="info-linha"><strong>E-mail</strong><span>${c.email || '-'}</span></div>
      <div class="info-linha"><strong>CPF</strong><span>${c.cpf || '-'}</span></div>
      <div class="info-linha"><strong>Endereço</strong><span>${c.endereco || '-'}</span></div>
      <div class="info-linha"><strong>Cadastrado em</strong><span>${formatDate(c.criado_em)}</span></div>
    `;
    document.getElementById('modal-cliente').classList.add('active');
  } catch (err) {
    alert('Erro ao carregar cliente: ' + err.message);
  }
}

function fecharModalCliente() {
  document.getElementById('modal-cliente').classList.remove('active');
  clienteModalAtual = null;
}

async function editarCliente(id) {
  try {
    const c = await apiGet('/clientes/' + id);
    document.getElementById('cliente-id').value = c.id;
    document.getElementById('cliente-nome').value = c.nome || '';
    document.getElementById('cliente-telefone').value = c.telefone || '';
    document.getElementById('cliente-email').value = c.email || '';
    document.getElementById('cliente-cpf').value = c.cpf || '';
    document.getElementById('cliente-endereco').value = c.endereco || '';
    document.getElementById('titulo-form-cliente').textContent = 'Editando Cliente';
    document.getElementById('cancel-cliente').style.display = 'inline-block';
    fecharModalCliente();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    alert('Erro ao carregar cliente: ' + err.message);
  }
}

async function excluirCliente(id) {
  if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
  await apiDelete('/clientes/' + id);
  carregarClientes();
}

async function atualizarSelectsClientes() {
  const lista = await apiGet('/clientes');
  const selects = ['ordem-cliente', 'orcamento-cliente', 'venda-cliente'];
  selects.forEach(sid => {
    const sel = document.getElementById(sid);
    if (!sel) return;
    const val = sel.value;
    sel.innerHTML = '<option value="">Selecione o cliente...</option>';
    lista.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.nome;
      sel.appendChild(opt);
    });
    sel.value = val;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-cliente');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('cliente-id').value;
      const dados = {
        nome: document.getElementById('cliente-nome').value,
        telefone: document.getElementById('cliente-telefone').value,
        email: document.getElementById('cliente-email').value,
        cpf: document.getElementById('cliente-cpf').value,
        endereco: document.getElementById('cliente-endereco').value
      };
      if (id) await apiPut('/clientes/' + id, dados);
      else await apiPost('/clientes', dados);
      form.reset();
      document.getElementById('cliente-id').value = '';
      document.getElementById('titulo-form-cliente').textContent = 'Novo Cliente';
      document.getElementById('cancel-cliente').style.display = 'none';
      carregarClientes();
    });
  }

  const btnCancel = document.getElementById('cancel-cliente');
  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      document.getElementById('form-cliente').reset();
      document.getElementById('cliente-id').value = '';
      document.getElementById('titulo-form-cliente').textContent = 'Novo Cliente';
      btnCancel.style.display = 'none';
    });
  }

  const btnEditarModal = document.getElementById('btn-editar-no-modal');
  if (btnEditarModal) {
    btnEditarModal.addEventListener('click', () => {
      if (clienteModalAtual) editarCliente(clienteModalAtual);
    });
  }

  const overlay = document.getElementById('modal-cliente');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) fecharModalCliente();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharModalCliente();
  });
});