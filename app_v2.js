/* ===== Pelada EARJ v2 — app_v2.js ===== */
'use strict';

let DATA = null;

const MESES_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

const STATE = {
  ranking: { ano: 'geral', metrica: 'pontos', limite: 10, ordem: 'desc', tipo: 'linha' },
  jogadores: { busca: '', selecionado: null },
  partidas:  { ano: 'todos', mes: 'todos', busca: '' },
};

// ══════════════════════════════════════
//  Boot
// ══════════════════════════════════════
if (typeof window.PELADA_DATA !== 'undefined') {
  DATA = window.PELADA_DATA;
  document.addEventListener('DOMContentLoaded', init);
} else {
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('main.container').innerHTML =
      '<div class="empty-state">Erro ao carregar dados: data.js não encontrado</div>';
  });
}

function init() {
  setupTabs();
  buildRankingSidebar();
  setupMetricaFilter();
  setupLimiteFilter();
  setupBusca();
  buildPartidasSidebar();
  setupBuscaPartida();
  setupSidebarToggles();
  setupRankingTypeToggle();
  setupHeaderSort();
  setupMobileSheets();

  renderRanking();
  renderJogadores();
  renderPartidas();

    renderSobre();

  document.getElementById('footer-data').textContent = formatDataBR(DATA.meta.atualizado_em);
}

// ══════════════════════════════════════
//  Tabs
// ══════════════════════════════════════
function setupTabs() {
  function syncBodyScroll(tabId) {
    // No mobile: bloqueia scroll da <body> na aba Rankings para que
    // o browser role apenas a tabela (que tem overflow:auto próprio).
    if (isMobile()) {
      document.body.style.overflow = (tabId === 'rankings') ? 'hidden' : '';
    }
  }
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      syncBodyScroll(btn.dataset.tab);
    });
  });
  // Estado inicial: Rankings é a aba default
  syncBodyScroll('rankings');
}

// ══════════════════════════════════════
//  Sidebar — toggles colapso
// ══════════════════════════════════════
function setupSidebarToggles() {
  const isMobile = window.innerWidth <= 640;
  ['ranking', 'partidas'].forEach(id => {
    const btn     = document.getElementById(`${id}-sidebar-toggle`);
    const sidebar = document.getElementById(`${id}-sidebar`);
    if (!btn || !sidebar) return;

    // No mobile, começa fechada (vira acordeão vertical)
    if (isMobile) sidebar.classList.add('collapsed');

    btn.addEventListener('click', () => {
      const collapsed = sidebar.classList.toggle('collapsed');
      if (!isMobile) {
        btn.textContent = collapsed ? '›' : '‹';
        btn.title = collapsed ? 'Expandir' : 'Recolher';
      }
    });

    // No mobile, clicar no cabeçalho inteiro também abre/fecha
    if (isMobile) {
      const header = sidebar.querySelector('.sidebar-header');
      if (header) header.style.cursor = 'pointer';
      if (header) header.addEventListener('click', e => {
        if (e.target === btn) return; // evita duplo disparo
        sidebar.classList.toggle('collapsed');
      });
    }
  });
}

// ══════════════════════════════════════
//  Toggle Jogadores / Goleiros
// ══════════════════════════════════════
function setupRankingTypeToggle() {
  document.querySelectorAll('.ranking-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ranking-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tipo = btn.dataset.tipo;
      STATE.ranking.tipo = tipo;
      document.getElementById('panel-linha').style.display    = tipo === 'linha'    ? '' : 'none';
      document.getElementById('panel-goleiros').style.display = tipo === 'goleiros' ? '' : 'none';
      const panelCorrida = document.getElementById('panel-corrida');
      if (panelCorrida) {
        panelCorrida.style.display = tipo === 'corrida' ? '' : 'none';
        if (tipo === 'corrida' && !panelCorrida.dataset.built) {
          const container = document.getElementById('corrida-chart-container');
          const corridaState = { top: 10, ano: null };
          container.innerHTML = buildCorridaChartHTML(corridaState);
          container.addEventListener('click', e => {
            const btnAnno = e.target.closest('.corrida-ano-btn');
            const btnTop  = e.target.closest('.corrida-top-btn');
            if (btnAnno) {
              container.querySelectorAll('.corrida-ano-btn').forEach(b => b.classList.remove('active'));
              btnAnno.classList.add('active');
              corridaState.ano = btnAnno.dataset.ano;
              container.querySelector('.corrida-svg-container').innerHTML =
                buildCorridaChartSVG(corridaState.top, corridaState.ano);
            }
            if (btnTop) {
              container.querySelectorAll('.corrida-top-btn').forEach(b => b.classList.remove('active'));
              btnTop.classList.add('active');
              corridaState.top = parseInt(btnTop.dataset.top, 10);
              container.querySelector('.corrida-svg-container').innerHTML =
                buildCorridaChartSVG(corridaState.top, corridaState.ano);
            }
          });
          panelCorrida.dataset.built = '1';
        }
      }
    });
  });
}

// ══════════════════════════════════════
//  Sidebar — Rankings
// ══════════════════════════════════════
function buildRankingSidebar() {
  const nav = document.getElementById('ranking-sidebar-nav');
  if (!nav) return;
  const anos = ['geral', ...DATA.meta.anos_disponiveis.slice().reverse().map(String)];

  nav.innerHTML = anos.map(a => {
    const label = a === 'geral' ? 'Geral' : a;
    const isActive = a === STATE.ranking.ano;

    const subItems = [
      { metrica: 'pontos',             label: '🏆 Pontos' },
      { metrica: 'aproveitamento',     label: '📈 Aproveit.' },
      { metrica: 'aproveitamento_pior',label: '📉 Pior Aprov.' },
      { metrica: 'jogos',              label: '🏟️ Jogos' },
      { metrica: null },  // separador
      { metrica: 'gols',               label: '⚽ Gols' },
      { metrica: 'assists',            label: '👟 Assists' },
      { metrica: 'g_a',               label: '🎯 G+A' },
      { metrica: 'g_a_jogo',          label: '🎯 G+A/J' },
    ];
    const limites = [
      { limite: 10, label: 'Top 10' },
      { limite: 20, label: 'Top 20' },
      { limite: 0,  label: 'Todos' },
    ];

    const metricaBtns = subItems.map(s =>
      s.metrica === null
        ? `<span class="sidebar-sub-sep"></span>`
        : `<button class="sidebar-sub-btn ${isActive && STATE.ranking.metrica === s.metrica ? 'active' : ''}"
        data-ano="${a}" data-metrica="${s.metrica}">${s.label}</button>`
    ).join('');
    const limiteBtns = limites.map(l =>
      `<button class="sidebar-sub-btn ${isActive && STATE.ranking.limite === l.limite ? 'active' : ''}"
        data-ano="${a}" data-limite="${l.limite}">${l.label}</button>`
    ).join('');

    return `
      <div class="sidebar-year-item">
        <button class="sidebar-year-btn ${isActive ? 'active' : ''}" data-ano="${a}">
          <span class="chevron">${isActive ? '▾' : '▸'}</span>
          <span>${label}</span>
        </button>
        <div class="sidebar-year-sub ${isActive ? 'open' : ''}">
          ${metricaBtns}
          <div class="sidebar-sub-divider"></div>
          ${limiteBtns}
        </div>
      </div>`;
  }).join('');

  nav.addEventListener('click', e => {
    const subBtn = e.target.closest('.sidebar-sub-btn');
    const yearBtn = e.target.closest('.sidebar-year-btn');

    if (subBtn) {
      STATE.ranking.ano = subBtn.dataset.ano;
      if (subBtn.dataset.metrica) { STATE.ranking.metrica = subBtn.dataset.metrica; STATE.ranking.ordem = 'desc'; }
      if (subBtn.dataset.limite !== undefined) STATE.ranking.limite = parseInt(subBtn.dataset.limite, 10);
      syncRankingSidebar();
      syncMetricaPills();
      syncLimitePills();
      renderRanking();
      return;
    }

    if (yearBtn) {
      const ano = yearBtn.dataset.ano;
      STATE.ranking.ano = ano;
      const item = yearBtn.closest('.sidebar-year-item');
      const sub = item.querySelector('.sidebar-year-sub');
      if (sub) {
        // Fecha todos os outros, abre este
        nav.querySelectorAll('.sidebar-year-sub').forEach(s => {
          if (s !== sub) s.classList.remove('open');
        });
        nav.querySelectorAll('.sidebar-year-btn .chevron').forEach(c => { c.textContent = '▸'; });
        sub.classList.toggle('open');
        yearBtn.querySelector('.chevron').textContent = sub.classList.contains('open') ? '▾' : '▸';
      }
      syncRankingSidebar();
      renderRanking();
    }
  });
}

