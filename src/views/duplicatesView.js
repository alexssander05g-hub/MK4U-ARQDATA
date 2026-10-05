/**
 * duplicatesView.js — painel "Buscar duplicados" (modal do botão de quadro).
 * Lê os nomes dos cards (sem gravar nada), mostra busca + grupos de possíveis
 * duplicados (nomes iguais e parecidos). Clicar abre o card.
 */
import { analyzeDuplicates, searchCards, normalizeName, similarity } from '../services/duplicates.js';

const t = window.TrelloPowerUp.iframe();

let CARDS = [];
let LIST = new Map();
let ANALYSIS = null;

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

function cardRow(c, extra) {
  return el('div', { class: 'dup-card' }, [
    el('div', { class: 'dup-card-main' }, [
      el('span', { class: 'dup-card-name', text: c.name }),
      el('span', { class: 'dup-card-list', text: listName(c.idList) }),
    ]),
    extra ? el('span', { class: 'dup-card-extra', text: extra }) : null,
    el('button', { class: 'dup-open', text: 'Abrir', onclick: () => openCard(c.id) }),
  ]);
}

function renderResults(container, query) {
  clear(container);

  // Modo BUSCA
  if (query && query.trim()) {
    const found = searchCards(CARDS, query);
    container.appendChild(el('div', { class: 'dup-section-title', text: `Resultados para "${query.trim()}" (${found.length})` }));
    if (found.length === 0) {
      container.appendChild(el('div', { class: 'dup-empty', text: 'Nenhum card com esse nome. Pode criar sem duplicar. ✅' }));
      return;
    }
    // ordena por semelhança com a busca (mais parecido primeiro)
    const qn = normalizeName(query);
    found
      .map((c) => ({ c, s: similarity(qn, normalizeName(c.name)) }))
      .sort((a, b) => b.s - a.s)
      .forEach(({ c }) => container.appendChild(cardRow(c)));
    return;
  }

  // Modo PADRÃO: possíveis duplicados
  const { exact, similar } = ANALYSIS;
  if (exact.length === 0 && similar.length === 0) {
    container.appendChild(el('div', { class: 'dup-empty', text: 'Nenhum card com nome igual ou parecido. Quadro limpo! ✅' }));
    return;
  }

  if (exact.length > 0) {
    container.appendChild(el('div', { class: 'dup-section-title', text: `Nomes iguais (${exact.length} grupo(s))` }));
    exact.forEach((g) => {
      const box = el('div', { class: 'dup-group is-exact' }, [
        el('div', { class: 'dup-group-head', text: `${g.cards.length}× "${g.cards[0].name}"` }),
      ]);
      g.cards.forEach((c) => box.appendChild(cardRow(c)));
      container.appendChild(box);
    });
  }

  if (similar.length > 0) {
    container.appendChild(el('div', { class: 'dup-section-title', text: `Nomes parecidos (${similar.length} par(es))` }));
    similar.forEach((pair) => {
      const pct = Math.round(pair.score * 100);
      const box = el('div', { class: 'dup-group is-similar' }, [
        el('div', { class: 'dup-group-head', text: `${pct}% parecidos` }),
      ]);
      box.appendChild(cardRow(pair.a));
      box.appendChild(cardRow(pair.b));
      container.appendChild(box);
    });
  }
}

async function boot() {
  const root = document.getElementById('app');
  try {
    const [cards, lists] = await Promise.all([
      t.cards('id', 'name', 'idList'),
      t.lists('id', 'name'),
    ]);
    CARDS = cards;
    LIST = new Map(lists.map((l) => [l.id, l.name]));
    ANALYSIS = analyzeDuplicates(CARDS, { threshold: 0.82 });

    clear(root);
    const search = el('input', { type: 'search', class: 'dup-search',
      placeholder: 'Digite o nome do projeto para conferir antes de criar…' });
    const results = el('div', { class: 'dup-results' });
    const summary = el('div', { class: 'dup-summary',
      text: `${CARDS.length} cards no quadro · ${ANALYSIS.exact.length} grupo(s) de nomes iguais · ${ANALYSIS.similar.length} par(es) parecidos` });

    search.addEventListener('input', () => renderResults(results, search.value));
    root.appendChild(el('div', { class: 'dup-head' }, [search, summary]));
    root.appendChild(results);
    renderResults(results, '');
    setTimeout(() => search.focus(), 50);
  } catch (e) {
    clear(root);
    root.appendChild(el('div', { class: 'dup-empty', text: 'Não foi possível carregar: ' + (e && e.message ? e.message : String(e)) }));
  }
}
boot();
