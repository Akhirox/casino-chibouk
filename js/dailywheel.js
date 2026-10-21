// Roue du bonus quotidien : un tour par jour, gain multiplié par la série de jours consécutifs
import { CONFIG } from './config.js';
import { spinDaily, streakMult, vipOf, xMult } from './progress.js';
import { h, $, fmt, money, toast, coinRain, sleep, CUR } from './ui.js';
import { earnWheel, jpState } from './jp.js';
import { JP_WHEEL_MIN, JP_WHEEL_MAX, JP_WHEEL_STEP, parisDay } from './poker/server.js';
import { icon } from './art.js';
import { sfx } from './sfx.js';
import { wheelInfo, multHTML } from './rewards.js';

const COLORS = ['#2f7a35', '#1f5e8c', '#8c3a1f', '#4a2a7a', '#2a6b5e', '#7a1f2f'];
const xfmt = (m) => '×' + m.toLocaleString('fr-FR', { maximumFractionDigits: 1 });

// Valeurs de la roue des Jetons Poker (50, 60… 200 JP), tirées par le serveur
const JP_VALUES = Array.from({ length: (JP_WHEEL_MAX - JP_WHEEL_MIN) / JP_WHEEL_STEP + 1 }, (_, i) => JP_WHEEL_MIN + i * JP_WHEEL_STEP);
const JP_COLORS = ['#1f4f9e', '#2b6fc4', '#173e7a', '#3a5fb0'];
function wheelSVG(V = CONFIG.DAILY_WHEEL, jp = false) {
  const n = V.length, a = (2 * Math.PI) / n;
  const p = (r, t) => `${(r * Math.cos(t)).toFixed(2)} ${(r * Math.sin(t)).toFixed(2)}`;
  const ring = jp ? '#8fb4ff' : '#f5c542', hub = jp ? '#8fb4ff' : '#f5c542', hubS = jp ? '#2a4f9e' : '#8a5a00';
  return `<svg class="dw-wheel" viewBox="-110 -110 220 220">${V.map((v, i) => {
    const a0 = i * a - Math.PI / 2 - a / 2, a1 = a0 + a, mid = (a0 + a1) / 2;
    const fill = jp ? (v >= 180 ? '#c98a00' : JP_COLORS[i % JP_COLORS.length]) : v >= 2000 ? (v >= 5000 ? '#c98a00' : '#b5651d') : COLORS[i % COLORS.length];
    return `<path d="M0 0 L${p(100, a0)} A100 100 0 0 1 ${p(100, a1)} Z" fill="${fill}" stroke="#0b120e" stroke-width="1.5"/>
      <text transform="translate(${p(72, mid)}) rotate(${(mid * 180) / Math.PI + 90})" text-anchor="middle" dominant-baseline="middle" font-family="Bungee, sans-serif" font-size="${jp ? 10 : v >= 1000 ? 11 : 12}" fill="#fff">${fmt(v)}</text>`;
  }).join('')}<circle r="100" fill="none" stroke="${ring}" stroke-width="4"/><circle r="16" fill="${hub}" stroke="${hubS}" stroke-width="3"/></svg>`;
}
// angle final pour arrêter la roue sur le segment seg (avec un petit décalage au hasard dans le segment)
const stopAngle = (seg, n, turns = 6) => 360 * turns - (seg * 360) / n + (Math.random() - 0.5) * (360 / n) * 0.6;

