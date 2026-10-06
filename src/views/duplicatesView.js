/**
 * duplicatesView.js — painel "Buscar duplicados" (AUTOSSUFICIENTE, sem imports).
 *
 * Busca por nome + possíveis duplicados (iguais e parecidos).
 * FILTRO DE ETIQUETAS: recolhido por padrão (botão "Ocultar etiquetas"), abre
 * numa caixa com ROLAGEM e um campo pra filtrar as etiquetas por nome. Ao marcar
 * uma etiqueta, os cards que a têm somem da busca. Nada é gravado.
 */
const t = window.TrelloPowerUp.iframe();

// ---------- motor (embutido) ----------
function normalizeName(s) {
  return String(s == null ? '' : s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}
function levenshtein(a, b) {
  a = a || ''; b = b || ''; if (a === b) return 0;
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j), cur = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    cur[0] = i; const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    const tmp = prev; prev = cur; cur = tmp;
  }
  return prev[n];
}
function similarity(a, b) { const m = Math.max(a.length, b.length); return m === 0 ? 1 : 1 - levenshtein(a, b) / m; }
function analyzeDuplicates(cards, opts = {}) {
  const threshold = opts.threshold == null ? 0.82 : opts.threshold;
  const maxSimilar = opts.maxSimilar == null ? 200 : opts.maxSimilar;
  const items = cards.map((c) => ({ id: c.id, name: c.name, idList: c.idList, norm: normalizeName(c.name) }))
    .filter((c) => c.norm.length > 0);
  // exatos
  const byNorm = new Map();
  for (const it of items) { if (!byNorm.has(it.norm)) byNorm.set(it.norm, []); byNorm.get(it.norm).push(it); }
  const exact = [];
  for (const arr of byNorm.values()) if (arr.length >= 2) exact.push({ key: arr[0].norm, cards: arr });
  exact.sort((a, b) => b.cards.length - a.cards.length || a.key.localeCompare(b.key, 'pt-BR'));
  // parecidos — comparados só dentro de "baldes" por prefixo (rápido mesmo com milhares de cards)
  const buckets = new Map();
  for (const it of items) { const k = it.norm.slice(0, 5); if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(it); }
  const similar = [];
  for (const arr of buckets.values()) {
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const A = arr[i].norm, B = arr[j].norm; if (A === B) continue;
        const mx = Math.max(A.length, B.length);
        if (Math.abs(A.length - B.length) / mx > (1 - threshold)) continue;
        const sc = similarity(A, B); if (sc >= threshold) similar.push({ a: arr[i], b: arr[j], score: sc });
      }
    }
  }
  similar.sort((x, y) => y.score - x.score);
  return { exact, similar: similar.slice(0, maxSimilar) };
}
function searchCards(cards, query) {
  const q = normalizeName(query); if (!q) return [];
  return cards.filter((c) => normalizeName(c.name).includes(q));
}

// ---------- estado ----------
let CARDS = [];
let LIST = new Map();
let LABELS = new Map();            // id -> {id,name,color}
const EXCLUDED = new Set();        // ids ocultados
let LABELS_OPEN = false;
let labelQuery = '';

// ---------- helpers ----------
function el(tag, props = {}, children = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  return n;
}
const clear = (n) => { while (n.firstChild) n.removeChild(n.firstChild); };
const listName = (id) => LIST.get(id) || '—';
const openCard = (id) => { try { t.showCard(id); } catch (e) { /* noop */ } };
const LABEL_HEX = { green: '#61bd4f', yellow: '#f2d600', orange: '#ff9f1a', red: '#eb5a46',
  purple: '#c377e0', blue: '#0079bf', sky: '#00c2e0', lime: '#51e898', pink: '#ff78cb', black: '#344563' };
function labelHex(color) { const base = String(color || '').split('_')[0]; return LABEL_HEX[base] || '#b3bac5'; }
function labelText(l) { return l.name && l.name.trim() ? l.name : `(${l.color || 'sem cor'})`; }
function cardExcluded(card) {
  if (EXCLUDED.size === 0) return false;
  return (Array.isArray(card.labels) ? card.labels : []).some((l) => EXCLUDED.has(l.id));
}
function visibleCards() { return CARDS.filter((c) => !cardExcluded(c)); }

