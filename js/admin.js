// Page admin (#/admin) : onglet « Joueurs » (soldes inexplicables, correction, suspension) et journal des mini-jeux.
// Visible seulement par les comptes listés dans la collection Firestore « admins » (voir README).
import { $, $$, fmt, esc, toast, modal, CUR } from './ui.js';
import { TAGS, tagsOf, tagsHTML } from './tags.js';
import { GIFT_KINDS, giftLabel } from './gifts.js';
import { CONFIG } from './config.js';

const NAMES = { quiz: 'Calcul mental', capitals: 'Capitales', flags: 'Drapeaux', movies: 'Quiz ciné', higher: 'Plus ou moins', motus: 'Mot du jour',
  queens: 'Queens', tango: 'Tango', pinpoint: 'Pinpoint', sudoku: 'Sudoku', demineur: 'Démineur', snake: 'Snake', memory: 'Memory', crossword: 'Mots croisés', breaker: 'Casse-briques', geo: 'Géographie', typing: 'Frappe éclair', _save: 'Sauvegarde locale', _admin: 'Action admin', _defi: 'Défi de la jungle' };
const LV = ['facile', 'moyen', 'difficile'];
const LVK = { easy: 'facile', medium: 'moyen', hard: 'difficile', expert: 'expert' };
const FLAG = { ok: ['OK', 'ok'], fast: ['Trop rapide', 'fast'], cheat: ['Triche', 'cheat'] };
const when = (t) => new Date(t).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const dur = (s) => (s == null ? '—' : s < 60 ? `${String(s).replace('.', ',')} s` : `${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, '0')}`);

