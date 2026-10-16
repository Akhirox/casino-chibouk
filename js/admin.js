// Page admin « Journal des mini-jeux » (#/admin) : qui a joué à quoi, en combien de temps, et les parties refusées pour triche.
// Visible seulement par les comptes listés dans la collection Firestore « admins » (voir README).
import { $, $$, fmt, esc, CUR } from './ui.js';

const NAMES = { quiz: 'Calcul mental', capitals: 'Capitales', flags: 'Drapeaux', movies: 'Quiz ciné', higher: 'Plus ou moins', motus: 'Mot du jour',
  queens: 'Queens', tango: 'Tango', pinpoint: 'Pinpoint', sudoku: 'Sudoku', demineur: 'Démineur', snake: 'Snake', memory: 'Memory', crossword: 'Mots croisés', breaker: 'Casse-briques' };
const LV = ['facile', 'moyen', 'difficile'];
const FLAG = { ok: ['OK', 'ok'], fast: ['Trop rapide', 'fast'], cheat: ['Triche', 'cheat'] };
const when = (t) => new Date(t).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const dur = (s) => (s == null ? '—' : s < 60 ? `${String(s).replace('.', ',')} s` : `${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, '0')}`);

export function mount(view, { wallet, backend, isAdmin }) {
  let alive = true, logs = [], done = false, loading = false;
  const f = { who: '', game: '', flag: '', since: 1 };
  view.innerHTML = `<div class="adm-wrap">
    <div class="game-head"><h1>Journal des <span>mini-jeux</span></h1><div class="actions"><button class="btn btn-ghost btn-sm" id="adm-reload">Actualiser</button></div></div>
    <div id="adm-body"><p class="muted">Chargement…</p></div></div>`;
  const body = $('#adm-body', view);

  isAdmin().then((ok) => {
    if (!alive) return;
    if (!ok) {
      body.innerHTML = `<div class="adm-deny"><h2>Accès réservé</h2><p class="muted">Cette page est réservée aux admins du casino. Pour devenir admin : console Firebase → Firestore → collection <code>admins</code> → document dont l'identifiant est ton identifiant de compte (<code>${esc(wallet.uid)}</code>, visible aussi dans Mon profil). Voir le README.</p></div>`;
      return;
    }
    load(true);
  });
  $('#adm-reload', view).onclick = () => load(true);

  async function load(reset) {
    if (loading) return;
    loading = true;
    if (reset) { logs = []; done = false; }
    try {
      const before = logs.length ? logs[logs.length - 1].at : 0;
      const got = await backend.fetchLogs({ before, n: 300 });
      if (!alive) return;
      logs = logs.concat(got);
      if (got.length < 300) done = true;
      render();
    } catch (e) {
      body.innerHTML = `<div class="adm-deny"><h2>Lecture impossible</h2><p class="muted">${esc(e.message || e.code || e)}. As-tu publié la dernière version de firestore.rules et créé ton document dans « admins » ?</p></div>`;
    } finally { loading = false; }
  }

  function render() {
    const now = Date.now(), horizon = f.since ? now - f.since * 86400000 : 0;
    const inTime = logs.filter((l) => l.at >= horizon);
    const rows = inTime.filter((l) => (!f.who || l.uid === f.who) && (!f.game || l.game === f.game) && (!f.flag || (f.flag === 'sus' ? l.flag !== 'ok' : l.flag === f.flag)));
    const players = [...new Map(logs.map((l) => [l.uid, l.pseudo])).entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1])));
    const games = [...new Set(logs.map((l) => l.game))].sort();
    // résumé par joueur sur la période
    const per = new Map();
    for (const l of inTime) {
      if (f.game && l.game !== f.game) continue;
      const p = per.get(l.uid) || { pseudo: l.pseudo, n: 0, gain: 0, cheat: 0, fast: 0, fines: 0, best: {} };
      p.n++; p.gain += l.amount || 0; if (l.flag === 'cheat') p.cheat++; if (l.flag === 'fast') p.fast++; p.fines += l.fine || 0;
      if (l.sec != null && l.flag === 'ok') { const k = l.game + (l.lv != null ? ':' + l.lv : ''); if (p.best[k] == null || l.sec < p.best[k]) p.best[k] = l.sec; }
      per.set(l.uid, p);
    }
    const perRows = [...per.entries()].sort((a, b) => (b[1].cheat + b[1].fast) - (a[1].cheat + a[1].fast) || b[1].gain - a[1].gain);
    const tot = { n: rows.length, gain: rows.reduce((a, l) => a + (l.amount || 0), 0), cheat: rows.filter((l) => l.flag === 'cheat').length, fast: rows.filter((l) => l.flag === 'fast').length };
    const bestTxt = (b) => Object.entries(b).slice(0, 6).map(([k, s]) => { const [g, lv] = k.split(':'); return `${NAMES[g] || g}${lv != null ? ' ' + (LV[lv] || lv) : ''} ${dur(s)}`; }).join(' · ');

    body.innerHTML = `
      <div class="adm-filters">
        <label>Joueur<select data-f="who"><option value="">Tous</option>${players.map(([u, p]) => `<option value="${esc(u)}" ${f.who === u ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select></label>
        <label>Jeu<select data-f="game"><option value="">Tous</option>${games.map((g) => `<option value="${g}" ${f.game === g ? 'selected' : ''}>${NAMES[g] || g}</option>`).join('')}</select></label>
        <label>Statut<select data-f="flag"><option value="">Tous</option><option value="sus" ${f.flag === 'sus' ? 'selected' : ''}>Suspects (triche + trop rapide)</option><option value="cheat" ${f.flag === 'cheat' ? 'selected' : ''}>Triche</option><option value="fast" ${f.flag === 'fast' ? 'selected' : ''}>Trop rapide</option><option value="ok" ${f.flag === 'ok' ? 'selected' : ''}>OK</option></select></label>
        <label>Période<select data-f="since"><option value="1" ${f.since === 1 ? 'selected' : ''}>24 h</option><option value="7" ${f.since === 7 ? 'selected' : ''}>7 jours</option><option value="0" ${!f.since ? 'selected' : ''}>Tout ce qui est chargé</option></select></label>
      </div>
      <div class="adm-kpis"><div><span>Parties</span><b>${fmt(tot.n)}</b></div><div><span>${CUR} gagnés</span><b>${fmt(tot.gain)}</b></div><div class="${tot.cheat ? 'bad' : ''}"><span>Triches</span><b>${tot.cheat}</b></div><div class="${tot.fast ? 'warn' : ''}"><span>Trop rapides</span><b>${tot.fast}</b></div></div>
      <h3>Par joueur</h3>
      <div class="tbl-scroll"><table class="tbl adm-tbl"><thead><tr><th>Joueur</th><th class="r">Parties</th><th class="r">Gains</th><th class="r">Triches</th><th class="r">Trop rapides</th><th class="r">Amendes</th><th>Meilleurs temps</th></tr></thead><tbody>
        ${perRows.map(([u, p]) => `<tr class="${p.cheat ? 'cheat' : p.fast ? 'fast' : ''}" data-who="${esc(u)}"><td><b>${esc(p.pseudo)}</b></td><td class="r">${p.n}</td><td class="r">${fmt(p.gain)}</td><td class="r">${p.cheat || '—'}</td><td class="r">${p.fast || '—'}</td><td class="r">${p.fines ? fmt(p.fines) : '—'}</td><td class="adm-best">${bestTxt(p.best)}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">Rien sur la période.</td></tr>'}
      </tbody></table></div>
      <h3>Parties <small class="muted">(${rows.length} affichées sur ${logs.length} chargées)</small></h3>
      <div class="tbl-scroll"><table class="tbl adm-tbl"><thead><tr><th>Quand</th><th>Joueur</th><th>Jeu</th><th class="r">Durée</th><th class="r">Actions</th><th class="r">Gain</th><th>Statut</th><th>Détails</th></tr></thead><tbody>
        ${rows.slice(0, 500).map((l) => { const [fl, cls] = FLAG[l.flag] || FLAG.ok; return `<tr class="${cls}"><td>${when(l.at)}</td><td>${esc(l.pseudo || '?')}</td><td>${NAMES[l.game] || esc(l.game)}${l.lv != null ? ` <small>${LV[l.lv] || l.lv}</small>` : ''}</td>
          <td class="r">${dur(l.sec)}</td><td class="r">${l.actions ?? '—'}${l.fastShare ? ` <small title="part des actions à moins de 60 ms">${Math.round(l.fastShare * 100)} %</small>` : ''}</td><td class="r">${l.amount ? '+' + fmt(l.amount) : l.fine ? `<span class="neg">−${fmt(l.fine)}</span>` : '0'}</td>
          <td><span class="adm-flag ${cls}">${fl}</span></td><td class="adm-det">${esc(l.reason || '')}${l.strikes ? ` · récidive ${l.strikes}` : ''}${l.info && l.info !== '{}' ? `<small>${esc(l.info)}</small>` : ''}</td></tr>`; }).join('') || '<tr><td colspan="8" class="muted">Aucune partie.</td></tr>'}
      </tbody></table></div>
      ${done ? '<p class="muted adm-end">Tout le journal est chargé.</p>' : '<button class="btn btn-ghost wide" id="adm-more">Charger les 300 parties précédentes</button>'}`;
    $$('[data-f]', body).forEach((s) => (s.onchange = () => { f[s.dataset.f] = s.dataset.f === 'since' ? +s.value : s.value; render(); }));
    $$('tr[data-who]', body).forEach((tr) => (tr.onclick = () => { f.who = tr.dataset.who; render(); }));
    const more = $('#adm-more', body); if (more) more.onclick = () => load(false);
  }
  return () => { alive = false; };
}
