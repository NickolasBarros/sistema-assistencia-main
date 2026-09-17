// ============================================
// RELATÓRIOS E DASHBOARD
// ============================================

async function carregarRelatorios() {
  const r = await apiGet('/relatorios/resumo');
  const hoje = await apiGet('/relatorios/lucro-diario');

  const el1 = document.getElementById('rel-assistencia-hoje');
  const el2 = document.getElementById('rel-vendas-hoje');
  const el3 = document.getElementById('rel-total-hoje');
  if (el1) el1.textContent = formatMoney(hoje.assistencia);
  if (el2) el2.textContent = formatMoney(hoje.vendas);
  if (el3) el3.textContent = formatMoney(hoje.total);

  const elC = document.getElementById('rel-clientes');
  const elO = document.getElementById('rel-ordens');
  const elR = document.getElementById('rel-receitas');
  const elD = document.getElementById('rel-despesas');
  const elS = document.getElementById('rel-saldo');
  if (elC) elC.textContent = r.clientes;
  if (elO) elO.textContent = r.ordens_total;
  if (elR) elR.textContent = formatMoney(r.receitas);
  if (elD) elD.textContent = formatMoney(r.despesas);
  if (elS) elS.textContent = formatMoney(r.saldo);
}

async function carregarDashboard() {
  const r = await apiGet('/relatorios/resumo');
  const hoje = await apiGet('/relatorios/lucro-diario');

  const elA = document.getElementById('dash-assistencia');
  const elV = document.getElementById('dash-vendas');
  const elT = document.getElementById('dash-total-hoje');
  if (elA) elA.textContent = formatMoney(hoje.assistencia);
  if (elV) elV.textContent = formatMoney(hoje.vendas);
  if (elT) elT.textContent = formatMoney(hoje.total);

  const elC = document.getElementById('kpi-clientes');
  const elO = document.getElementById('kpi-ordens');
  const elVe = document.getElementById('kpi-vendas');
  const elCx = document.getElementById('kpi-caixa');
  if (elC) elC.textContent = r.clientes;
  if (elO) elO.textContent = r.ordens_abertas;
  if (elVe) elVe.textContent = formatMoney(r.vendas_total);
  if (elCx) elCx.textContent = formatMoney(r.caixa_saldo || 0);

  const div = document.getElementById('lista-estoque-baixo');
  if (div) {
    if (!r.estoque_baixo || r.estoque_baixo.length === 0) {
      div.innerHTML = '<div class="vazio">Nenhum produto com estoque baixo</div>';
    } else {
      div.innerHTML = r.estoque_baixo.map(p =>
        `<div class="item"><strong>${p.nome}</strong> — Qtd: ${p.quantidade} (mín: ${p.estoque_minimo})</div>`
      ).join('');
    }
  }
}