function syncRankingSidebar() {
  const nav = document.getElementById('ranking-sidebar-nav');
  if (!nav) return;
  nav.querySelectorAll('.sidebar-year-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.ano === STATE.ranking.ano);
  });
  nav.querySelectorAll('.sidebar-sub-btn').forEach(btn => {
    let active = false;
    if (btn.dataset.ano !== STATE.ranking.ano) { btn.classList.remove('active'); return; }
    if (btn.dataset.metrica) active = btn.dataset.metrica === STATE.ranking.metrica;
    else if (btn.dataset.limite !== undefined) active = parseInt(btn.dataset.limite) === STATE.ranking.limite;
    btn.classList.toggle('active', active);
  });
}

function syncMetricaPills() {
  const wrap = document.getElementById('filter-metrica');
  if (!wrap) return;
  wrap.querySelectorAll('.pill').forEach(p => {
    p.classList.toggle('active', p.dataset.metrica === STATE.ranking.metrica);
  });
}

function syncLimitePills() {
  document.querySelectorAll('[data-limite]').forEach(p => {
    if (p.classList.contains('sidebar-sub-btn')) return;
    p.classList.toggle('active', parseInt(p.dataset.limite) === STATE.ranking.limite);
  });
}

function setupMetricaFilter() {
  const wrap = document.getElementById('filter-metrica');
  wrap.addEventListener('click', e => {
    const b = e.target.closest('button[data-metrica]');
    if (!b) return;
    STATE.ranking.metrica = b.dataset.metrica;
    STATE.ranking.ordem   = 'desc';
    wrap.querySelectorAll('.pill').forEach(p => p.classList.toggle('active', p === b));
    syncRankingSidebar();
    renderRanking();
  });
}

function setupLimiteFilter() {
  const pills = document.querySelectorAll('.pill[data-limite]');
  const wrap = pills[0]?.parentElement;
  if (!wrap) return;
  wrap.addEventListener('click', e => {
    const b = e.target.closest('button[data-limite]');
    if (!b || b.classList.contains('sidebar-sub-btn')) return;
    STATE.ranking.limite = parseInt(b.dataset.limite, 10);
    wrap.querySelectorAll('.pill').forEach(p => p.classList.toggle('active', p === b));
    syncRankingSidebar();
    renderRanking();
  });
}

// ══════════════════════════════════════
//  Render Ranking
// ══════════════════════════════════════
function formDots(partidas, n = 5) {
  return (partidas || []).slice(0, n).map(p => {
    const cls = p.resultado === 'V' ? 'dot-v' : p.resultado === 'E' ? 'dot-e' : 'dot-d';
    return `<span class="form-dot ${cls}" title="${formatDataBR(p.data)}">${p.resultado}</span>`;
  }).join('');
}

function renderRanking() {
  const ano     = STATE.ranking.ano;
  const metrica = STATE.ranking.metrica;
  const limite  = STATE.ranking.limite;
  const anoCorrente = String(new Date().getFullYear());
  const usarMedalhas = (ano !== anoCorrente);

  const linha = [], goleiros = [];
  Object.values(DATA.jogadores).forEach(j => {
    const s = ano === 'geral' ? j.geral : j.por_ano[ano];
    if (!s || s.jogos === 0) return;
    const entry = {
      nome: j.nome, goleiro: j.goleiro,
      jogos: s.jogos, vitorias: s.vitorias, empates: s.empates, derrotas: s.derrotas,
      gols: s.gols, assists: s.assists, g_a: s.g_a,
      g_a_jogo: s.jogos > 0 ? s.g_a / s.jogos : 0,
      pontos: s.pontos, aproveitamento: s.aproveitamento,
      partidas: j.partidas || [],
    };
    if (j.goleiro) goleiros.push(entry); else linha.push(entry);
  });

  const minJogos = (metrica === 'aproveitamento' || metrica === 'aproveitamento_pior') ? 15 : 0;
  const sortKey  = metrica === 'aproveitamento_pior' ? 'aproveitamento' : metrica;
  const ordem    = metrica === 'aproveitamento_pior' ? 'asc' : (STATE.ranking.ordem || 'desc');
  let sorted = linha.filter(p => p.jogos >= minJogos);
  sorted.sort((a, b) => {
    const va = a[sortKey] ?? 0, vb = b[sortKey] ?? 0;
    if (ordem === 'asc') return va !== vb ? va - vb : a.jogos - b.jogos;
    return vb !== va ? vb - va : b.jogos - a.jogos;
  });
  const view = limite > 0 ? sorted.slice(0, limite) : sorted;

  const metricaLabels = {
    pontos: '🏆 Pontos', gols: '⚽ Gols', assists: '👟 Assistências',
    g_a: '🎯 G+A', g_a_jogo: '🎯 G+A/J', aproveitamento: '📈 Aproveitamento',
    aproveitamento_pior: '📉 Pior Aproveitamento', jogos: '🏟️ Jogos',
    vitorias: '✅ Vitórias', empates: '🤝 Empates', derrotas: '❌ Derrotas',
  };
  const anoTxt = ano === 'geral' ? 'Geral' : ano;
  document.getElementById('ranking-title').textContent =
    `${metricaLabels[metrica] || 'Top'} — ${anoTxt}`;
  document.getElementById('ranking-meta').textContent =
    `${sorted.length} jogador${sorted.length === 1 ? '' : 'es'} de linha` +
    (minJogos > 0 ? ` (≥ ${minJogos} jogos)` : '');

  const tbody = document.querySelector('#ranking-table tbody');
  tbody.innerHTML = view.length === 0
    ? `<tr><td colspan="13" class="empty-state">Nenhum dado para este filtro.</td></tr>`
    : view.map((p, i) => {
        const rankTd = (usarMedalhas && i < 3)
          ? `<td class="num rank-medal">${['🥇','🥈','🥉'][i]}</td>`
          : `<td class="num rank-cell">${i + 1}</td>`;
        const hl = (col) => metrica === col ? 'metric-highlight' : '';
        const dots = formDots(p.partidas);
        return `<tr class="clickable" data-jogador="${escapeAttr(p.nome)}">
          ${rankTd}
          <td class="player-cell">${escapeHtml(p.nome)}</td>
          <td class="num ${hl('jogos')}">${p.jogos}</td>
          <td class="num">${p.vitorias}</td>
          <td class="num">${p.empates}</td>
          <td class="num">${p.derrotas}</td>
          <td class="num ${hl('gols')}">${p.gols}</td>
          <td class="num ${hl('assists')}">${p.assists}</td>
          <td class="num ${hl('g_a')}">${p.g_a}</td>
          <td class="num ${hl('g_a_jogo')}">${p.g_a_jogo.toFixed(2).replace('.', ',')}</td>
          <td class="num bold ${hl('pontos')}">${p.pontos}</td>
          <td class="num ${hl('aproveitamento') || hl('aproveitamento_pior')}">${p.aproveitamento.toFixed(1).replace('.', ',')}%</td>
          <td class="form-dots-cell"><div class="form-dots">${dots}</div></td>
        </tr>`;
      }).join('');

  tbody.onclick = e => {
    const tr = e.target.closest('tr[data-jogador]');
    if (tr) abrirJogador(tr.dataset.jogador);
  };

  // Goleiros
  const golSorted = goleiros.slice().sort((a, b) => b.pontos - a.pontos);
  const tbg = document.querySelector('#goleiros-table tbody');
  tbg.innerHTML = golSorted.length === 0
    ? `<tr><td colspan="9" class="empty-state">Nenhum goleiro neste período.</td></tr>`
    : golSorted.map((g, i) => `
        <tr class="clickable" data-jogador="${escapeAttr(g.nome)}">
          <td class="num ${(usarMedalhas && i < 3) ? 'rank-medal' : 'rank-cell'}">${(usarMedalhas && i < 3) ? ['🥇','🥈','🥉'][i] : i+1}</td>
          <td class="player-cell">${escapeHtml(g.nome.replace(' (Goleiro)', ''))}</td>
          <td class="num">${g.jogos}</td>
          <td class="num">${g.vitorias}</td>
          <td class="num">${g.empates}</td>
          <td class="num">${g.derrotas}</td>
          <td class="num bold">${g.pontos}</td>
          <td class="num">${g.aproveitamento.toFixed(1).replace('.', ',')}%</td>
          <td class="form-dots-cell"><div class="form-dots">${formDots(g.partidas)}</div></td>
        </tr>`).join('');
  tbg.onclick = e => {
    const tr = e.target.closest('tr[data-jogador]');
    if (tr) abrirJogador(tr.dataset.jogador);
  };

  // Indicadores visuais no cabeçalho
  updateSortHeaders();
  // Atualiza status da barra mobile
  if (isMobile()) updateMobileBar();
}

