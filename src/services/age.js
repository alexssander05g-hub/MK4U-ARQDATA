/**
 * age.js — cálculo PURO da idade do card em dias úteis.
 *
 * NÃO grava nada. A data de criação vem do próprio ID do card do Trello
 * (os 8 primeiros dígitos hex do ID são o timestamp Unix de criação). Como
 * nada é armazenado por card, este Power-Up não tem como "perder dados".
 */
const DEFAULT_DAYS = [1, 2, 3, 4, 5]; // seg..sex (padrão de Date.getDay(); 0=dom)

/** Data de criação (ms) derivada do ID do card, ou null. */
export function creationMsFromId(id) {
  if (typeof id !== 'string' || id.length < 8) return null;
  const secs = parseInt(id.slice(0, 8), 16);
  return Number.isFinite(secs) ? secs * 1000 : null;
}

/** Quantidade de dias ÚTEIS entre startMs e endMs (inclusive), pelos dias válidos. */
export function businessDayCount(startMs, endMs, businessDays = DEFAULT_DAYS) {
  const set = new Set(businessDays && businessDays.length ? businessDays : DEFAULT_DAYS);
  if (!(endMs >= startMs)) return 0;
  const cur = new Date(startMs);
  cur.setHours(0, 0, 0, 0);
  let n = 0, guard = 0;
  while (cur.getTime() <= endMs && guard < 20000) {
    guard += 1;
    if (set.has(cur.getDay())) n += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return n;
}

/** Idade do card em dias úteis, da criação até `atMs`. */
export function cardAgeDays(createdAtMs, atMs, config) {
  if (createdAtMs == null) return 0;
  const bd = (config && config.businessDays) || DEFAULT_DAYS;
  return businessDayCount(createdAtMs, atMs, bd);
}
