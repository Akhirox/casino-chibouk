// Roue du bonus quotidien : un tour par jour, gain multiplié par la série de jours consécutifs
import { CONFIG } from './config.js';
import { spinDaily, streakMult, vipOf } from './progress.js';
import { h, $, fmt, money, toast, coinRain, sleep, CUR } from './ui.js';
import { sfx } from './sfx.js';

const COLORS = ['#2f7a35', '#1f5e8c', '#8c3a1f', '#4a2a7a', '#2a6b5e', '#7a1f2f'];
const xfmt = (m) => '×' + m.toLocaleString('fr-FR', { maximumFractionDigits: 1 });

function wheelSVG() {
  const V = CONFIG.DAILY_WHEEL, n = V.length, a = (2 * Math.PI) / n;
  const p = (r, t) => `${(r * Math.cos(t)).toFixed(2)} ${(r * Math.sin(t)).toFixed(2)}`;
  return `<svg class="dw-wheel" viewBox="-110 -110 220 220">${V.map((v, i) => {
    const a0 = i * a - Math.PI / 2 - a / 2, a1 = a0 + a, mid = (a0 + a1) / 2;
    const big = v >= 2000;
    return `<path d="M0 0 L${p(100, a0)} A100 100 0 0 1 ${p(100, a1)} Z" fill="${big ? (v >= 5000 ? '#c98a00' : '#b5651d') : COLORS[i % COLORS.length]}" stroke="#0b120e" stroke-width="1.5"/>
      <text transform="translate(${p(70, mid)}) rotate(${(mid * 180) / Math.PI + 90})" text-anchor="middle" dominant-baseline="middle" font-family="Bungee, sans-serif" font-size="${v >= 1000 ? 11 : 12}" fill="#fff">${fmt(v)}</text>`;
  }).join('')}<circle r="100" fill="none" stroke="#f5c542" stroke-width="4"/><circle r="16" fill="#f5c542" stroke="#8a5a00" stroke-width="3"/></svg>`;
}

export function openDailyWheel(wallet, onDone) {
  if (!wallet.dailyAvailable()) { toast('Roue déjà tournée aujourd\'hui. Reviens après minuit !'); return; }
  const n = wallet.nextStreak(), mult = streakMult(n), vip = vipOf(wallet.stats.totalWagered);
  const days = Array.from({ length: 7 }, (_, i) => i + 1);
  const m = h(`<div class="modal-backdrop"><div class="modal dw-modal" role="dialog" aria-modal="true">
    <h2 class="modal-title">Roue du jour</h2>
    <div class="modal-body">
      <div class="dw-streak"><b>Série : ${n} jour${n > 1 ? 's' : ''}</b> → gain ${xfmt(mult)}
        <div class="dw-days">${days.map((d) => `<i class="${d <= Math.min(n, 7) ? 'on' : ''}">${d}</i>`).join('')}<span>${n > 7 ? `+${n - 7}` : ''}</span></div>
        <small class="muted">+${Math.round(CONFIG.STREAK_STEP * 100)} % par jour consécutif, jusqu'à ${xfmt(CONFIG.STREAK_MAX)}. Un jour raté et la série repart à 1.</small>${vip.wheel ? `<small>Bonus VIP ${vip.name} : <b>+${Math.round(vip.wheel * 100)} %</b></small>` : ''}</div>
      <div class="dw-box"><div class="dw-pointer"></div>${wheelSVG()}</div>
      <p class="dw-res" id="dw-res">Tourne la roue pour gagner de ${fmt(Math.min(...CONFIG.DAILY_WHEEL))} à ${fmt(Math.max(...CONFIG.DAILY_WHEEL))} ${CUR}${mult > 1 ? `, multipliés par ${xfmt(mult)}` : ''} !</p>
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
    if (spinning || !wallet.dailyAvailable()) return;
    spinning = true;
    $('#dw-spin', m).disabled = true; $('[data-x]', m).disabled = true;
    const r = spinDaily(wallet);
    // le gain est enregistré tout de suite (fermer la fenêtre ne change rien)
    await wallet.claimDaily(r.amount, { base: r.base, mult: r.mult });
    const N = CONFIG.DAILY_WHEEL.length;
    const jitter = (Math.random() - 0.5) * (360 / N) * 0.6;
    const deg = 360 * 6 - (r.seg * 360) / N + jitter;
    const wheel = $('.dw-wheel', m);
    wheel.style.transition = 'transform 4.2s cubic-bezier(.12,.75,.2,1)';
    wheel.style.transform = `rotate(${deg}deg)`;
    sfx.spinStart();
    const ticks = setInterval(() => sfx.tick && sfx.tick(), 140);
    await sleep(4300);
    clearInterval(ticks);
    spinning = false; done = true;
    $('#dw-res', m).innerHTML = `<b>${fmt(r.base)}</b>${r.mult > 1 ? ` ${xfmt(r.mult)} (série de ${r.streak} jours)` : ''}${r.vip ? ` +${Math.round(r.vip * 100)} % VIP` : ''} = <span class="big">+${money(r.amount)}</span>`;
    const btn = $('#dw-spin', m);
    btn.disabled = false; btn.textContent = 'Super !';
    $('[data-x]', m).disabled = false;
    sfx.coin(); sfx.win(true); coinRain(r.base >= 2000 ? 60 : 35);
  };
}
