const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');

let server;
let baseUrl;
let testDirectory;

async function portaLivre() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(err => err ? reject(err) : resolve(port));
    });
  });
}

async function esperarServidor(url) {
  const limite = Date.now() + 10000;
  while (Date.now() < limite) {
    try {
      const resposta = await fetch(`${url}/health`);
      if (resposta.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('O servidor de teste não iniciou no prazo esperado.');
}

async function request(pathname, options = {}) {
  return fetch(`${baseUrl}${pathname}`, options);
}

async function json(res) {
  return res.json();
}

before(async () => {
  testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'techgest-system-test-'));
  const port = await portaLivre();
  baseUrl = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      DATABASE_PATH: path.join(testDirectory, 'database.db'),
      UPLOADS_PATH: path.join(testDirectory, 'uploads'),
      PORT: String(port),
      NODE_ENV: 'test'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let logs = '';
  server.stdout.on('data', chunk => { logs += chunk; });
  server.stderr.on('data', chunk => { logs += chunk; });
  server.on('exit', code => {
    if (code && code !== 0) console.error('Servidor de teste encerrou:', logs);
  });
  await esperarServidor(baseUrl);
});

after(async () => {
  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
    await new Promise(resolve => server.once('exit', resolve));
  }
  if (testDirectory) fs.rmSync(testDirectory, { recursive: true, force: true });
});

