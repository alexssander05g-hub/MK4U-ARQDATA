import { getConfig, saveConfig, DEFAULT_CONFIG } from '../services/config.js';

const t = window.TrelloPowerUp.iframe();
const $ = (id) => document.getElementById(id);
const DAYS = [1, 2, 3, 4, 5, 6, 0];

async function boot() {
  const cfg = await getConfig(t);
  DAYS.forEach((d) => { const c = $(`d${d}`); if (c) c.checked = cfg.businessDays.includes(d); });
  $('showBadge').checked = cfg.showBadge;
  $('warnDays').value = cfg.warnDays || 0;
  $('alertDays').value = cfg.alertDays || 0;

  $('saveBtn').addEventListener('click', async () => {
    const businessDays = DAYS.filter((d) => $(`d${d}`) && $(`d${d}`).checked);
    const cfg2 = {
      ...DEFAULT_CONFIG,
      businessDays: businessDays.length ? businessDays : DEFAULT_CONFIG.businessDays,
      showBadge: $('showBadge').checked,
      warnDays: Math.max(0, parseInt($('warnDays').value, 10) || 0),
      alertDays: Math.max(0, parseInt($('alertDays').value, 10) || 0),
    };
    await saveConfig(t, cfg2);
    t.closePopup();
  });

  t.sizeTo('#app').catch(() => {});
}
boot();
