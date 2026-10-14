// Classement de la semaine (bénéfice aux jeux de casino, du lundi au dimanche) + palmarès permanent
import { weekId, prevWeekId } from './wallet.js';
import { getPlayers } from './players.js';
import { setWeeks } from './profile.js';

let weeks = [], loaded = 0, loadedFor = null;
export const getWeeks = () => weeks;

// Chiffres d'un joueur pour la semaine W (semaine en cours ou précédente, selon ce qui est enregistré)
export function weekData(p, W) {
  if (p.week && p.week.id === W) return p.week;
  if (p.lastWeek && p.lastWeek.id === W) return p.lastWeek;
  return null;
}
export function weeklyRows(players, W = weekId()) {
  return players.map((p) => {
    const d = weekData(p, W);
    return d && d.wagered > 0 ? { uid: p.uid, pseudo: p.pseudo, avatar: p.avatar, shop: p.shop, profit: (d.won || 0) - d.wagered, wagered: d.wagered } : null;
  }).filter(Boolean).sort((a, b) => b.profit - a.profit || b.wagered - a.wagered);
}

// Au premier passage après la fin d'une semaine, un joueur enregistre le vainqueur (une seule fois, garanti par Firestore)
export async function syncWeeks(backend, wallet, force = false) {
  const done = () => {
    setWeeks(weeks);
    wallet.weekWins = weeks.filter((w) => w.winnerUid === wallet.uid).length;
    wallet.emit({ type: 'weeks' }); // pour le succès « vainqueur de la semaine »
  };
  if (!force && loadedFor === wallet.uid && Date.now() - loaded < 10 * 60000) { done(); return weeks; }
  try {
    weeks = await backend.listWeeks();
    loaded = Date.now();
    const W = prevWeekId();
    if (!weeks.some((w) => w.id === W)) {
      const rows = weeklyRows(await getPlayers(backend, wallet, true), W);
      if (rows.length) {
        const top = rows.slice(0, 3).map((r) => ({ uid: r.uid, pseudo: r.pseudo, profit: Math.round(r.profit) }));
        const doc = { winnerUid: top[0].uid, winnerPseudo: top[0].pseudo, profit: top[0].profit, top, players: rows.length, at: Date.now() };
        if (await backend.createWeek(W, doc)) {
          weeks = [...weeks, { id: W, ...doc }];
          window.dispatchEvent(new CustomEvent('chibouk:feed', { detail: { type: 'week', winner: doc.winnerPseudo, profit: doc.profit } }));
        } else weeks = await backend.listWeeks();
      }
    }
    weeks.sort((a, b) => (a.id < b.id ? 1 : -1));
    loadedFor = wallet.uid;
    done();
  } catch (e) { console.warn('Palmarès indisponible', e); }
  return weeks;
}
