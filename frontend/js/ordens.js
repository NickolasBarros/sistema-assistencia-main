// ============================================
// ORDENS DE SERVIÇO (OS)
// ============================================

let osAtual = null;

// ============================================
// LISTAR
// ============================================

async function carregarOrdens() {
  const lista = await apiGet('/ordens');
  const tbody = document.querySelector('#tabela-ordens tbody');
  tbody.innerHTML = '';

  lista.forEach(o => {
    const pago = o.valor_pago || 0;
    const total = o.valor || 0;
    const falta = Math.max(total - pago, 0);
    const quitado = o.quitado === 1;

    // BARRA DE GARANTIA
    let barraGarantia = '<small style="color:var(--cor-texto-suave);">—</small>';
    if (o.garantia_ate) {
      const inicio = new Date(o.data_saida).getTime();
      const fim = new Date(o.garantia_ate).getTime();
      const agora = Date.now();
      const totalMs = fim - inicio;
      const passouMs = agora - inicio;
      let pct = (passouMs / totalMs) * 100;
      if (pct < 0) pct = 0;
      if (pct > 100) pct = 100;

      const diasRestantes = Math.max(0, Math.ceil((fim - agora) / (1000 * 60 * 60 * 24)));
      const expirada = agora > fim;
      const cor = expirada ? 'var(--cor-erro)' : pct < 50 ? 'var(--cor-sucesso)' : pct < 85 ? 'var(--cor-aviso)' : 'var(--cor-erro)';

      barraGarantia = `
        <div style="min-width:130px;">
          <div style="height:6px; background:#e5e7eb; border-radius:3px; overflow:hidden; margin-bottom:4px;">
            <div style="height:100%; width:${pct}%; background:${cor}; transition:width .3s;"></div>
          </div>
          <small style="font-size:10px; color:${expirada ? 'var(--cor-erro)' : 'var(--cor-texto-suave)'}; font-weight:${expirada ? '700' : '400'};">
            ${expirada ? 'Garantia expirada' : diasRestantes + ' dias restantes'}
          </small>
        </div>
      `;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${o.id}</td>
      <td>${o.cliente_nome || '-'}</td>
      <td>${o.aparelho || '-'} ${o.marca ? '| ' + o.marca : ''}</td>
      <td>${o.funcionario_nome || '-'}</td>
      <td><span class="badge">${o.status}</span></td>
      <td>${formatMoney(total)}</td>
      <td>${quitado ? '<span style="color:var(--cor-sucesso); font-weight:700;">QUITADO</span>' : formatMoney(falta)}</td>
      <td>${barraGarantia}</td>
      <td>
        <button class="btn-ver" onclick="verOrdem(${o.id})">Ver</button>
        <button class="btn-ver" onclick="abrirModalEnvio(${o.id})">Enviar</button>
        <button class="edit" onclick="editarOrdem(${o.id})">Editar</button>
        <button onclick="excluirOrdem(${o.id})">Excluir</button>
      </td>`;
    tbody.appendChild(tr);
  });

  await atualizarSelectsClientes();
  await atualizarSelectsFuncionarios();
}

// ============================================
// VER
// ============================================

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
    <div class="info-linha"><strong>Garantia até</strong><span>${o.garantia_ate ? formatDate(o.garantia_ate) : '-'}</span></div>
  `;

  abrirModalVer('Detalhes da OS', html);
}

// ============================================
// EDITAR (com seção de pagamentos embutida)
// ============================================

async function editarOrdem(id) {
  const lista = await apiGet('/ordens');
  const o = lista.find(x => x.id === id);
  if (!o) return;

  osAtual = o.id;

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

  // Mostra a seção de pagamentos
  document.getElementById('pagamentos-os-section').style.display = 'block';
  document.getElementById('pagamento-os-id').textContent = o.id;
  await atualizarPagamentosOS();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function atualizarPagamentosOS() {
  if (!osAtual) return;

  const lista = await apiGet('/ordens');
  const ordem = lista.find(o => o.id === osAtual);
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

  const pagamentos = await apiGet(`/ordens/${osAtual}/pagamentos`);
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
            <td><button type="button" onclick="excluirPagamento(${osAtual}, ${p.id})">x</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function excluirPagamento(ordemId, pagamentoId) {
  if (!confirm('Excluir este pagamento? O valor será removido do Caixa e do Financeiro.')) return;
  await apiDelete(`/ordens/${ordemId}/pagamento/${pagamentoId}`);
  await atualizarPagamentosOS();
}

async function excluirOrdem(id) {
  if (!confirm('Excluir OS? Todos os pagamentos relacionados também serão removidos.')) return;
  await apiDelete('/ordens/' + id);
  carregarOrdens();
}

// ============================================
// MODAL DE ENVIO
// ============================================

async function abrirModalEnvio(id) {
  try {
    const lista = await apiGet('/ordens');
    const o = lista.find(x => x.id === id);
    if (!o) return alert('OS não encontrada');

    osAtual = o;

    document.getElementById('envio-os-id').textContent = o.id;
    document.getElementById('envio-cliente-nome').textContent = o.cliente_nome || '-';
    document.getElementById('envio-os-status').textContent = o.status || '-';

    let tel = (o.cliente_telefone || '').replace(/\D/g, '');
    if (tel && !tel.startsWith('55')) tel = '55' + tel;
    document.getElementById('envio-telefone').value = tel;

    const temGarantia = !!o.garantia_ate;
    const cbGarantia = document.getElementById('envio-pdf-garantia');
    cbGarantia.disabled = !temGarantia;
    cbGarantia.checked = temGarantia;

    document.getElementById('envio-pdf-os').checked = true;
    document.getElementById('envio-whatsapp').checked = true;

    const pago = o.valor_pago || 0;
    const total = o.valor || 0;
    const falta = Math.max(total - pago, 0);
    const quitado = o.quitado === 1;

    let statusPag = 'Total: ' + formatMoney(total);
    if (quitado) statusPag += ' (QUITADO)';
    else if (pago > 0) statusPag += ' | Pago: ' + formatMoney(pago) + ' | Falta: ' + formatMoney(falta);

    const msg = `Olá ${o.cliente_nome || 'cliente'}!

Sua OS #${o.id} - ${o.aparelho || 'aparelho'} está com status: *${o.status}*

Serviço realizado: ${o.servico_realizado || '-'}
Valor: ${statusPag}

Qualquer dúvida, estamos à disposição!

Att,
*Garagem Tech*`;

    document.getElementById('envio-mensagem').value = msg;
    document.getElementById('modal-envio').classList.add('active');
  } catch (err) {
    alert('Erro ao abrir envio: ' + err.message);
  }
}

function fecharModalEnvio() {
  const modal = document.getElementById('modal-envio');
  if (modal) modal.classList.remove('active');
}

async function executarEnvio() {
  if (!osAtual) return;

  const o = osAtual;
  const enviarPdfOs = document.getElementById('envio-pdf-os').checked;
  const enviarPdfGarantia = document.getElementById('envio-pdf-garantia').checked;
  const abrirWhats = document.getElementById('envio-whatsapp').checked;
  const telefone = document.getElementById('envio-telefone').value.replace(/\D/g, '');
  const mensagem = document.getElementById('envio-mensagem').value;

  if (!enviarPdfOs && !enviarPdfGarantia && !abrirWhats) {
    alert('Selecione pelo menos uma opção.');
    return;
  }

  const btn = document.getElementById('btn-executar-envio');
  const textoOriginal = btn.textContent;
  btn.textContent = 'Gerando...';
  btn.disabled = true;

  try {
    if (enviarPdfOs) {
      await gerarPDFOrdem(o.id);
      await new Promise(r => setTimeout(r, 500));
    }

    if (enviarPdfGarantia && o.garantia_ate) {
      await gerarPDFGarantia(o.id);
      await new Promise(r => setTimeout(r, 500));
    }

    if (abrirWhats && telefone) {
      const url = 'https://wa.me/' + telefone + '?text=' + encodeURIComponent(mensagem);
      window.open(url, '_blank');
    }

    fecharModalEnvio();

    let aviso = 'Documentos gerados com sucesso!\n\n';
    if (enviarPdfOs) aviso += '- PDF da OS baixado na pasta Downloads\n';
    if (enviarPdfGarantia) aviso += '- PDF de Garantia baixado na pasta Downloads\n';
    if (abrirWhats && telefone) aviso += '- WhatsApp aberto em nova aba\n';
    aviso += '\nAgora:\n1. Va na conversa do WhatsApp\n2. Clique no clip\n3. Escolha os PDFs baixados\n4. Enviar';
    alert(aviso);

  } catch (err) {
    alert('Erro ao enviar: ' + err.message);
    console.error(err);
  } finally {
    btn.textContent = textoOriginal;
    btn.disabled = false;
  }
}

// ============================================
// PDF DA OS
// ============================================

async function gerarPDFOrdem(id) {
  const lista = await apiGet('/ordens');
  const o = lista.find(x => x.id === id);
  if (!o) throw new Error('OS não encontrada');

  if (!window.jspdf || !window.jspdf.jsPDF) {
    throw new Error('Biblioteca de PDF não carregou.');
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const pago = o.valor_pago || 0;
  const total = o.valor || 0;
  const falta = Math.max(total - pago, 0);
  const quitado = o.quitado === 1;

  doc.setFillColor(0, 138, 125);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('TechGest', 15, 13);
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text('Sistema de Gestao para Assistencia Tecnica', 15, 20);
  doc.text('Garagem Tech', 15, 25);
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('OS #' + o.id, 195, 15, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');

  let y = 40;
  doc.setFont(undefined, 'bold');
  doc.text('Status:', 15, y);
  doc.setFont(undefined, 'normal');
  doc.text(o.status || '-', 40, y);
  doc.setFont(undefined, 'bold');
  doc.text('Data entrada:', 120, y);
  doc.setFont(undefined, 'normal');
  doc.text(formatDate(o.data_entrada), 155, y);

  y += 7;
  doc.setFont(undefined, 'bold');
  doc.text('Funcionario:', 15, y);
  doc.setFont(undefined, 'normal');
  doc.text(o.funcionario_nome || '-', 40, y);
  doc.setFont(undefined, 'bold');
  doc.text('Data saida:', 120, y);
  doc.setFont(undefined, 'normal');
  doc.text(o.data_saida ? formatDate(o.data_saida) : '-', 155, y);

  y += 8;
  doc.setDrawColor(200, 200, 200);
  doc.line(15, y, 195, y);
  y += 8;

  doc.setFillColor(230, 245, 243);
  doc.rect(15, y - 5, 180, 7, 'F');
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.text('DADOS DO CLIENTE', 15, y);
  y += 8;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.text('Nome: ' + (o.cliente_nome || '-'), 15, y);
  y += 6;

  try {
    const cliente = await apiGet('/clientes/' + o.cliente_id);
    if (cliente) {
      doc.text('Telefone: ' + (cliente.telefone || '-'), 15, y);
      doc.text('CPF: ' + (cliente.cpf || '-'), 110, y);
      y += 6;
      doc.text('E-mail: ' + (cliente.email || '-'), 15, y);
      y += 6;
      doc.text('Endereco: ' + (cliente.endereco || '-'), 15, y);
      y += 6;
    }
  } catch (e) {}

  y += 4;

  doc.setFillColor(230, 245, 243);
  doc.rect(15, y - 5, 180, 7, 'F');
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.text('DADOS DO APARELHO', 15, y);
  y += 8;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.text('Aparelho: ' + (o.aparelho || '-'), 15, y);
  doc.text('Marca: ' + (o.marca || '-'), 110, y);
  y += 6;
  doc.text('Modelo: ' + (o.modelo || '-'), 15, y);
  doc.text('IMEI: ' + (o.imei || '-'), 110, y);
  y += 6;
  doc.text('N Serie: ' + (o.numero_serie || '-'), 15, y);
  y += 8;

  doc.setFillColor(230, 245, 243);
  doc.rect(15, y - 5, 180, 7, 'F');
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.text('DESCRICAO DO SERVICO', 15, y);
  y += 8;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Defeito relatado:', 15, y);
  y += 5;
  doc.setFont(undefined, 'normal');
  const defeito = doc.splitTextToSize(o.defeito || '-', 175);
  doc.text(defeito, 15, y);
  y += defeito.length * 5 + 3;

  doc.setFont(undefined, 'bold');
  doc.text('Servico realizado:', 15, y);
  y += 5;
  doc.setFont(undefined, 'normal');
  const servico = doc.splitTextToSize(o.servico_realizado || '-', 175);
  doc.text(servico, 15, y);
  y += servico.length * 5 + 3;

  doc.setFont(undefined, 'bold');
  doc.text('Pecas utilizadas:', 15, y);
  y += 5;
  doc.setFont(undefined, 'normal');
  const pecas = doc.splitTextToSize(o.pecas_utilizadas || '-', 175);
  doc.text(pecas, 15, y);
  y += pecas.length * 5 + 5;

  doc.setFillColor(0, 138, 125);
  doc.setTextColor(255, 255, 255);
  doc.rect(15, y - 5, 180, 7, 'F');
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.text('VALORES', 15, y);
  y += 10;

  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(11);
  doc.text('Valor Total:', 15, y);
  doc.setFont(undefined, 'bold');
  doc.text(formatMoney(total), 195, y, { align: 'right' });
  y += 7;

  doc.setFont(undefined, 'normal');
  doc.text('Valor Pago:', 15, y);
  doc.setFont(undefined, 'bold');
  doc.text(formatMoney(pago), 195, y, { align: 'right' });
  y += 7;

  doc.setFont(undefined, 'normal');
  doc.text('Falta Pagar:', 15, y);
  doc.setFont(undefined, 'bold');
  if (quitado) {
    doc.setTextColor(16, 185, 129);
    doc.text('QUITADO', 195, y, { align: 'right' });
  } else {
    doc.setTextColor(239, 68, 68);
    doc.text(formatMoney(falta), 195, y, { align: 'right' });
  }
  doc.setTextColor(0, 0, 0);

  const alturaPagina = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    'Documento gerado em ' + new Date().toLocaleString('pt-BR') + ' pelo sistema TechGest',
    105,
    alturaPagina - 10,
    { align: 'center' }
  );

  const nomeCliente = (o.cliente_nome || 'cliente').replace(/[^a-zA-Z0-9]/g, '-');
  doc.save('OS-' + o.id + '-' + nomeCliente + '.pdf');
}

// ============================================
// PDF DE GARANTIA
// ============================================

async function gerarPDFGarantia(id) {
  const lista = await apiGet('/ordens');
  const o = lista.find(x => x.id === id);
  if (!o) throw new Error('OS não encontrada');

  if (!o.garantia_ate) {
    throw new Error('Esta OS ainda não tem garantia.');
  }

  if (!window.jspdf || !window.jspdf.jsPDF) {
    throw new Error('Biblioteca de PDF não carregou.');
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const entregue = new Date(o.data_saida);
  const expira = new Date(o.garantia_ate);

  doc.setFillColor(0, 138, 125);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('TERMO DE GARANTIA', 15, 13);
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text('Garagem Tech - Assistencia Tecnica', 15, 21);
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('OS #' + o.id, 195, 15, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  let y = 40;

  doc.setFillColor(230, 245, 243);
  doc.rect(15, y - 5, 180, 7, 'F');
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.text('CLIENTE', 15, y);
  y += 8;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.text('Nome: ' + (o.cliente_nome || '-'), 15, y);
  y += 6;

  try {
    const cliente = await apiGet('/clientes/' + o.cliente_id);
    if (cliente) {
      doc.text('Telefone: ' + (cliente.telefone || '-'), 15, y);
      doc.text('CPF: ' + (cliente.cpf || '-'), 110, y);
      y += 6;
    }
  } catch (e) {}

  y += 4;

  doc.setFillColor(230, 245, 243);
  doc.rect(15, y - 5, 180, 7, 'F');
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.text('APARELHO', 15, y);
  y += 8;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.text('Aparelho: ' + (o.aparelho || '-'), 15, y);
  doc.text('Marca: ' + (o.marca || '-'), 110, y);
  y += 6;
  doc.text('Modelo: ' + (o.modelo || '-'), 15, y);
  doc.text('IMEI: ' + (o.imei || '-'), 110, y);
  y += 6;
  doc.text('N Serie: ' + (o.numero_serie || '-'), 15, y);
  y += 10;

  doc.setFillColor(230, 245, 243);
  doc.rect(15, y - 5, 180, 7, 'F');
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.text('PERIODO DE GARANTIA', 15, y);
  y += 8;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.text('Data de entrega:', 15, y);
  doc.setFont(undefined, 'bold');
  doc.text(entregue.toLocaleDateString('pt-BR'), 60, y);
  y += 6;

  doc.setFont(undefined, 'normal');
  doc.text('Garantia valida ate:', 15, y);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 138, 125);
  doc.text(expira.toLocaleDateString('pt-BR'), 60, y);
  doc.setTextColor(0, 0, 0);
  y += 12;

  doc.setFillColor(230, 245, 243);
  doc.rect(15, y - 5, 180, 7, 'F');
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.text('TERMOS', 15, y);
  y += 8;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);

  const termo1 = doc.splitTextToSize(
    'A Garagem Tech concede garantia de 6 (seis) meses sobre os servicos realizados nesta ordem, contados a partir da data de entrega do aparelho ao cliente.',
    180
  );
  doc.text(termo1, 15, y);
  y += termo1.length * 5 + 3;

  doc.setFont(undefined, 'bold');
  doc.text('A garantia cobre:', 15, y);
  y += 5;
  doc.setFont(undefined, 'normal');
  doc.text('  - Defeitos relacionados ao servico executado', 15, y);
  y += 5;
  doc.text('  - Problemas nas pecas substituidas pela Garagem Tech', 15, y);
  y += 8;

  doc.setFont(undefined, 'bold');
  doc.text('A garantia NAO cobre:', 15, y);
  y += 5;
  doc.setFont(undefined, 'normal');
  doc.text('  - Danos por mau uso, quedas ou contato com liquidos', 15, y);
  y += 5;
  doc.text('  - Violacao do aparelho por terceiros', 15, y);
  y += 5;
  doc.text('  - Desgaste natural do produto', 15, y);
  y += 10;

  const termo2 = doc.splitTextToSize(
    'Para acionar a garantia, o cliente deve apresentar este documento junto com o aparelho.',
    180
  );
  doc.text(termo2, 15, y);
  y += termo2.length * 5 + 15;

  doc.setDrawColor(0, 0, 0);
  doc.line(60, y, 150, y);
  y += 5;
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.text('Garagem Tech', 105, y, { align: 'center' });
  y += 5;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Assistencia Tecnica Especializada', 105, y, { align: 'center' });

  const alturaPagina = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    'Documento gerado em ' + new Date().toLocaleString('pt-BR') + ' pelo sistema TechGest',
    105,
    alturaPagina - 10,
    { align: 'center' }
  );

  const nomeCliente = (o.cliente_nome || 'cliente').replace(/[^a-zA-Z0-9]/g, '-');
  doc.save('Garantia-OS-' + o.id + '-' + nomeCliente + '.pdf');
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
      document.getElementById('pagamentos-os-section').style.display = 'none';
      osAtual = null;
      carregarOrdens();
    });

    const btnCancel = document.getElementById('cancel-ordem');
    if (btnCancel) {
      btnCancel.addEventListener('click', () => {
        form.reset();
        document.getElementById('ordem-id').value = '';
        document.getElementById('cancel-ordem').style.display = 'none';
        document.getElementById('pagamentos-os-section').style.display = 'none';
        osAtual = null;
      });
    }
  }

  const formPgto = document.getElementById('form-pagamento');
  if (formPgto) {
    formPgto.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!osAtual) return;

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

      await apiPost(`/ordens/${osAtual}/pagamento`, dados);
      formPgto.reset();
      await atualizarPagamentosOS();
      carregarOrdens();
    });
  }

  const modalEnvio = document.getElementById('modal-envio');
  if (modalEnvio) {
    modalEnvio.addEventListener('click', (e) => {
      if (e.target === modalEnvio) fecharModalEnvio();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharModalEnvio();
  });
});