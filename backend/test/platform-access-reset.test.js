const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const Module = require('node:module');
const path = require('node:path');
const { once } = require('node:events');

process.env.JWT_SECRET = 'test-jwt-secret-with-more-than-32-characters';
process.env.PLATFORM_ADMIN_TOKEN = 'test-platform-admin-token-with-more-than-32-characters';

const databasePath = require.resolve('../database');
const db = {
  isPostgres: true,
  async resetTenantOwnerAccess(...args) {
    this.resetArguments = args;
    return { email: args[1] };
  }
};
require.cache[databasePath] = {
  id: databasePath,
  filename: databasePath,
  loaded: true,
  exports: db,
  children: [],
  paths: Module._nodeModulePaths(path.dirname(databasePath))
};

const auth = require('../auth');
const app = express();
app.use(express.json());
app.use('/api/platform', auth.platformRouter);

test('redefine acesso do responsável apenas com token e entrega senha temporária de uso único', async t => {
  const server = app.listen(0);
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  }));

  const url = `http://127.0.0.1:${server.address().port}/api/platform/tenants/42/reset-owner-access`;
  const unauthorized = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'responsavel@exemplo.com' })
  });
  assert.equal(unauthorized.status, 401);

  const invalidEmail = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Platform-Admin-Token': process.env.PLATFORM_ADMIN_TOKEN
    },
    body: JSON.stringify({ email: 'email-invalido' })
  });
  assert.equal(invalidEmail.status, 400);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Platform-Admin-Token': process.env.PLATFORM_ADMIN_TOKEN
    },
    body: JSON.stringify({ email: '  Novo.Acesso@Exemplo.com  ' })
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.responsavel.email, 'novo.acesso@exemplo.com');
  assert.ok(result.senhaTemporaria.length >= 12);
  assert.match(result.aviso, /exigirá uma nova senha/);
  assert.equal(db.resetArguments[0], '42');
  assert.equal(db.resetArguments[1], 'novo.acesso@exemplo.com');
  assert.notEqual(db.resetArguments[2], result.senhaTemporaria);
  assert.ok(db.resetArguments[3]);
});
