const API_URL = '/api';

async function respostaErro(res, fallback) {
  const erro = await res.json().catch(() => ({}));
  return new Error(erro.error || fallback);
}
async function apiGet(path) {
    const token = localStorage.getItem('token');
    const headers = {};
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(API_URL + path, { headers });
    
    if (!res.ok) {
        throw await respostaErro(res, 'Erro ao buscar ' + path);
    }
    return res.json();
}
async function apiPost(path, data) {
    const token = localStorage.getItem('token'); // Pega o crachá salvo
    
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`; // Coloca o crachá se ele existir
    }

    const res = await fetch(API_URL + path, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data)
    });
    
    if (!res.ok) {
        throw await respostaErro(res, 'Erro ao criar');
    }
    return res.json();
}

async function apiPost(path, data) {
    const token = localStorage.getItem('token'); // Pega o crachá salvo
    
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`; // Coloca o crachá se ele existir
    }

    const res = await fetch(API_URL + path, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data)
    });
    
    if (!res.ok) {
        throw await respostaErro(res, 'Erro ao criar');
    }
    return res.json();
}

async function apiUpload(path, file) {
  const res = await fetch(API_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': file.type },
    body: file
  });
  if (!res.ok) throw await respostaErro(res, 'Erro ao enviar arquivo');
  return res.json();
}

async function apiPut(path, data) {
  const res = await fetch(API_URL + path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw await respostaErro(res, 'Erro ao atualizar');
  return res.json();
}

async function apiDelete(path) {
  const res = await fetch(API_URL + path, { method: 'DELETE' });
  if (!res.ok) throw await respostaErro(res, 'Erro ao deletar');
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
});