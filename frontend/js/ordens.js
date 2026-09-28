// ============================================
// ORDENS DE SERVIÇO (OS)
// ============================================

let osAtual = null;
let produtosOS = [];
let maoDeObraOS = [];

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
// MÃO DE OBRA
// ============================================

function adicionarMaoDeObra() {
  const descInput = document.getElementById('os-mo-descricao');
  const valorInput = document.getElementById('os-mo-valor');

  const descricao = descInput.value.trim();
  const valor = parseFloat(valorInput.value) || 0;

  if (!descricao) return alert('Digite a descrição do serviço');
  if (valor <= 0) return alert('Digite um valor maior que zero');

  maoDeObraOS.push({ descricao, valor });
  descInput.value = '';
  valorInput.value = '';
  renderMaoDeObra();
}

function removerMaoDeObra(i) {
  maoDeObraOS.splice(i, 1);
  renderMaoDeObra();
}

function renderMaoDeObra() {
  const div = document.getElementById('os-mao-de-obra-lista');
  if (!div) return;

  if (maoDeObraOS.length === 0) {
    div.innerHTML = '<div class="vazio">Nenhum serviço adicionado</div>';
    document.getElementById('os-mo-subtotal').textContent = 'R$ 0,00';
    recalcularTotal();
    return;
  }

  div.innerHTML = '';
  let subtotal = 0;

  maoDeObraOS.forEach((item, i) => {
    subtotal += item.valor;
    const el = document.createElement('div');
    el.className = 'item';
    el.style.display = 'flex';
    el.style.justifyContent = 'space-between';
    el.style.alignItems = 'center';
    el.innerHTML = `
      <span>${item.descricao} — <strong>${formatMoney(item.valor)}</strong></span>
      <button type="button" onclick="removerMaoDeObra(${i})" style="background:var(--cor-erro); color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:12px;">x</button>
    `;
    div.appendChild(el);
  });

  document.getElementById('os-mo-subtotal').textContent = formatMoney(subtotal);
  recalcularTotal();
}

// ============================================
// PRODUTOS
// ============================================