export const bonusSpins = (wallet) => (wallet.p.loot && wallet.p.loot.spins) || 0;
// bonus : tour de roue en plus gagné dans une caisse (utilisable quand la roue du jour est déjà tournée)
export function openDailyWheel(wallet, onDone, { bonus = false } = {}) {
  if (!bonus && !wallet.dailyAvailable()) { toast('Roue déjà tournée aujourd\'hui. Reviens après minuit !'); return; }
  if (bonus && !bonusSpins(wallet)) return;
  const n = bonus ? Math.max(1, (wallet.p.streak && wallet.p.streak.n) || 1) : wallet.nextStreak(), mult = streakMult(n), wi = wheelInfo();
  const days = Array.from({ length: 7 }, (_, i) => i + 1);
  // roue du jour (pas les tours bonus) : la roue des Jetons Poker tourne en même temps
  const withJP = !bonus;
  const jpDone = withJP && jpState().loaded && jpState().wheelDay === parisDay(Date.now());
  const m = h(`<div class="modal-backdrop"><div class="modal dw-modal ${withJP ? 'dual' : ''}" role="dialog" aria-modal="true">
    <h2 class="modal-title">${bonus ? `Tour de roue bonus <small class="muted">(${bonusSpins(wallet)} disponible${bonusSpins(wallet) > 1 ? 's' : ''})</small>` : 'Roue du jour'}</h2>
    <div class="modal-body">
      <div class="dw-streak"><b>Série : ${n} jour${n > 1 ? 's' : ''}</b> → gain ${xfmt(mult)}
        <div class="dw-days">${days.map((d) => `<i class="${d <= Math.min(n, 7) ? 'on' : ''}">${d}</i>`).join('')}<span>${n > 7 ? `+${n - 7}` : ''}</span></div>
        <small class="muted">+${Math.round(CONFIG.STREAK_STEP * 100)} % par jour consécutif, jusqu'à ${xfmt(CONFIG.STREAK_MAX)}. Un jour raté et la série repart à 1.</small>${wi.mult > 1 ? `<small>Tes bonus (VIP, caisses, titre) : <b class="gold">${multHTML(wi)}</b> <span class="muted">· survole pour le détail</span></small>` : ''}</div>
      <div class="dw-wheels">
        <div class="dw-col"><div class="dw-box"><div class="dw-pointer"></div>${wheelSVG()}</div><small class="dw-cap">${CUR} (avec tes bonus)</small></div>
        ${withJP ? `<div class="dw-col jp ${jpDone ? 'done' : ''}"><div class="dw-box"><div class="dw-pointer"></div>${wheelSVG(JP_VALUES, true).replace('class="dw-wheel"', 'class="dw-wheel dw-jpwheel"')}</div><small class="dw-cap">${icon('jp')}Jetons Poker${jpDone ? ' · déjà reçus aujourd\'hui' : ' · sans bonus'}</small></div>` : ''}
      </div>
      <p class="dw-res" id="dw-res">Tourne la roue pour gagner de ${fmt(Math.min(...CONFIG.DAILY_WHEEL))} à ${fmt(Math.max(...CONFIG.DAILY_WHEEL))} ${CUR}${mult * wi.mult > 1 ? `, multipliés par ${xfmt(Math.round(mult * wi.mult * 100) / 100)}${wi.mult > 1 ? ' (série × bonus)' : ''}` : ''} !</p>
    </div>
    <div class="modal-actions"><button class="btn btn-ghost" data-x>Plus tard</button><button class="btn btn-gold btn-lg" id="dw-spin">Tourner !</button></div>
  </div></div>`);
  document.body.append(m);
  requestAnimationFrame(() => m.classList.add('show'));
  let spinning = false, done = false;
  const close = () => { if (spinning) return; m.classList.remove('show'); setTimeout(() => m.remove(), 250); if (done && onDone) onDone(); };
  m.addEventListener('click', (e) => { if ((e.target === m && !spinning) || e.target.closest('[data-x]')) close(); });

  $('#dw-spin', m).onclick = async () => {
    if (done) { close(); return; }
    if (spinning || (bonus ? !bonusSpins(wallet) : !wallet.dailyAvailable())) return;
    spinning = true;
    $('#dw-spin', m).disabled = true; $('[data-x]', m).disabled = true;
    // Jetons Poker : montant tiré par le serveur avant de lancer les deux roues ensemble (un instant au premier appel)
    let jpWon = 0;
    if (withJP && !jpDone) {
      $('#dw-spin', m).textContent = 'Lancement…';
      jpWon = await Promise.race([earnWheel().catch(() => 0), sleep(8000).then(() => 0)]);
    }
    const r = spinDaily(wallet, bonus);
    // le gain est enregistré tout de suite (fermer la fenêtre ne change rien)
    // … mais annoncé (solde affiché, fil, quêtes…) seulement quand la roue s'arrête
    let saved;
    const reveal = wallet.deferEvents(() => {
      if (bonus) { wallet.p.loot.spins = bonusSpins(wallet) - 1; wallet.credit('wheelbonus', r.amount, { base: r.base, mult: r.mult }); saved = Promise.resolve(true); }
      else saved = wallet.claimDaily(r.amount, { base: r.base, mult: r.mult });
    });
    await saved;
    const wheel = $('.dw-wheel', m);
    wheel.style.transition = 'transform 4.2s cubic-bezier(.12,.75,.2,1)';
    wheel.style.transform = `rotate(${stopAngle(r.seg, CONFIG.DAILY_WHEEL.length)}deg)`;
    const jw = $('.dw-jpwheel', m), jseg = JP_VALUES.indexOf(jpWon);
    if (jw && jseg >= 0) { jw.style.transition = 'transform 4.6s cubic-bezier(.12,.75,.2,1)'; jw.style.transform = `rotate(${-(360 * 5) - (jseg * 360) / JP_VALUES.length + (Math.random() - 0.5) * (360 / JP_VALUES.length) * 0.6}deg)`; } // sens inverse
    sfx.spinStart();
    const ticks = setInterval(() => sfx.tick && sfx.tick(), 140);
    await sleep(jw && jseg >= 0 ? 4700 : 4300);
    clearInterval(ticks);
    reveal();
    spinning = false; done = true;
    $('#dw-res', m).innerHTML = `<b>${fmt(r.base)}</b>${r.mult > 1 ? ` ${xfmt(r.mult)} (série de ${r.streak} jours)` : ''}${r.vip > 1 ? ` ${xMult(r.vip)} (VIP et bonus)` : ''}${r.cos ? ` +${Math.round(r.cos * 100)} % (titre, coffres)` : ''} = <span class="big">+${money(r.amount)}</span>${jpWon ? `<span class="dw-jp">${icon('jp')}+${fmt(jpWon)} JP <small>pour le poker</small></span>` : withJP && !jpDone ? '<span class="dw-jp muted"><small>Jetons Poker indisponibles pour l\'instant : récupère-les plus tard depuis le salon du poker.</small></span>' : ''}`;
    const btn = $('#dw-spin', m);
    btn.disabled = false; btn.textContent = 'Super !';
    $('[data-x]', m).disabled = false;
    sfx.coin(); sfx.win(true); coinRain(r.base >= 2000 ? 60 : 35);
  };
}
