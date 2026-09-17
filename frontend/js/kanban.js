// ============================================
// KANBAN
// ============================================

const KANBAN_STATUS = [
  'Aberta',
  'Em Análise',
  'Aguardando Peça',
  'Em Reparo',
  'Pronto',
  'Entregue',
  'Cancelada'
];

async function carregarKanban() {
  const ordens = await apiGet('/ordens');
  const board = document.getElementById('kanban-board');
  if (!board) return;
  board.innerHTML = '';

  KANBAN_STATUS.forEach(status => {
    const ordensStatus = ordens.filter(o => o.status === status);

    const col = document.createElement('div');
    col.className = 'kanban-col';
    col.dataset.status = status;

    col.innerHTML = `
      <div class="kanban-col-header">
        <h3>${status}</h3>
        <span class="contador">${ordensStatus.length}</span>
      </div>
      <div class="kanban-cards" data-status="${status}"></div>
    `;

    const cards = col.querySelector('.kanban-cards');

    ordensStatus.forEach(o => {
      const card = document.createElement('div');
      card.className = 'kanban-card';
      card.draggable = true;
      card.dataset.id = o.id;
      card.dataset.status = o.status;
      card.innerHTML = `
        <div class="titulo">#${o.id} — ${o.cliente_nome || 'Sem cliente'}</div>
        <div class="linha">${o.aparelho || '-'} ${o.marca ? '| ' + o.marca : ''}</div>
        <div class="linha">${o.defeito ? o.defeito.substring(0, 40) : ''}</div>
        <div class="valor">${formatMoney(o.valor)}</div>
      `;

      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', o.id);
        card.classList.add('dragging');
      });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));

      cards.appendChild(card);
    });

    cards.addEventListener('dragover', (e) => {
      e.preventDefault();
      col.classList.add('drag-over');
    });
    cards.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    cards.addEventListener('drop', async (e) => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const ordemId = e.dataTransfer.getData('text/plain');
      await moverOrdemParaStatus(ordemId, status);
    });

    board.appendChild(col);
  });
}

async function moverOrdemParaStatus(ordemId, novoStatus) {
  try {
    const lista = await apiGet('/ordens');
    const ordem = lista.find(o => String(o.id) === String(ordemId));
    if (!ordem) return;
    if (ordem.status === novoStatus) return;

    await apiPut('/ordens/' + ordemId, {
      cliente_id: ordem.cliente_id,
      funcionario_id: ordem.funcionario_id,
      aparelho: ordem.aparelho,
      marca: ordem.marca,
      modelo: ordem.modelo,
      imei: ordem.imei,
      numero_serie: ordem.numero_serie,
      defeito: ordem.defeito,
      servico_realizado: ordem.servico_realizado,
      pecas_utilizadas: ordem.pecas_utilizadas,
      valor: ordem.valor,
      status: novoStatus
    });

    carregarKanban();
  } catch (err) {
    alert('Erro ao mover: ' + err.message);
  }
}