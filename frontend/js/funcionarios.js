// ============================================
// FUNCIONÁRIOS
// ============================================

async function carregarFuncionarios() {
  const lista = await apiGet('/funcionarios');
  const tbody = document.querySelector('#tabela-funcionarios tbody');
  tbody.innerHTML = '';
  lista.forEach(f => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${f.id}</td>
      <td>${f.nome}</td>
      <td>${f.cargo || '-'}</td>
      <td>${f.telefone || '-'}</td>
      <td>
        <button class="edit" onclick="editarFuncionario(${f.id})">Editar</button>
        <button onclick="excluirFuncionario(${f.id})">Excluir</button>
      </td>`;
    tbody.appendChild(tr);
  });
  await atualizarSelectsFuncionarios();
}

async function editarFuncionario(id) {
  const lista = await apiGet('/funcionarios');
  const f = lista.find(x => x.id === id);
  if (!f) return;
  document.getElementById('funcionario-nome').value = f.nome || '';
  document.getElementById('funcionario-cargo').value = f.cargo || '';
  document.getElementById('funcionario-telefone').value = f.telefone || '';
  document.getElementById('form-funcionario').dataset.editandoId = f.id;
  document.getElementById('form-funcionario').querySelector('button[type="submit"]').textContent = 'Atualizar';
}

async function excluirFuncionario(id) {
  if (!confirm('Excluir funcionário?')) return;
  await apiDelete('/funcionarios/' + id);
  carregarFuncionarios();
}

async function atualizarSelectsFuncionarios() {
  const lista = await apiGet('/funcionarios');
  const selects = ['ordem-funcionario', 'produto-funcionario', 'venda-funcionario', 'estoque-funcionario'];
  selects.forEach(sid => {
    const sel = document.getElementById(sid);
    if (!sel) return;
    const val = sel.value;
    sel.innerHTML = '<option value="">Selecione o funcionário...</option>';
    lista.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = f.nome;
      sel.appendChild(opt);
    });
    sel.value = val;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-funcionario');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editandoId = form.dataset.editandoId;
    const dados = {
      nome: document.getElementById('funcionario-nome').value,
      cargo: document.getElementById('funcionario-cargo').value,
      telefone: document.getElementById('funcionario-telefone').value
    };

    if (editandoId) {
      await apiPut('/funcionarios/' + editandoId, dados);
      delete form.dataset.editandoId;
      form.querySelector('button[type="submit"]').textContent = 'Salvar';
    } else {
      await apiPost('/funcionarios', dados);
    }

    form.reset();
    carregarFuncionarios();
  });
});