function injectStyles() {
  if (document.getElementById('dup-extra-css')) return;
  const s = document.createElement('style'); s.id = 'dup-extra-css';
  s.textContent = `
    .dup-labels-wrap{margin-top:8px}
    .dup-labels-toggle{border:1px solid #dfe1e6;background:#fff;border-radius:6px;padding:6px 12px;font-size:13px;cursor:pointer;color:#172b4d}
    .dup-labels-toggle:hover{background:#f4f5f7}
    .dup-label-filter{width:100%;box-sizing:border-box;margin:8px 0 6px;padding:6px 9px;border:1px solid #dfe1e6;border-radius:4px;font-size:13px}
    .dup-labels-panel{max-height:150px;overflow:auto;border:1px solid #dfe1e6;border-radius:6px;padding:8px;display:flex;flex-wrap:wrap;gap:6px;background:#fafbfc}
    .dup-labels-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
    .lbl-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid #dfe1e6;border-radius:12px;padding:3px 9px;font-size:12px;cursor:pointer;background:#fff;color:#172b4d;user-select:none}
    .lbl-chip .dot{width:10px;height:10px;border-radius:50%;flex:0 0 auto}
    .lbl-chip.is-off{background:#eaf3ff;border-color:#4c9aff;color:#0747a6}
    .lbl-hint{font-size:11px;color:#97a0af;margin-top:4px}
  `;
  document.head.appendChild(s);
}

// ---------- render de resultados ----------
function cardRow(c) {
  return el('div', { class: 'dup-card' }, [
    el('div', { class: 'dup-card-main' }, [
      el('span', { class: 'dup-card-name', text: c.name }),
      el('span', { class: 'dup-card-list', text: listName(c.idList) }),
    ]),
    el('button', { class: 'dup-open', text: 'Abrir', onclick: () => openCard(c.id) }),
  ]);
}
function renderResults(container, query) {
  clear(container);
  const cards = visibleCards();
  if (query && query.trim()) {
    const found = searchCards(cards, query);
    container.appendChild(el('div', { class: 'dup-section-title', text: `Resultados para "${query.trim()}" (${found.length})` }));
    if (found.length === 0) { container.appendChild(el('div', { class: 'dup-empty', text: 'Nenhum card com esse nome (entre os visíveis). Pode criar sem duplicar. ✅' })); return; }
    const qn = normalizeName(query);
    found.map((c) => ({ c, s: similarity(qn, normalizeName(c.name)) })).sort((a, b) => b.s - a.s).forEach(({ c }) => container.appendChild(cardRow(c)));
    return;
  }
  const { exact, similar } = analyzeDuplicates(cards, { threshold: 0.82 });
  if (exact.length === 0 && similar.length === 0) { container.appendChild(el('div', { class: 'dup-empty', text: 'Nenhum card com nome igual ou parecido (entre os visíveis). Quadro limpo! ✅' })); return; }
  if (exact.length > 0) {
    container.appendChild(el('div', { class: 'dup-section-title', text: `Nomes iguais (${exact.length} grupo(s))` }));
    exact.forEach((g) => {
      const box = el('div', { class: 'dup-group is-exact' }, [el('div', { class: 'dup-group-head', text: `${g.cards.length}× "${g.cards[0].name}"` })]);
      g.cards.forEach((c) => box.appendChild(cardRow(c))); container.appendChild(box);
    });
  }
  if (similar.length > 0) {
    container.appendChild(el('div', { class: 'dup-section-title', text: `Nomes parecidos (${similar.length} par(es))` }));
    similar.forEach((pair) => {
      const box = el('div', { class: 'dup-group is-similar' }, [el('div', { class: 'dup-group-head', text: `${Math.round(pair.score * 100)}% parecidos` })]);
      box.appendChild(cardRow(pair.a)); box.appendChild(cardRow(pair.b)); container.appendChild(box);
    });
  }
}

// ---------- render do filtro de etiquetas ----------
function chip(l, isOff, onClick) {
  const c = el('span', { class: `lbl-chip${isOff ? ' is-off' : ''}`, title: 'Clique para ocultar/mostrar os cards com esta etiqueta' }, [
    el('span', { class: 'dot', style: `background:${labelHex(l.color)}` }),
    (isOff ? '✓ ' : '') + labelText(l),
  ]);
  c.addEventListener('click', onClick);
  return c;
}

