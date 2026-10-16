// Journal des mini-jeux : une ligne par partie terminée (gagnée, perdue, refusée pour triche), envoyée dans
// la collection Firestore « logs ». Lecture réservée aux admins (page #/admin). Sert à repérer la triche.
import { VERSION } from './changelog.js';

const lvFromExtra = (x = {}) => { for (const k of Object.keys(x)) { const m = /^Won(\d)$/.exec(k); if (m) return +m[1]; } return null; };
const num = (x) => (typeof x === 'number' && isFinite(x) ? Math.round(x * 100) / 100 : null);

export function initGameLog(wallet, backend) {
  let warned = false;
  const send = (entry) => {
    const clean = Object.fromEntries(Object.entries(entry).filter(([, v]) => v !== null && v !== undefined && v !== ''));
    backend.addLog(clean).catch((e) => { if (!warned) { warned = true; console.warn('Journal des mini-jeux indisponible (règles Firestore à publier ?)', e && e.code); } });
  };
  const base = () => ({ uid: wallet.uid, pseudo: wallet.pseudo, at: Date.now(), v: VERSION });
  return wallet.on((e) => {
    if (!e) return;
    if (e.type === 'free') {
      const log = (e.meta && e.meta.log) || {};
      const extra = e.extra || {};
      send({ ...base(), game: e.game, flag: 'ok', amount: Math.round(e.amount || 0),
        lv: log.lv ?? lvFromExtra(extra), sec: num(log.sec), actions: num(log.actions), fastShare: num(log.fastShare), ms: num(log.ms),
        info: JSON.stringify({ ...extra, ...(log.moves != null ? { moves: log.moves } : {}), ...(log.hints != null ? { hints: log.hints } : {}) }).slice(0, 300) });
    } else if (e.type === 'breaker') {
      send({ ...base(), game: 'breaker', flag: 'ok', amount: Math.round(e.amount || 0) });
    } else if (e.type === 'fairplay') {
      send({ ...base(), game: e.game, flag: e.flag, amount: 0, lv: e.lv ?? null, sec: num(e.sec), actions: num(e.actions), fastShare: num(e.fastShare), ms: num(e.medianMs),
        untrusted: e.untrusted || null, reason: String(e.reason || '').slice(0, 200), fine: e.fine || null, strikes: e.strikes || null, lockMin: e.lockMin || null });
    }
  });
}
