// Fenêtre « Rangs VIP » : tous les rangs, leurs avantages, ta progression et ta cagnotte de rakeback
import { VIP, vipOf, vipProgress, rakePot, claimRake, pctFmt, xMult } from './progress.js';
import { fmt, money, modal, toast, coinRain, CUR } from './ui.js';
import { sfx } from './sfx.js';

export async function openVipModal(wallet) {
  const tw = wallet.stats.totalWagered || 0;
  const v = vipOf(tw), p = vipProgress(tw);
  const pot = Math.floor(rakePot(wallet));
  const rows = VIP.map((r, i) => {
    const state = i < v.index ? 'done' : i === v.index ? 'cur' : '';
    return `<tr class="${state}"><td><span class="vip-badge big vip-${r.id}" style="--vc:${r.color}">${r.name}</span>${state === 'cur' ? ' <small class="gold">← toi</small>' : ''}</td>
      <td class="r">${r.min ? fmt(r.min) : '—'}</td><td class="r">${r.up ? '+' + fmt(r.up) : '—'}</td><td class="r">${r.rb ? pctFmt(r.rb) : '—'}</td>
      <td class="r">${r.mult > 1 ? `<span class="vip-x">${xMult(r.mult)}</span>` : '—'}</td></tr>`;
  }).join('');
  const res = await modal({ title: 'Rangs VIP', cls: 'wide vip-modal', html: `
    <div class="vip-head"><span class="vip-badge big vip-${v.id}" style="--vc:${v.color}">${v.name}</span>
      <div class="vip-prog"><div class="q-bar vip"><i style="width:${p}%;background:${v.next ? v.next.color : v.color}"></i></div>
      <small>${v.next ? `<b>${p.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %</b> vers <b>${v.next.name}</b> · encore ${fmt(v.next.min - tw)} à miser (total misé : ${fmt(tw)}) · bonus de passage : <b class="gold">+${fmt(v.next.up)}</b> · gains gratuits ${xMult(v.next.mult)}` : 'Rang maximum atteint, respect.'}</small></div></div>
    <div class="vip-rake"><div><small>Ta cagnotte de rakeback</small><b>${money(rakePot(wallet))}</b></div><small>${v.rb ? `${pctFmt(v.rb)} de chacune de tes mises aux jeux de casino y tombe. Récupère-la quand tu veux (à partir de 1 ${CUR}).` : 'Le rakeback commence au rang Tamarin (10 000 misés).'}</small></div>
    <div class="tbl-scroll"><table class="tbl vip-tbl"><thead><tr><th>Rang</th><th class="r">Total misé</th><th class="r">Bonus de passage</th><th class="r">Rakeback</th><th class="r">Gains gratuits</th></tr></thead><tbody>${rows}</tbody></table></div>
    <ul class="muted vip-notes">
      <li><b>Bonus de passage</b> : versé une seule fois, dès que tu atteins le rang.</li>
      <li><b>Rakeback</b> : un pourcentage de chaque mise aux jeux de casino, gagnée ou perdue, s'ajoute à ta cagnotte. Récupérable à tout moment ici ou sur l'accueil.</li>
      <li><b>Gains gratuits</b> : multiplicateur sur la roue du jour (cumulé avec ta série de jours consécutifs), les quêtes, les quiz, le calcul mental, le mot du jour, le Plus ou moins, le casse-briques, Queens, Tango, Pinpoint, Sudoku, Démineur, Snake, Memory et les mots croisés. Plus tu montes, plus chaque journée rapporte.</li>
      <li>Le rang dépend du total misé depuis la création du compte : il ne redescend jamais.</li>
    </ul>`, buttons: [...(pot >= 1 ? [{ label: `Récupérer ${fmt(pot)} ${CUR}`, value: 'claim' }] : []), { label: 'Fermer', value: true, primary: true }] });
  if (res === 'claim') {
    const a = claimRake(wallet);
    if (a) { sfx.win(true); coinRain(25); toast(`+${fmt(a)} ${CUR} de rakeback récupérés !`, 'win'); }
  }
}
