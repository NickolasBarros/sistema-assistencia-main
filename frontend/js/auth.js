let techgestAuthRequired = false;
let techgestAuthUser = null;
let resolverAutenticacao;
window.techgestAuthReady = new Promise(resolve => { resolverAutenticacao = resolve; });

function aplicarIdentidadeUsuario(user) {
  techgestAuthUser = user || null;
  document.body.dataset.role = user?.role || 'owner';
  const label = document.getElementById('account-label');
  const logout = document.getElementById('btn-sair');
  if (label && user) {
    label.textContent = `${user.empresa || 'TechGest'} · ${user.nome}`;
    label.hidden = false;
  }
  if (logout) logout.hidden = !techgestAuthRequired;

  if (user?.role === 'staff') {
    document.querySelectorAll('.nav-item[data-view="funcionarios"], .nav-item[data-view="caixa"], .nav-item[data-view="financeiro"], .nav-item[data-view="despesasFixas"], .nav-item[data-view="relatorios"]').forEach(item => item.hidden = true);
    document.querySelectorAll('.nav-group').forEach(group => {
      if (group.querySelector('.nav-group-items') && !group.querySelector('.nav-item:not([hidden])')) group.hidden = true;
    });
    document.querySelectorAll('#view-configuracoes > .form-box:not(#settings-password), #view-configuracoes > .settings-modelos').forEach(item => item.hidden = true);
    document.querySelectorAll('#dash-assistencia, #dash-vendas, #dash-total-hoje, #kpi-vendas, #kpi-caixa').forEach(item => {
      const card = item.closest('.card');
      if (card) card.hidden = true;
    });
  }
}

function mostrarLogin(mensagem = '') {
  const tela = document.getElementById('login-screen');
  const erro = document.getElementById('login-error');
  if (erro) erro.textContent = mensagem;
  if (tela) tela.hidden = false;
  document.body.classList.add('auth-required');
}

async function verificarSessaoTechGest() {
  try {
    const status = await fetch('/api/auth/status');
    if (!status.ok) throw new Error('Não foi possível verificar a autenticação do sistema.');
    const dadosStatus = await status.json();
    techgestAuthRequired = dadosStatus.authenticationRequired;
    if (!techgestAuthRequired) {
      document.getElementById('login-screen').hidden = true;
      document.getElementById('settings-team').hidden = true;
      document.getElementById('settings-password').hidden = true;
      document.body.classList.remove('auth-required', 'auth-checking');
      resolverAutenticacao();
      return;
    }

    const resposta = await fetch('/api/auth/session');
    if (resposta.ok) {
      const sessao = await resposta.json();
      aplicarIdentidadeUsuario(sessao.user);
      if (sessao.user.mustChangePassword) {
        document.getElementById('login-form').hidden = true;
        document.getElementById('force-password-form').hidden = false;
        document.querySelector('.login-panel > p').textContent = 'Por segurança, defina uma senha pessoal antes de usar o sistema.';
        document.getElementById('force-password-current').focus();
        mostrarLogin();
      } else {
        document.getElementById('login-screen').hidden = true;
        document.body.classList.remove('auth-required', 'auth-checking');
      }
    } else if (resposta.status === 401) {
      mostrarLogin();
      document.body.classList.remove('auth-checking');
    } else {
      throw new Error('O serviço de autenticação está temporariamente indisponível.');
    }
  } catch (error) {
    mostrarLogin(error.message || 'Não foi possível conectar ao TechGest.');
    document.body.classList.remove('auth-checking');
  } finally {
    resolverAutenticacao();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  loginForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = document.getElementById('login-submit');
    const erro = document.getElementById('login-error');
    submit.disabled = true;
    erro.textContent = '';
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: document.getElementById('login-email').value,
          password: document.getElementById('login-password').value
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível entrar.');
      window.location.reload();
    } catch (error) {
      erro.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });

  document.getElementById('force-password-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = document.getElementById('force-password-submit');
    const error = document.getElementById('force-password-error');
    submit.disabled = true;
    error.textContent = '';
    try {
      await apiPost('/auth/change-password', {
        currentPassword: document.getElementById('force-password-current').value,
        newPassword: document.getElementById('force-password-new').value
      });
      window.location.reload();
    } catch (err) {
      error.textContent = err.message;
    } finally {
      submit.disabled = false;
    }
  });

  document.getElementById('btn-sair')?.addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.reload();
    } catch (error) {
      alert('Não foi possível encerrar a sessão: ' + error.message);
    }
  });

  document.getElementById('form-equipe')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const created = await apiPost('/tenant-users', {
        nome: document.getElementById('equipe-nome').value,
        email: document.getElementById('equipe-email').value
      });
      const output = document.getElementById('equipe-credencial');
      output.textContent = `Acesso criado para ${created.nome} (${created.email}). Senha inicial: ${created.senhaInicial}. Entregue por canal seguro; ela não será exibida novamente.`;
      output.hidden = false;
      form.reset();
      await carregarEquipe();
    } catch (error) {
      alert('Não foi possível criar o acesso: ' + error.message);
    } finally {
      button.disabled = false;
    }
  });

  document.getElementById('form-alterar-senha')?.addEventListener('submit', async event => {
    event.preventDefault();
    try {
      await apiPost('/auth/change-password', {
        currentPassword: document.getElementById('senha-atual').value,
        newPassword: document.getElementById('senha-nova').value
      });
      event.currentTarget.reset();
      alert('Senha alterada. Use a nova senha nos próximos acessos.');
    } catch (error) {
      alert('Não foi possível alterar a senha: ' + error.message);
    }
  });

  verificarSessaoTechGest();
});

async function carregarEquipe() {
  const list = document.getElementById('lista-equipe');
  if (!list || techgestAuthUser?.role !== 'owner' || !techgestAuthRequired) return;
  try {
    const users = await apiGet('/tenant-users');
    list.replaceChildren();
    users.forEach(user => {
      const row = document.createElement('div');
      row.className = 'settings-team-row';
      const identity = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = user.nome;
      const email = document.createElement('span');
      email.textContent = user.email;
      identity.append(name, email);
      const role = document.createElement('span');
      role.className = `team-role ${user.role}`;
      role.textContent = user.role === 'owner' ? 'Responsável' : 'Colaborador';
      if (!user.ativo) {
        role.textContent = 'Acesso desativado';
        role.classList.add('disabled');
      }
      row.append(identity, role);
      if (user.role === 'staff' && user.ativo) {
        const disable = document.createElement('button');
        disable.type = 'button';
        disable.className = 'btn-team-disable';
        disable.textContent = 'Desativar';
        disable.addEventListener('click', async () => {
          if (!confirm(`Desativar o acesso de ${user.nome}?`)) return;
          try {
            await apiDelete(`/tenant-users/${user.id}`);
            await carregarEquipe();
          } catch (error) {
            alert('Não foi possível desativar o acesso: ' + error.message);
          }
        });
        row.appendChild(disable);
      }
      list.appendChild(row);
    });
    if (users.length === 0) list.textContent = 'Nenhum usuário cadastrado.';
  } catch (error) {
    list.textContent = 'Não foi possível carregar os acessos: ' + error.message;
  }
}