function updateSortHeaders() {
  const metrica = STATE.ranking.metrica;
  const ordem   = STATE.ranking.ordem;
  document.querySelectorAll('#ranking-table thead th[data-sort]').forEach(th => {
    th.classList.remove('sort-active', 'sort-asc');
    if (th.dataset.sort === metrica ||
        (metrica === 'aproveitamento_pior' && th.dataset.sort === 'aproveitamento')) {
      th.classList.add('sort-active');
      if (ordem === 'asc' || metrica === 'aproveitamento_pior') th.classList.add('sort-asc');
    }
  });
}

function setupHeaderSort() {
  const thead = document.querySelector('#ranking-table thead');
  if (!thead) return;
  thead.addEventListener('click', e => {
    const th = e.target.closest('th[data-sort]');
    if (!th) return;
    const col = th.dataset.sort;
    if (STATE.ranking.metrica === col) {
      // Mesmo col: toggle asc/desc
      STATE.ranking.ordem = STATE.ranking.ordem === 'desc' ? 'asc' : 'desc';
    } else {
      STATE.ranking.metrica = col;
      STATE.ranking.ordem   = 'desc';
      // Sync pills: ativa o pill correspondente (se existir)
      document.querySelectorAll('#filter-metrica .pill').forEach(p => {
        p.classList.toggle('active', p.dataset.metrica === col);
      });
    }
    renderRanking();
  });
}

// ══════════════════════════════════════
//  Mobile — Bottom Bar + Sheets
// ══════════════════════════════════════

const METRICA_LABELS = {
  pontos:            '🏆 Pontos',
  aproveitamento:    '📈 Aproveit.',
  aproveitamento_pior: '📉 Pior Aprov.',
  jogos:             '🏟️ Jogos',
  gols:              '⚽ Gols',
  assists:           '👟 Assists',
  g_a:               '🎯 G+A',
  g_a_jogo:          '🎯 G+A/J',
};

function isMobile() { return window.innerWidth <= 768; }

function closeMobileSheets() {
  document.getElementById('mobile-overlay').classList.remove('open');
  document.getElementById('sheet-temporada').classList.remove('open');
  document.getElementById('sheet-filtros').classList.remove('open');
}

function openMobileSheet(id) {
  // Preenche conteúdo antes de abrir
  if (id === 'sheet-filtros')    renderSheetFiltros();
  if (id === 'sheet-temporada')  renderSheetTemporada();
  document.getElementById('mobile-overlay').classList.add('open');
  document.getElementById(id).classList.add('open');
}

function updateMobileBar() {
  const el = document.getElementById('mobile-bar-status');
  if (!el) return;
  const anoLabel    = STATE.ranking.ano === 'geral' ? 'Geral' : STATE.ranking.ano;
  const limiteLabel = STATE.ranking.limite === 0 ? 'Todos' : `Top ${STATE.ranking.limite}`;
  const metLabel    = METRICA_LABELS[STATE.ranking.metrica] || STATE.ranking.metrica;
  el.textContent = `${metLabel} · ${limiteLabel} · ${anoLabel}`;
}

function renderSheetTemporada() {
  const body = document.getElementById('sheet-temporada-body');
  const anos = (DATA.meta && DATA.meta.anos_disponiveis ? [...DATA.meta.anos_disponiveis].map(String).sort().reverse() : []);
  const lista = ['geral', ...anos];
  body.innerHTML = `<div class="sheet-year-list">${
    lista.map(a => `
      <button class="sheet-year-btn${STATE.ranking.ano === a ? ' active' : ''}" data-ano="${a}">
        ${a === 'geral' ? '🌐 Geral (todos os anos)' : `📅 ${a}`}
      </button>`).join('')
  }</div>`;
  body.querySelectorAll('.sheet-year-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      STATE.ranking.ano   = btn.dataset.ano;
      STATE.ranking.ordem = 'desc';
      syncRankingSidebar();
      renderRanking();
      closeMobileSheets();
      updateMobileBar();
    });
  });
}

