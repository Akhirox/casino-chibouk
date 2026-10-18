// Coffre-fort : mettre des Brundles à l'abri des mises (dépôt et retrait libres, sans frais), avec intérêts
import { $, $$, fmt, money, modal, toast, CUR } from './ui.js';
import { icon } from './art.js';
import { sfx } from './sfx.js';

const pct = (x) => (x * 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' %';

export async function openVault(wallet) {
  let mode = 'in';
  const body = () => {
    const max = mode === 'in' ? wallet.balance : wallet.vault;
    return `<div class="vt-kpis"><div><span>Solde jouable</span><b>${money(wallet.balance)}</b></div><div class="vt-safe">${icon('vault')}<span>Dans le coffre</span><b>${money(wallet.vault)}</b></div></div>
      <div class="seg vt-tabs"><button type="button" data-v="in" class="${mode === 'in' ? 'on' : ''}">Déposer</button><button type="button" data-v="out" class="${mode === 'out' ? 'on' : ''}">Retirer</button></div>
      <div class="vt-row"><input id="vt-amount" class="bet-input" type="number" min="1" max="${max}" step="1" inputmode="numeric" placeholder="Montant"><button type="button" class="btn btn-gold" id="vt-go" ${max < 1 ? 'disabled' : ''}>${mode === 'in' ? 'Déposer' : 'Retirer'}</button></div>
      <div class="vt-quick">${[25, 50, 75, 100].map((p) => `<button type="button" class="btn btn-ghost btn-sm" data-p="${p}">${p === 100 ? 'Tout' : p + ' %'}</button>`).join('')}</div>
      <div class="vt-int">${icon('chart')}<div><b>Intérêts : ${pct(wallet.vaultRate)} par jour</b><small>au prorata du temps passé dans le coffre${wallet.vaultRate > 0.05 ? ' (bonus de ton effet de victoire et des caisses inclus)' : ''} · ${wallet.vault > 0 ? `environ <b class="gold">+${fmt(Math.floor(wallet.vault * wallet.vaultRate))}</b> par jour en ce moment · ` : ''}déjà gagnés : ${fmt(Math.floor((wallet.stats.interestTotal || 0) + wallet.vaultPending()))} ${CUR}</small></div></div>
      <p class="muted vt-note">Les ${CUR} du coffre ne peuvent pas être misés : ils restent à l'abri des mauvaises séries et rapportent des intérêts. Tu peux les reprendre quand tu veux, sans frais. Ils comptent dans ta fortune au classement.</p>`;
  };
  await modal({ title: 'Coffre-fort', cls: 'vt-modal', html: `<div id="vt-body">${body()}</div>`, buttons: [{ label: 'Fermer', value: true, primary: true }],
    onOpen: (m) => {
      const bind = () => {
        const box = m.querySelector('#vt-body');
        box.querySelectorAll('[data-v]').forEach((b) => (b.onclick = () => { mode = b.dataset.v; box.innerHTML = body(); bind(); }));
        const inp = box.querySelector('#vt-amount');
        box.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => { const max = mode === 'in' ? wallet.balance : wallet.vault; inp.value = Math.floor((max * +b.dataset.p) / 100); }));
        const go = () => {
          const n = Math.floor(+inp.value);
          if (!(n > 0)) { inp.focus(); return; }
          const ok = mode === 'in' ? wallet.vaultDeposit(n) : wallet.vaultWithdraw(n);
          if (!ok) { toast(mode === 'in' ? `Pas assez de ${CUR} sur ton solde` : 'Pas assez dans le coffre', 'error'); return; }
          sfx.coin();
          toast(mode === 'in' ? `${fmt(n)} ${CUR} mis au coffre` : `${fmt(n)} ${CUR} repris du coffre`, 'win');
          box.innerHTML = body(); bind();
        };
        box.querySelector('#vt-go').onclick = go;
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      };
      bind();
    } });
}
