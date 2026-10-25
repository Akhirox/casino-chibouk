// Chat de la jungle. V37 : en temps réel avec Firebase (les autres voient ton message tout de suite), au plus
// 1 message toutes les 3 s. Sans temps réel (mode démo), 1 message par synchro (CONFIG.SYNC_INTERVAL_MS).
// Si tu écris plus vite, ton message attend son tour (un seul en attente).
import { CONFIG } from './config.js';

export const CHAT_MAX = 200;

export function createChat(wallet, social) {
  let pending = null, lastSent = 0, timer = null;
  try { lastSent = +localStorage.getItem('chibouk_chat_last_' + wallet.uid) || 0; } catch {}
  const subs = new Set();
  const notify = () => subs.forEach((cb) => { try { cb(); } catch (e) { console.error(e); } });
  const gap = () => (social && social.live ? 3000 : CONFIG.SYNC_INTERVAL_MS);
  const waitMs = () => Math.max(0, lastSent + gap() - Date.now());

  async function sendNow(text) {
    lastSent = Date.now();
    try { localStorage.setItem('chibouk_chat_last_' + wallet.uid, String(lastSent)); } catch {}
    try { await social.say(text); } catch (e) { console.warn('Chat : envoi impossible', e); pending = pending || text; schedule(); }
    notify();
  }
  function schedule() {
    clearTimeout(timer);
    if (!pending) return;
    timer = setTimeout(() => { const t = pending; pending = null; sendNow(t); }, waitMs() + 50);
  }

  return {
    // Renvoie 'sent', 'queued' (partira à la prochaine synchro) ou un message d'erreur
    send(raw) {
      const text = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX);
      if (!text) return 'Message vide';
      if (!social) return 'Chat indisponible';
      if (pending) return 'Un message attend déjà la prochaine synchro';
      if (waitMs() > 0) { pending = text; schedule(); notify(); return 'queued'; }
      sendNow(text);
      return 'sent';
    },
    get pending() { return pending; },
    get waitMs() { return waitMs(); },
    get live() { return !!(social && social.live); },
    cancel() { pending = null; clearTimeout(timer); notify(); },
    subscribe(cb) { subs.add(cb); return () => subs.delete(cb); },
    destroy() { clearTimeout(timer); subs.clear(); },
  };
}
