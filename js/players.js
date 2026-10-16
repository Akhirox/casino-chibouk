// Liste des joueurs, lue avec parcimonie : classement, meilleures wins, fermes des voisins, destinataires des transferts.
//
// Économie de lectures (chaque profil lu = 1 lecture Firestore) :
//  - la liste est gardée dans le navigateur (localStorage) : recharger la page ne relit rien ;
//  - au bout de LEADERBOARD_CACHE_MS, on ne relit que les profils modifiés depuis la dernière fois (updatedAt),
//    soit en pratique les quelques joueurs en train de jouer, et 1 seule lecture si personne n'a bougé ;
//  - une relecture complète n'a lieu qu'au plus toutes les PLAYERS_FULL_MS (suspensions, comptes supprimés…).
import { CONFIG } from './config.js';

const LS = 'chibouk_players_v2';
const MARGIN = 3 * 60000; // marge pour les horloges un peu décalées entre joueurs
let cache = { ts: 0, full: 0, cursor: 0, rows: null, owner: null, pending: null };

function loadLocal(uid) {
  try {
    const c = JSON.parse(localStorage.getItem(LS) || 'null');
    if (c && c.owner === uid && Array.isArray(c.rows)) cache = { ...cache, ts: c.ts || 0, full: c.full || 0, cursor: c.cursor || 0, rows: c.rows, owner: uid };
  } catch {}
}
function saveLocal() {
  try { localStorage.setItem(LS, JSON.stringify({ owner: cache.owner, ts: cache.ts, full: cache.full, cursor: cache.cursor, rows: cache.rows })); }
  catch { try { localStorage.removeItem(LS); } catch {} } // trop gros pour le navigateur : on garde seulement en mémoire
}
const cursorOf = (rows) => Math.min(Date.now(), Math.max(0, ...rows.map((r) => (typeof r.updatedAt === 'number' ? r.updatedAt : 0))));

// Déjà à jour ? (bouton « Actualiser » : pas plus d'une relecture par minute)
export function playersFresh(forced = false) { return cache.rows && Date.now() - cache.ts < (forced ? 60000 : CONFIG.LEADERBOARD_CACHE_MS); }

export async function getPlayers(backend, wallet, force = false) {
  if (cache.owner !== wallet.uid) { cache = { ts: 0, full: 0, cursor: 0, rows: null, owner: wallet.uid, pending: null }; loadLocal(wallet.uid); }
  if (!playersFresh(force)) {
    if (!cache.pending) {
      cache.pending = (async () => {
        await wallet.flush();
        const now = Date.now();
        if (!cache.rows || now - cache.full > CONFIG.PLAYERS_FULL_MS || !backend.listPlayersSince) {
          cache.rows = await backend.listPlayers(500);
          cache.full = now;
        } else {
          const changed = await backend.listPlayersSince(cache.cursor - MARGIN);
          if (changed.length) {
            const by = new Map(cache.rows.map((r) => [r.uid, r]));
            changed.forEach((r) => by.set(r.uid, r));
            cache.rows = [...by.values()];
          }
        }
        cache.cursor = cursorOf(cache.rows);
        cache.ts = now;
        saveLocal();
      })().finally(() => { cache.pending = null; });
    }
    try { await cache.pending; } catch (e) { if (!cache.rows) throw e; console.warn('Liste des joueurs : on garde la version en cache', e); }
  }
  // comptes suspendus : hors classements
  return withMe(cache.rows.filter((r) => !r.banned), wallet);
}

// Remplace ses propres données par l'état local (toujours à jour)
function withMe(rows, wallet) {
  return rows.map((r) => (r.uid === wallet.uid ? { ...r, balance: wallet.balance, stats: wallet.stats, pseudo: wallet.pseudo, ach: wallet.p.ach, avatar: wallet.p.avatar || '', bio: wallet.p.bio || '', shop: wallet.p.shop, week: wallet.p.week, lastWeek: wallet.p.lastWeek, farm: wallet.p.farm, vault: wallet.p.vault || 0 } : r));
}
