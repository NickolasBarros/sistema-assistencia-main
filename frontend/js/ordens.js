// ============================================
// ORDENS DE SERVIÇO (OS)
// ============================================

let osModalAtual = null;

async function carregarOrdens() {
  const lista = await apiGet('/ordens');
  const tbody = document.querySelector('#tabela-ordens tbody');
  tbody.innerHTML = '';
  lista.forEach(o => {
    const pago = o.valor_pago || 0;
    const total = o.valor || 0;
    const falta = Math.max(total - pago, 0);
    const quitado = o.quitado === 1;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${o.id}</td>
      <td>${o.cliente_nome || '-'}</td>
      <td>${o.aparelho || '-'} ${o.marca ? '| ' + o.marca : ''}</td>
      <td>${o.funcionario_nome || '-'}</td>
      <td><span class="badge">${o.status}</span></td>
      <td>${formatMoney(total)}</td>
      <td>${formatMoney(pago)}</td>
      <td>${quitado ? '<span style="color:var(--cor-sucesso); font-weight:700;">QUITADO</span>' : formatMoney(falta)}</td>
      <td>
        <button class="btn-ver" onclick="verOrdem(${o.id})">Ver</button>
        <button class="btn-ver" onclick="abrirPagamentos(${o.id})">Pagamentos</button>
        <button class="edit" onclick="editarOrdem(${o.id})">Editar</button>
        <button onclick="excluirOrdem(${o.id})">Excluir</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

async function verOrdem(id) {
  const lista = await apiGet('/ordens');
  const o = lista.find(x => x.id === id);
  if (!o) return;

  const pago = o.valor_pago || 0;
  const total = o.valor || 0;
  const falta = Math.max(total - pago, 0);
  const quitado = o.quitado === 1;

  const html = `
    <div class="info-linha"><strong>OS</strong><span>#${o.id}</span></div>
    <div class="info-linha"><strong>Cliente</strong><span>${o.cliente_nome || '-'}</span></div>
    <div class="info-linha"><strong>Funcionário</strong><span>${o.funcionario_nome || '-'}</span></div>
    <div class="info-linha"><strong>Status</strong><span>${o.status || '-'}</span></div>
    <div class="info-linha"><strong>Aparelho</strong><span>${o.aparelho || '-'}</span></div>
    <div class="info-linha"><strong>Marca</strong><span>${o.marca || '-'}</span></div>
    <div class="info-linha"><strong>Modelo</strong><span>${o.modelo || '-'}</span></div>
    <div class="info-linha"><strong>IMEI</strong><span>${o.imei || '-'}</span></div>
    <div class="info-linha"><strong>Nº Série</strong><span>${o.numero_serie || '-'}</span></div>
    <div class="info-linha"><strong>Defeito</strong><span>${o.defeito || '-'}</span></div>
    <div class="info-linha"><strong>Serviço realizado</strong><span>${o.servico_realizado || '-'}</span></div>
    <div class="info-linha"><strong>Peças utilizadas</strong><span>${o.pecas_utilizadas || '-'}</span></div>
    <div class="info-linha"><strong>Valor total</strong><span>${formatMoney(total)}</span></div>
    <div class="info-linha"><strong>Valor pago</strong><span>${formatMoney(pago)}</span></div>
    <div class="info-linha"><strong>Falta</strong><span>${quitado ? 'QUITADO' : formatMoney(falta)}</span></div>
    <div class="info-linha"><strong>Data entrada</strong><span>${formatDate(o.data_entrada)}</span></div>
    <div class="info-linha"><strong>Data saída</strong><span>${formatDate(o.data_saida)}</span></div>
  `;

  abrirModalVer('Detalhes da OS', html);
}

async function editarOrdem(id) {
  const lista = await apiGet('/ordens');
  const o = lista.find(x => x.id === id);
  if (!o) return;

  document.getElementById('ordem-id').value = o.id;
  document.getElementById('ordem-cliente').value = o.cliente_id || '';
  document.getElementById('ordem-funcionario').value = o.funcionario_id || '';
  document.getElementById('ordem-aparelho').value = o.aparelho || '';
  document.getElementById('ordem-marca').value = o.marca || '';
  document.getElementById('ordem-modelo').value = o.modelo || '';
  document.getElementById('ordem-imei').value = o.imei || '';
  document.getElementById('ordem-serie').value = o.numero_serie || '';
  document.getElementById('ordem-defeito').value = o.defeito || '';
  document.getElementById('ordem-servico').value = o.servico_realizado || '';
  document.getElementById('ordem-pecas').value = o.pecas_utilizadas || '';
  document.getElementById('ordem-valor').value = o.valor || 0;
  document.getElementById('ordem-status').value = o.status || 'Aberta';
  document.getElementById('cancel-ordem').style.display = 'inline-block';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function excluirOrdem(id) {
  if (!confirm('Excluir OS? Todos os pagamentos relacionados também serão removidos.')) return;
  await apiDelete('/ordens/' + id);
  carregarOrdens();
}

// ============================================
// MODAL DE PAGAMENTOS
// ============================================

async function abrirPagamentos(ordemId) {
  osModalAtual = ordemId;
  document.getElementById('pagamento-os-id').textContent = ordemId;
  document.getElementById('modal-pagamentos').classList.add('active');
  await atualizarModalPagamentos();
}

function fecharModalPagamentos() {
  const modal = document.getElementById('modal-pagamentos');
  if (modal) modal.classList.remove('active');
  osModalAtual = null;
  carregarOrdens();
}

async function atualizarModalPagamentos() {
  if (!osModalAtual) return;

  const lista = await apiGet('/ordens');
  const ordem = lista.find(o => o.id === osModalAtual);
  if (!ordem) return;

  const pago = ordem.valor_pago || 0;
  const total = ordem.valor || 0;
  const falta = Math.max(total - pago, 0);
  const quitado = ordem.quitado === 1;

  document.getElementById('pagamento-resumo').innerHTML = `
    <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
      <span>Valor Total:</span><strong>${formatMoney(total)}</strong>
    </div>
    <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
      <span>Já Pago:</span><strong style="color:var(--cor-sucesso);">${formatMoney(pago)}</strong>
    </div>
    <div style="display:flex; justify-content:space-between;">
      <span>Falta Pagar:</span>
      <strong style="color:${quitado ? 'var(--cor-sucesso)' : 'var(--cor-erro)'};">
        ${quitado ? 'QUITADO' : formatMoney(falta)}
      </strong>
    </div>
  `;

  const pagamentos = await apiGet(`/ordens/${osModalAtual}/pagamentos`);
  const div = document.getElementById('pagamento-historico');

  if (pagamentos.length === 0) {
    div.innerHTML = '<div class="lista"><div class="vazio">Nenhum pagamento registrado</div></div>';
    return;
  }

  div.innerHTML = `
    <table>
      <thead><tr><th>Data</th><th>Valor</th><th>Forma</th><th>Parcelas</th><th></th></tr></thead>
      <tbody>
        ${pagamentos.map(p => `
          <tr>
            <td>${formatDate(p.data_pagamento)}</td>
            <td>${formatMoney(p.valor)}</td>
            <td>${p.forma_pagamento || '-'}</td>
            <td>${p.parcelas > 1 ? p.parcelas + 'x' : '1x'}</td>
            <td><button onclick="excluirPagamento(${osModalAtual}, ${p.id})">x</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function excluirPagamento(ordemId, pagamentoId) {
  if (!confirm('Excluir este pagamento? O valor será removido do Caixa e do Financeiro.')) return;
  await apiDelete(`/ordens/${ordemId}/pagamento/${pagamentoId}`);
  await atualizarModalPagamentos();
}

// ============================================
// EVENTOS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-ordem');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('ordem-id').value;
      const dados = {
        cliente_id: parseInt(document.getElementById('ordem-cliente').value) || null,
        funcionario_id: parseInt(document.getElementById('ordem-funcionario').value) || null,
        aparelho: document.getElementById('ordem-aparelho').value,
        marca: document.getElementById('ordem-marca').value,
        modelo: document.getElementById('ordem-modelo').value,
        imei: document.getElementById('ordem-imei').value,
        numero_serie: document.getElementById('ordem-serie').value,
        defeito: document.getElementById('ordem-defeito').value,
        servico_realizado: document.getElementById('ordem-servico').value,
        pecas_utilizadas: document.getElementById('ordem-pecas').value,
        valor: parseFloat(document.getElementById('ordem-valor').value) || 0,
        status: document.getElementById('ordem-status').value
      };

      if (id) await apiPut('/ordens/' + id, dados);
      else await apiPost('/ordens', dados);

      form.reset();
      document.getElementById('ordem-id').value = '';
      document.getElementById('cancel-ordem').style.display = 'none';
      carregarOrdens();
    });

    const btnCancel = document.getElementById('cancel-ordem');
    if (btnCancel) {
      btnCancel.addEventListener('click', () => {
        form.reset();
        document.getElementById('ordem-id').value = '';
        btnCancel.style.display = 'none';
      });
    }
  }

  const formPgto = document.getElementById('form-pagamento');
  if (formPgto) {
    formPgto.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!osModalAtual) return;

      const dados = {
        valor: parseFloat(document.getElementById('pagamento-valor').value) || 0,
        forma_pagamento: document.getElementById('pagamento-forma').value,
        parcelas: parseInt(document.getElementById('pagamento-parcelas').value) || 1,
        observacao: document.getElementById('pagamento-obs').value
      };

      if (dados.valor <= 0) {
        alert('Valor deve ser maior que zero.');
        return;
      }

      await apiPost(`/ordens/${osModalAtual}/pagamento`, dados);
      formPgto.reset();
      await atualizarModalPagamentos();
    });
  }

  const modalPgto = document.getElementById('modal-pagamentos');
  if (modalPgto) {
    modalPgto.addEventListener('click', (e) => {
      if (e.target === modalPgto) fecharModalPagamentos();
    });
  }
});