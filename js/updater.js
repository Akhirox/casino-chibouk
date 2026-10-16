// Mises à jour du site : détecte qu'une nouvelle version a été publiée pendant qu'on joue,
// prévient le joueur, puis recharge proprement (sauvegarde d'abord, et fichiers re-téléchargés pour ne
// pas mélanger l'ancienne et la nouvelle version à cause du cache du navigateur).
//
// La version publiée est lue dans js/changelog.js (constante VERSION) : rien d'autre à mettre à jour
// quand on pousse une version, il suffit de changer VERSION comme d'habitude.

const CHECK_EVERY = 3 * 60 * 1000; // toutes les 3 minutes (et à chaque retour sur l'onglet)

export function initUpdater({ current, beforeReload }) {
  let latest = null, timer = null, applying = false, bar = null, lastCheck = 0;

  async function check() {
    if (latest || applying) return;
    lastCheck = Date.now();
    try {
      // paramètre unique : on passe à travers le cache du navigateur et celui de GitHub Pages
      const r = await fetch(`js/changelog.js?check=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) return;
      const m = (await r.text()).match(/export const VERSION\s*=\s*['"]([^'"]+)['"]/);
      if (m && m[1] && m[1] !== String(current)) found(m[1]);
    } catch { /* hors ligne : on réessaiera */ }
  }

  function found(v) {
    latest = v;
    clearInterval(timer);
    bar = document.createElement('div');
    bar.className = 'upd-bar';
    bar.setAttribute('role', 'status');
    bar.innerHTML = `<span class="upd-dot"></span><span class="upd-txt"><b>Nouvelle version V${v} disponible.</b> Elle s'installera toute seule au prochain changement de page.</span>
      <button type="button" class="btn btn-gold btn-sm upd-go">Mettre à jour</button>`;
    document.body.append(bar);
    requestAnimationFrame(() => bar.classList.add('on'));
    bar.querySelector('.upd-go').onclick = () => apply();
  }

  // Recharge : sauvegarde de la partie, fichiers du site re-téléchargés, puis rechargement de la page
  async function apply() {
    if (applying) return;
    applying = true;
    if (bar) { bar.querySelector('.upd-txt').innerHTML = '<b>Mise à jour du casino…</b> Sauvegarde de ta partie.'; bar.querySelector('.upd-go').disabled = true; }
    const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);
    try { await withTimeout(Promise.resolve(beforeReload && beforeReload()), 6000); } catch (e) { console.error(e); }
    try {
      const here = location.origin;
      const urls = new Set([location.pathname || '/']);
      for (const e of performance.getEntriesByType('resource')) {
        const u = new URL(e.name, location.href);
        if (u.origin === here && /\.(js|css|json|svg)$/.test(u.pathname) && !u.search) urls.add(u.pathname);
      }
      await withTimeout(Promise.allSettled([...urls].map((u) => fetch(u, { cache: 'reload' }))), 6000);
    } catch (e) { console.error(e); }
    location.reload();
  }

  timer = setInterval(check, CHECK_EVERY);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - lastCheck > 30000) check(); });
  window.addEventListener('online', check);
  setTimeout(check, 20000);

  return {
    get pending() { return !!latest && !applying; },
    apply,
    check,
  };
}
