// ============================================
// TEMA CLARO / ESCURO
// ============================================

const ICONE_SOL = `
  <circle cx="12" cy="12" r="5"/>
  <line x1="12" y1="1" x2="12" y2="3"/>
  <line x1="12" y1="21" x2="12" y2="23"/>
  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
  <line x1="1" y1="12" x2="3" y2="12"/>
  <line x1="21" y1="12" x2="23" y2="12"/>
  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
`;

const ICONE_LUA = `
  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
`;

function aplicarTema(tema) {
  const body = document.body;
  const icone = document.getElementById('icone-tema');
  if (!icone) return;

  if (tema === 'dark') {
    body.classList.add('dark');
    icone.innerHTML = ICONE_LUA;
  } else {
    body.classList.remove('dark');
    icone.innerHTML = ICONE_SOL;
  }
}

function alternarTema() {
  const temaAtual = document.body.classList.contains('dark') ? 'dark' : 'light';
  const novoTema = temaAtual === 'dark' ? 'light' : 'dark';
  aplicarTema(novoTema);
  localStorage.setItem('techgest-tema', novoTema);
}

document.addEventListener('DOMContentLoaded', () => {
  const temaSalvo = localStorage.getItem('techgest-tema') || 'light';
  aplicarTema(temaSalvo);

  const btn = document.getElementById('btn-tema');
  if (btn) {
    btn.addEventListener('click', alternarTema);
  }
});