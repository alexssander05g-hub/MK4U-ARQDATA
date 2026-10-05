/**
 * duplicates.js — detecção PURA de cards com nome igual ou parecido.
 * Não grava nada; recebe a lista de cards (name) e devolve grupos/pares.
 */

/** Normaliza o nome: sem acentos, minúsculo, pontuação vira espaço, espaços colapsados. */
export function normalizeName(s) {
  return String(s == null ? '' : s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')                       // pontuação/símbolos → espaço
    .trim().replace(/\s+/g, ' ');
}

/** Distância de Levenshtein (edições) entre duas strings. */
export function levenshtein(a, b) {
  a = a || ''; b = b || '';
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array(n + 1);
  let cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    const tmp = prev; prev = cur; cur = tmp;
  }
  return prev[n];
}

/** Semelhança 0..1 (1 = idêntico) entre duas strings já normalizadas. */
export function similarity(a, b) {
  const m = Math.max(a.length, b.length);
  if (m === 0) return 1;
  return 1 - levenshtein(a, b) / m;
}

/**
 * Analisa os cards e devolve:
 *  - exact:   grupos de cards com o MESMO nome normalizado (≥2 cards)
 *  - similar: pares de cards PARECIDOS (semelhança ≥ threshold, nomes diferentes)
 * @param {{id:string,name:string,idList?:string}[]} cards
 * @param {{threshold?:number, maxSimilar?:number}} [opts]
 */
export function analyzeDuplicates(cards, opts = {}) {
  const threshold = opts.threshold == null ? 0.82 : opts.threshold;
  const maxSimilar = opts.maxSimilar == null ? 200 : opts.maxSimilar;
  const items = cards
    .map((c) => ({ id: c.id, name: c.name, idList: c.idList, norm: normalizeName(c.name) }))
    .filter((c) => c.norm.length > 0);

  // --- exatos: agrupa por nome normalizado ---
  const byNorm = new Map();
  for (const it of items) {
    if (!byNorm.has(it.norm)) byNorm.set(it.norm, []);
    byNorm.get(it.norm).push(it);
  }
  const exact = [];
  for (const arr of byNorm.values()) if (arr.length >= 2) exact.push({ key: arr[0].norm, cards: arr });
  exact.sort((a, b) => b.cards.length - a.cards.length || a.key.localeCompare(b.key, 'pt-BR'));

  // --- parecidos: pares com semelhança alta, nomes normalizados diferentes ---
  const similar = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const A = items[i].norm, B = items[j].norm;
      if (A === B) continue; // já contam como "exatos"
      const mx = Math.max(A.length, B.length);
      if (Math.abs(A.length - B.length) / mx > (1 - threshold)) continue; // pré-filtro barato
      const sc = similarity(A, B);
      if (sc >= threshold) similar.push({ a: items[i], b: items[j], score: sc });
    }
  }
  similar.sort((x, y) => y.score - x.score);
  return { exact, similar: similar.slice(0, maxSimilar), total: items.length };
}

/** Busca simples: cards cujo nome normalizado contém o texto digitado. */
export function searchCards(cards, query) {
  const q = normalizeName(query);
  if (!q) return [];
  return cards.filter((c) => normalizeName(c.name).includes(q));
}
