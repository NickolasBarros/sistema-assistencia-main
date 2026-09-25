// ============================================
// CONFIGURAÇÕES + TERMOS DE GARANTIA
// ============================================

// ============================================
// CONFIGURAÇÕES GERAIS
// ============================================

async function carregarConfiguracoes() {
  try {
    const config = await apiGet('/configuracoes');
    document.getElementById('conf-nome').value = config.nome_loja || '';
    document.getElementById('conf-slogan').value = config.slogan_loja || '';
    document.getElementById('conf-endereco').value = config.endereco_loja || '';
    document.getElementById('conf-telefone').value = config.telefone_loja || '';
  } catch (err) {
    console.error('Erro ao carregar configurações:', err);
  }

  await carregarTermos();
}

// ============================================
// TERMOS DE GARANTIA
// ============================================

async function carregarTermos() {
  try {
    const lista = await apiGet('/termosGarantia');
    const tbody = document.querySelector('#tabela-termos tbody');
    tbody.innerHTML = '';

    if (lista.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--cor-texto-suave); font-style:italic;">Nenhum modelo cadastrado</td></tr>';
      return;
    }

    lista.forEach(t => {
      const tr = document.createElement('tr');
      const dias = t.tempo_dias || 0;
      const texto = dias >= 365 ? Math.round(dias / 365) + ' ano(s)' : dias >= 30 ? Math.round(dias / 30) + ' mês(es)' : dias + ' dias';

      tr.innerHTML = `
        <td>${t.id}</td>
        <td>${t.nome}</td>
        <td>${dias} dias (${texto})</td>
        <td>
          <button class="edit" onclick="editarTermo(${t.id})">Editar</button>
          <button onclick="excluirTermo(${t.id})">Excluir</button>
        </td>`;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Erro ao carregar termos:', err);
  }
}

function abrirModalTermo() {
  document.getElementById('modal-termo-titulo').textContent = 'Novo Modelo de Garantia';
  document.getElementById('termo-id').value = '';
  document.getElementById('form-termo').reset();
  document.getElementById('modal-termo').classList.add('active');
}

function fecharModalTermo() {
  document.getElementById('modal-termo').classList.remove('active');
}

async function editarTermo(id) {
  try {
    const t = await apiGet('/termosGarantia/' + id);
    document.getElementById('modal-termo-titulo').textContent = 'Editar Modelo';
    document.getElementById('termo-id').value = t.id;
    document.getElementById('termo-nome').value = t.nome || '';
    document.getElementById('termo-tempo').value = t.tempo_dias || 180;
    document.getElementById('termo-texto').value = t.texto || '';
    document.getElementById('modal-termo').classList.add('active');
  } catch (err) {
    alert('Erro ao carregar termo: ' + err.message);
  }
}

async function excluirTermo(id) {
  if (!confirm('Excluir este modelo de garantia?')) return;
  await apiDelete('/termosGarantia/' + id);
  carregarTermos();
}

// ============================================
// EVENTOS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Form de configurações
  const formConfig = document.getElementById('form-configuracoes');
  if (formConfig) {
    formConfig.addEventListener('submit', async (e) => {
      e.preventDefault();
      const dados = {
        nome_loja: document.getElementById('conf-nome').value,
        slogan_loja: document.getElementById('conf-slogan').value,
        endereco_loja: document.getElementById('conf-endereco').value,
        telefone_loja: document.getElementById('conf-telefone').value
      };
      await apiPut('/configuracoes', dados);
      alert('Configurações salvas!');
    });
  }

  // Form de termo
  const formTermo = document.getElementById('form-termo');
  if (formTermo) {
    formTermo.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('termo-id').value;
      const dados = {
        nome: document.getElementById('termo-nome').value,
        tempo_dias: parseInt(document.getElementById('termo-tempo').value) || 180,
        texto: document.getElementById('termo-texto').value,
        ativo: 1
      };

      if (id) {
        await apiPut('/termosGarantia/' + id, dados);
      } else {
        await apiPost('/termosGarantia', dados);
      }

      fecharModalTermo();
      carregarTermos();
    });
  }

  // Fecha modal ao clicar fora
  const modalTermo = document.getElementById('modal-termo');
  if (modalTermo) {
    modalTermo.addEventListener('click', (e) => {
      if (e.target === modalTermo) fecharModalTermo();
    });
  }
});