test('cliente, estoque, venda, OS, imagens e preservação de histórico funcionam em conjunto', async () => {
  const clienteResponse = await request('/api/clientes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome: 'Cliente de integração', telefone: '999999999' })
  });
  assert.equal(clienteResponse.status, 201);
  const cliente = await json(clienteResponse);

  const produtoResponse = await request('/api/produtos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome: 'Cabo de teste', tipo: 'produto', preco: 10, quantidade: 3, estoque_minimo: 1 })
  });
  assert.equal(produtoResponse.status, 201);
  const produto = await json(produtoResponse);

  const arquivoImagem = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
  const imagemInvalida = await request(`/api/midias/produto/${produto.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/png' },
    body: Buffer.from('not an image')
  });
  assert.equal(imagemInvalida.status, 400);

  const uploadProduto = await request(`/api/midias/produto/${produto.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/png' },
    body: arquivoImagem
  });
  assert.equal(uploadProduto.status, 201);
  const mediaProduto = await json(uploadProduto);
  assert.match(mediaProduto.url, /^\/api\/midias\/\d+\/arquivo$/);
  const imagemProduto = await request(mediaProduto.url);
  assert.equal(imagemProduto.status, 200);
  assert.equal(imagemProduto.headers.get('content-type'), 'image/png');

  const vendaSemSaldo = await request('/api/vendas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cliente_id: cliente.id,
      itens: [{ produto_id: produto.id, quantidade: 4 }],
      forma_pagamento: 'PIX'
    })
  });
  assert.equal(vendaSemSaldo.status, 409);
  let produtos = await json(await request('/api/produtos'));
  assert.equal(produtos.find(item => item.id === produto.id).quantidade, 3);
  assert.deepEqual(await json(await request('/api/vendas')), []);

  const itensDuplicadosSemSaldo = await request('/api/vendas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cliente_id: cliente.id,
      itens: [
        { produto_id: produto.id, quantidade: 2 },
        { produto_id: produto.id, quantidade: 2 }
      ],
      forma_pagamento: 'PIX'
    })
  });
  assert.equal(itensDuplicadosSemSaldo.status, 409);
  produtos = await json(await request('/api/produtos'));
  assert.equal(produtos.find(item => item.id === produto.id).quantidade, 3);

  const vendaResponse = await request('/api/vendas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cliente_id: cliente.id,
      itens: [{ produto_id: produto.id, quantidade: 2 }],
      forma_pagamento: 'PIX'
    })
  });
  assert.equal(vendaResponse.status, 201);
  const venda = await json(vendaResponse);
  assert.equal(venda.valor_total, 20);
  produtos = await json(await request('/api/produtos'));
  assert.equal(produtos.find(item => item.id === produto.id).quantidade, 1);

  const vendaDelete = await request(`/api/vendas/${venda.id}`, { method: 'DELETE' });
  assert.equal(vendaDelete.status, 200);
  produtos = await json(await request('/api/produtos'));
  assert.equal(produtos.find(item => item.id === produto.id).quantidade, 3);
  assert.deepEqual(await json(await request('/api/vendas')), []);

  const imagemOs = await request(`/api/midias/ordem/1`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/png' },
    body: arquivoImagem
  });
  assert.equal(imagemOs.status, 404);

  const osBody = {
    cliente_id: cliente.id,
    aparelho: 'Celular de teste',
    valor: 20,
    status: 'Aberta',
    produtos_vendidos: JSON.stringify([{ id: produto.id, nome: 'Cabo de teste', tipo: 'produto', preco: 10, quantidade: 2 }])
  };
  const osResponse = await request('/api/ordens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(osBody)
  });
  assert.equal(osResponse.status, 201);
  const ordem = await json(osResponse);
  produtos = await json(await request('/api/produtos'));
  assert.equal(produtos.find(item => item.id === produto.id).quantidade, 1);

  const ordemImage = await request(`/api/midias/ordem/${ordem.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/png' },
    body: arquivoImagem
  });
  assert.equal(ordemImage.status, 201);
  const midiaOrdem = await json(ordemImage);

  const clienteEmUso = await request(`/api/clientes/${cliente.id}`, { method: 'DELETE' });
  assert.equal(clienteEmUso.status, 409);

  const atualizarOs = async (status, produtosOs) => request(`/api/ordens/${ordem.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...osBody, status, produtos_vendidos: JSON.stringify(produtosOs) })
  });

  const cancelar = await atualizarOs('Cancelada', JSON.parse(osBody.produtos_vendidos));
  assert.equal(cancelar.status, 200);
  produtos = await json(await request('/api/produtos'));
  assert.equal(produtos.find(item => item.id === produto.id).quantidade, 3);

  const reabrir = await atualizarOs('Em Reparo', JSON.parse(osBody.produtos_vendidos));
  assert.equal(reabrir.status, 200);
  produtos = await json(await request('/api/produtos'));
  assert.equal(produtos.find(item => item.id === produto.id).quantidade, 1);

  const removerPeca = await atualizarOs('Em Reparo', []);
  assert.equal(removerPeca.status, 200);
  produtos = await json(await request('/api/produtos'));
  assert.equal(produtos.find(item => item.id === produto.id).quantidade, 3);

  const adicionarPagamento = await request(`/api/ordens/${ordem.id}/pagamento`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ valor: 21, forma_pagamento: 'PIX', parcelas: 1 })
  });
  assert.equal(adicionarPagamento.status, 409);

  const caixaLegado = await request('/api/caixa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tipo: 'entrada',
      descricao: `Pagamento OS #${ordem.id}`,
      valor: 4,
      forma_pagamento: 'PIX',
      parcelas: 1
    })
  });
  assert.equal(caixaLegado.status, 200);

  const pagamentoResponse = await request(`/api/ordens/${ordem.id}/pagamento`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ valor: 4, forma_pagamento: 'PIX', parcelas: 1 })
  });
  assert.equal(pagamentoResponse.status, 201);
  const pagamento = await json(pagamentoResponse);
  const excluirPagamento = await request(`/api/ordens/${ordem.id}/pagamento/${pagamento.id}`, { method: 'DELETE' });
  assert.equal(excluirPagamento.status, 200);
  const movimentosCaixa = await json(await request('/api/caixa'));
  assert.equal(movimentosCaixa.filter(movimento => movimento.descricao === `Pagamento OS #${ordem.id}`).length, 1);
  assert.equal(movimentosCaixa.filter(movimento => movimento.descricao === `Pagamento OS #${ordem.id} - #${pagamento.id}`).length, 0);

  const excluirOs = await request(`/api/ordens/${ordem.id}`, { method: 'DELETE' });
  assert.equal(excluirOs.status, 200);
  const ordemFotos = await json(await request(`/api/midias/entidade/ordem/${ordem.id}`));
  assert.deepEqual(ordemFotos, []);
  const imagemRemovida = await request(midiaOrdem.url);
  assert.equal(imagemRemovida.status, 404);
  assert.equal((await json(await request('/api/produtos'))).find(item => item.id === produto.id).quantidade, 3);

  const ajustarEstoque = await request(`/api/produtos/${produto.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome: 'Cabo de teste', tipo: 'produto', preco: 10, quantidade: 0, estoque_minimo: 1 })
  });
  assert.equal(ajustarEstoque.status, 200);
  for (let indice = 0; indice < 4; indice++) {
    const fotoAdicional = await request(`/api/midias/produto/${produto.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'image/png' },
      body: arquivoImagem
    });
    assert.equal(fotoAdicional.status, 201);
  }
  const sextaFoto = await request(`/api/midias/produto/${produto.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/png' },
    body: arquivoImagem
  });
  assert.equal(sextaFoto.status, 409);

  const arquivarProduto = await request(`/api/produtos/${produto.id}`, { method: 'DELETE' });
  assert.equal(arquivarProduto.status, 200);
  assert.equal((await json(arquivarProduto)).arquivado, true);
  assert.deepEqual(await json(await request('/api/produtos')), []);

  const produtoArquivadoVenda = await request('/api/vendas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itens: [{ produto_id: produto.id, quantidade: 1 }], forma_pagamento: 'PIX' })
  });
  assert.equal(produtoArquivadoVenda.status, 409);

  const excluirCliente = await request(`/api/clientes/${cliente.id}`, { method: 'DELETE' });
  assert.equal(excluirCliente.status, 200);

  const imagemGrande = await request(`/api/midias/produto/${produto.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/png' },
    body: Buffer.alloc(5 * 1024 * 1024 + 1, 0x00)
  });
  assert.equal(imagemGrande.status, 413);
});