function render() {
  const root = document.getElementById('app');
  clear(root);

  const search = el('input', { type: 'search', class: 'dup-search', placeholder: 'Digite o nome do projeto para conferir antes de criar…' });
  const labelsWrap = el('div', { class: 'dup-labels-wrap' });
  const summary = el('div', { class: 'dup-summary' });
  const results = el('div', { class: 'dup-results' });

  const refreshResults = () => {
    summary.textContent = `${CARDS.length} cards · ${visibleCards().length} visível(is) após filtro · ${EXCLUDED.size} etiqueta(s) oculta(s)`;
    renderResults(results, search.value);
  };
  const toggleExcl = (id) => { if (EXCLUDED.has(id)) EXCLUDED.delete(id); else EXCLUDED.add(id); };

  const renderLabels = () => {
    clear(labelsWrap);
    if (LABELS.size === 0) return;
    const btn = el('button', { class: 'dup-labels-toggle',
      text: `${LABELS_OPEN ? '▾' : '▸'} Ocultar etiquetas${EXCLUDED.size ? ` (${EXCLUDED.size} oculta(s))` : ''}`,
      onclick: () => { LABELS_OPEN = !LABELS_OPEN; renderLabels(); } });
    labelsWrap.appendChild(btn);

    // quando fechado: mostra só as etiquetas já ocultas (pra desfazer rápido)
    if (!LABELS_OPEN && EXCLUDED.size) {
      const row = el('div', { class: 'dup-labels-row' });
      Array.from(EXCLUDED).map((id) => LABELS.get(id)).filter(Boolean)
        .forEach((l) => row.appendChild(chip(l, true, () => { toggleExcl(l.id); renderLabels(); refreshResults(); })));
      labelsWrap.appendChild(row);
    }

    // quando aberto: filtro por nome + caixa rolável com todas
    if (LABELS_OPEN) {
      const filter = el('input', { type: 'search', class: 'dup-label-filter', placeholder: 'filtrar etiquetas por nome…', value: labelQuery });
      const panel = el('div', { class: 'dup-labels-panel' });
      const fillPanel = () => {
        clear(panel);
        const q = normalizeName(labelQuery);
        const arr = Array.from(LABELS.values())
          .filter((l) => !q || normalizeName(labelText(l)).includes(q))
          .sort((a, b) => labelText(a).localeCompare(labelText(b), 'pt-BR'));
        if (!arr.length) { panel.appendChild(el('div', { class: 'lbl-hint', text: 'nenhuma etiqueta encontrada' })); return; }
        arr.forEach((l) => panel.appendChild(chip(l, EXCLUDED.has(l.id), () => { toggleExcl(l.id); fillPanel(); btn.textContent = `▾ Ocultar etiquetas${EXCLUDED.size ? ` (${EXCLUDED.size} oculta(s))` : ''}`; refreshResults(); })));
      };
      filter.addEventListener('input', () => { labelQuery = filter.value; fillPanel(); });
      labelsWrap.appendChild(filter);
      labelsWrap.appendChild(panel);
      fillPanel();
    }
  };

  search.addEventListener('input', () => renderResults(results, search.value));

  const head = el('div', { class: 'dup-head' }, [search, labelsWrap, summary,
    el('div', { class: 'lbl-hint', text: 'Dica: abra "Ocultar etiquetas", marque as de alteração/revisão para tirá-las da busca.' })]);
  root.appendChild(head);
  root.appendChild(results);

  renderLabels();
  refreshResults();
  setTimeout(() => search.focus(), 50);
}

async function boot() {
  const root = document.getElementById('app');
  try {
    injectStyles();
    const [cards, lists] = await Promise.all([t.cards('id', 'name', 'idList', 'labels'), t.lists('id', 'name')]);
    CARDS = cards;
    LIST = new Map(lists.map((l) => [l.id, l.name]));
    LABELS = new Map();
    for (const c of cards) for (const l of (Array.isArray(c.labels) ? c.labels : [])) {
      if (l && l.id && !LABELS.has(l.id)) LABELS.set(l.id, { id: l.id, name: l.name || '', color: l.color || '' });
    }
    render();
  } catch (e) {
    clear(root);
    root.appendChild(el('div', { class: 'dup-empty', text: 'Não foi possível carregar: ' + (e && e.message ? e.message : String(e)) }));
  }
}
boot();
