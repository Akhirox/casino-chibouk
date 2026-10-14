// Fenêtre « Rangs VIP » : tous les rangs, leurs avantages et ta progression
import { VIP, vipOf, vipProgress, cashbackInfo } from './progress.js';
import { fmt, modal } from './ui.js';

const pct = (x) => `${Math.round(x * 100)} %`;
export function openVipModal(wallet) {
  const tw = wallet.stats.totalWagered || 0;
  const v = vipOf(tw), p = vipProgress(tw);
  const cb = cashbackInfo(wallet);
  const rows = VIP.map((r, i) => {
    const state = i < v.index ? 'done' : i === v.index ? 'cur' : '';
    return `<tr class="${state}"><td><span class="vip-badge big vip-${r.id}" style="--vc:${r.color}">${r.name}</span>${state === 'cur' ? ' <small class="gold">← toi</small>' : ''}</td>
      <td class="r">${r.min ? fmt(r.min) : '—'}</td><td class="r">${r.cb ? pct(r.cb) : '—'}</td><td class="r">${r.wheel ? '+' + pct(r.wheel) : '—'}</td><td class="r">${r.quest ? '+' + pct(r.quest) : '—'}</td></tr>`;
  }).join('');
  modal({ title: 'Rangs VIP', cls: 'wide vip-modal', html: `
    <div class="vip-head"><span class="vip-badge big vip-${v.id}" style="--vc:${v.color}">${v.name}</span>
      <div class="vip-prog"><div class="q-bar vip"><i style="width:${p}%;background:${v.next ? v.next.color : v.color}"></i></div>
      <small>${v.next ? `<b>${p.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %</b> vers <b>${v.next.name}</b> · encore ${fmt(v.next.min - tw)} à miser (total misé : ${fmt(tw)})` : 'Rang maximum atteint, respect.'}</small></div></div>
    <div class="tbl-scroll"><table class="tbl vip-tbl"><thead><tr><th>Rang</th><th class="r">Total misé</th><th class="r">Remboursement hebdo</th><th class="r">Roue du jour</th><th class="r">Quêtes</th></tr></thead><tbody>${rows}</tbody></table></div>
    <ul class="muted vip-notes">
      <li><b>Remboursement hebdo</b> : chaque lundi, tu récupères ce pourcentage de tes pertes nettes de la semaine précédente aux jeux de casino (misé − gagné, du lundi au dimanche). Bouton sur l'accueil.${cb.amount ? ` <b class="gold">${fmt(cb.amount)} Brundles t'attendent !</b>` : ''}</li>
      <li><b>Roue du jour</b> et <b>Quêtes</b> : bonus sur leurs gains, cumulé avec ta série de jours consécutifs.</li>
      <li>Le rang dépend du total misé depuis la création du compte : il ne redescend jamais.</li>
    </ul>`, buttons: [{ label: 'Fermer', value: true, primary: true }] });
}
