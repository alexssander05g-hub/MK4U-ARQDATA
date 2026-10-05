/**
 * config.js — configuração do QUADRO (não é dado de card). Guarda só preferências:
 * quais dias contam e limites de cor. Se um dia for apagado, apenas volta ao padrão
 * — nenhum dado de usuário se perde.
 */
const KEY = 'cfg';

export const DEFAULT_CONFIG = Object.freeze({
  businessDays: [1, 2, 3, 4, 5], // seg..sex
  showBadge: true,
  warnDays: 0,   // 0 = desligado; >0 = badge AMARELO a partir de N dias úteis
  alertDays: 0,  // 0 = desligado; >0 = badge VERMELHO a partir de N dias úteis
});

export async function getConfig(t) {
  const s = await t.get('board', 'shared', KEY);
  return {
    ...DEFAULT_CONFIG,
    ...(s || {}),
    businessDays: (s && Array.isArray(s.businessDays) && s.businessDays.length)
      ? s.businessDays : DEFAULT_CONFIG.businessDays,
  };
}

export async function saveConfig(t, cfg) {
  return t.set('board', 'shared', KEY, cfg);
}