function renderSheetFiltros() {
  const body  = document.getElementById('sheet-filtros-body');
  const tipo  = STATE.ranking.tipo;
  const tipos = [
    { k: 'linha',    label: '⚽ Jogadores' },
    { k: 'goleiros', label: '🧤 Goleiros'  },
    { k: 'corrida',  label: '🏁 Corrida'   },
  ];
  const grupos = [
    { label: 'Desempenho', items: [
      { k: 'pontos',             label: '🏆 Pontos'     },
      { k: 'aproveitamento',     label: '📈 Aproveit.'  },
      { k: 'aproveitamento_pior',label: '📉 Pior Aprov.'},
      { k: 'jogos',              label: '🏟️ Jogos'      },
    ]},
    { label: 'Ataque', items: [
      { k: 'gols',     label: '⚽ Gols'   },
      { k: 'assists',  label: '👟 Assists' },
      { k: 'g_a',      label: '🎯 G+A'   },
      { k: 'g_a_jogo', label: '🎯 G+A/J' },
    ]},
  ];
  const limites = [
    { v: 10, label: 'Top 10' },
    { v: 20, label: 'Top 20' },
    { v: 0,  label: 'Todos'  },
  ];

  body.innerHTML = `
    <div class="sheet-section">
      <div class="sheet-section-label">Tipo de ranking</div>
      <div class="sheet-tipo-row">
        ${tipos.map(t => `
          <button class="sheet-tipo-btn${tipo === t.k ? ' active' : ''}" data-tipo="${t.k}">${t.label}</button>
        `).join('')}
      </div>
    </div>
    ${grupos.map(g => `
      <div class="sheet-section">
        <div class="sheet-section-label">${g.label}</div>
        <div class="sheet-pill-row">
          ${g.items.map(it => `
            <button class="sheet-pill${STATE.ranking.metrica === it.k ? ' active' : ''}" data-metrica="${it.k}">${it.label}</button>
          `).join('')}
        </div>
      </div>
    `).join('')}
    <div class="sheet-section">
      <div class="sheet-section-label">Mostrar</div>
      <div class="sheet-pill-row">
        ${limites.map(l => `
          <button class="sheet-pill${STATE.ranking.limite === l.v ? ' active' : ''}" data-limite="${l.v}">${l.label}</button>
        `).join('')}
      </div>
    </div>`;

  // Tipo
  body.querySelectorAll('.sheet-tipo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.tipo;
      STATE.ranking.tipo = t;
      // Sync desktop tabs
      document.querySelectorAll('.ranking-type-btn').forEach(b => b.classList.toggle('active', b.dataset.tipo === t));
      document.getElementById('panel-linha').style.display    = t === 'linha'    ? '' : 'none';
      document.getElementById('panel-goleiros').style.display = t === 'goleiros' ? '' : 'none';
      const pc = document.getElementById('panel-corrida');
      if (pc) {
        pc.style.display = t === 'corrida' ? '' : 'none';
        if (t === 'corrida' && !pc.dataset.built) {
          // dispara o click no desktop btn para construir o corrida chart
          document.querySelector('.ranking-type-btn[data-tipo="corrida"]')?.click();
          return;
        }
      }
      renderRanking();
      closeMobileSheets();
      updateMobileBar();
    });
  });

  // Métrica
  body.querySelectorAll('.sheet-pill[data-metrica]').forEach(btn => {
    btn.addEventListener('click', () => {
      STATE.ranking.metrica = btn.dataset.metrica;
      STATE.ranking.ordem   = 'desc';
      syncMetricaPills();
      syncRankingSidebar();
      renderRanking();
      closeMobileSheets();
      updateMobileBar();
    });
  });

  // Limite
  body.querySelectorAll('.sheet-pill[data-limite]').forEach(btn => {
    btn.addEventListener('click', () => {
      STATE.ranking.limite = parseInt(btn.dataset.limite, 10);
      syncLimitePills();
      renderRanking();
      closeMobileSheets();
      updateMobileBar();
    });
  });
}


function setupMobileTableScroll() {
  // No mobile, o browser confunde scroll horizontal da tabela com scroll vertical da página.
  // Usamos delta incremental entre eventos consecutivos para evitar o problema de trava.
  document.querySelectorAll('.table-scroll-wrap').forEach(wrap => {
    let lastX = 0, lastY = 0;
    let initX = 0, initY = 0;   // posição ao iniciar o toque
    let direcao = null;          // null=indefinida, 'h'=horizontal, 'v'=vertical

    wrap.addEventListener('touchstart', e => {
      initX  = lastX = e.touches[0].clientX;
      initY  = lastY = e.touches[0].clientY;
      direcao = null;
    }, { passive: true });

    wrap.addEventListener('touchmove', e => {
      const curX = e.touches[0].clientX;
      const curY = e.touches[0].clientY;

      // Determina direção uma única vez, com ao menos 6px de deslocamento total
      if (direcao === null) {
        const totalDx = Math.abs(curX - initX);
        const totalDy = Math.abs(curY - initY);
        if (totalDx > 6 || totalDy > 6) {
          direcao = totalDx > totalDy ? 'h' : 'v';
        }
      }

      if (direcao === 'h') {
        e.preventDefault();
        wrap.scrollLeft += lastX - curX;
      }
      // Swipe vertical: browser cuida naturalmente

      lastX = curX;
      lastY = curY;
    }, { passive: false });
  });
}

function setupMobileSheets() {
  // Elementos mobile podem não existir em versões antigas do index.html
  const bar     = document.getElementById('mobile-bar');
  const btnTemp = document.getElementById('mb-temporada');
  const btnFilt = document.getElementById('mb-filtros');
  const overlay = document.getElementById('mobile-overlay');
  if (!bar || !btnTemp || !btnFilt || !overlay) return; // silencioso — sem crash

  // Mostrar/ocultar barra conforme aba ativa
  function syncBarVisibility() {
    const activeTab  = document.querySelector('.tab-panel.active');
    const isRankings = activeTab && activeTab.id === 'tab-rankings';
    bar.classList.toggle('hidden', !isRankings);
  }

  // Observar mudança de aba
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => setTimeout(syncBarVisibility, 50));
  });
  syncBarVisibility();

  // Botões da barra
  btnTemp.addEventListener('click', () => openMobileSheet('sheet-temporada'));
  btnFilt.addEventListener('click', () => openMobileSheet('sheet-filtros'));

  // Fechar ao clicar no overlay
  overlay.addEventListener('click', closeMobileSheets);

  updateMobileBar();
}

// ══════════════════════════════════════
//  Jogadores
// ══════════════════════════════════════
function setupBusca() {
  const inp = document.getElementById('busca-input');
  inp.addEventListener('input', () => {
    STATE.jogadores.busca = inp.value.trim().toLowerCase();
    renderJogadores();
  });
}

function renderJogadores() {
  const busca = STATE.jogadores.busca;
  let lista = Object.values(DATA.jogadores)
    .filter(j => !busca || j.nome.toLowerCase().includes(busca));
  lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const tbody = document.querySelector('#jogadores-table tbody');
  tbody.innerHTML = lista.length === 0
    ? `<tr><td colspan="5" class="empty-state">Nenhum jogador encontrado.</td></tr>`
    : lista.map(j => `
        <tr class="clickable ${STATE.jogadores.selecionado === j.nome ? 'selected' : ''}"
            data-jogador="${escapeAttr(j.nome)}">
          <td class="player-cell">${escapeHtml(j.nome)}</td>
          <td class="num">${j.geral.jogos}</td>
          <td class="num bold">${j.geral.pontos}</td>
          <td class="num">${j.geral.gols}</td>
          <td class="num">${j.geral.assists}</td>
        </tr>`).join('');
  tbody.onclick = e => {
    const tr = e.target.closest('tr[data-jogador]');
    if (tr) abrirJogador(tr.dataset.jogador);
  };
}

