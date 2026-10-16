// Écriture locale (localStorage) regroupée : au lieu d'écrire à chaque partie (jusqu'à des dizaines de fois par seconde
// en mode turbo), on écrit au plus toutes les `ms` millisecondes, et tout de suite si l'onglet se cache ou se ferme.
export function lazySave(write, ms = 400) {
  let t = null;
  const run = () => { clearTimeout(t); t = null; try { write(); } catch {} };
  const flushPending = () => { if (t) run(); };
  window.addEventListener('pagehide', flushPending);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushPending(); });
  return { save() { if (!t) t = setTimeout(run, ms); }, now: run, flush: flushPending };
}
