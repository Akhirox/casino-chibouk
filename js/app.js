// Point d'entrée : authentification, coque du site, routeur, lobby, bonus quotidien
import { CONFIG } from './config.js';
import { createBackend } from './backend.js';
import { Wallet, msUntilParisMidnight } from './wallet.js';
import { h, $, $$, fmt, money, esc, toast, modal, coinRain, CUR } from './ui.js';
import { monkeySVG, goldMonkeySVG, hangingMonkeySVG, coinSVG, symbolSVG } from './art.js';
import { sfx } from './sfx.js';
import * as Slots from './games/slots.js';
import * as Blackjack from './games/blackjack.js';
import * as Roulette from './games/roulette.js';
import * as Breaker from './games/breaker.js';
import * as Stats from './stats.js';

const app = $('#app');
let backend = null;
let wallet = null;
let cleanupView = null;
let signupPromise = null;
let authToken = 0;
let headerTimer = null;

const ROUTES = {
  lobby: { label: 'Accueil', icon: '🏠', mount: mountLobby },
  slots: { label: 'Machine à sous', icon: '🎰', mount: Slots.mount },
  blackjack: { label: 'Blackjack', icon: '🃏', mount: Blackjack.mount },
  roulette: { label: 'Roulette', icon: '🎡', mount: Roulette.mount },
  breaker: { label: 'Casse-briques', icon: '🧱', mount: Breaker.mount },
  stats: { label: 'Stats', icon: '📊', mount: Stats.mount },
};