function abrirJogador(nome) {
  document.querySelector('.tab-btn[data-tab="jogadores"]').click();
  STATE.jogadores.selecionado = nome;
  document.getElementById('jogadores-layout').classList.add('player-selected');
  renderJogadores();
  renderDetalheJogador(nome);
  document.getElementById('jogador-detalhe').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function voltarParaLista() {
  STATE.jogadores.selecionado = null;
  document.getElementById('jogadores-layout').classList.remove('player-selected');
  renderJogadores();
  document.getElementById('jogador-detalhe').innerHTML =
    '<p class="placeholder">Selecione um jogador para ver o histórico completo.</p>';
}

function renderDetalheJogador(nome, anoFiltro) {
  anoFiltro = anoFiltro || 'geral';
  const j = DATA.jogadores[nome];
  const wrap = document.getElementById('jogador-detalhe');
  if (!j) { wrap.innerHTML = `<p class="placeholder">Jogador não encontrado.</p>`; return; }

  const role = j.goleiro ? 'Goleiro' : 'Jogador de linha';

  // Stats for selected period
  const s = (anoFiltro === 'geral' || !j.por_ano[anoFiltro]) ? j.geral : j.por_ano[anoFiltro];

  // Year pills
  const anosOrdenados = Object.keys(j.por_ano).sort((a, b) => Number(b) - Number(a));
  const pillsHTML = ['geral', ...anosOrdenados].map(a =>
    `<button class="perfil-year-btn ${a === anoFiltro ? 'active' : ''}" data-ano="${a}">${a === 'geral' ? 'Geral' : a}</button>`
  ).join('');

  // Tabela por temporada (always all years)
  const tabelaAno = anosOrdenados.map(a => {
    const ts = j.por_ano[a];
    return `<tr>
      <td>${a}</td>
      <td class="num">${ts.jogos}</td>
      <td class="num">${ts.vitorias}</td>
      <td class="num">${ts.empates}</td>
      <td class="num">${ts.derrotas}</td>
      ${!j.goleiro ? `<td class="num">${ts.gols}</td><td class="num">${ts.assists}</td>` : ''}
      <td class="num bold">${ts.pontos}</td>
      <td class="num">${ts.aproveitamento.toFixed(1).replace('.', ',')}%</td>
    </tr>`;
  }).join('');

  // Historico de partidas (filtered by year)
  const todasPartidas = j.partidas;
  const partidasFiltradas = anoFiltro === 'geral'
    ? todasPartidas
    : todasPartidas.filter(p => String(p.ano) === String(anoFiltro));
  const partidasExibidas = partidasFiltradas.slice(0, 200);
  const partidas = partidasExibidas.map(p => {
    const timeCls = p.time === 'Preto' ? 'badge-preto' : 'badge-branco';
    const timeIcon = p.time === 'Preto' ? '⚫' : '⚪';
    return `<tr>
      <td>${formatDataBR(p.data)}</td>
      <td><span class="badge-time ${timeCls}">${timeIcon} ${escapeHtml(p.time)}</span></td>
      <td class="num">${p.placar_p ?? '—'}–${p.placar_b ?? '—'}</td>
      <td class="row-result-${p.resultado}">${p.resultado || ''}</td>
      <td class="num">${p.gols ? `⚽ ${p.gols}` : ''}</td>
      <td class="num">${p.assists ? `👟 ${p.assists}` : ''}</td>
    </tr>`;
  }).join('');

  const golosColHead = !j.goleiro ? `<th class="num">⚽ G</th><th class="num">👟 A</th>` : '';

  wrap.innerHTML = `
    <div class="detalhe-header">
      <button class="btn-voltar" onclick="voltarParaLista()">← Voltar</button>
    </div>

    <h2>${escapeHtml(j.nome.replace(' (Goleiro)', ''))}</h2>
    <span class="role">${role}</span>

    <div class="perfil-year-filter">
      ${pillsHTML}
    </div>

    <div class="kpi-grid-v2">
      <div class="kpi-v2">
        <span class="kpi-icon-v2">🏟️</span>
        <span class="kpi-value-v2">${s.jogos}</span>
        <span class="kpi-label-v2">Jogos</span>
      </div>
      <div class="kpi-v2 kpi-accent">
        <span class="kpi-icon-v2">🏆</span>
        <span class="kpi-value-v2">${s.pontos}</span>
        <span class="kpi-label-v2">Pontos</span>
      </div>
      <div class="kpi-v2">
        <span class="kpi-icon-v2">✅</span>
        <span class="kpi-value-v2">${s.vitorias}</span>
        <span class="kpi-label-v2">Vitórias</span>
      </div>
      <div class="kpi-v2">
        <span class="kpi-icon-v2">🤝</span>
        <span class="kpi-value-v2">${s.empates}</span>
        <span class="kpi-label-v2">Empates</span>
      </div>
      <div class="kpi-v2">
        <span class="kpi-icon-v2">❌</span>
        <span class="kpi-value-v2">${s.derrotas}</span>
        <span class="kpi-label-v2">Derrotas</span>
      </div>
      ${!j.goleiro ? `
      <div class="kpi-v2">
        <span class="kpi-icon-v2">⚽</span>
        <span class="kpi-value-v2">${s.gols}</span>
        <span class="kpi-label-v2">Gols</span>
      </div>
      <div class="kpi-v2">
        <span class="kpi-icon-v2">👟</span>
        <span class="kpi-value-v2">${s.assists}</span>
        <span class="kpi-label-v2">Assists</span>
      </div>` : ''}
      <div class="kpi-v2 kpi-clickable" id="kpi-aproveitamento" title="Clique para ver evolução do aproveitamento">
        <span class="kpi-icon-v2">📈</span>
        <span class="kpi-value-v2">${s.aproveitamento.toFixed(1).replace('.', ',')}%</span>
        <span class="kpi-label-v2">Aprov. <span class="kpi-hint">▾</span></span>
      </div>
    </div>

    <div id="aprov-chart-wrap" class="aprov-chart-wrap" style="display:none"></div>

    <div class="detalhe-section">
      <h3>Por temporada</h3>
      <table class="data-table">
        <thead><tr>
          <th>Ano</th>
          <th class="num">🏟️ J</th>
          <th class="num">✅ V</th>
          <th class="num">🤝 E</th>
          <th class="num">❌ D</th>
          ${golosColHead}
          <th class="num">🏆 Pts</th>
          <th class="num">📈 %</th>
        </tr></thead>
        <tbody>${tabelaAno}</tbody>
      </table>
    </div>

    <div class="detalhe-section">
      <h3>Histórico de partidas (${partidasFiltradas.length})${partidasFiltradas.length > 200 ? ' — mostrando 200 mais recentes' : ''}</h3>
      <table class="data-table">
        <thead><tr>
          <th>Data</th>
          <th>Time</th>
          <th class="num">Placar (P–B)</th>
          <th>Res.</th>
          <th class="num">Gols</th>
          <th class="num">Assists</th>
        </tr></thead>
        <tbody>${partidas}</tbody>
      </table>
    </div>
  `;

  // Year filter pills — re-render with selected year
  wrap.querySelector('.perfil-year-filter').addEventListener('click', e => {
    const btn = e.target.closest('.perfil-year-btn');
    if (!btn) return;
    renderDetalheJogador(nome, btn.dataset.ano);
    wrap.scrollTop = 0;
  });

  // Toggle grafico de aproveitamento
  const kpiAprov = document.getElementById('kpi-aproveitamento');
  const chartWrap = document.getElementById('aprov-chart-wrap');
  if (kpiAprov && chartWrap) {
    kpiAprov.addEventListener('click', () => {
      const open = chartWrap.style.display !== 'none';
      if (open) {
        chartWrap.style.display = 'none';
        kpiAprov.classList.remove('kpi-clickable--open');
      } else {
        if (!chartWrap.dataset.built) {
          chartWrap.innerHTML = buildAprovChartHTML(j.partidas);
          chartWrap.querySelector('.aprov-year-filter').addEventListener('click', e => {
            const btn = e.target.closest('.aprov-year-btn');
            if (!btn) return;
            chartWrap.querySelectorAll('.aprov-year-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const ano = btn.dataset.ano;
            const filtradas = ano === 'geral'
              ? j.partidas
              : j.partidas.filter(p => String(p.ano) === ano);
            chartWrap.querySelector('.aprov-svg-container').innerHTML = buildAprovChartSVG(filtradas);
          });
          chartWrap.dataset.built = '1';
        }
        chartWrap.style.display = '';
        kpiAprov.classList.add('kpi-clickable--open');
      }
    });
  }
}

// ══════════════════════════════════════
//  Gráfico — Aproveitamento cumulativo
// ══════════════════════════════════════
function buildAprovChartHTML(allPartidas) {
  const anos = [...new Set(allPartidas.map(p => p.ano))].sort((a, b) => b - a);
  const pills = ['geral', ...anos.map(String)].map(a =>
    `<button class="aprov-year-btn ${a === 'geral' ? 'active' : ''}" data-ano="${a}">${a === 'geral' ? 'Geral' : a}</button>`
  ).join('');
  return `
    <div class="aprov-chart-inner">
      <div class="aprov-chart-header">
        <span class="aprov-chart-title">Evolução do Aproveitamento</span>
        <div class="aprov-year-filter">${pills}</div>
      </div>
      <div class="aprov-svg-container">${buildAprovChartSVG(allPartidas)}</div>
    </div>`;
}

function buildAprovChartSVG(partidas) {
  // Cronológico (partidas vêm newest-first)
  const crono = [...partidas].reverse();
  if (crono.length < 2) return '<p class="aprov-chart-empty">Partidas insuficientes para gráfico.</p>';

  // Calcula aproveitamento cumulativo
  let pts = 0;
  const vals = crono.map((p, i) => {
    pts += p.pontos;
    return { n: i + 1, data: p.data, aprov: pts / ((i + 1) * 3) * 100 };
  });

  // Dimensões
  const W = 560, H = 200;
  const PAD = { top: 18, right: 24, bottom: 34, left: 40 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;
  const n = vals.length;

  const xScale = i => PAD.left + (i / (n - 1)) * iW;
  const yScale = v => PAD.top + iH - (v / 100) * iH;

  const pts_line = vals.map((v, i) => `${xScale(i).toFixed(1)},${yScale(v.aprov).toFixed(1)}`).join(' ');
  const area_pts =
    `${xScale(0).toFixed(1)},${(PAD.top + iH).toFixed(1)} ` +
    vals.map((v, i) => `${xScale(i).toFixed(1)},${yScale(v.aprov).toFixed(1)}`).join(' ') +
    ` ${xScale(n-1).toFixed(1)},${(PAD.top + iH).toFixed(1)}`;

  const y50  = yScale(50);
  const yTop = PAD.top;
  const yBot = PAD.top + iH;

  // Último ponto
  const last      = vals[n - 1];
  const lx        = xScale(n - 1).toFixed(1);
  const ly        = yScale(last.aprov).toFixed(1);
  const lastColor = last.aprov >= 50 ? '#22a06b' : '#e34935';

  // Grades horizontais — todas tracejadas, finas
  const yLabels = [0, 25, 50, 75, 100].map(v => {
    const y = yScale(v).toFixed(1);
    const is50 = v === 50;
    return `<line x1="${PAD.left}" y1="${y}" x2="${PAD.left + iW}" y2="${y}"
        stroke="${is50 ? '#bbb' : '#e4e4e0'}" stroke-width="${is50 ? 0.8 : 0.6}" stroke-dasharray="3,3"/>
      <text x="${PAD.left - 5}" y="${y}" text-anchor="end" dominant-baseline="middle"
        font-size="8.5" fill="#aaa">${v}%</text>`;
  }).join('');

  // Labels eixo X
  const step = n <= 20 ? 5 : n <= 50 ? 10 : n <= 100 ? 20 : 30;
  const xLabels = vals
    .filter((_, i) => i === 0 || (i + 1) % step === 0 || i === n - 1)
    .map(v => {
      const x = xScale(v.n - 1).toFixed(1);
      return `<text x="${x}" y="${yBot + 13}" text-anchor="middle" font-size="8.5" fill="#aaa">${v.n}</text>`;
    }).join('');

  // Dots com tooltip
  const dotStep = Math.max(1, Math.floor(n / 40));
  const dots = vals
    .filter((_, i) => i % dotStep === 0 || i === n - 1)
    .map(v => {
      const x   = xScale(v.n - 1).toFixed(1);
      const y   = yScale(v.aprov).toFixed(1);
      const col = v.aprov >= 50 ? '#22a06b' : '#e34935';
      return `<circle cx="${x}" cy="${y}" r="2.5" fill="${col}" opacity="0.75">
        <title>Jogo ${v.n} (${formatDataBR(v.data)}): ${v.aprov.toFixed(1).replace('.', ',')}%</title>
      </circle>`;
    }).join('');

  return `
      <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="aprov-svg">
        <defs>
          <!-- Clip: região acima de 50% (verde) -->
          <clipPath id="clipAbove">
            <rect x="${PAD.left}" y="${yTop}" width="${iW}" height="${(y50 - yTop).toFixed(1)}"/>
          </clipPath>
          <!-- Clip: região abaixo de 50% (vermelha) -->
          <clipPath id="clipBelow">
            <rect x="${PAD.left}" y="${y50.toFixed(1)}" width="${iW}" height="${(yBot - y50).toFixed(1)}"/>
          </clipPath>
          <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#22a06b" stop-opacity="0.14"/>
            <stop offset="100%" stop-color="#22a06b" stop-opacity="0.01"/>
          </linearGradient>
          <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#e34935" stop-opacity="0.01"/>
            <stop offset="100%" stop-color="#e34935" stop-opacity="0.12"/>
          </linearGradient>
        </defs>

        ${yLabels}
        ${xLabels}
        <text x="${W / 2}" y="${H - 2}" text-anchor="middle" font-size="8.5" fill="#bbb">Partidas jogadas</text>

        <!-- Áreas coloridas por região -->
        <polygon points="${area_pts}" fill="url(#gradGreen)" clip-path="url(#clipAbove)"/>
        <polygon points="${area_pts}" fill="url(#gradRed)"   clip-path="url(#clipBelow)"/>

        <!-- Linha bicolor via clipPath -->
        <polyline points="${pts_line}" fill="none" stroke="#22a06b" stroke-width="2"
          stroke-linejoin="round" clip-path="url(#clipAbove)"/>
        <polyline points="${pts_line}" fill="none" stroke="#e34935" stroke-width="2"
          stroke-linejoin="round" clip-path="url(#clipBelow)"/>
        ${dots}
        <!-- Ultimo ponto -->
        <circle cx="${lx}" cy="${ly}" r="4.5" fill="${lastColor}" stroke="white" stroke-width="2"/>
        <text x="${lx}" y="${parseFloat(ly) < yTop+18 ? parseFloat(ly)+16 : parseFloat(ly)-8}"
          text-anchor="middle" font-size="9" font-weight="700" fill="${lastColor}">${last.aprov.toFixed(1).replace('.', ',')}%</text>
      </svg>
    `;
}

const CORRIDA_PALETTE = [
  '#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f',
  '#edc948','#b07aa1','#ff9da7','#9c755f','#6b8e7b',
  '#86bcb6','#a0cbe8','#ffbe7d','#8cd17d','#b6992d',
  '#f1ce63','#499894','#d37295','#c47c5a','#79706e',
];

// Formato de nome: "R. Rondinelli", "A. Correa", "Israel"
function corridaNomeShort(nome, _todos) {
  const clean = nome.replace(' (Goleiro)', '').trim();
  const parts = clean.split(' ');
  if (parts.length === 1) return parts[0];
  const initial = parts[0][0].toUpperCase() + '.';
  const last    = parts[parts.length - 1];
  return `${initial} ${last}`;
}

function buildCorridaChartHTML(state) {
  const anos = [...new Set(DATA.partidas.map(p => String(p.ano)))].sort().reverse();
  state.ano = state.ano || anos[0];

  const yearPills = anos.map(a =>
    `<button class="aprov-year-btn corrida-ano-btn ${a === state.ano ? 'active' : ''}" data-ano="${a}">${a}</button>`
  ).join('');
  const topPills = [5, 10, 20].map(n =>
    `<button class="aprov-year-btn corrida-top-btn ${n === state.top ? 'active' : ''}" data-top="${n}">Top ${n}</button>`
  ).join('');

  return `
    <div class="aprov-chart-wrap" style="margin:8px 0 16px;">
      <div class="aprov-chart-inner">
        <div class="aprov-chart-header" style="flex-wrap:wrap; gap:8px;">
          <span class="aprov-chart-title">Corrida do Ranking — Pontos</span>
          <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
            <div class="aprov-year-filter">${yearPills}</div>
            <div class="aprov-year-filter" style="border-left:1px solid var(--border); padding-left:10px;">${topPills}</div>
          </div>
        </div>
        <div class="corrida-svg-container">${buildCorridaChartSVG(state.top, state.ano)}</div>
      </div>
    </div>`;
}

function buildCorridaChartSVG(topN, ano) {
  const MESES_ABREV = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const fmtData = iso => {
    const d = iso.slice(8, 10).replace(/^0/, '');
    const m = parseInt(iso.slice(5, 7), 10) - 1;
    return `${d}/${MESES_ABREV[m]}`;
  };

  // Dados filtrados por ano
  const partidasAno = DATA.partidas.filter(p => String(p.ano) === String(ano));
  const todasDatas  = [...new Set(partidasAno.map(p => p.data))].sort();
  const M = todasDatas.length;

  const jogadoresAno = Object.values(DATA.jogadores)
    .filter(j => !j.goleiro && j.por_ano && j.por_ano[ano] && j.por_ano[ano].jogos > 0)
    .sort((a, b) => (b.por_ano[ano]?.pontos || 0) - (a.por_ano[ano]?.pontos || 0))
    .slice(0, topN);

  if (M < 2 || jogadoresAno.length === 0)
    return '<p class="aprov-chart-empty">Dados insuficientes para este filtro.</p>';

  const todosNomes = jogadoresAno.map(j => j.nome);

  const playerLines = jogadoresAno.map((j, idx) => {
    const ptsByData = {};
    (j.partidas || [])
      .filter(p => String(p.ano) === String(ano))
      .forEach(p => { ptsByData[p.data] = (ptsByData[p.data] || 0) + p.pontos; });
    let cum = 0;
    const points = todasDatas.map(d => { cum += (ptsByData[d] || 0); return cum; });
    return {
      nome: j.nome,
      nomeShort: corridaNomeShort(j.nome, todosNomes),
      points,
      color: CORRIDA_PALETTE[idx % CORRIDA_PALETTE.length],
      idx,
    };
  });

  // — Dimensões maiores
  const W = 760, H = 340;
  const PAD = { top: 20, right: 126, bottom: 44, left: 46 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;

  const maxPts  = Math.max(...playerLines.map(l => l.points[M - 1]));
  const gridStep = maxPts <= 60 ? 10 : maxPts <= 120 ? 20 : maxPts <= 250 ? 50 : 100;
  const yMax    = Math.ceil((maxPts + gridStep * 0.5) / gridStep) * gridStep;

  const xScale = i => PAD.left + (M === 1 ? iW / 2 : (i / (M - 1)) * iW);
  const yScale = v => PAD.top + iH - (v / yMax) * iH;

  // Grade Y — tracejada, fina
  const gridLines = [];
  for (let v = 0; v <= yMax; v += gridStep) {
    const y = yScale(v).toFixed(1);
    gridLines.push(
      `<line x1="${PAD.left}" y1="${y}" x2="${PAD.left + iW}" y2="${y}"
        stroke="#e8e8e4" stroke-width="0.6" stroke-dasharray="3,3"/>` +
      `<text x="${PAD.left - 6}" y="${y}" text-anchor="end" dominant-baseline="middle"
        font-size="10" fill="#aaa">${v}</text>`
    );
  }

  // Linha sólida do eixo X
  const yAxis = (PAD.top + iH).toFixed(1);
  const xAxisLine = `<line x1="${PAD.left}" y1="${yAxis}" x2="${PAD.left + iW}" y2="${yAxis}"
    stroke="#ccc" stroke-width="1"/>`;

  // Labels eixo X — "5/mai", "19/mai" — intervalo simétrico, sempre inclui último
  const TARGET_LABELS = 7;
  // Escolher step que minimize |count - TARGET| e, de preferência, faça (M-1) % step === 0
  let bestStep = 1, bestScore = Infinity;
  for (let s = 1; s <= M; s++) {
    const count = Math.floor((M - 1) / s) + 1;
    if (count < 2 || count > 12) continue;
    const rem   = (M - 1) % s;
    const score = Math.abs(count - TARGET_LABELS) * 10 + (rem === 0 ? 0 : 1);
    if (score < bestScore) { bestScore = score; bestStep = s; }
  }
  const xIdxSet = new Set();
  for (let i = 0; i <= M - 1; i += bestStep) xIdxSet.add(i);
  xIdxSet.add(M - 1);

  const xLabels = [...xIdxSet].sort((a, b) => a - b).map(i => {
    const x = xScale(i).toFixed(1);
    return (
      `<line x1="${x}" y1="${yAxis}" x2="${x}" y2="${(PAD.top + iH + 4).toFixed(1)}" stroke="#ccc" stroke-width="1"/>` +
      `<text x="${x}" y="${(PAD.top + iH + 16).toFixed(1)}" text-anchor="middle" font-size="10" fill="#aaa">${fmtData(todasDatas[i])}</text>`
    );
  }).join('');

  // Anti-sobreposição de labels finais
  const MIN_SP = 13;
  const labelData = playerLines
    .map(pl => ({ nome: pl.nomeShort, color: pl.color, y: yScale(pl.points[M - 1]), idx: pl.idx }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < labelData.length; i++) {
    if (labelData[i].y - labelData[i - 1].y < MIN_SP)
      labelData[i].y = labelData[i - 1].y + MIN_SP;
  }
  const labelByIdx = {};
  labelData.forEach(l => { labelByIdx[l.idx] = l; });

  // Grupos por jogador (linha + ponto final + label) — hover em grupo
  const xLbl = (PAD.left + iW + 7).toFixed(1);
  const playerGroups = playerLines.map(pl => {
    const pts = pl.points.map((v, i) =>
      `${xScale(i).toFixed(1)},${yScale(v).toFixed(1)}`
    ).join(' ');
    const fx  = xScale(M - 1).toFixed(1);
    const fy  = yScale(pl.points[M - 1]).toFixed(1);
    const lbl = labelByIdx[pl.idx];
    return `<g class="c-line">
      <polyline class="c-hit" points="${pts}" fill="none" stroke="transparent" stroke-width="14"/>
      <polyline class="c-vis" points="${pts}" fill="none" stroke="${pl.color}" stroke-width="2"
        stroke-linejoin="round" stroke-linecap="round">
        <title>${escapeHtml(pl.nome)}: ${pl.points[M - 1]} pts</title>
      </polyline>
      <circle cx="${fx}" cy="${fy}" r="3.5" fill="${pl.color}" stroke="white" stroke-width="1.5"/>
      <text x="${xLbl}" y="${lbl.y.toFixed(1)}" dominant-baseline="middle"
        font-size="10" font-weight="600" fill="${pl.color}">${escapeHtml(pl.nomeShort)}</text>
    </g>`;
  }).join('\n    ');

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="aprov-svg">
    <rect x="0" y="0" width="${W}" height="${H}" fill="white"/>
    ${gridLines.join('\n    ')}
    ${xAxisLine}
    ${xLabels}
    ${playerGroups}
  </svg>`;
}


// ══════════════════════════════════════
//  Sidebar — Partidas
// ══════════════════════════════════════
function buildPartidasSidebar() {
  const nav = document.getElementById('partidas-sidebar-nav');
  if (!nav) return;

  const anos = [...DATA.meta.anos_disponiveis.slice().reverse().map(String)];

  // Meses disponíveis por ano
  const mesesPorAno = {};
  DATA.partidas.forEach(p => {
    const a = String(p.ano);
    const m = p.data.slice(5, 7);
    if (!mesesPorAno[a]) mesesPorAno[a] = new Set();
    mesesPorAno[a].add(m);
  });

  const todosItem = `
    <div class="sidebar-year-item">
      <button class="sidebar-year-btn ${STATE.partidas.ano === 'todos' ? 'active' : ''}" data-ano="todos">
        <span class="chevron">—</span>
        <span>Todos</span>
      </button>
    </div>`;

  const anosItems = anos.map(a => {
    const isActive = STATE.partidas.ano === a;
    const meses = mesesPorAno[a] ? [...mesesPorAno[a]].sort().reverse() : [];
    const mesesBtns = [
      `<button class="sidebar-sub-btn ${isActive && STATE.partidas.mes === 'todos' ? 'active' : ''}"
        data-ano="${a}" data-mes="todos">Todos os meses</button>`,
      ...meses.map(m => {
        const label = MESES_PT[parseInt(m, 10) - 1];
        return `<button class="sidebar-sub-btn ${isActive && STATE.partidas.mes === m ? 'active' : ''}"
          data-ano="${a}" data-mes="${m}">${label}</button>`;
      })
    ].join('');

    return `
      <div class="sidebar-year-item">
        <button class="sidebar-year-btn ${isActive ? 'active' : ''}" data-ano="${a}">
          <span class="chevron">${isActive ? '▾' : '▸'}</span>
          <span>${a}</span>
        </button>
        <div class="sidebar-year-sub ${isActive ? 'open' : ''}">
          ${mesesBtns}
        </div>
      </div>`;
  }).join('');

  nav.innerHTML = todosItem + anosItems;

  nav.addEventListener('click', e => {
    const subBtn  = e.target.closest('.sidebar-sub-btn');
    const yearBtn = e.target.closest('.sidebar-year-btn');

    if (subBtn) {
      STATE.partidas.ano = subBtn.dataset.ano;
      STATE.partidas.mes = subBtn.dataset.mes || 'todos';
      syncPartidasSidebar();
      renderPartidas();
      return;
    }

    if (yearBtn) {
      const ano = yearBtn.dataset.ano;
      if (ano === 'todos') {
        STATE.partidas.ano = 'todos';
        STATE.partidas.mes = 'todos';
      } else {
        STATE.partidas.ano = ano;
        STATE.partidas.mes = 'todos';
        const item = yearBtn.closest('.sidebar-year-item');
        const sub  = item.querySelector('.sidebar-year-sub');
        if (sub) {
          nav.querySelectorAll('.sidebar-year-sub').forEach(s => { if (s !== sub) s.classList.remove('open'); });
          nav.querySelectorAll('.sidebar-year-btn .chevron').forEach(c => { c.textContent = '▸'; });
          sub.classList.toggle('open');
          yearBtn.querySelector('.chevron').textContent = sub.classList.contains('open') ? '▾' : '▸';
        }
      }
      syncPartidasSidebar();
      renderPartidas();
    }
  });
}

function syncPartidasSidebar() {
  const nav = document.getElementById('partidas-sidebar-nav');
  if (!nav) return;
  nav.querySelectorAll('.sidebar-year-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.ano === STATE.partidas.ano);
  });
  nav.querySelectorAll('.sidebar-sub-btn').forEach(btn => {
    let active = false;
    if (btn.dataset.ano !== STATE.partidas.ano) { btn.classList.remove('active'); return; }
    if (btn.dataset.mes) active = btn.dataset.mes === STATE.partidas.mes;
    btn.classList.toggle('active', active);
  });
}

function setupBuscaPartida() {
  const inp = document.getElementById('busca-partida');
  if (!inp) return;
  inp.addEventListener('input', () => {
    STATE.partidas.busca = inp.value.trim().toLowerCase();
    renderPartidas();
  });
}

// ══════════════════════════════════════
//  Partidas
// ══════════════════════════════════════
function renderPartidas() {
  const { ano, mes, busca } = STATE.partidas;
  const wrap = document.getElementById('partidas-content');
  if (!wrap) return;

  let lista = DATA.partidas.slice();

  if (ano !== 'todos') lista = lista.filter(p => String(p.ano) === ano);
  if (mes !== 'todos') lista = lista.filter(p => p.data.slice(5, 7) === mes);

  if (busca) {
    lista = lista.filter(p => {
      const dataFmt = formatDataBR(p.data).toLowerCase();
      if (dataFmt.includes(busca)) return true;
      return Object.values(p.times).some(time =>
        time.some(j => j.nome.toLowerCase().includes(busca))
      );
    });
  }

  if (lista.length === 0) {
    wrap.innerHTML = '<p class="empty-state">Nenhuma partida encontrada.</p>';
    return;
  }

  // Agrupar por ano-mês
  const grupos = {};
  lista.forEach(p => {
    const key = p.data.slice(0, 7);
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(p);
  });

  const keys = Object.keys(grupos).sort().reverse();
  wrap.innerHTML = keys.map(key => {
    const [y, m] = key.split('-');
    const mesLabel = `${MESES_PT[parseInt(m, 10) - 1]} ${y}`;
    const partidas = grupos[key];
    return `
      <div class="mes-grupo">
        <div class="mes-header">
          <span class="mes-label">${mesLabel}</span>
          <span class="mes-count">${partidas.length} partida${partidas.length > 1 ? 's' : ''}</span>
        </div>
        <div class="partidas-list-mes">
          ${partidas.map(p => renderPartidaCard(p)).join('')}
        </div>
      </div>`;
  }).join('');

  wrap.onclick = e => {
    const li = e.target.closest('li[data-jogador]');
    if (li) abrirJogador(li.dataset.jogador);
  };
}

function renderPartidaCard(p) {
  const times = Object.keys(p.times);
  const ordem = ['Preto', 'Branco', ...times.filter(t => t !== 'Preto' && t !== 'Branco')];
  const timesOrd = ordem.filter(t => times.includes(t));

  const placarHtml = (timesOrd.includes('Preto') || timesOrd.includes('Branco'))
    ? `<div class="placar-v2">
        <div class="placar-team">
          <span class="badge-circle preto">⚫</span>
          <span class="placar-nome">Preto</span>
          <span class="placar-score">${p.placar_p ?? '—'}</span>
        </div>
        <span class="placar-sep">×</span>
        <div class="placar-team placar-team-right">
          <span class="placar-score">${p.placar_b ?? '—'}</span>
          <span class="placar-nome">Branco</span>
          <span class="badge-circle branco">⚪</span>
        </div>
      </div>`
    : '';

  const escalacaoHtml = `<div class="escalacao-v2">${
    timesOrd.map(t => {
      const jogadores = p.times[t]
        .slice()
        .sort((a, b) => (b.gols + b.assists) - (a.gols + a.assists) || a.nome.localeCompare(b.nome, 'pt-BR'))
        .map(j => {
          const tags = [];
          if (j.gols)    tags.push(`<span class="stat-icon">⚽${j.gols > 1 ? ' '+j.gols : ''}</span>`);
          if (j.assists) tags.push(`<span class="stat-icon">👟${j.assists > 1 ? ' '+j.assists : ''}</span>`);
          const tagStr = tags.length ? `<span class="stat-tags">${tags.join('')}</span>` : '';
          return `<li data-jogador="${escapeAttr(j.nome)}" class="clickable">
                    <span class="jog-nome">${escapeHtml(j.nome.replace(' (Goleiro)', ''))}</span>${tagStr}
                  </li>`;
        }).join('');
      return `<div class="time-col">
        <h4 class="time-col-header">${t === 'Preto' ? '⚫' : '⚪'} ${escapeHtml(t)}</h4>
        <ul>${jogadores}</ul>
      </div>`;
    }).join('')
  }</div>`;

  return `<article class="partida-card-v2">
    <div class="partida-data-v2">${formatDataBR(p.data)}</div>
    ${placarHtml}
    ${escalacaoHtml}
  </article>`;
}

// ══════════════════════════════════════
//  Sobre
// ══════════════════════════════════════
function renderSobre() {
  const m = DATA.meta;
  document.getElementById('sobre-meta').innerHTML = `
    Última partida: <strong>${formatDataBR(m.ultima_partida)}</strong>.<br>
    Total de partidas: <strong>${m.total_partidas}</strong>.<br>
    Total de jogadores: <strong>${m.total_jogadores}</strong>.<br>
    Anos disponíveis: <strong>${m.anos_disponiveis.join(', ')}</strong>.<br>
    Página gerada em <strong>${formatDataBR(m.atualizado_em)}</strong>.
  `;
}

// ══════════════════════════════════════
//  Util
// ══════════════════════════════════════
function formatDataBR(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function escapeAttr(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;',
    "'":'&#39;' }[c]));
}