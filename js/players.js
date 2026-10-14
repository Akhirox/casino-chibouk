// Liste des joueurs, lue avec parcimonie (cache partagé) : classement, meilleures wins, destinataires des transferts
import { CONFIG } from './config.js';

let cache = { ts: 0, rows: null, pending: null };

export function playersFresh() { return cache.rows && Date.now() - cache.ts < CONFIG.LEADERBOARD_CACHE_MS; }

export async function getPlayers(backend, wallet, force = false) {
  if (!force && playersFresh()) return withMe(cache.rows, wallet);
  if (cache.pending) return withMe(await cache.pending, wallet);
  cache.pending = (async () => {
    await wallet.flush();
    const rows = await backend.listPlayers(200);
    cache = { ts: Date.now(), rows, pending: null };
    return rows;
  })();
  try { return withMe(await cache.pending, wallet); } finally { cache.pending = null; }
}

// Remplace ses propres données par l'état local (toujours à jour)
function withMe(rows, wallet) {
  return rows.map((r) => (r.uid === wallet.uid ? { ...r, balance: wallet.balance, stats: wallet.stats, pseudo: wallet.pseudo, ach: wallet.p.ach, avatar: wallet.p.avatar || '', bio: wallet.p.bio || '' } : r));
}