/* ============================== DÉMARRAGE ============================== */
async function boot() {
  try {
    backend = await createBackend();
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="fatal">${monkeySVG({ wink: true })}<h2>Impossible de charger Firebase</h2><p>${esc(e.message)}</p><p>Vérifie ta connexion et le fichier <code>js/firebase-config.js</code>.</p></div>`;
    return;
  }
  document.body.addEventListener('pointerdown', () => sfx.unlock(), { once: true });
  setupTabGuard();
  backend.onAuth(async (user) => {
    const token = ++authToken;
    if (wallet) { await wallet.stop(); wallet = null; }
    if (!user) { renderAuth(); return; }
    let hint = user.pseudo;
    if (signupPromise) { try { hint = (await signupPromise).pseudo; } catch { /* inscription échouée */ } }
    if (token !== authToken) return;
    app.innerHTML = `<div class="boot">${monkeySVG({ cls: 'bounce' })}<p>Ouverture du coffre…</p></div>`;
    try {
      const w = await Wallet.open(backend, { ...user, pseudo: hint });
      if (token !== authToken) { w.stop(); return; }
      wallet = w;
      renderShell();
      route();
    } catch (e) {
      console.error(e);
      app.innerHTML = `<div class="fatal">${monkeySVG({})}<h2>Erreur de chargement du profil</h2><p>${esc(e.message)}</p><p>As-tu bien publié les règles Firestore ? (voir README)</p><button class="btn btn-gold" id="retry">Réessayer</button> <button class="btn btn-ghost" id="out">Se déconnecter</button></div>`;
      $('#retry').onclick = () => location.reload();
      $('#out').onclick = () => backend.signOut();
    }
  });
}

/* ============================ ANTI MULTI-ONGLET ============================ */
function setupTabGuard() {
  if (!('BroadcastChannel' in window)) return;
  const id = Math.random().toString(36).slice(2);
  const ch = new BroadcastChannel('chibouk-tabs');
  ch.onmessage = async (e) => {
    if (e.data && e.data.type === 'hello' && e.data.id !== id && wallet) {
      await wallet.flush();
      wallet.disabled = true;
      $$('.modal-backdrop').forEach((m) => m.remove());
      const ov = h(`<div class="tab-guard">${monkeySVG({ wink: true })}<h2>Le casino est ouvert dans un autre onglet</h2>
        <p>Pour éviter que tes soldes se marchent dessus, un seul onglet peut jouer à la fois.</p>
        <button class="btn btn-gold">Jouer dans cet onglet</button></div>`);
      ov.querySelector('button').onclick = () => location.reload();
      document.body.append(ov);
    }
  };
  ch.postMessage({ type: 'hello', id });
}

/* ================================ AUTH ================================ */
function renderAuth() {
  if (cleanupView) { cleanupView(); cleanupView = null; }
  clearInterval(headerTimer);
  let mode = 'login';
  app.innerHTML = '';
  const v = h(`<div class="auth-wrap">
    ${backend.mode === 'demo' ? `<div class="demo-banner">Mode démo local : Firebase n'est pas encore configuré, les comptes sont enregistrés dans ce navigateur uniquement.</div>` : ''}
    <div class="auth-card">
      <div class="auth-logo">${goldMonkeySVG('auth-monkey')}</div>
      <h1 class="logo-text">Casino <span>Chibouk</span></h1>
      <p class="auth-sub">Le casino le plus singe de la jungle. ${fmt(CONFIG.DAILY_BONUS)} ${CUR} offerts chaque jour.</p>
      <div class="tabs"><button class="tab active" data-m="login">Connexion</button><button class="tab" data-m="signup">Créer un compte</button></div>
      <form class="auth-form" autocomplete="on">
        <label>Pseudo<input name="pseudo" required minlength="3" maxlength="16" autocomplete="username" placeholder="ex : KingKong_42"></label>
        <label>Mot de passe<input name="password" type="password" required minlength="6" autocomplete="current-password" placeholder="6 caractères minimum"></label>
        <label class="only-signup">Confirmer le mot de passe<input name="confirm" type="password" minlength="6" autocomplete="new-password"></label>
        <p class="form-error" role="alert"></p>
        <button class="btn btn-gold btn-lg" type="submit">Entrer dans la jungle</button>
      </form>
      <p class="fineprint">Argent 100 % fictif, juste pour s'amuser entre potes. 🐒</p>
    </div></div>`);
  app.append(v);
  const form = $('form', v), err = $('.form-error', v), submit = $('button[type=submit]', v);
  const setMode = (m) => {
    mode = m;
    $$('.tab', v).forEach((t) => t.classList.toggle('active', t.dataset.m === m));
    v.classList.toggle('signup', m === 'signup');
    form.confirm.required = m === 'signup';
    form.password.autocomplete = m === 'signup' ? 'new-password' : 'current-password';
    submit.textContent = m === 'signup' ? `Créer mon compte (+${fmt(CONFIG.START_BALANCE)} ${CUR})` : 'Entrer dans la jungle';
    err.textContent = '';
  };
  $$('.tab', v).forEach((t) => (t.onclick = () => setMode(t.dataset.m)));
  form.onsubmit = async (e) => {
    e.preventDefault();
    err.textContent = '';
    const pseudo = form.pseudo.value.trim(), pw = form.password.value;
    if (mode === 'signup' && pw !== form.confirm.value) { err.textContent = 'Les mots de passe ne correspondent pas'; return; }
    submit.disabled = true;
    try {
      if (mode === 'signup') { signupPromise = backend.signUp(pseudo, pw); await signupPromise; }
      else await backend.signIn(pseudo, pw);
    } catch (ex) {
      err.textContent = ex.message;
      submit.disabled = false;
    } finally { signupPromise = null; }
  };
}

/* ================================ COQUE ================================ */
function renderShell() {
  app.innerHTML = '';
  const shell = h(`<div class="shell">
    ${backend.mode === 'demo' ? `<div class="demo-banner slim">Mode démo local (Firebase non configuré)</div>` : ''}
    <header class="topbar">
      <a class="brand" href="#/lobby">${monkeySVG({ cls: 'brand-monkey' })}<span class="logo-text">Casino <span>Chibouk</span></span></a>
      <nav class="nav">${Object.entries(ROUTES).map(([k, r]) => `<a href="#/${k}" data-r="${k}"><span class="ni">${r.icon}</span><span class="nl">${r.label}</span></a>`).join('')}</nav>
      <div class="top-right">
        <button class="daily-btn" title="Bonus quotidien"></button>
        <div class="balance-pill" title="Ton solde">${coinSVG('coin')}<span class="bal-amount">${fmt(wallet.balance)}</span></div>
        <span class="sync-dot saved" title="Sauvegardé"></span>
        <button class="icon-btn mute-btn" title="Son">${sfx.muted ? '🔇' : '🔊'}</button>
        <div class="user-menu"><button class="user-btn">${esc(wallet.pseudo)} ▾</button>
          <div class="user-drop"><a href="#/stats">Mes stats</a><button class="logout">Se déconnecter</button></div></div>
      </div>
    </header>
    <main id="view"></main>
    <footer class="foot">Casino Chibouk · argent fictif, aucune mise réelle · sauvegarde automatique toutes les ${CONFIG.SYNC_INTERVAL_MS / 1000} s</footer>
  </div>`);
  app.append(shell);

  const balEl = $('.bal-amount', shell), pill = $('.balance-pill', shell);
  let shown = wallet.balance;
  wallet.on((evt) => {
    const nb = wallet.balance;
    if (nb !== shown) {
      pill.classList.remove('up', 'down'); void pill.offsetWidth;
      pill.classList.add(nb > shown ? 'up' : 'down');
      shown = nb;
    }
    balEl.textContent = fmt(nb);
    updateDaily();
  });
  const dot = $('.sync-dot', shell);
  const syncTitles = { saved: 'Sauvegardé', pending: 'Modifications en attente (envoi auto)', saving: 'Sauvegarde…', error: 'Échec de sauvegarde, nouvel essai bientôt' };
  wallet.onSync((s) => { dot.className = 'sync-dot ' + s; dot.title = syncTitles[s] || s; });

  $('.mute-btn', shell).onclick = (e) => { const m = sfx.toggle(); e.currentTarget.textContent = m ? '🔇' : '🔊'; };
  const um = $('.user-menu', shell);
  $('.user-btn', shell).onclick = (e) => { e.stopPropagation(); um.classList.toggle('open'); };
  document.addEventListener('click', () => um.classList.remove('open'));
  $('.logout', shell).onclick = async () => { await wallet.flush(); await backend.signOut(); location.hash = '#/lobby'; };

  const daily = $('.daily-btn', shell);
  daily.onclick = claimDaily;
  function updateDaily() {
    if (wallet.dailyAvailable()) { daily.classList.add('ready'); daily.innerHTML = `🎁 <span>+${fmt(CONFIG.DAILY_BONUS)}</span>`; }
    else { daily.classList.remove('ready'); daily.innerHTML = `⏳ <span>${countdown()}</span>`; }
    const lobbyDaily = $('#lobby-daily');
    if (lobbyDaily) renderLobbyDaily(lobbyDaily);
  }
  clearInterval(headerTimer);
  headerTimer = setInterval(updateDaily, 1000);
  updateDaily();

  window.onhashchange = route;
}

function countdown() {
  const s = Math.floor(msUntilParisMidnight() / 1000);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

async function claimDaily() {
  if (!wallet.dailyAvailable()) { toast(`Bonus déjà récupéré aujourd'hui. Reviens dans ${countdown()} 🐒`); return; }
  const ok = await wallet.claimDaily();
  if (ok) { sfx.coin(); sfx.win(true); coinRain(40); toast(`+${fmt(CONFIG.DAILY_BONUS)} ${CUR} ! Bonne chance 🍌`, 'win'); }
}

/* ================================ ROUTEUR ================================ */
function route() {
  if (!wallet) return;
  const key = (location.hash.replace(/^#\/?/, '') || 'lobby').split('?')[0];
  const r = ROUTES[key] || ROUTES.lobby;
  const view = $('#view');
  if (!view) return;
  if (cleanupView) { try { cleanupView(); } catch (e) { console.error(e); } cleanupView = null; }
  view.innerHTML = '';
  view.className = 'view view-' + (ROUTES[key] ? key : 'lobby');
  $$('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.r === (ROUTES[key] ? key : 'lobby')));
  window.scrollTo(0, 0);
  const ctx = { wallet, backend, navigate: (k) => (location.hash = '#/' + k) };
  cleanupView = r.mount(view, ctx) || null;
}

/* ================================ LOBBY ================================ */
function renderLobbyDaily(box) {
  if (wallet.dailyAvailable()) {
    if (box.dataset.state !== 'ready') {
      box.dataset.state = 'ready';
      box.innerHTML = `<div class="daily-icon">🎁</div><div><h3>Ton bonus quotidien est prêt !</h3><p>${fmt(CONFIG.DAILY_BONUS)} ${CUR} offerts, une fois par jour.</p></div><button class="btn btn-gold btn-lg pulse">Récupérer +${fmt(CONFIG.DAILY_BONUS)}</button>`;
      $('button', box).onclick = claimDaily;
    }
  } else {
    box.dataset.state = 'wait';
    box.innerHTML = `<div class="daily-icon">⏳</div><div><h3>Bonus récupéré ✔</h3><p>Prochain bonus dans <b class="mono">${countdown()}</b> (minuit, heure de Paris)</p></div>`;
  }
}

function mountLobby(view, { wallet: w }) {
  const s = w.stats;
  const broke = w.balance < CONFIG.BREAKER_UNLOCK_BELOW;
  view.innerHTML = `
    <section class="hero">
      <div class="hero-text">
        <h1>Salut <span class="gold">${esc(w.pseudo)}</span> !</h1>
        <p>Bienvenue au <b>Casino Chibouk</b>, le seul casino tenu par des singes. Mise tes ${CUR}, gagne, perds, recommence.</p>
        <div class="hero-bal">Ton solde : ${money(w.balance)}</div>
      </div>
      ${hangingMonkeySVG()}
    </section>
    <section id="lobby-daily" class="daily-card"></section>
    <section class="games-grid">
      <a class="game-card gc-slots" href="#/slots">
        <div class="gc-art"><div class="mini-reels">${['S', 'W', 'S'].map((x) => `<div>${symbolSVG(x)}</div>`).join('')}</div></div>
        <div class="gc-body"><h3>Jungle Chibouk</h3><p>Machine à sous 5×3, 21 lignes. 3 WILD = tours gratuits ×2. RTP ~102 % 🔥</p></div>
      </a>
      <a class="game-card gc-bj" href="#/blackjack">
        <div class="gc-art"><div class="mini-cards"><div class="mc mc1">A<span>♠</span></div><div class="mc mc2 red">K<span>♥</span></div></div></div>
        <div class="gc-body"><h3>Blackjack du Singe</h3><p>Blackjack classique 6 jeux, paie 3:2. Doubler, séparer, en 3D.</p></div>
      </a>
      <a class="game-card gc-roulette" href="#/roulette">
        <div class="gc-art"><div class="mini-wheel"></div></div>
        <div class="gc-body"><h3>Roulette Banane</h3><p>Roulette européenne à un zéro, roue animée.</p></div>
      </a>
      <a class="game-card gc-breaker ${broke ? '' : 'locked'}" href="#/breaker">
        <div class="gc-art"><div class="mini-bricks">${Array.from({ length: 15 }, (_, i) => `<i style="--h:${(i * 37) % 360}"></i>`).join('')}</div></div>
        <div class="gc-body"><h3>Casse-briques de la dèche ${broke ? '' : '🔒'}</h3><p>${broke ? `Tu es à sec ? Casse toutes les briques d'un niveau et gagne ${CONFIG.BREAKER_REWARD} ${CUR} !` : `Se débloque quand ton solde passe sous ${CONFIG.BREAKER_UNLOCK_BELOW} ${CUR}.`}</p></div>
      </a>
    </section>
    <section class="mini-stats">
      <div><span>Total misé</span><b>${money(s.totalWagered)}</b></div>
      <div><span>Total gagné</span><b>${money(s.totalWon)}</b></div>
      <div><span>Bilan</span><b class="${s.totalWon - s.totalWagered >= 0 ? 'pos' : 'neg'}">${s.totalWon - s.totalWagered >= 0 ? '+' : ''}${fmt(s.totalWon - s.totalWagered)}</b></div>
      <div><span>Plus gros gain</span><b>${money(s.biggestWin)}</b></div>
      <a class="btn btn-ghost" href="#/stats">Stats & classement →</a>
    </section>`;
  renderLobbyDaily($('#lobby-daily', view));
  const off = w.on(() => { const hb = $('.hero-bal', view); if (hb) hb.innerHTML = `Ton solde : ${money(w.balance)}`; });
  return () => off();
}

boot();