export function mount(view, { wallet, backend, isAdmin }) {
  let alive = true, logs = [], done = false, loading = false, cursor = 0, tab = 'players', players = null;
  const f = { who: '', game: '', flag: '', since: 1 };
  view.innerHTML = `<div class="adm-wrap">
    <div class="game-head"><h1>Espace <span>admin</span></h1><div class="actions"><span class="seg adm-tabs"><button data-t="players" class="on">Joueurs</button><button data-t="logs">Journal des mini-jeux</button></span><button class="btn btn-ghost btn-sm" id="adm-reload">Actualiser</button></div></div>
    <div id="adm-body"><p class="muted">Chargement…</p></div></div>`;
  const body = $('#adm-body', view);
  $$('.adm-tabs button', view).forEach((b) => (b.onclick = () => { tab = b.dataset.t; $$('.adm-tabs button', view).forEach((x) => x.classList.toggle('on', x === b)); show(); }));
  const show = () => (tab === 'players' ? loadPlayers() : logs.length ? render() : load(true));

  isAdmin().then((ok) => {
    if (!alive) return;
    if (!ok) {
      body.innerHTML = `<div class="adm-deny"><h2>Accès réservé</h2><p class="muted">Cette page est réservée aux admins du casino. Pour devenir admin : console Firebase → Firestore → collection <code>admins</code> → document dont l'identifiant est ton identifiant de compte (<code>${esc(wallet.uid)}</code>, visible aussi dans Mon profil). Voir le README.</p></div>`;
      return;
    }
    show();
  });
  $('#adm-reload', view).onclick = () => (tab === 'players' ? loadPlayers(true) : load(true));

  /* ---------------- Joueurs : solde explicable, correction, suspension ---------------- */
  // Tout Brundle gagné passe par une statistique : gains des jeux (totalWon) et compteurs « …Total » (roue, quêtes,
  // succès, mini-jeux, ferme, rakeback, VIP, jackpot…), plus les transferts reçus. Fortune maximale explicable =
  // départ + tout ce qui est entré − tout ce qui a été misé. Au-dessus, le solde a été modifié à la main.
  function audit(p) {
    const st = p.stats || {};
    const inflow = (st.totalWon || 0) + Object.entries(st).reduce((a, [k, v]) => a + (/Total$/.test(k) && k !== 'penaltyTotal' && typeof v === 'number' ? v : 0), 0) + (st.transfersReceived || 0);
    const outflow = Object.entries(st).reduce((a, [k, v]) => a + (/Spent$/.test(k) && typeof v === 'number' ? v : 0), 0) + (st.transfersSent || 0) + (st.penaltyTotal || 0);
    const max = CONFIG.START_BALANCE + inflow - (st.totalWagered || 0);
    const fortune = (p.balance || 0) + Math.max(0, p.vault || 0);
    const expected = max - outflow;
    const gap = fortune - max;
    const sus = gap > Math.max(20000, Math.abs(max) * 0.1);
    return { inflow, max, expected, fortune, gap, sus };
  }
  async function loadPlayers(force) {
    if (!players || force) {
      body.innerHTML = '<p class="muted">Chargement des joueurs…</p>';
      try { players = await backend.listPlayers(500); } catch (e) { body.innerHTML = `<p class="muted">${esc(e.message || e)}</p>`; return; }
    }
    if (!alive || tab !== 'players') return;
    const rows = players.map((p) => ({ p, a: audit(p) })).sort((x, y) => (y.p.banned ? 0 : y.a.sus) - (x.p.banned ? 0 : x.a.sus) || y.a.gap - x.a.gap);
    const nSus = rows.filter((r) => r.a.sus && !r.p.banned).length;
    body.innerHTML = `
      <div class="adm-kpis"><div><span>Joueurs</span><b>${rows.length}</b></div><div class="${nSus ? 'bad' : ''}"><span>Soldes inexplicables</span><b>${nSus}</b></div><div><span>Suspendus</span><b>${rows.filter((r) => r.p.banned).length}</b></div></div>
      <div class="adm-giftall"><button class="btn btn-gold btn-sm" data-giftall>Cadeau à tous les joueurs</button><small class="muted">Indemnisation, événement… Chaque joueur le reçoit à son prochain chargement (1 écriture par joueur).</small></div>
      <p class="muted adm-help">« Max explicable » = 1 000 de départ + tout ce que le joueur a gagné (jeux, bonus, mini-jeux, ferme, transferts reçus) − tout ce qu'il a misé. Une fortune au-dessus ne peut venir que d'une modification à la main.</p>
      <div class="tbl-scroll"><table class="tbl adm-tbl"><thead><tr><th>Joueur</th><th class="r">Solde</th><th class="r">Coffre</th><th class="r">Misé</th><th class="r">Gagné aux jeux</th><th class="r">Max explicable</th><th class="r">Écart</th><th>Statut</th><th></th></tr></thead><tbody>
      ${rows.map(({ p, a }) => `<tr class="${p.banned ? 'banned' : a.sus ? 'cheat' : ''}"><td><b>${esc(p.pseudo)}</b>${tagsHTML(p)}${p.adminNote ? `<small class="adm-note">${esc(p.adminNote)}</small>` : ''}</td><td class="r">${fmt(p.balance || 0)}</td><td class="r">${fmt(p.vault || 0)}</td>
        <td class="r">${fmt((p.stats && p.stats.totalWagered) || 0)}</td><td class="r">${fmt((p.stats && p.stats.totalWon) || 0)}</td><td class="r">${fmt(Math.max(0, Math.round(a.max)))}</td>
        <td class="r ${a.gap > 0 ? 'neg' : ''}">${a.gap > 0 ? '+' + fmt(Math.round(a.gap)) : '—'}</td>
        <td>${p.banned ? '<span class="adm-flag cheat">Suspendu</span>' : a.sus ? '<span class="adm-flag cheat">Solde inexplicable</span>' : '<span class="adm-flag ok">OK</span>'}</td>
        <td class="adm-acts"><button class="btn btn-ghost btn-sm" data-gift="${esc(p.uid)}">Cadeau${(p.gifts || []).length ? ` (${p.gifts.length} en attente)` : ''}</button><button class="btn btn-ghost btn-sm" data-tags="${esc(p.uid)}">Tags${tagsOf(p).length ? ` (${tagsOf(p).length})` : ''}</button><button class="btn btn-ghost btn-sm" data-fix="${esc(p.uid)}">Corriger</button><button class="btn btn-ghost btn-sm" data-ban="${esc(p.uid)}">${p.banned ? 'Réactiver' : 'Suspendre'}</button></td></tr>`).join('')}
      </tbody></table></div>`;
    $$('[data-fix]', body).forEach((b) => (b.onclick = () => fix(rows.find((r) => r.p.uid === b.dataset.fix))));
    $$('[data-ban]', body).forEach((b) => (b.onclick = () => ban(rows.find((r) => r.p.uid === b.dataset.ban).p)));
    $$('[data-tags]', body).forEach((b) => (b.onclick = () => editTags(rows.find((r) => r.p.uid === b.dataset.tags).p)));
    $$('[data-gift]', body).forEach((b) => (b.onclick = () => gift([rows.find((r) => r.p.uid === b.dataset.gift).p])));
    const ga = $('[data-giftall]', body); if (ga) ga.onclick = () => gift(rows.filter((r) => !r.p.banned).map((r) => r.p));
  }
  async function fix({ p, a }) {
    let box = null;
    const suggest = Math.max(0, Math.round(Math.min(p.balance || 0, a.expected - Math.max(0, p.vault || 0))));
    const res = await modal({ title: `Corriger le compte de ${esc(p.pseudo)}`, html: `
      <p class="muted">Solde actuel : <b>${fmt(p.balance || 0)}</b> · coffre : <b>${fmt(p.vault || 0)}</b> · max explicable : <b>${fmt(Math.max(0, Math.round(a.max)))}</b></p>
      <label class="adm-field">Nouveau solde<input id="adm-bal" class="bet-input" type="number" min="0" step="1" value="${suggest}"></label>
      <label class="adm-field">Nouveau coffre<input id="adm-vault" class="bet-input" type="number" min="0" step="1" value="${Math.max(0, p.vault || 0)}"></label>
      <label class="adm-field">Note (visible ici seulement)<input id="adm-note" class="bet-input" type="text" maxlength="120" value="${esc(p.adminNote || '')}" placeholder="ex : solde modifié à la main, remis à zéro"></label>
      <p class="muted">Le joueur est rechargé automatiquement à sa prochaine sauvegarde, avec les nouvelles valeurs.</p>`,
      buttons: [{ label: 'Annuler', value: false }, { label: 'Enregistrer', value: 'ok', primary: true }],
      onOpen: (m) => { box = m; m.querySelector('#adm-bal').focus(); } });
    if (res !== 'ok' || !box) return;
    const val = (id) => box.querySelector(id).value;
    await apply(p, { balance: Math.max(0, Math.floor(+val('#adm-bal') || 0)), vault: Math.max(0, Math.floor(+val('#adm-vault') || 0)), adminNote: String(val('#adm-note') || '').slice(0, 120) }, `Compte de ${p.pseudo} corrigé`);
  }
  // Tags spéciaux (OG CHBK…) : affichés à côté du pseudo partout (profil, classements, chat)
  async function editTags(p) {
    let box = null;
    const cur = new Set(tagsOf(p));
    const res = await modal({ title: `Tags de ${esc(p.pseudo)}`, html: `<p class="muted">Coche les tags à donner. Le joueur les voit après son prochain rechargement (automatique).</p>
      <div class="adm-tags">${Object.entries(TAGS).map(([id, t]) => `<label class="adm-tag"><input type="checkbox" value="${id}" ${cur.has(id) ? 'checked' : ''}> <span class="pl-tag tag-${id}">${esc(t.label)}</span> <small class="muted">${esc(t.desc)}</small></label>`).join('')}</div>`,
      buttons: [{ label: 'Annuler', value: false }, { label: 'Enregistrer', value: 'ok', primary: true }], onOpen: (m) => { box = m; } });
    if (res !== 'ok' || !box) return;
    const tags = [...box.querySelectorAll('.adm-tag input:checked')].map((x) => x.value).filter((t) => TAGS[t]);
    await apply(p, { tags }, tags.length ? `Tags de ${p.pseudo} : ${tags.map((t) => TAGS[t].label).join(', ')}` : `Tags de ${p.pseudo} retirés`);
  }
  // Cadeaux (V29) : Brundles, boosts temporaires ou tours de roue, reçus par le joueur à son prochain chargement
  async function gift(list) {
    if (!list.length) return;
    let box = null;
    const one = list.length === 1;
    const res = await modal({ title: one ? `Cadeau pour ${esc(list[0].pseudo)}` : `Cadeau à ${list.length} joueurs`, cls: 'adm-gift-modal', html: `
      <label class="adm-field">Type<select id="gf-kind" class="bet-input">${Object.entries(GIFT_KINDS).map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join('')}</select></label>
      <label class="adm-field gf-br">Montant<input id="gf-amount" class="bet-input" type="number" min="1" step="1" value="10000"></label>
      <label class="adm-field gf-boost" hidden>Multiplicateur ×<input id="gf-m" class="bet-input" type="number" min="1.1" max="5" step="0.1" value="2"></label>
      <label class="adm-field gf-boost" hidden>Durée (heures)<input id="gf-h" class="bet-input" type="number" min="0.25" max="720" step="0.25" value="24"></label>
      <label class="adm-field gf-spin" hidden>Nombre de tours<input id="gf-n" class="bet-input" type="number" min="1" max="50" step="1" value="3"></label>
      <label class="adm-field">Message (affiché au joueur)<input id="gf-msg" class="bet-input" type="text" maxlength="120" placeholder="ex : désolé pour le bug de la ferme !"></label>
      <p class="muted" id="gf-prev"></p>`,
      buttons: [{ label: 'Annuler', value: false }, { label: one ? 'Envoyer' : `Envoyer à ${list.length} joueurs`, value: 'ok', primary: true }],
      onOpen: (m) => {
        box = m;
        const sync = () => {
          const k = m.querySelector('#gf-kind').value;
          m.querySelectorAll('.gf-br').forEach((x) => (x.hidden = k !== 'br'));
          m.querySelectorAll('.gf-boost').forEach((x) => (x.hidden = !['farm', 'all', 'chal', 'sell'].includes(k)));
          m.querySelectorAll('.gf-spin').forEach((x) => (x.hidden = k !== 'spin'));
          m.querySelector('#gf-prev').textContent = 'Aperçu : ' + giftLabel(read(m));
        };
        m.querySelectorAll('select,input').forEach((x) => (x.oninput = x.onchange = sync));
        sync();
      } });
    if (res !== 'ok' || !box) return;
    const g = read(box);
    if ((g.kind === 'br' && !(g.amount > 0)) || (['farm', 'all', 'chal', 'sell'].includes(g.kind) && !(g.m > 1 && g.h > 0)) || (g.kind === 'spin' && !(g.n > 0))) { toast('Cadeau incomplet', 'error'); return; }
    let ok = 0;
    for (const p of list) {
      const item = { ...g, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), at: Date.now() };
      try { await backend.adminUpdateUser(p.uid, { gifts: [...(Array.isArray(p.gifts) ? p.gifts : []), item].slice(-20) }, p.adminRev || 0); ok++; }
      catch (e) { toast(`${p.pseudo} : refusé (${e.code || e.message || e})`, 'error'); }
    }
    backend.addLog({ uid: wallet.uid, pseudo: wallet.pseudo, game: '_admin', flag: 'ok', amount: 0, at: Date.now(), reason: `Cadeau (${giftLabel(g)}) à ${ok} joueur${ok > 1 ? 's' : ''}${g.msg ? ` : ${g.msg}` : ''}`.slice(0, 200), info: one ? list[0].uid : 'tous' }).catch(() => {});
    toast(`Cadeau envoyé à ${ok} joueur${ok > 1 ? 's' : ''} : ${giftLabel(g)}`, 'win');
    await loadPlayers(true);
  }
  function read(m) {
    const v = (id) => m.querySelector(id).value;
    const kind = v('#gf-kind'), msg = String(v('#gf-msg') || '').slice(0, 120);
    if (kind === 'br') return { kind, amount: Math.max(0, Math.floor(+v('#gf-amount') || 0)), msg };
    if (kind === 'spin') return { kind, n: Math.max(0, Math.min(50, Math.floor(+v('#gf-n') || 0))), msg };
    return { kind, m: Math.max(1, Math.min(5, Math.round((+String(v('#gf-m')).replace(',', '.') || 0) * 100) / 100)), h: Math.max(0, Math.min(720, +String(v('#gf-h')).replace(',', '.') || 0)), msg };
  }
  async function ban(p) {
    if (p.banned) { await apply(p, { banned: false, banReason: '' }, `${p.pseudo} est réactivé`); return; }
    let box = null;
    const res = await modal({ title: `Suspendre ${esc(p.pseudo)} ?`, html: `<p class="muted">Le joueur ne pourra plus jouer ni sauvegarder. Tu pourras le réactiver ici.</p>
      <label class="adm-field">Raison (affichée au joueur)<input id="adm-reason" class="bet-input" type="text" maxlength="120" placeholder="ex : solde modifié à la main"></label>`,
      buttons: [{ label: 'Annuler', value: false }, { label: 'Suspendre', value: 'ok', primary: true }], onOpen: (m) => { box = m; } });
    if (res !== 'ok' || !box) return;
    await apply(p, { banned: true, banReason: String(box.querySelector('#adm-reason').value || '').slice(0, 120) }, `${p.pseudo} est suspendu`);
  }
  async function apply(p, data, msg) {
    try {
      await backend.adminUpdateUser(p.uid, data, p.adminRev || 0);
      backend.addLog({ uid: wallet.uid, pseudo: wallet.pseudo, game: '_admin', flag: 'ok', amount: 0, at: Date.now(), reason: `${msg} : ${JSON.stringify(data).slice(0, 150)}`, info: p.uid }).catch(() => {});
      toast(msg, 'win');
      await loadPlayers(true);
    } catch (e) { toast('Modification refusée : ' + (e.code || e.message || e) + '. Règles Firestore publiées ?', 'error'); }
  }

  async function load(reset) {
    if (loading) return;
    loading = true;
    if (reset) { logs = []; done = false; cursor = 0; }
    try {
      // 1 lecture par document ; depuis la V22 un document regroupe jusqu'à 60 parties
      const got = await backend.fetchLogs({ before: cursor, n: 40 });
      if (!alive) return;
      logs = logs.concat(got.rows).sort((a, b) => (b.at || 0) - (a.at || 0));
      cursor = got.cursor; done = got.done;
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
      const p = per.get(l.uid) || { pseudo: l.pseudo, n: 0, gain: 0, cheat: 0, fast: 0, fines: 0, best: {}, times: {} };
      if (l.flag === 'ok' && l.game && l.game[0] !== '_') (p.times[l.game] = p.times[l.game] || []).push(l.at);
      p.n++; p.gain += l.amount || 0; if (l.flag === 'cheat') p.cheat++; if (l.flag === 'fast') p.fast++; p.fines += l.fine || 0;
      if (l.sec != null && l.flag === 'ok') { const k = l.game + (l.lv != null ? ':' + l.lv : ''); if (p.best[k] == null || l.sec < p.best[k]) p.best[k] = l.sec; }
      per.set(l.uid, p);
    }
    // rafale : nombre maximal de parties d'un même jeu terminées en 60 secondes (un humain en finit rarement plus de 2 ou 3)
    for (const p of per.values()) {
      p.burst = 0; p.burstGame = '';
      for (const [g, ts] of Object.entries(p.times)) { ts.sort((a, b) => a - b); let j = 0; for (let i = 0; i < ts.length; i++) { while (ts[i] - ts[j] > 60000) j++; if (i - j + 1 > p.burst) { p.burst = i - j + 1; p.burstGame = g; } } }
    }
    const perRows = [...per.entries()].sort((a, b) => (b[1].cheat + b[1].fast + (b[1].burst >= 5)) - (a[1].cheat + a[1].fast + (a[1].burst >= 5)) || b[1].gain - a[1].gain);
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
      <div class="tbl-scroll"><table class="tbl adm-tbl"><thead><tr><th>Joueur</th><th class="r">Parties</th><th class="r">Gains</th><th class="r">Triches</th><th class="r">Trop rapides</th><th class="r">Amendes</th><th class="r" title="Parties d'un même jeu terminées en 60 s, au maximum">Rafale / min</th><th>Meilleurs temps</th></tr></thead><tbody>
        ${perRows.map(([u, p]) => `<tr class="${p.cheat ? 'cheat' : p.fast ? 'fast' : ''}" data-who="${esc(u)}"><td><b>${esc(p.pseudo)}</b></td><td class="r">${p.n}</td><td class="r">${fmt(p.gain)}</td><td class="r">${p.cheat || '—'}</td><td class="r">${p.fast || '—'}</td><td class="r">${p.fines ? fmt(p.fines) : '—'}</td><td class="r ${p.burst >= 5 ? 'neg' : ''}" title="${NAMES[p.burstGame] || p.burstGame}">${p.burst || '—'}${p.burst >= 5 ? ` <small>${NAMES[p.burstGame] || p.burstGame}</small>` : ''}</td><td class="adm-best">${bestTxt(p.best)}</td></tr>`).join('') || '<tr><td colspan="8" class="muted">Rien sur la période.</td></tr>'}
      </tbody></table></div>
      <h3>Parties <small class="muted">(${rows.length} affichées sur ${logs.length} chargées)</small></h3>
      <div class="tbl-scroll"><table class="tbl adm-tbl"><thead><tr><th>Quand</th><th>Joueur</th><th>Jeu</th><th class="r">Durée</th><th class="r">Actions</th><th class="r">Gain</th><th>Statut</th><th>Détails</th></tr></thead><tbody>
        ${rows.slice(0, 500).map((l) => { const [fl, cls] = FLAG[l.flag] || FLAG.ok; return `<tr class="${cls}"><td>${when(l.at)}</td><td>${esc(l.pseudo || '?')}</td><td>${NAMES[l.game] || esc(l.game)}${l.lv != null ? ` <small>${LV[l.lv] || LVK[l.lv] || l.lv}</small>` : ''}</td>
          <td class="r">${dur(l.sec)}</td><td class="r">${l.actions ?? '—'}${l.ms ? ` <small title="temps de réponse médian">${l.ms} ms</small>` : ''}${l.fastShare ? ` <small title="part des actions à moins de 60 ms">${Math.round(l.fastShare * 100)} %</small>` : ''}</td><td class="r">${l.amount ? '+' + fmt(l.amount) : l.fine ? `<span class="neg">−${fmt(l.fine)}</span>` : '0'}</td>
          <td><span class="adm-flag ${cls}">${fl}</span></td><td class="adm-det">${esc(l.reason || '')}${l.strikes ? ` · récidive ${l.strikes}` : ''}${l.info && l.info !== '{}' ? `<small>${esc(l.info)}</small>` : ''}</td></tr>`; }).join('') || '<tr><td colspan="8" class="muted">Aucune partie.</td></tr>'}
      </tbody></table></div>
      ${done ? '<p class="muted adm-end">Tout le journal est chargé.</p>' : '<button class="btn btn-ghost wide" id="adm-more">Charger les parties précédentes</button>'}`;
    $$('[data-f]', body).forEach((s) => (s.onchange = () => { f[s.dataset.f] = s.dataset.f === 'since' ? +s.value : s.value; render(); }));
    $$('tr[data-who]', body).forEach((tr) => (tr.onclick = () => { f.who = tr.dataset.who; render(); }));
    const more = $('#adm-more', body); if (more) more.onclick = () => load(false);
  }
  return () => { alive = false; };
}
