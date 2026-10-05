/**
 * client.js — Power-Up "Contagem de Dias".
 *
 * Mostra a IDADE do card em dias úteis (desde a criação) como badge na frente
 * do card e no verso. Não grava dado por card — a idade é sempre calculada na
 * hora a partir do ID do card. Cores opcionais para destacar cards antigos.
 */
import { getConfig } from './services/config.js';
import { creationMsFromId, cardAgeDays } from './services/age.js';

const BADGE_REFRESH = 3600; // a idade muda por dia; atualizar 1x/hora basta
const ICON = {
  search: './public/icons/search.svg',
  searchLight: './public/icons/search-light.svg',
};

function colorFor(days, cfg) {
  if (cfg.alertDays && days >= cfg.alertDays) return 'red';
  if (cfg.warnDays && days >= cfg.warnDays) return 'yellow';
  return null; // cor neutra padrão do Trello
}

window.TrelloPowerUp.initialize({
  // Badge na FRENTE do card: 🗓 Nd
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

  // Selo no verso do card
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

  // Botão do quadro: buscar cards duplicados / parecidos
  'board-buttons': function (t) {
    // Ícone de lupa embutido (data URI) — não depende de arquivo, sempre renderiza.
    const mag = (c) => 'data:image/svg+xml,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`);
    return [{
      icon: { dark: mag('#ffffff'), light: mag('#42526e') }, // dark=cabeçalho escuro, light=claro
      text: '', // sem texto: só o ícone no topo do quadro
      callback: (tt) => tt.modal({
        title: 'Buscar duplicados',
        url: tt.signUrl('./views/duplicates.html'),
        fullscreen: false,
        height: 620,
      }),
    }];
  },

  // Configurações (quais dias contam + limites de cor)
  'show-settings': function (t) {
    return t.popup({
      title: 'Contagem de Dias — Configurações',
      url: './views/settings.html',
      height: 400,
    });
  },
});
