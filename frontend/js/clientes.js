// ============================================
// CLIENTES
// ============================================

let clienteModalAtual = null;

function abrirCadastroClienteRapido() {
  const modal = document.getElementById('modal-cliente-rapido');
  const form = document.getElementById('form-cliente-rapido');
  form.reset();
  modal.classList.add('active');
  document.body.classList.add('modal-aberto');
  document.getElementById('cliente-rapido-nome').focus();
}

function fecharCadastroClienteRapido() {
  const modal = document.getElementById('modal-cliente-rapido');
  modal.classList.remove('active');
  if (!document.querySelector('.modal-overlay.active')) document.body.classList.remove('modal-aberto');
}

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
    abrirFormularioCadastro('form-cliente', 'Editando Cliente');
  } catch (err) {
    alert('Erro ao carregar cliente: ' + err.message);
  }
}

async function excluirCliente(id) {
  if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
  try {
    await apiDelete('/clientes/' + id);
    await carregarClientes();
  } catch (err) {
    alert(err.message);
  }
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
  const formClienteRapido = document.getElementById('form-cliente-rapido');
  if (formClienteRapido) {
    formClienteRapido.addEventListener('submit', async event => {
      event.preventDefault();
      const dados = {
        nome: document.getElementById('cliente-rapido-nome').value.trim(),
        telefone: document.getElementById('cliente-rapido-telefone').value.trim(),
        email: document.getElementById('cliente-rapido-email').value.trim()
      };
      const botao = formClienteRapido.querySelector('button[type="submit"]');
      botao.disabled = true;
      try {
        const cliente = await apiPost('/clientes', dados);
        await atualizarSelectsClientes();
        document.getElementById('ordem-cliente').value = String(cliente.id);
        await carregarClientes();
        fecharCadastroClienteRapido();
      } catch (err) {
        alert('Não foi possível cadastrar o cliente: ' + err.message);
      } finally {
        botao.disabled = false;
      }
    });
  }

  const modalRapido = document.getElementById('modal-cliente-rapido');
  if (modalRapido) {
    modalRapido.addEventListener('click', event => {
      if (event.target === modalRapido) fecharCadastroClienteRapido();
    });
  }

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

});