const API_URL = '/api';

async function apiGet(path) {
  const res = await fetch(API_URL + path);
  if (!res.ok) throw new Error('Erro ao buscar ' + path);
  return res.json();
}

async function apiPost(path, data) {
  const res = await fetch(API_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Erro ao criar');
  }
  return res.json();
}

async function apiPut(path, data) {
  const res = await fetch(API_URL + path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Erro ao atualizar');
  return res.json();
}

async function apiDelete(path) {
  const res = await fetch(API_URL + path, { method: 'DELETE' });
  if (!res.ok) throw new Error('Erro ao deletar');
  return res.json();
}

function formatMoney(v) {
  return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString('pt-BR');
}


// ============================================
// MODAL GENÉRICO "VER"
// ============================================

function abrirModalVer(titulo, conteudoHTML) {
  const modal = document.getElementById('modal-ver');
  const tituloEl = document.getElementById('modal-ver-titulo');
  const conteudo = document.getElementById('modal-ver-conteudo');

  if (!modal) return;

  tituloEl.textContent = titulo;
  conteudo.innerHTML = conteudoHTML;
  modal.classList.add('active');
}

function fecharModalVer() {
  const modal = document.getElementById('modal-ver');
  if (modal) modal.classList.remove('active');
}

// Fecha o modal ao clicar fora dele ou apertar ESC
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('modal-ver');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) fecharModalVer();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharModalVer();
  });
});