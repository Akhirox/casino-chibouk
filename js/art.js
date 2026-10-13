// Illustrations SVG (singes, symboles de la machine à sous, pièce)
let uid = 0;

export function monkeySVG({ fur = '#7a4a28', face = '#f0c597', ear = '#e9b98c', crown = false, wink = false, cls = '', flower = false, cap = false } = {}) {
  const id = 'mk' + (++uid);
  const crownSvg = crown ? `
    <path d="M30 26 L36 4 L48 18 L60 0 L72 18 L84 4 L90 26 Z" fill="url(#${id}g)" stroke="#8a5a00" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="60" cy="14" r="3.6" fill="#e3263b"/><circle cx="42" cy="19" r="2.6" fill="#2fb1ff"/><circle cx="78" cy="19" r="2.6" fill="#2fb1ff"/>` : '';
  const flowerSvg = flower ? `
    <g transform="translate(88 26)"><circle r="6" cx="0" cy="-7" fill="#ff6fae"/><circle r="6" cx="7" cy="0" fill="#ff6fae"/><circle r="6" cx="0" cy="7" fill="#ff6fae"/><circle r="6" cx="-7" cy="0" fill="#ff6fae"/><circle r="4.5" fill="#ffd34d"/></g>` : '';
  const capSvg = cap ? `<path d="M24 34 Q60 -2 96 34 Z" fill="#2a7de1" stroke="#163f73" stroke-width="2"/><path d="M80 32 Q104 30 108 40 L84 38 Z" fill="#2a7de1" stroke="#163f73" stroke-width="2"/>` : '';
  const leftEye = wink
    ? `<path d="M40 55 Q46 50 52 55" stroke="#1b1b1b" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
    : `<ellipse cx="46" cy="54" rx="6" ry="7.5" fill="#1b1b1b"/><circle cx="48" cy="51" r="2.2" fill="#fff"/>`;
  return `<svg class="monkey ${cls}" viewBox="0 0 120 112" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2a8"/><stop offset=".5" stop-color="#ffcc33"/><stop offset="1" stop-color="#d18f00"/></linearGradient>
      <radialGradient id="${id}f" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="${fur}" stop-opacity=".75"/><stop offset="1" stop-color="${fur}"/></radialGradient>
    </defs>
    <circle cx="18" cy="60" r="16" fill="${fur}"/><circle cx="18" cy="60" r="9" fill="${ear}"/>
    <circle cx="102" cy="60" r="16" fill="${fur}"/><circle cx="102" cy="60" r="9" fill="${ear}"/>
    <circle cx="60" cy="60" r="42" fill="url(#${id}f)"/>
    <path d="M54 22 Q58 12 62 22 Q66 14 70 24" stroke="${fur}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M60 42 C50 28 26 32 30 56 C22 72 30 98 60 100 C90 98 98 72 90 56 C94 32 70 28 60 42 Z" fill="${face}"/>
    ${leftEye}
    <ellipse cx="74" cy="54" rx="6" ry="7.5" fill="#1b1b1b"/><circle cx="76" cy="51" r="2.2" fill="#fff"/>
    <ellipse cx="55" cy="72" rx="2.4" ry="1.7" fill="${fur}"/><ellipse cx="65" cy="72" rx="2.4" ry="1.7" fill="${fur}"/>
    <path d="M45 81 Q60 94 75 81" stroke="#5a321a" stroke-width="3.6" fill="none" stroke-linecap="round"/>
    <ellipse cx="38" cy="74" rx="6" ry="3.5" fill="#ff8a8a" opacity=".45"/><ellipse cx="82" cy="74" rx="6" ry="3.5" fill="#ff8a8a" opacity=".45"/>
    ${capSvg}${crownSvg}${flowerSvg}
  </svg>`;
}

export function goldMonkeySVG(cls = '') {
  return monkeySVG({ fur: '#c98a00', face: '#ffe6a6', ear: '#ffd36b', crown: true, cls });
}

export function coinSVG(cls = 'coin') {
  const id = 'cn' + (++uid);
  return `<svg class="${cls}" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1a1"/><stop offset=".55" stop-color="#f5c542"/><stop offset="1" stop-color="#b9850b"/></linearGradient></defs>
  <circle cx="16" cy="16" r="15" fill="url(#${id})" stroke="#8a6206" stroke-width="1.5"/><circle cx="16" cy="16" r="11" fill="none" stroke="#a87a0a" stroke-width="1" stroke-dasharray="2 2"/>
  <text x="16" y="21.5" text-anchor="middle" font-family="Bungee, sans-serif" font-size="15" fill="#6b4700">B</text></svg>`;
}

// Hanging monkey on a vine (for the lobby)
export function hangingMonkeySVG() {
  return `<div class="hanging-monkey"><svg class="vine" viewBox="0 0 20 200" preserveAspectRatio="none"><path d="M10 0 Q2 50 10 100 Q18 150 10 200" stroke="#2f7a35" stroke-width="5" fill="none"/><path d="M10 40 q10 -6 14 2 q-8 4 -14 -2Z M10 120 q-10 -6 -14 2 q8 4 14 -2Z" fill="#3fae4b"/></svg>${monkeySVG({ wink: true })}</div>`;
}

/* --------------------------- Symboles de la slot --------------------------- */
export function symbolSVG(sym) {
  const id = 'sy' + (++uid);
  const wrap = (inner, extra = '') => `<svg viewBox="0 0 100 100" class="sym sym-${sym}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${extra}${inner}</svg>`;
  switch (sym) {
    case 'W':
      return `<div class="sym-wild">${goldMonkeySVG('sym')}<span class="wild-tag">WILD</span></div>`;
    case 'M':
      return `<div class="sym-monkey">${monkeySVG({})}</div>`;
    case 'S':
      return wrap(`<text x="50" y="80" text-anchor="middle" font-family="Bungee, sans-serif" font-size="78" fill="url(#${id})" stroke="#ffd34d" stroke-width="3.5" paint-order="stroke">7</text>`,
        `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6b6b"/><stop offset="1" stop-color="#a0001a"/></linearGradient></defs>`);
    case 'B':
      return wrap(`<rect x="8" y="30" width="84" height="40" rx="9" fill="#141414" stroke="url(#${id})" stroke-width="5"/>
        <text x="50" y="62" text-anchor="middle" font-family="Bungee, sans-serif" font-size="27" fill="url(#${id})">BAR</text>`,
        `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2a8"/><stop offset="1" stop-color="#d49400"/></linearGradient></defs>`);
    case 'C':
      return wrap(`<path d="M50 14 C30 14 26 34 26 50 C26 62 20 68 14 74 L86 74 C80 68 74 62 74 50 C74 34 70 14 50 14 Z" fill="url(#${id})" stroke="#9a6a00" stroke-width="3"/>
        <circle cx="50" cy="82" r="8" fill="#c98a00" stroke="#7a5300" stroke-width="2"/><circle cx="50" cy="11" r="5" fill="#c98a00"/>
        <path d="M36 30 Q34 44 36 58" stroke="#fff7c2" stroke-width="5" stroke-linecap="round" fill="none" opacity=".7"/>`,
        `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0a0"/><stop offset=".5" stop-color="#ffc928"/><stop offset="1" stop-color="#c98a00"/></linearGradient></defs>`);
    case 'P':
      return wrap(`<path d="M8 38 A42 42 0 0 0 92 38 Z" fill="#2e8b3e"/><path d="M14 38 A36 36 0 0 0 86 38 Z" fill="#c9f2b0"/><path d="M19 38 A31 31 0 0 0 81 38 Z" fill="#ff4b5c"/>
        <g fill="#2a1a1a"><ellipse cx="36" cy="50" rx="2.4" ry="4"/><ellipse cx="50" cy="56" rx="2.4" ry="4"/><ellipse cx="64" cy="50" rx="2.4" ry="4"/><ellipse cx="43" cy="62" rx="2.2" ry="3.6"/><ellipse cx="57" cy="62" rx="2.2" ry="3.6"/></g>`);
    case 'R':
      return wrap(`<path d="M50 20 Q52 8 62 6" stroke="#5b3a14" stroke-width="4" fill="none"/><path d="M52 16 Q70 4 80 18 Q66 24 52 16Z" fill="#3fae4b"/>
        <g fill="url(#${id})" stroke="#3c0d5c" stroke-width="1.5">
        <circle cx="36" cy="32" r="11"/><circle cx="58" cy="30" r="11"/><circle cx="25" cy="50" r="11"/><circle cx="47" cy="50" r="11"/><circle cx="69" cy="48" r="11"/>
        <circle cx="36" cy="68" r="11"/><circle cx="58" cy="68" r="11"/><circle cx="47" cy="86" r="10"/></g>`,
        `<defs><radialGradient id="${id}" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#d79bff"/><stop offset="1" stop-color="#6a1fa0"/></radialGradient></defs>`);
    case 'N':
      return wrap(`<path d="M22 22 C18 62 50 92 88 74 C92 72 90 66 85 67 C56 76 34 56 34 22 Z" fill="url(#${id})" stroke="#b38300" stroke-width="3" stroke-linejoin="round"/>
        <path d="M20 24 L18 12 L32 12 L34 24 Z" fill="#6b4a1a"/><path d="M30 30 C32 54 50 70 74 70" stroke="#fff6b0" stroke-width="3" fill="none" opacity=".7" stroke-linecap="round"/>`,
        `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff27a"/><stop offset="1" stop-color="#f2b600"/></linearGradient></defs>`);
    case 'L':
      return wrap(`<g transform="rotate(-25 50 50)"><path d="M8 50 Q14 44 18 42 C24 22 76 22 82 42 Q86 44 92 50 Q86 56 82 58 C76 78 24 78 18 58 Q14 56 8 50Z" fill="url(#${id})" stroke="#b39200" stroke-width="3"/>
        <ellipse cx="38" cy="40" rx="12" ry="5" fill="#fffbd0" opacity=".6"/></g><path d="M58 22 Q70 10 84 16 Q74 28 58 22Z" fill="#3fae4b"/>`,
        `<defs><radialGradient id="${id}" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fffa8a"/><stop offset="1" stop-color="#e8c400"/></radialGradient></defs>`);
    case 'K':
      return wrap(`<path d="M34 64 Q40 30 62 12 M68 66 Q66 34 62 12" stroke="#3f7d2a" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M62 12 Q78 4 88 16 Q74 22 62 12Z" fill="#3fae4b"/>
        <circle cx="32" cy="72" r="17" fill="url(#${id})"/><circle cx="68" cy="74" r="17" fill="url(#${id})"/>
        <circle cx="26" cy="66" r="4.5" fill="#fff" opacity=".6"/><circle cx="62" cy="68" r="4.5" fill="#fff" opacity=".6"/>`,
        `<defs><radialGradient id="${id}" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#ff7a7a"/><stop offset="1" stop-color="#9c0012"/></radialGradient></defs>`);
  }
  return '';
}