async function carregarSelectProdutosOS() {
  const select = document.getElementById('os-produto-select');
  if (!select) return;

  try {
    const produtos = await apiGet('/produtos');
    select.innerHTML = '<option value="">Selecione um produto...</option>';

    produtos.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.nome} — ${formatMoney(p.preco)}`;
      opt.dataset.preco = p.preco;
      opt.dataset.nome = p.nome;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Erro ao carregar produtos:', err);
  }
}

function adicionarProdutoOS() {
  const select = document.getElementById('os-produto-select');
  const qtdInput = document.getElementById('os-produto-qtd');
  const opt = select.options[select.selectedIndex];
  const qtd = parseInt(qtdInput.value) || 1;

  if (!select.value) return alert('Selecione um produto');

  const preco = parseFloat(opt.dataset.preco) || 0;
  const nome = opt.dataset.nome;

  produtosOS.push({
    id: parseInt(select.value),
    nome,
    preco,
    quantidade: qtd
  });

  select.value = '';
  qtdInput.value = '1';
  renderProdutosOS();
}

function removerProdutoOS(index) {
  produtosOS.splice(index, 1);
  renderProdutosOS();
}

function renderProdutosOS() {
  const div = document.getElementById('os-produtos-lista');
  if (!div) return;

  if (produtosOS.length === 0) {
    div.innerHTML = '<div class="vazio">Nenhum produto adicionado</div>';
    document.getElementById('os-produtos-subtotal').textContent = 'R$ 0,00';
    recalcularTotal();
    return;
  }

  div.innerHTML = '';
  let subtotal = 0;

  produtosOS.forEach((p, i) => {
    subtotal += p.preco * p.quantidade;
    const el = document.createElement('div');
    el.className = 'item';
    el.style.display = 'flex';
    el.style.justifyContent = 'space-between';
    el.style.alignItems = 'center';
    el.innerHTML = `
      <span>${p.nome} — ${p.quantidade}x ${formatMoney(p.preco)} = <strong>${formatMoney(p.preco * p.quantidade)}</strong></span>
      <button type="button" onclick="removerProdutoOS(${i})" style="background:var(--cor-erro); color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:12px;">x</button>
    `;
    div.appendChild(el);
  });

  document.getElementById('os-produtos-subtotal').textContent = formatMoney(subtotal);
  recalcularTotal();
}

// ============================================
// RECALCULAR TOTAL
// ============================================

function recalcularTotal() {
  const somaMO = maoDeObraOS.reduce((s, i) => s + i.valor, 0);
  const somaProd = produtosOS.reduce((s, i) => s + i.preco * i.quantidade, 0);
  const total = somaMO + somaProd;
  const el = document.getElementById('ordem-valor');
  if (el) el.value = total.toFixed(2);
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

  let moHTML = '-';
  try {
    const arr = JSON.parse(o.mao_de_obra || '[]');
    if (arr.length > 0) moHTML = arr.map(m => `${m.descricao} — ${formatMoney(m.valor)}`).join('<br>');
  } catch (e) {}

  let prodHTML = '-';
  try {
    const arr = JSON.parse(o.produtos_vendidos || '[]');
    if (arr.length > 0) prodHTML = arr.map(p => `${p.quantidade}x ${p.nome} (${formatMoney(p.preco)})`).join('<br>');
  } catch (e) {}

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
    <div class="info-linha"><strong>Mão de Obra</strong><span>${moHTML}</span></div>
    <div class="info-linha"><strong>Produtos vendidos</strong><span>${prodHTML}</span></div>
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
// EDITAR
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
  document.getElementById('ordem-status').value = o.status || 'Aberta';

  try { maoDeObraOS = JSON.parse(o.mao_de_obra || '[]'); } catch (e) { maoDeObraOS = []; }
  if (!Array.isArray(maoDeObraOS)) maoDeObraOS = [];

  try { produtosOS = JSON.parse(o.produtos_vendidos || '[]'); } catch (e) { produtosOS = []; }
  if (!Array.isArray(produtosOS)) produtosOS = [];

  await carregarSelectProdutosOS();
  renderMaoDeObra();
  renderProdutosOS();

  if (o.data_saida) {
    const d = new Date(o.data_saida);
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    document.getElementById('ordem-data-saida').value = `${ano}-${mes}-${dia}`;
  } else {
    document.getElementById('ordem-data-saida').value = '';
  }

  document.getElementById('cancel-ordem').style.display = 'inline-block';
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

    await preencherTermosGarantia();
    toggleSeletorTermo();

    document.getElementById('envio-pdf-os').checked = true;
    document.getElementById('envio-whatsapp').checked = true;

    const pago = o.valor_pago || 0;
    const total = o.valor || 0;
    const falta = Math.max(total - pago, 0);
    const quitado = o.quitado === 1;

    let statusPag = 'Total: ' + formatMoney(total);
    if (quitado) statusPag += ' (QUITADO)';
    else if (pago > 0) statusPag += ' | Pago: ' + formatMoney(pago) + ' | Falta: ' + formatMoney(falta);

    let nomeLoja = 'Garagem Tech';
    try {
      const config = await apiGet('/configuracoes');
      if (config && config.nome_loja) nomeLoja = config.nome_loja;
    } catch (e) {}

    const msg = `Olá ${o.cliente_nome || 'cliente'}!

Sua OS #${o.id} - ${o.aparelho || 'aparelho'} está com status: *${o.status}*

Serviço realizado: ${o.servico_realizado || '-'}
Valor: ${statusPag}

Qualquer dúvida, estamos à disposição!

Att,
*${nomeLoja}*`;

    document.getElementById('envio-mensagem').value = msg;
    document.getElementById('modal-envio').classList.add('active');
  } catch (err) {
    alert('Erro ao abrir envio: ' + err.message);
  }
}

async function preencherTermosGarantia() {
  try {
    const termos = await apiGet('/termosGarantia');
    const select = document.getElementById('envio-termo-garantia');
    if (!select) return;

    select.innerHTML = '';
    const ativos = termos.filter(t => t.ativo !== 0);

    if (ativos.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Nenhum modelo cadastrado';
      select.appendChild(opt);
      return;
    }

    ativos.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.nome;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Erro ao carregar termos:', err);
  }
}

function toggleSeletorTermo() {
  const cb = document.getElementById('envio-pdf-garantia');
  const container = document.getElementById('container-termo-garantia');
  if (!cb || !container) return;
  container.style.display = (cb.checked && !cb.disabled) ? 'block' : 'none';
}

// ============================================
// PDF DA OS
// ============================================

async function gerarPDFOrdem(id) {
  const lista = await apiGet('/ordens');
  const o = lista.find(x => x.id === id);
  if (!o) throw new Error('OS não encontrada');
  if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('Biblioteca de PDF não carregou.');

  let nomeLoja = 'Garagem Tech';
  let sloganLoja = 'Soluções Tecnológicas';
  try {
    const config = await apiGet('/configuracoes');
    if (config.nome_loja) nomeLoja = config.nome_loja;
    if (config.slogan_loja) sloganLoja = config.slogan_loja;
  } catch (e) {}

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const pago = o.valor_pago || 0;
  const total = o.valor || 0;
  const falta = Math.max(total - pago, 0);
  const quitado = o.quitado === 1;

  let moArr = [];
  let prodArr = [];
  try { moArr = JSON.parse(o.mao_de_obra || '[]'); } catch (e) {}
  try { prodArr = JSON.parse(o.produtos_vendidos || '[]'); } catch (e) {}
  if (!Array.isArray(moArr)) moArr = [];
  if (!Array.isArray(prodArr)) prodArr = [];

  // CABEÇALHO
  doc.setFillColor(0, 138, 125);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text(nomeLoja, 15, 13);
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(sloganLoja, 15, 20);
  doc.text('Sistema TechGest', 15, 25);
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

  // CLIENTE
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
    }
  } catch (e) {}

  y += 4;

  // APARELHO (com wrap)
  doc.setFillColor(230, 245, 243);
  doc.rect(15, y - 5, 180, 7, 'F');
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.text('DADOS DO APARELHO', 15, y);
  y += 8;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);

  // Aparelho com wrap
  const aparelhoLinhas = doc.splitTextToSize('Aparelho: ' + (o.aparelho || '-'), 180);
  if (y + aparelhoLinhas.length * 5 > 275) { doc.addPage(); y = 20; }
  doc.text(aparelhoLinhas, 15, y);
  y += aparelhoLinhas.length * 5 + 1;

  // Marca com wrap
  const marcaLinhas = doc.splitTextToSize('Marca: ' + (o.marca || '-'), 180);
  if (y + marcaLinhas.length * 5 > 275) { doc.addPage(); y = 20; }
  doc.text(marcaLinhas, 15, y);
  y += marcaLinhas.length * 5 + 1;

  // Modelo com wrap
  const modeloLinhas = doc.splitTextToSize('Modelo: ' + (o.modelo || '-'), 180);
  if (y + modeloLinhas.length * 5 > 275) { doc.addPage(); y = 20; }
  doc.text(modeloLinhas, 15, y);
  y += modeloLinhas.length * 5 + 1;

  // IMEI com wrap
  const imeiLinhas = doc.splitTextToSize('IMEI: ' + (o.imei || '-'), 180);
  if (y + imeiLinhas.length * 5 > 275) { doc.addPage(); y = 20; }
  doc.text(imeiLinhas, 15, y);
  y += imeiLinhas.length * 5 + 1;

  // N Série com wrap
  const serieLinhas = doc.splitTextToSize('N Serie: ' + (o.numero_serie || '-'), 180);
  if (y + serieLinhas.length * 5 > 275) { doc.addPage(); y = 20; }
  doc.text(serieLinhas, 15, y);
  y += serieLinhas.length * 5 + 6;

  // DEFEITO (com wrap)
  if (o.defeito) {
    if (y > 250) { doc.addPage(); y = 20; }

    doc.setFillColor(230, 245, 243);
    doc.rect(15, y - 5, 180, 7, 'F');
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.text('DEFEITO RELATADO', 15, y);
    y += 8;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    const linhas = doc.splitTextToSize(o.defeito, 180);
    if (y + linhas.length * 5 > 275) { doc.addPage(); y = 20; }
    doc.text(linhas, 15, y);
    y += linhas.length * 5 + 5;
  }

  // MÃO DE OBRA (com wrap)
  if (moArr.length > 0) {
    if (y > 230) { doc.addPage(); y = 20; }

    doc.setFillColor(230, 245, 243);
    doc.rect(15, y - 5, 180, 7, 'F');
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.text('MAO DE OBRA', 15, y);
    y += 10;

    doc.setFillColor(60, 60, 60);
    doc.setTextColor(255, 255, 255);
    doc.rect(15, y - 4, 180, 6, 'F');
    doc.setFontSize(10);
    doc.text('Servico', 18, y);
    doc.text('Valor', 195, y, { align: 'right' });
    y += 6;

    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');

    let subtotalMO = 0;
    moArr.forEach(m => {
      const descLinhas = doc.splitTextToSize(m.descricao || '-', 150);
      const altura = Math.max(descLinhas.length * 5, 6);

      if (y + altura > 275) { doc.addPage(); y = 20; }

      subtotalMO += m.valor || 0;
      doc.text(descLinhas, 18, y);
      doc.text(formatMoney(m.valor || 0), 195, y, { align: 'right' });
      y += altura;
    });

    y += 2;
    doc.setFont(undefined, 'bold');
    doc.text('Subtotal Mao de Obra:', 130, y);
    doc.text(formatMoney(subtotalMO), 195, y, { align: 'right' });
    y += 10;
  }

  // PRODUTOS (com wrap real)
  if (prodArr.length > 0) {
    if (y > 220) { doc.addPage(); y = 20; }

    doc.setFillColor(230, 245, 243);
    doc.rect(15, y - 5, 180, 7, 'F');
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.text('PRODUTOS VENDIDOS', 15, y);
    y += 10;

    doc.setFillColor(60, 60, 60);
    doc.setTextColor(255, 255, 255);
    doc.rect(15, y - 4, 180, 6, 'F');
    doc.setFontSize(9);
    doc.text('Produto', 18, y);
    doc.text('Qtd', 128, y);
    doc.text('Unit.', 152, y);
    doc.text('Total', 195, y, { align: 'right' });
    y += 6;

    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);

    let subtotalProd = 0;
    prodArr.forEach(p => {
      const nomeLinhas = doc.splitTextToSize(p.nome || '-', 105);
      const altura = Math.max(nomeLinhas.length * 4.5, 6);

      if (y + altura > 275) { doc.addPage(); y = 20; }

      const sub = (p.preco || 0) * (p.quantidade || 1);
      subtotalProd += sub;

      doc.text(nomeLinhas, 18, y);
      doc.text(String(p.quantidade || 1), 128, y);
      doc.text(formatMoney(p.preco || 0), 152, y);
      doc.text(formatMoney(sub), 195, y, { align: 'right' });

      y += altura;
    });

    y += 2;
    doc.setFont(undefined, 'bold');
    doc.text('Subtotal Produtos:', 130, y);
    doc.text(formatMoney(subtotalProd), 195, y, { align: 'right' });
    y += 10;
  }

  // SERVIÇO REALIZADO (com wrap)
  if (o.servico_realizado) {
    if (y > 240) { doc.addPage(); y = 20; }

    doc.setFillColor(230, 245, 243);
    doc.rect(15, y - 5, 180, 7, 'F');
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.text('OBSERVACOES DO SERVICO', 15, y);
    y += 8;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    const linhas = doc.splitTextToSize(o.servico_realizado, 180);
    if (y + linhas.length * 5 > 275) { doc.addPage(); y = 20; }
    doc.text(linhas, 15, y);
    y += linhas.length * 5 + 5;
  }

  // VALORES
  if (y > 240) { doc.addPage(); y = 20; }

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
  doc.text('Documento gerado em ' + new Date().toLocaleString('pt-BR') + ' pelo TechGest', 105, alturaPagina - 10, { align: 'center' });

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
  if (!o.garantia_ate) throw new Error('Esta OS ainda não tem garantia.');
  if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('Biblioteca de PDF não carregou.');

  const selectTermo = document.getElementById('envio-termo-garantia');
  const termoId = selectTermo ? selectTermo.value : null;
  if (!termoId) throw new Error('Nenhum modelo de garantia selecionado.');

  const termo = await apiGet('/termosGarantia/' + termoId);
  if (!termo) throw new Error('Modelo de garantia não encontrado');

  let nomeLoja = 'Garagem Tech';
  let sloganLoja = 'Soluções Tecnológicas';
  try {
    const config = await apiGet('/configuracoes');
    if (config.nome_loja) nomeLoja = config.nome_loja;
    if (config.slogan_loja) sloganLoja = config.slogan_loja;
  } catch (e) {}

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
  doc.text(nomeLoja + ' - ' + sloganLoja, 15, 21);
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
  doc.text('APARELHO / SERVICO', 15, y);
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

  y += 6;
  doc.setFont(undefined, 'normal');
  const tempoTexto = termo.tempo_dias >= 365 ? Math.round(termo.tempo_dias / 365) + ' ano(s)' : termo.tempo_dias >= 30 ? Math.round(termo.tempo_dias / 30) + ' mes(es)' : termo.tempo_dias + ' dias';
  doc.text('Periodo:', 15, y);
  doc.text(tempoTexto + ' (' + termo.tempo_dias + ' dias)', 60, y);
  y += 12;

  doc.setFillColor(230, 245, 243);
  doc.rect(15, y - 5, 180, 7, 'F');
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.text('TERMOS', 15, y);
  y += 8;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(9.5);

  const paragrafos = (termo.texto || '').split('\n');
  paragrafos.forEach(par => {
    if (!par.trim()) { y += 3; return; }
    const linhas = doc.splitTextToSize(par.trim(), 180);
    linhas.forEach(linha => {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(linha, 15, y);
      y += 4.5;
    });
    y += 3;
  });

  y += 10;
  if (y > 250) { doc.addPage(); y = 30; }

  doc.setDrawColor(0, 0, 0);
  doc.line(60, y, 150, y);
  y += 5;
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.text(nomeLoja, 105, y, { align: 'center' });
  y += 5;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(sloganLoja, 105, y, { align: 'center' });

  const alturaPagina = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Documento gerado em ' + new Date().toLocaleString('pt-BR') + ' pelo sistema TechGest', 105, alturaPagina - 10, { align: 'center' });

  const nomeCliente = (o.cliente_nome || 'cliente').replace(/[^a-zA-Z0-9]/g, '-');
  doc.save('Garantia-OS-' + o.id + '-' + nomeCliente + '.pdf');
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
      await new Promise(r => setTimeout(r, 700));
    }
    if (enviarPdfGarantia && o.garantia_ate) {
      await gerarPDFGarantia(o.id);
      await new Promise(r => setTimeout(r, 700));
    }
    if (abrirWhats && telefone) {
      const url = 'https://wa.me/' + telefone + '?text=' + encodeURIComponent(mensagem);
      window.open(url, '_blank');
    }

    fecharModalEnvio();
    let aviso = 'Documentos gerados com sucesso!\n\n';
    if (enviarPdfOs) aviso += '- PDF da OS: baixado na pasta Downloads\n';
    if (enviarPdfGarantia) aviso += '- PDF de Garantia: baixado na pasta Downloads\n';
    if (abrirWhats && telefone) aviso += '- WhatsApp: aberto em nova aba\n';
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
// EVENTOS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-ordem');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('ordem-id').value;
      const valorCalculado = parseFloat(document.getElementById('ordem-valor').value) || 0;

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
        mao_de_obra: JSON.stringify(maoDeObraOS),
        produtos_vendidos: JSON.stringify(produtosOS),
        valor: valorCalculado,
        status: document.getElementById('ordem-status').value,
        data_saida: document.getElementById('ordem-data-saida').value || null
      };

      if (id) await apiPut('/ordens/' + id, dados);
      else await apiPost('/ordens', dados);

      form.reset();
      maoDeObraOS = [];
      produtosOS = [];
      renderMaoDeObra();
      renderProdutosOS();
      document.getElementById('ordem-id').value = '';
      document.getElementById('ordem-data-saida').value = '';
      document.getElementById('cancel-ordem').style.display = 'none';
      document.getElementById('pagamentos-os-section').style.display = 'none';
      osAtual = null;
      carregarOrdens();
    });

    carregarSelectProdutosOS();
    renderMaoDeObra();
    renderProdutosOS();

    const btnCancel = document.getElementById('cancel-ordem');
    if (btnCancel) {
      btnCancel.addEventListener('click', () => {
        form.reset();
        maoDeObraOS = [];
        produtosOS = [];
        renderMaoDeObra();
        renderProdutosOS();
        document.getElementById('ordem-id').value = '';
        document.getElementById('ordem-data-saida').value = '';
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