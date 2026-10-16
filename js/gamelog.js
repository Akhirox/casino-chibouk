// Journal des mini-jeux : une ligne par partie terminée (gagnée, perdue, refusée pour triche), dans la collection
// Firestore « logs ». Lecture réservée aux admins (page #/admin). Sert à repérer la triche.
//
// Économie d'écritures : les parties sont regroupées par lots (un seul document pour jusqu'à LOG_BATCH parties),
// envoyés au plus tard LOG_BATCH_MS après la première partie du lot, à la fermeture de l'onglet, ou tout de suite
// en cas de triche détectée. Le lot en attente est gardé dans le navigateur pour survivre à un rechargement.
// Format compatible avec les règles existantes (uid, game, at, moins de 20 champs) : pas de règles à republier.
import { VERSION } from './changelog.js';
import { CONFIG } from './config.js';

const lvFromExtra = (x = {}) => { for (const k of Object.keys(x)) { const m = /^Won(\d)$/.exec(k); if (m) return +m[1]; } return null; };
const num = (x) => (typeof x === 'number' && isFinite(x) ? Math.round(x * 100) / 100 : null);
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== ''));

export function initGameLog(wallet, backend) {
  const key = 'chibouk_logq_' + wallet.uid;
  let q = [], timer = null, sending = false, warned = false;
  try { q = JSON.parse(localStorage.getItem(key) || '[]'); if (!Array.isArray(q)) q = []; } catch { q = []; }
  const keep = () => { try { if (q.length) localStorage.setItem(key, JSON.stringify(q)); else localStorage.removeItem(key); } catch {} };

  async function send() {
    clearTimeout(timer); timer = null;
    if (sending || !q.length) return;
    sending = true;
    const items = q.slice(0, CONFIG.LOG_BATCH);
    const doc = { uid: wallet.uid, pseudo: wallet.pseudo, game: '_batch', at: Math.max(...items.map((i) => i.at || 0)), v: VERSION, n: items.length,
      cheat: items.filter((i) => i.flag === 'cheat').length, fast: items.filter((i) => i.flag === 'fast').length, items };
    try {
      await backend.addLog(doc);
      q = q.slice(items.length); keep();
    } catch (e) {
      if (!warned) { warned = true; console.warn('Journal des mini-jeux indisponible (règles Firestore à publier ?)', e && e.code); }
    } finally { sending = false; }
    if (q.length) schedule(q.length >= CONFIG.LOG_BATCH ? 2000 : CONFIG.LOG_BATCH_MS);
  }
  function schedule(ms) { if (!timer) timer = setTimeout(send, ms); }

  function add(entry) {
    q.push(clean(entry));
    if (q.length > 600) q = q.slice(-600); // hors ligne très longtemps : on garde les 600 dernières
    keep();
    if (entry.flag === 'cheat' || q.length >= CONFIG.LOG_BATCH) { clearTimeout(timer); timer = null; send(); }
    else schedule(CONFIG.LOG_BATCH_MS);
  }

  const base = () => ({ at: Date.now() });
  const off = wallet.on((e) => {
    if (!e) return;
    if (e.type === 'free') {
      const log = (e.meta && e.meta.log) || {};
      const extra = e.extra || {};
      add({ ...base(), game: e.game, flag: 'ok', amount: Math.round(e.amount || 0),
        lv: log.lv ?? lvFromExtra(extra), sec: num(log.sec), actions: num(log.actions), fastShare: num(log.fastShare), ms: num(log.ms),
        info: JSON.stringify({ ...extra, ...(log.moves != null ? { moves: log.moves } : {}), ...(log.hints != null ? { hints: log.hints } : {}) }).slice(0, 300) });
    } else if (e.type === 'breaker') {
      add({ ...base(), game: 'breaker', flag: 'ok', amount: Math.round(e.amount || 0) });
    } else if (e.type === 'fairplay') {
      add({ ...base(), game: e.game, flag: e.flag, amount: 0, lv: e.lv ?? null, sec: num(e.sec), actions: num(e.actions), fastShare: num(e.fastShare), ms: num(e.medianMs),
        untrusted: e.untrusted || null, reason: String(e.reason || '').slice(0, 200), fine: e.fine || null, strikes: e.strikes || null, lockMin: e.lockMin || null });
    }
  });
  // départ : on envoie ce qui restait d'une session précédente ; fermeture de la page : on envoie le lot en cours
  // (changer d'onglet n'envoie rien : le lot reste dans le navigateur et part au prochain envoi)
  if (q.length) schedule(5000);
  const onLeave = () => { if (q.length) send(); };
  window.addEventListener('pagehide', onLeave);
  return () => { off(); window.removeEventListener('pagehide', onLeave); clearTimeout(timer); if (q.length) send(); };
}
