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
