const idTables = new Set([
  'clientes', 'funcionarios', 'produtos', 'ordens', 'caixa', 'despesas_fixas', 'vendas', 'vendas_aparelhos',
  'estoque_mov', 'financeiro', 'orcamentos', 'os_pagamentos', 'termos_garantia', 'caixa_sessoes',
  'modelos_documentos', 'midias'
]);

function converterSql(sql) {
  const converted = sql
    .replace(/\bBEGIN IMMEDIATE\b/gi, 'BEGIN')
    .replace(/\bAUTOINCREMENT\b/gi, '')
    .replace(/\bDATETIME\b/gi, 'TIMESTAMP')
    .replace(/\bREAL\b/gi, 'DOUBLE PRECISION')
    .replace(/\bINTEGER\s+PRIMARY\s+KEY\b/gi, 'SERIAL PRIMARY KEY')
    .replace(/strftime\('%Y-%m',\s*([^)]+)\)/gi, "TO_CHAR($1::timestamp, 'YYYY-MM')")
    .replace(/\bdate\('now',\s*'-(\d+)\s+(days?|months?|years?)'\)/gi, "(CURRENT_DATE - INTERVAL '$1 $2')::date")
    .replace(/\bdate\(([^)]+)\)/gi, '($1)::date');

  let index = 0;
  let singleQuoted = false;
  let doubleQuoted = false;
  let lineComment = false;
  let blockComment = false;
  let output = '';
  for (let position = 0; position < converted.length; position++) {
    const character = converted[position];
    const next = converted[position + 1];
    if (lineComment) {
      output += character;
      if (character === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      output += character;
      if (character === '*' && next === '/') {
        output += converted[++position];
        blockComment = false;
      }
      continue;
    }
    if (!singleQuoted && !doubleQuoted && character === '-' && next === '-') {
      output += character + converted[++position];
      lineComment = true;
    } else if (!singleQuoted && !doubleQuoted && character === '/' && next === '*') {
      output += character + converted[++position];
      blockComment = true;
    } else if (character === "'" && !doubleQuoted) {
      output += character;
      if (singleQuoted && next === "'") {
        output += converted[++position];
      } else {
        singleQuoted = !singleQuoted;
      }
    } else if (character === '"' && !singleQuoted) {
      output += character;
      if (doubleQuoted && next === '"') {
        output += converted[++position];
      } else {
        doubleQuoted = !doubleQuoted;
      }
    } else if (character === '?' && !singleQuoted && !doubleQuoted) {
      output += `$${++index}`;
    } else {
      output += character;
    }
  }

  const insert = output.match(/^\s*INSERT\s+INTO\s+([a-z_]+)/i);
  if (insert && idTables.has(insert[1].toLowerCase()) && !/\bRETURNING\b/i.test(output)) {
    return `${output} RETURNING id`;
  }
  return output;
}

module.exports = converterSql;
