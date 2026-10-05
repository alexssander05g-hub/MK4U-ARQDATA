/**
 * client.js — Power-Up "Contagem de Dias" (AUTOSSUFICIENTE, sem imports).
 *
 * Tudo que o conector precisa (cálculo de idade + leitura de config) está AQUI
 * dentro, de propósito: assim não há módulo externo que possa quebrar o
 * carregamento. Badges na frente/verso do card + botão "Duplicados" no quadro.
 *
 * Regra de dias: o DIA DA CRIAÇÃO conta como 0; sobe no próximo dia útil.
 * Fins de semana (fora de businessDays) não contam. Nada é gravado por card.
 */

const BADGE_REFRESH = 3600;
const DEFAULT_DAYS = [1, 2, 3, 4, 5]; // seg..sex (0=dom)
const CFG_KEY = 'cfg';
const DEFAULT_CONFIG = {
  businessDays: [1, 2, 3, 4, 5],
  showBadge: true,
  warnDays: 0,
  alertDays: 0,
};

// --- cálculo de idade (embutido) ---
function creationMsFromId(id) {
  if (typeof id !== 'string' || id.length < 8) return null;
  const secs = parseInt(id.slice(0, 8), 16);
  return Number.isFinite(secs) ? secs * 1000 : null;
}
function businessDayCount(startMs, endMs, businessDays) {
  const set = new Set(businessDays && businessDays.length ? businessDays : DEFAULT_DAYS);
  if (!(endMs >= startMs)) return 0;
  const cur = new Date(startMs); cur.setHours(0, 0, 0, 0);
  let n = 0, guard = 0;
  while (cur.getTime() <= endMs && guard < 20000) {
    guard += 1;
    if (set.has(cur.getDay())) n += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return n;
}
function cardAgeDays(createdAtMs, atMs, cfg) {
  if (createdAtMs == null) return 0;
  const bd = (cfg && cfg.businessDays) || DEFAULT_DAYS;
  const start = new Date(createdAtMs); start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + 1); // criação = dia 0
  return businessDayCount(start.getTime(), atMs, bd);
}

// --- config do quadro (embutido) ---
function getConfig(t) {
  return t.get('board', 'shared', CFG_KEY).then((s) => ({
    ...DEFAULT_CONFIG,
    ...(s || {}),
    businessDays: (s && Array.isArray(s.businessDays) && s.businessDays.length)
      ? s.businessDays : DEFAULT_CONFIG.businessDays,
  }));
}

function colorFor(days, cfg) {
  if (cfg.alertDays && days >= cfg.alertDays) return 'red';
  if (cfg.warnDays && days >= cfg.warnDays) return 'yellow';
  return null;
}

window.TrelloPowerUp.initialize({
  'card-badges': function (t) {
    return getConfig(t).then((cfg) => {
      if (!cfg.showBadge) return [];
      return [{
        dynamic: function () {
          return t.card('id').then((card) => {
            const days = cardAgeDays(creationMsFromId(card && card.id), Date.now(), cfg);
            return { text: `🗓 ${days}d`, color: colorFor(days, cfg), refresh: BADGE_REFRESH };
          });
        },
      }];
    });
  },

  'card-detail-badges': function (t) {
    return t.card('id').then((card) => getConfig(t).then((cfg) => {
      const days = cardAgeDays(creationMsFromId(card && card.id), Date.now(), cfg);
      return [{
        title: 'Idade',
        text: `${days} ${days === 1 ? 'dia útil' : 'dias úteis'}`,
        color: colorFor(days, cfg),
      }];
    }));
  },

  'board-buttons': function () {
    const mag = (c) => 'data:image/svg+xml,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`);
    return [{
      icon: { dark: mag('#ffffff'), light: mag('#42526e') },
      text: 'Duplicados',
      callback: (tt) => tt.modal({
        title: 'Buscar duplicados',
        url: tt.signUrl('./views/duplicates.html'),
        fullscreen: false,
        height: 620,
      }),
    }];
  },

  'show-settings': function (t) {
    return t.popup({
      title: 'Contagem de Dias — Configurações',
      url: './views/settings.html',
      height: 400,
    });
  },
});
