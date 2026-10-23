function connectionStringForPool(connectionString) {
  if (!connectionString) return connectionString;
  const url = new URL(connectionString);
  url.searchParams.delete('sslmode');
  url.searchParams.delete('uselibpqcompat');
  return url.toString();
}

function sslOptionsForMode(mode) {
  if (mode === 'disable') return false;
  if (mode === 'require') return { rejectUnauthorized: false };
  if (mode === 'verify-ca' || mode === 'verify-full') return { rejectUnauthorized: true };
  throw new Error('PGSSLMODE inválido. Use disable, require, verify-ca ou verify-full.');
}

module.exports = { connectionStringForPool, sslOptionsForMode };
