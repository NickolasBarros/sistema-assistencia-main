const { test } = require('node:test');
const assert = require('node:assert/strict');
const { enforceRole } = require('../permissions');

function evaluate(role, method, path) {
  let nextCalled = false;
  let statusCode = 200;
  let responseBody;
  const response = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    }
  };
  enforceRole(
    { auth: { role }, method, path },
    response,
    () => { nextCalled = true; }
  );
  return { nextCalled, statusCode, responseBody };
}

test('colaboradores têm operação diária, sem módulos e alterações restritas', () => {
  assert.equal(evaluate('staff', 'GET', '/relatorios/resumo').nextCalled, true);
  assert.equal(evaluate('staff', 'GET', '/funcionarios').nextCalled, true);
  assert.equal(evaluate('staff', 'GET', '/configuracoes').nextCalled, true);

  for (const [method, path] of [
    ['GET', '/caixa'],
    ['GET', '/financeiro/extrato'],
    ['GET', '/despesasFixas'],
    ['GET', '/relatorios/graficos'],
    ['POST', '/configuracoes'],
    ['POST', '/funcionarios'],
    ['DELETE', '/clientes/12']
  ]) {
    const result = evaluate('staff', method, path);
    assert.equal(result.nextCalled, false, `${method} ${path} deve ser bloqueado`);
    assert.equal(result.statusCode, 403);
  }
});

test('responsáveis não são limitados pelas regras de colaborador', () => {
  assert.equal(evaluate('owner', 'GET', '/financeiro/extrato').nextCalled, true);
  assert.equal(evaluate('owner', 'DELETE', '/clientes/12').nextCalled, true);
});
