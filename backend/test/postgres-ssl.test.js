const test = require('node:test');
const assert = require('node:assert/strict');
const { parse } = require('pg-connection-string');
const { connectionStringForPool, sslOptionsForMode } = require('../postgres-ssl');

test('usa a configuração TLS explícita do pool mesmo com sslmode na DATABASE_URL', () => {
  const databaseUrl = 'postgres://techgest:senha@db.example/techgest?sslmode=require&application_name=techgest';
  const connectionString = connectionStringForPool(databaseUrl);
  const parsed = parse(connectionString);

  assert.equal(parsed.ssl, undefined);
  assert.equal(parsed.application_name, 'techgest');
  assert.deepEqual(sslOptionsForMode('require'), { rejectUnauthorized: false });
});

test('mantém modos de verificação rigorosa e rejeita configurações desconhecidas', () => {
  assert.deepEqual(sslOptionsForMode('verify-ca'), { rejectUnauthorized: true });
  assert.deepEqual(sslOptionsForMode('verify-full'), { rejectUnauthorized: true });
  assert.equal(sslOptionsForMode('disable'), false);
  assert.throws(() => sslOptionsForMode('invalid'), /PGSSLMODE inválido/);
});
