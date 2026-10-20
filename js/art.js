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
    case 'X':
      return `<div class="sym-wild sym-wildx">${monkeySVG({ fur: '#7b3fd1', face: '#f1dcff', ear: '#c9a0ff', crown: true, cls: 'sym' })}<span class="x2-badge">×2</span><span class="wild-tag">WILD</span></div>`;
    case 'F':
      return `<div class="sym-scatter">` + wrap(`<ellipse cx="50" cy="94" rx="30" ry="5" fill="#000" opacity=".3"/>
        <path d="M30 10 h40 l-4 14 h-32z" fill="url(#${id})" stroke="#5a2e05" stroke-width="2.5"/>
        <rect x="26" y="24" width="48" height="34" rx="6" fill="#b5651d" stroke="#5a2e05" stroke-width="3"/>
        <rect x="28" y="58" width="44" height="32" rx="6" fill="#8b4513" stroke="#5a2e05" stroke-width="3"/>
        <g fill="#ffd34d" stroke="#5a2e05" stroke-width="2"><circle cx="40" cy="38" r="6"/><circle cx="60" cy="38" r="6"/><circle cx="41" cy="70" r="5"/><circle cx="59" cy="70" r="5"/></g>
        <g fill="#2a1406"><circle cx="40" cy="38" r="2.5"/><circle cx="60" cy="38" r="2.5"/><circle cx="41" cy="70" r="2"/><circle cx="59" cy="70" r="2"/></g>
        <path d="M38 49 q12 7 24 0" stroke="#2a1406" stroke-width="3" fill="none" stroke-linecap="round"/>
        <rect x="40" y="78" width="20" height="6" rx="2" fill="#2a1406"/><path d="M42 78v6M47 78v6M52 78v6M57 78v6" stroke="#f5f5f5" stroke-width="1.6"/>
        <path d="M26 30 l-12 -6 l4 14z M74 30 l12 -6 l-4 14z" fill="#3fae4b" stroke="#1f5e26" stroke-width="2"/>`,
        `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2a8"/><stop offset="1" stop-color="#d49400"/></linearGradient></defs>`) + `<span class="wild-tag scatter-tag">SCATTER</span></div>`;
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

/* --------------------------- Icônes maison (remplacent les emojis) --------------------------- */
// Style "duotone" : trait currentColor + remplissage léger, pour rester lisible en petit.
const D = 'fill="currentColor" fill-opacity=".18"';
const ICONS = {
  seed: `<path d="M12 3c4.5 3 6.5 7 6.5 10.5A6.5 6.5 0 0 1 5.5 13.5C5.5 10 7.5 6 12 3Z" ${D}/><path d="M12 8v12M12 13l-3-2.5M12 16l3-2.5" />`,
  crate: `<path d="M3.5 8.5 12 4l8.5 4.5v9L12 22l-8.5-4.5z" ${D}/><path d="M3.5 8.5 12 13l8.5-4.5M12 13v9" /><path d="M7.8 6.2l8.5 4.6" stroke-width="1.3"/>`,
  home: `<path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v10h13V10" ${D}/><path d="M10 20v-5h4v5" /><path d="M16.5 4.5c1.8-.6 3.4.2 4 1.6-1.7.5-3.2 0-4-1.6Z" ${D}/>`,
  slots: `<rect x="3" y="5" width="15" height="15" rx="2.5" ${D}/><rect x="5.5" y="8.5" width="10" height="6" rx="1" /><path d="M8.8 8.5v6M12.2 8.5v6" /><path d="M18 12h2.2V7.5" /><circle cx="20.2" cy="5.8" r="1.6" ${D}/><path d="M7 17.5h7" />`,
  blackjack: `<rect x="3.5" y="6" width="10" height="14" rx="1.8" transform="rotate(-12 8.5 13)" ${D}/><rect x="10" y="4" width="10" height="14" rx="1.8" transform="rotate(10 15 11)" ${D}/><path d="M15.3 8.6c-1.4 1.3-2.6 2.2-2.6 3.3 0 .9 1.2 1.5 2.1.6l-.4 1.6h1.8l-.4-1.6c.9.9 2.1.3 2.1-.6 0-1.1-1.2-2-2.6-3.3Z" fill="currentColor" stroke="none"/>`,
  roulette: `<circle cx="12" cy="12" r="9" ${D}/><circle cx="12" cy="12" r="3.2" /><path d="M12 3v5.8M12 15.2V21M3 12h5.8M15.2 12H21M5.6 5.6l4.1 4.1M14.3 14.3l4.1 4.1M18.4 5.6l-4.1 4.1M9.7 14.3l-4.1 4.1" stroke-width="1.4"/><circle cx="17.5" cy="7.8" r="1.4" fill="currentColor" stroke="none"/>`,
  plinko: `<g fill="currentColor" stroke="none"><circle cx="12" cy="5" r="1.2"/><circle cx="9" cy="9" r="1.2"/><circle cx="15" cy="9" r="1.2"/><circle cx="6" cy="13" r="1.2"/><circle cx="12" cy="13" r="1.2"/><circle cx="18" cy="13" r="1.2"/></g><circle cx="10.5" cy="11" r="1.9" ${D}/><path d="M3 17.5h18v3H3z" ${D}/><path d="M7.5 17.5v3M12 17.5v3M16.5 17.5v3" stroke-width="1.4"/>`,
  crash: `<path d="M3 20.5h18" /><path d="M3.5 19C9 18.6 13 15.6 16 9.5" ${D}/><path d="m14.5 5.5 5.5-2.5-2.5 5.5-1.6-.4-1-1-.4-1.6Z" fill="currentColor" fill-opacity=".9"/><path d="M15.2 10.3 13.7 8.8" />`,
  breaker: `<rect x="3" y="4" width="5.2" height="3" rx=".8" ${D}/><rect x="9.4" y="4" width="5.2" height="3" rx=".8" ${D}/><rect x="15.8" y="4" width="5.2" height="3" rx=".8" ${D}/><rect x="6.2" y="8.4" width="5.2" height="3" rx=".8" ${D}/><rect x="12.6" y="8.4" width="5.2" height="3" rx=".8" ${D}/><circle cx="13.5" cy="15" r="1.6" fill="currentColor" stroke="none"/><path d="M8 20h8" stroke-width="2.6"/>`,
  stats: `<path d="M3.5 20.5h17" /><rect x="5" y="12" width="3.4" height="8.5" rx=".8" ${D}/><rect x="10.3" y="7" width="3.4" height="13.5" rx=".8" ${D}/><rect x="15.6" y="10" width="3.4" height="10.5" rx=".8" ${D}/><path d="m5 8.5 4.5-3.5 4 2.5 5.5-4" stroke-width="1.5"/>`,
  gift: `<rect x="3.5" y="9" width="17" height="4" rx="1" ${D}/><path d="M5 13v7.5h14V13" ${D}/><path d="M12 9v11.5" /><path d="M12 9C10.5 5.5 6.5 5 6.8 7.6 7 9 10 9 12 9Zm0 0c1.5-3.5 5.5-4 5.2-1.4C17 9 14 9 12 9Z" />`,
  hourglass: `<path d="M6.5 3.5h11M6.5 20.5h11" /><path d="M8 3.5c0 4.5 4 5.5 4 8.5s-4 4-4 8.5h8c0-4.5-4-5.5-4-8.5s4-4 4-8.5" ${D}/>`,
  sound: `<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" ${D}/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11" />`,
  mute: `<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" ${D}/><path d="m16 9.5 5 5m0-5-5 5" />`,
  scroll: `<path d="M7 4h11a2 2 0 0 1 2 2v1.5h-3" /><path d="M17 6v12.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V17h11" ${D}/><path d="M7 4a2 2 0 0 0-2 2v11M8.5 9.5h5.5M8.5 13h5.5" />`,
  trophy: `<path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0z" ${D}/><path d="M7.5 6H4.5c0 3 1.2 4.5 3.4 4.8M16.5 6h3c0 3-1.2 4.5-3.4 4.8M12 13.5v3.5M8.5 20.5h7l-.8-3.5H9.3z" />`,
  lock: `<rect x="5" y="10.5" width="14" height="10" rx="2" ${D}/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2.5" />`,
  bolt: `<path d="M13.5 3 5.5 13.5h6L10.5 21l8-10.5h-6z" ${D}/>`,
  undo: `<path d="M9 7 4.5 11.5 9 16" /><path d="M5 11.5h9.5a5 5 0 0 1 0 10H11" />`,
  rocket: `<path d="M12 3c3 2.2 4.5 5.5 4.5 9.5l-2 3.5h-5l-2-3.5C7.5 8.5 9 5.2 12 3Z" ${D}/><circle cx="12" cy="9.5" r="1.8" /><path d="M7.5 12.5 5 15.5l3 1M16.5 12.5l2.5 3-3 1M10.5 18.5l1.5 2.5 1.5-2.5" />`,
  chip: `<circle cx="12" cy="12" r="8.5" ${D}/><circle cx="12" cy="12" r="4.5" /><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3" />`,
  arrow: `<path d="M5 12h14M13 6l6 6-6 6" />`,
  quiz: `<rect x="5" y="3" width="14" height="18" rx="2.5" ${D}/><rect x="7.5" y="5.5" width="9" height="4" rx="1" /><g fill="currentColor" stroke="none"><circle cx="9" cy="13" r="1.1"/><circle cx="12" cy="13" r="1.1"/><circle cx="15" cy="13" r="1.1"/><circle cx="9" cy="17" r="1.1"/><circle cx="12" cy="17" r="1.1"/><circle cx="15" cy="17" r="1.1"/></g>`,
  send: `<path d="M21 3 3 10.5l7 2.8L21 3Z" ${D}/><path d="m10 13.3 2.8 7.2L21 3" ${D}/><path d="M10 13.3 21 3" />`,
  chart: `<path d="M3.5 20.5h17" /><path d="M4 16l4.5-5 3.5 3 4-6 4 3" ${D}/><circle cx="20" cy="11" r="1.4" fill="currentColor" stroke="none"/>`,
  close: `<path d="M6 6l12 12M18 6 6 18" />`,
  reset: `<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" /><path d="M4 4v4.5h4.5" />`,
  medal: `<circle cx="12" cy="14.5" r="5.5" ${D}/><path d="M8.5 3.5 10.5 9M15.5 3.5 13.5 9M12 12v5" stroke-width="1.6"/>`,
  tower: `<rect x="4" y="16.5" width="16" height="4" rx="1" ${D}/><rect x="5.5" y="10.5" width="13" height="4" rx="1" ${D}/><rect x="7" y="4.5" width="10" height="4" rx="1" ${D}/><path d="M9.7 16.5v4M14.3 16.5v4M10 10.5v4M14 10.5v4M12 4.5v4" stroke-width="1.3"/>`,
  mines: `<circle cx="10.5" cy="14" r="6.5" ${D}/><path d="M15 9.5 17 7.5" /><path d="M17.5 7c.5-1.6 1.6-2.6 3-3" /><path d="M20.5 2.8v1.6M19.4 4.6h1.6M8 12a3 3 0 0 1 2.2-2" stroke-width="1.5"/>`,
  dice: `<rect x="3.5" y="3.5" width="17" height="17" rx="4" ${D}/><g fill="currentColor" stroke="none"><circle cx="8.3" cy="8.3" r="1.5"/><circle cx="15.7" cy="8.3" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="8.3" cy="15.7" r="1.5"/><circle cx="15.7" cy="15.7" r="1.5"/></g>`,
  check: `<path d="m5 12.5 4.5 4.5L19 7.5" />`,
  user: `<circle cx="12" cy="8.5" r="4" ${D}/><path d="M4.5 20.5c.8-4 3.8-6.2 7.5-6.2s6.7 2.2 7.5 6.2" ${D}/>`,
  camera: `<rect x="3" y="7" width="18" height="13" rx="3" ${D}/><path d="M8.5 7 10 4.5h4L15.5 7"/><circle cx="12" cy="13.5" r="3.6"/>`,
  bulb: `<path d="M9 17.5h6M9.8 20.5h4.4M12 3.5a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2v1.2h5.2v-1.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3.5z" ${D}/>`,
  star: `<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" ${D}/>`,
  hilo: `<rect x="3" y="5" width="10" height="14" rx="2" ${D}/><path d="M17 9l2.5-3L22 9M17 15l2.5 3 2.5-3M19.5 6v12" stroke-width="1.6"/><path d="M6.5 10.5 8 9l1.5 1.5M8 9v5" stroke-width="1.4"/>`,
  keno: `<rect x="3" y="3" width="18" height="18" rx="3" ${D}/><g fill="currentColor" stroke="none"><circle cx="8" cy="8" r="1.6"/><circle cx="16" cy="8" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="8" cy="16" r="1.6"/></g><circle cx="16" cy="16" r="2.2"/>`,
  wheel: `<circle cx="12" cy="13" r="8" ${D}/><path d="M12 5v16M4 13h16M6.3 7.3l11.4 11.4M17.7 7.3 6.3 18.7" stroke-width="1.2"/><path d="M12 1.5l2 3h-4z" fill="currentColor"/>`,
  limbo: `<path d="M3 20h18" /><path d="M4 16c4-1 6-4 8-9 2 5 4 8 8 9" ${D}/><path d="M12 7V3" stroke-width="1.6"/>`,
  flag: `<path d="M5 21V4" stroke-width="2"/><path d="M5 4h13l-2.5 4L18 12H5" ${D}/>`,
  motus: `<rect x="2.5" y="7" width="5.5" height="10" rx="1.2" ${D}/><rect x="9.25" y="7" width="5.5" height="10" rx="1.2"/><rect x="16" y="7" width="5.5" height="10" rx="1.2" ${D}/><path d="M11 10.5h2M11 13.5h2" stroke-width="1.3"/>`,
  higher: `<path d="M7 20V5M3.5 8.5 7 5l3.5 3.5M17 4v15M13.5 15.5 17 19l3.5-3.5" stroke-width="1.8"/>`,
  shop: `<path d="M4.5 8h15l-1.3 12h-12.4z" ${D}/><path d="M8.5 10V7a3.5 3.5 0 0 1 7 0v3" stroke-width="1.6"/>`,
  chev: `<path d="m6 9 6 6 6-6" stroke-width="2"/>`,
  fire: `<path d="M12 21c-4 0-7-2.8-7-6.6 0-3.4 2.6-5.4 3.7-8.4.5 2 1.6 3 2.6 3.5C11.6 6 13 4 15 3c-.3 3 1.5 4.6 2.8 6.6A7 7 0 0 1 19 14.4C19 18.2 16 21 12 21z" ${D}/>`,
  craps: `<rect x="2.5" y="7" width="11" height="11" rx="2.5" ${D} transform="rotate(-12 8 12.5)"/><rect x="11" y="4" width="10.5" height="10.5" rx="2.5" ${D} transform="rotate(10 16 9)"/><g fill="currentColor" stroke="none"><circle cx="6" cy="11" r="1.1"/><circle cx="10" cy="15" r="1.1"/><circle cx="14" cy="7" r="1.1"/><circle cx="16.3" cy="9.3" r="1.1"/><circle cx="18.6" cy="11.6" r="1.1"/></g>`,
  keyboard: `<rect x="2.5" y="6" width="19" height="12" rx="2.5" ${D}/><path d="M6 9.5h1M9.5 9.5h1M13 9.5h1M16.5 9.5h1M6 12.5h1M9.5 12.5h1M13 12.5h1M16.5 12.5h1M8 15.5h8" stroke-width="1.8" stroke-linecap="round"/>`,
  globe: `<circle cx="12" cy="12" r="8.5" ${D}/><path d="M3.5 12h17M12 3.5c2.6 2.4 3.8 5.2 3.8 8.5s-1.2 6.1-3.8 8.5M12 3.5C9.4 5.9 8.2 8.7 8.2 12s1.2 6.1 3.8 8.5" stroke-width="1.5"/>`,
  jungle: `<rect x="3" y="3" width="18" height="18" rx="3" ${D}/><path d="M9 3v18M15 3v18M3 9h18M3 15h18" stroke-width="1" opacity=".6"/><path d="M6 6h6v6h6v6" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  scratch: `<rect x="3" y="5" width="18" height="14" rx="2" ${D}/><path d="M7 9h4M7 12.5h3M13.5 13l3.5-4M14 16l4-4.5" stroke-width="1.6"/><circle cx="17" cy="8" r="1" fill="currentColor"/>`,
  memory: `<rect x="3" y="4" width="8" height="11" rx="1.6" ${D}/><rect x="13" y="9" width="8" height="11" rx="1.6" ${D}/><path d="M7 8.2l1.2 2.3-1.2 2.3-1.2-2.3z" fill="currentColor" stroke="none"/><path d="M17 13.2l1.2 2.3-1.2 2.3-1.2-2.3z" fill="currentColor" stroke="none"/>`,
  crossword: `<rect x="3.5" y="3.5" width="17" height="17" rx="1.6" ${D}/><path d="M3.5 9.2h17M3.5 14.8h17M9.2 3.5v17M14.8 3.5v17" stroke-width="1.2"/><rect x="14.8" y="3.5" width="5.7" height="5.7" fill="currentColor" stroke="none"/><rect x="3.5" y="14.8" width="5.7" height="5.7" fill="currentColor" stroke="none"/>`,
  vault: `<rect x="3.5" y="4" width="17" height="15" rx="2.2" ${D}/><circle cx="12" cy="11.5" r="3.6"/><path d="M12 8.2v1.4M12 13.4v1.4M8.7 11.5h1.4M13.9 11.5h1.4" stroke-width="1.4"/><path d="M6 19v1.5M18 19v1.5" stroke-width="2"/>`,
  banana: `<path d="M4 13.5c3.6 4.8 10.8 5.2 14.9.4 1-1.2 1.7-2.8 1.9-4.3-.9 1.7-2.5 2.9-4.3 3.5C12.3 14.6 8 13.6 4 13.5z" ${D}/><path d="M19.6 9.4l1.2-2.3" stroke-width="2"/>`,
  queens: `<path d="M3.5 18h17l-1.5-9.5-4.3 3.8L12 5l-2.7 7.3L5 8.5z" ${D}/><path d="M3.5 21h17" />`,
  tango: `<circle cx="8" cy="9" r="3.6" ${D}/><path d="M8 2.6v1.2M8 14.2v1.2M1.6 9h1.2M13.2 9h1.2M3.5 4.5l.9.9M11.6 12.6l.9.9M3.5 13.5l.9-.9M11.6 5.4l.9-.9" stroke-width="1.4"/><path d="M19.5 12.5a5 5 0 1 0 1.5 7.2 4 4 0 0 1-1.5-7.2z" ${D}/>`,
  pinpoint: `<path d="M12 21.5s-6.5-6.4-6.5-11.3a6.5 6.5 0 0 1 13 0c0 4.9-6.5 11.3-6.5 11.3z" ${D}/><circle cx="12" cy="10.2" r="2.4" />`,
  sudoku: `<rect x="3.5" y="3.5" width="17" height="17" rx="2" ${D}/><path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17" stroke-width="1.3"/>`,
  snake: `<path d="M4 18.5c3 0 3-4 6-4s3 4 6 4 3.5-2.5 3.5-5-2-4.5-5-4.5H9.5A2.5 2.5 0 0 1 9.5 4H18" ${D} stroke-width="2.2"/><circle cx="18.5" cy="4" r="1.2" fill="currentColor"/>`,
  demineur: `<rect x="3.5" y="3.5" width="17" height="17" rx="2.5" ${D}/><circle cx="12" cy="13" r="4" fill="currentColor"/><path d="M12 6.5V8.5M15.5 9.5l1.2-1.2M8.5 9.5 7.3 8.3" stroke-width="1.6"/>`,
  film: `<rect x="3.5" y="9" width="17" height="11.5" rx="2" ${D}/><path d="m3.8 9 15.4-4.2-.9-3.3L3 5.7z" ${D}/><path d="m7.6 4.7 2 3M12.4 3.4l2 3" stroke-width="1.5"/><path d="M3.5 13h17" stroke-width="1.3"/>`,
};
export function icon(name, cls = '') {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

/* --------------------------- Illustrations des cartes du lobby --------------------------- */
export function plinkoArtSVG() {
  let pegs = '';
  for (let r = 0; r < 6; r++) for (let i = 0; i <= r + 2; i++) pegs += `<circle cx="${100 + (i - (r + 2) / 2) * 22}" cy="${20 + r * 17}" r="3" fill="#e9f5ee" opacity=".85"/>`;
  const cols = ['#ff4d5e', '#ff8a3d', '#ffc23d', '#9be15d', '#ffc23d', '#ff8a3d', '#ff4d5e'];
  const bins = cols.map((c, i) => `<rect x="${29 + i * 20.5}" y="124" width="18" height="12" rx="3" fill="${c}"/>`).join('');
  return `<svg viewBox="0 0 200 145" class="art-plinko" aria-hidden="true">${pegs}${bins}
    <circle cx="111" cy="62" r="6.5" fill="#ffd34d" stroke="#8a5a00" stroke-width="1.5"/><circle cx="89" cy="96" r="6.5" fill="#ffd34d" stroke="#8a5a00" stroke-width="1.5" opacity=".55"/></svg>`;
}
export function crashArtSVG() {
  return `<svg viewBox="0 0 200 145" class="art-crash" aria-hidden="true">
    <defs><linearGradient id="crg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#3ddc84" stop-opacity="0"/><stop offset="1" stop-color="#3ddc84" stop-opacity=".45"/></linearGradient></defs>
    <path d="M14 132 L186 132" stroke="#2a3d31" stroke-width="2"/><path d="M14 132 L14 14" stroke="#2a3d31" stroke-width="2"/>
    <path d="M16 130 C80 128 120 108 158 40 L158 130 Z" fill="url(#crg)"/>
    <path d="M16 130 C80 128 120 108 158 40" stroke="#3ddc84" stroke-width="4" fill="none" stroke-linecap="round"/>
    <g transform="translate(160 36) rotate(30)"><path d="M0 -20 C9 -12 11 -2 9 8 L-9 8 C-11 -2 -9 -12 0 -20Z" fill="#f5f5f5" stroke="#8a5a00" stroke-width="1.5"/><circle cy="-6" r="4.5" fill="#7a4a28" stroke="#5a321a"/><path d="M-9 4 -15 13 -7 10ZM9 4 15 13 7 10Z" fill="#ff4d5e"/><path d="M-5 9 0 20 5 9Z" fill="#ffc23d"/></g>
    <text x="40" y="58" font-family="Bungee, sans-serif" font-size="26" fill="#ffd34d">4,20×</text></svg>`;
}

export function towerArtSVG() {
  let rows = '';
  for (let r = 0; r < 5; r++) {
    const y = 118 - r * 24;
    for (let c = 0; c < 3; c++) {
      const x = 52 + c * 34;
      const bomb = (r === 3 && c === 2);
      const safe = r < 2 && c === (r % 3);
      rows += `<rect x="${x}" y="${y}" width="30" height="19" rx="5" fill="${bomb ? '#ff4d5e' : safe ? '#3ddc84' : '#3a5242'}" stroke="${bomb ? '#8a1020' : '#22352a'}" stroke-width="1.5"/>`;
    }
    rows += `<text x="162" y="${y + 14}" font-family="Rubik, sans-serif" font-weight="800" font-size="11" fill="#f5c542">×${(1.48 ** (r + 1)).toFixed(2).replace('.', ',')}</text>`;
  }
  return `<svg viewBox="0 0 200 145" class="art-tower" aria-hidden="true">${rows}
    <path d="M67 12 l0 14 M67 12 l12 5 l-12 5" stroke="#f5c542" stroke-width="2.5" fill="#f5c542" stroke-linejoin="round"/></svg>`;
}
export function minesArtSVG() {
  let cells = '';
  const gems = new Set([1, 7, 12, 18]), bombs = new Set([13]);
  for (let i = 0; i < 25; i++) {
    const x = 50 + (i % 5) * 21, y = 20 + Math.floor(i / 5) * 21;
    const fill = bombs.has(i) ? '#ff4d5e' : gems.has(i) ? '#ffd34d' : '#2f4a3a';
    cells += `<rect x="${x}" y="${y}" width="18" height="18" rx="4" fill="${fill}" stroke="#1a2a20" stroke-width="1"/>`;
    if (gems.has(i)) cells += `<path d="M${x + 4} ${y + 7} l5 -3 l5 3 l-5 7z" fill="#fff7c2" opacity=".85"/>`;
    if (bombs.has(i)) cells += `<circle cx="${x + 9}" cy="${y + 10}" r="5" fill="#2a0a0a"/><path d="M${x + 12} ${y + 6} l3 -3" stroke="#ffd34d" stroke-width="1.5"/>`;
  }
  return `<svg viewBox="0 0 200 145" class="art-mines" aria-hidden="true">${cells}</svg>`;
}
export function diceArtSVG() {
  return `<svg viewBox="0 0 200 145" class="art-dice" aria-hidden="true">
    <text x="100" y="62" text-anchor="middle" font-family="Bungee, sans-serif" font-size="34" fill="#3ddc84">57,32</text>
    <rect x="22" y="88" width="156" height="12" rx="6" fill="#3ddc84"/><rect x="22" y="88" width="105" height="12" rx="6" fill="#ff4d5e"/><rect x="118" y="88" width="9" height="12" fill="#ff4d5e"/>
    <circle cx="127" cy="94" r="10" fill="#f5f5f5" stroke="#8a5a00" stroke-width="2"/>
    <path d="M111 76 l6 8 l6 -8z" fill="#ffd34d"/>
    <text x="22" y="122" font-family="Rubik, sans-serif" font-weight="700" font-size="11" fill="#8fa597">0</text><text x="178" y="122" text-anchor="end" font-family="Rubik, sans-serif" font-weight="700" font-size="11" fill="#8fa597">100</text></svg>`;
}

// Tuiles des jeux Tower et Mines
export function bananaTileSVG() {
  return `<svg viewBox="0 0 100 100" class="tile-svg" aria-hidden="true"><path d="M24 24 C20 62 50 88 84 72 C88 70 86 64 81 65 C55 74 36 56 36 24 Z" fill="#ffd93b" stroke="#b38300" stroke-width="4" stroke-linejoin="round"/><path d="M22 26 L20 14 L34 14 L36 26 Z" fill="#6b4a1a"/><path d="M32 32 C34 52 50 66 72 66" stroke="#fff6b0" stroke-width="4" fill="none" opacity=".7" stroke-linecap="round"/></svg>`;
}
export function bombTileSVG() {
  return `<svg viewBox="0 0 100 100" class="tile-svg" aria-hidden="true"><circle cx="46" cy="58" r="28" fill="#1e1414" stroke="#000" stroke-width="3"/><circle cx="36" cy="48" r="8" fill="#fff" opacity=".18"/><rect x="58" y="24" width="14" height="12" rx="3" transform="rotate(40 65 30)" fill="#5a5a5a"/><path d="M70 26 Q78 14 88 16" stroke="#c8a060" stroke-width="4" fill="none"/><g fill="#ffd34d"><circle cx="88" cy="15" r="5"/></g><path d="M88 6v4M88 20v4M79 15h4M93 15h4" stroke="#ff8a3d" stroke-width="3" stroke-linecap="round"/></svg>`;
}

export function quizArtSVG() {
  return `<svg viewBox="0 0 200 145" class="art-quiz" aria-hidden="true">
    <rect x="30" y="22" width="140" height="62" rx="14" fill="#0b120e" stroke="#2f7a35" stroke-width="2"/>
    <text x="100" y="64" text-anchor="middle" font-family="Bungee, sans-serif" font-size="28" fill="#f5f5f5">7×8=<tspan fill="#f5c542">?</tspan></text>
    <rect x="30" y="98" width="140" height="10" rx="5" fill="#1d3126"/><rect x="30" y="98" width="92" height="10" rx="5" fill="#3ddc84"/>
    <g fill="#3ddc84">${[0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${62 + i * 15}" cy="124" r="4.5" ${i > 3 ? 'fill="#2f4a3a"' : ''}/>`).join('')}</g></svg>`;
}

export function capitalsArtSVG() {
  return `<svg viewBox="0 0 200 145" class="art-capitals" aria-hidden="true">
    <circle cx="100" cy="74" r="50" fill="#123a5c" stroke="#3a8fd0" stroke-width="2"/>
    <path d="M70 46c10 4 14 12 10 20s4 14 12 12 10 10 4 20M118 32c-6 8 2 14 10 12s16 8 10 18-6 16 4 22M60 92c8-2 14 2 16 10" stroke="none" fill="none"/>
    <path d="M66 50c8-6 20-6 24 2s-4 14 4 18 6 14-4 16-10 10-18 4-10-18-6-26 -4-10 0-14z" fill="#3ddc84" opacity=".85"/>
    <path d="M112 36c10-2 22 4 24 14s-8 10-4 18 14 8 10 18-14 12-20 4-2-16-10-20-8-12-4-22 2-11 4-12z" fill="#3ddc84" opacity=".85"/>
    <ellipse cx="100" cy="74" rx="50" ry="18" fill="none" stroke="#7fc4f5" stroke-opacity=".35" stroke-width="1.5"/>
    <path d="M100 24v100" stroke="#7fc4f5" stroke-opacity=".35" stroke-width="1.5"/>
    <g transform="translate(128 30)"><path d="M0 0v26" stroke="#e8e8e8" stroke-width="2.5"/><path d="M1 1h22l-6 6 6 6H1z" fill="#f5c542"/></g>
    <circle cx="129" cy="57" r="4" fill="#ff4d5e" stroke="#fff" stroke-width="1.5"/></svg>`;
}

export function moviesArtSVG() {
  return `<svg viewBox="0 0 200 145" class="art-movies" aria-hidden="true">
    <rect x="44" y="58" width="112" height="66" rx="8" fill="#1a1a1a" stroke="#555" stroke-width="2"/>
    <g transform="rotate(-14 44 58)"><rect x="44" y="38" width="112" height="20" rx="4" fill="#1a1a1a" stroke="#555" stroke-width="2"/>
      <g fill="#f5f5f5">${[0, 1, 2, 3, 4].map((i) => `<path d="M${54 + i * 22} 39h11l-8 18h-11z"/>`).join('')}</g></g>
    <g fill="#f5f5f5">${[0, 1, 2, 3, 4].map((i) => `<path d="M${50 + i * 22} 59h11l-8 14h-11z"/>`).join('')}</g>
    <text x="100" y="106" text-anchor="middle" font-family="Bungee, sans-serif" font-size="22" fill="#f5c542">ACTION</text>
    <g fill="#ffe08a"><circle cx="168" cy="40" r="3"/><circle cx="30" cy="96" r="2.5"/><circle cx="176" cy="104" r="2"/></g></svg>`;
}

export function hiloArtSVG() {
  const c = (x, r, sym, red, rot) => `<g transform="translate(${x} 72) rotate(${rot})"><rect x="-26" y="-38" width="52" height="76" rx="7" fill="#fff" stroke="#ccc"/><text x="-17" y="-18" font-family="Bungee, sans-serif" font-size="16" fill="${red ? '#c8102e' : '#161616'}">${r}</text><text x="0" y="14" text-anchor="middle" font-size="34" fill="${red ? '#c8102e' : '#161616'}">${sym}</text></g>`;
  return `<svg viewBox="0 0 200 145" class="art-hilo" aria-hidden="true">${c(72, '7', '♠', 0, -10)}${c(128, 'D', '♥', 1, 10)}
    <g fill="#3ddc84"><path d="M172 40l12 16h-24z"/></g><g fill="#ff4d5e"><path d="M172 104l12-16h-24z"/></g></svg>`;
}
export function kenoArtSVG() {
  const hits = [3, 9, 12, 18, 22, 27], picks = [3, 7, 12, 18, 25];
  return `<svg viewBox="0 0 200 145" class="art-keno" aria-hidden="true">${Array.from({ length: 30 }, (_, i) => {
    const x = 34 + (i % 6) * 26, y = 18 + Math.floor(i / 6) * 23, n = i + 1;
    const h = hits.includes(n) && picks.includes(n), p = picks.includes(n), d = hits.includes(n);
    return `<rect x="${x}" y="${y}" width="22" height="19" rx="4" fill="${h ? '#3ddc84' : p ? '#f5c542' : d ? '#5a2330' : '#1d3126'}"/><text x="${x + 11}" y="${y + 13.5}" text-anchor="middle" font-family="Rubik, sans-serif" font-weight="800" font-size="9" fill="${h || p ? '#0b120e' : '#9fb3a6'}">${n}</text>`;
  }).join('')}</svg>`;
}
export function wheelArtSVG() {
  const cols = ['#2b3a31', '#3ddc84', '#2b3a31', '#2fb1ff', '#2b3a31', '#f5c542', '#2b3a31', '#c77dff', '#2b3a31', '#3ddc84', '#2b3a31', '#ff8a3d'];
  const a = (2 * Math.PI) / cols.length;
  const p = (r, t) => `${(100 + r * Math.cos(t)).toFixed(1)} ${(76 + r * Math.sin(t)).toFixed(1)}`;
  return `<svg viewBox="0 0 200 145" class="art-wheel" aria-hidden="true">${cols.map((c, i) => `<path d="M${p(34, i * a)} L${p(60, i * a)} A60 60 0 0 1 ${p(60, (i + 1) * a)} L${p(34, (i + 1) * a)} A34 34 0 0 0 ${p(34, i * a)}Z" fill="${c}" stroke="#0b120e" stroke-width="1.5"/>`).join('')}
    <circle cx="100" cy="76" r="60" fill="none" stroke="#f5c542" stroke-width="3"/><text x="100" y="83" text-anchor="middle" font-family="Bungee, sans-serif" font-size="18" fill="#f5c542">×5</text><path d="M100 22l-8-14h16z" fill="#ff4d5e" stroke="#fff" stroke-width="1.5"/></svg>`;
}
export function limboArtSVG() {
  return `<svg viewBox="0 0 200 145" class="art-limbo" aria-hidden="true"><defs><linearGradient id="lbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3ddc84"/><stop offset="1" stop-color="#0f5a30"/></linearGradient></defs>
    <path d="M20 112 Q100 112 180 24" stroke="url(#lbg)" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M30 70h140" stroke="#f5c542" stroke-width="2" stroke-dasharray="6 5"/><text x="168" y="64" text-anchor="end" font-family="Rubik, sans-serif" font-weight="800" font-size="11" fill="#f5c542">cible ×2,00</text>
    <text x="70" y="104" text-anchor="middle" font-family="Bungee, sans-serif" font-size="26" fill="#fff">4,87×</text></svg>`;
}
export function jungleArtSVG() {
  const C = ['#ffd23f', '#b28cff', '#ff8a3d', '#5fe08a', '#36c2ff', '#9ccc65'];
  const win = new Set([8, 9, 15, 16, 17, 23]);
  const cells = Array.from({ length: 35 }, (_, k) => { const r = (k / 7) | 0, c = k % 7, w = win.has(k); const col = w ? '#ffd23f' : C[(k * 7 + r * 3) % C.length];
    return `<rect x="${37 + c * 18}" y="${10 + r * 18}" width="15" height="15" rx="4" fill="${col}" fill-opacity="${w ? 1 : .35}" ${w ? 'stroke="#fff" stroke-width="1.5"' : ''}/>`; }).join('');
  return `<svg viewBox="0 0 200 145" class="art-jungle" aria-hidden="true"><rect x="31" y="4" width="138" height="104" rx="10" fill="#0d2010" stroke="#6b4a1e" stroke-width="3"/>${cells}
    <text x="100" y="134" text-anchor="middle" font-family="Bungee, sans-serif" font-size="20" fill="#ffd23f" stroke="#6b4400" stroke-width="1">×256</text>
    <g transform="translate(160 96)"><rect x="-17" y="-12" width="34" height="22" rx="7" fill="#c2185b"/><text y="5" text-anchor="middle" font-family="Bungee, sans-serif" font-size="12" fill="#fff">×4</text></g></svg>`;
}
export function crapsArtSVG() {
  const die = (x, y, r, pips) => `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-22" y="-22" width="44" height="44" rx="9" fill="#fff8ec" stroke="#c9b48a" stroke-width="2"/>${pips.map(([a, b]) => `<circle cx="${a}" cy="${b}" r="4.6" fill="#c8102e"/>`).join('')}</g>`;
  return `<svg viewBox="0 0 200 145" class="art-craps" aria-hidden="true"><rect x="8" y="8" width="184" height="128" rx="14" fill="#0d5a37" stroke="#7a4a1e" stroke-width="5"/>
    <path d="M20 112h160" stroke="#f5c542" stroke-width="2"/><text x="100" y="128" text-anchor="middle" font-family="Bungee, sans-serif" font-size="11" fill="#f5c542">PASS LINE</text>
    <text x="100" y="32" text-anchor="middle" font-family="Bungee, sans-serif" font-size="11" fill="#fff" opacity=".8">4 · 5 · SIX · 8 · NINE · 10</text>
    ${die(78, 72, -14, [[-11, -11], [0, 0], [11, 11]])}${die(124, 66, 18, [[-11, -11], [11, -11], [-11, 11], [11, 11]])}</svg>`;
}
export function geoArtSVG() {
  return `<svg viewBox="0 0 200 145" class="art-geo" aria-hidden="true"><defs><radialGradient id="geoS" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#3a7bd5"/><stop offset="1" stop-color="#0b2c5a"/></radialGradient></defs>
    <circle cx="100" cy="70" r="58" fill="url(#geoS)" stroke="#9fd3ff" stroke-width="2"/>
    <path d="M62 40c10-8 22-6 28 2s-2 14 6 20-4 18-14 16-10-12-18-14-12-16-2-24z" fill="#3ddc84" opacity=".9"/><path d="M112 34c14-4 28 4 30 14s-8 10-4 20-8 20-18 14-2-14-10-20-8-24 2-28z" fill="#3ddc84" opacity=".9"/>
    <path d="M96 92c8 0 14 6 12 14s-10 10-16 6-6-20 4-20z" fill="#f5c542" stroke="#fff" stroke-width="2"/>
    <g transform="translate(118 96)"><path d="M0 0l-6-16a10 10 0 1 1 12 0z" fill="#ff4d5e" stroke="#fff" stroke-width="2"/><circle cx="0" cy="-22" r="3.5" fill="#fff"/></g></svg>`;
}
export function typingArtSVG() {
  const k = (x, y, c, on) => `<rect x="${x}" y="${y}" width="22" height="20" rx="5" fill="${on ? '#f5c542' : '#1b2a21'}" stroke="${on ? '#fff3a8' : '#3a5544'}" stroke-width="1.5"/><text x="${x + 11}" y="${y + 14}" text-anchor="middle" font-family="Bungee, sans-serif" font-size="11" fill="${on ? '#2a1600' : '#cfe8d6'}">${c}</text>`;
  return `<svg viewBox="0 0 200 145" class="art-typing" aria-hidden="true">
    <text x="100" y="34" text-anchor="middle" font-family="Bungee, sans-serif" font-size="20" fill="#3ddc84">banane <tspan fill="#f5c542">singe</tspan> jungle</text>
    ${'AZERTYUI'.split('').map((c, i) => k(14 + i * 22, 52, c, i === 2)).join('')}${'QSDFGHJK'.split('').map((c, i) => k(22 + i * 22, 76, c, i === 4)).join('')}${'WXCVBN'.split('').map((c, i) => k(36 + i * 22, 100, c, false)).join('')}
    <text x="186" y="136" text-anchor="end" font-family="Bungee, sans-serif" font-size="14" fill="#f5c542">72 mots/min</text></svg>`;
}
export function flagsArtSVG() {
  const f = (x, y, rot, colors, vertical = true) => `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-27" y="-18" width="54" height="36" rx="3" fill="#111"/>${colors.map((c, i) => vertical ? `<rect x="${-27 + i * 18}" y="-18" width="18" height="36" fill="${c}"/>` : `<rect x="-27" y="${-18 + i * 12}" width="54" height="12" fill="${c}"/>`).join('')}<rect x="-27" y="-18" width="54" height="36" rx="3" fill="none" stroke="#0006"/></g>`;
  return `<svg viewBox="0 0 200 145" class="art-flags" aria-hidden="true">${f(62, 58, -12, ['#0055a4', '#fff', '#ef4135'])}${f(138, 54, 10, ['#000', '#dd0000', '#ffce00'], false)}${f(100, 96, -2, ['#009246', '#fff', '#ce2b37'])}
    <text x="100" y="138" text-anchor="middle" font-family="Bungee, sans-serif" font-size="14" fill="#f5c542">?</text></svg>`;
}
export function motusArtSVG() {
  const L = ['B', 'A', 'N', 'A', 'N', 'E'], st = ['ok', 'ok', 'mis', 'no', 'ok', 'no'];
  return `<svg viewBox="0 0 200 145" class="art-motus" aria-hidden="true">${L.map((l, i) => {
    const x = 22 + i * 27, s = st[i];
    return `<rect x="${x}" y="50" width="24" height="28" rx="3" fill="${s === 'ok' ? '#e3263b' : '#1f5ea8'}"/>${s === 'mis' ? `<circle cx="${x + 12}" cy="64" r="11" fill="#f5c542"/>` : ''}<text x="${x + 12}" y="70.5" text-anchor="middle" font-family="Bungee, sans-serif" font-size="17" fill="#fff">${l}</text>`;
  }).join('')}${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${22 + i * 27}" y="84" width="24" height="28" rx="3" fill="#1f5ea8" opacity=".45"/>`).join('')}<text x="35" y="104" text-anchor="middle" font-family="Bungee, sans-serif" font-size="17" fill="#fff">B</text></svg>`;
}
export function higherArtSVG() {
  return `<svg viewBox="0 0 200 145" class="art-higher" aria-hidden="true">
    <rect x="30" y="22" width="60" height="88" rx="6" fill="#3a1420" stroke="#ff8a3d"/><text x="60" y="72" text-anchor="middle" font-family="Bungee, sans-serif" font-size="14" fill="#fff">160 M$</text>
    <rect x="110" y="22" width="60" height="88" rx="6" fill="#14324a" stroke="#2fb1ff"/><text x="140" y="72" text-anchor="middle" font-family="Bungee, sans-serif" font-size="22" fill="#f5c542">?</text>
    <path d="M100 52l7 9h-14zM100 92l7-9h-14z" fill="#f5c542"/><text x="100" y="134" text-anchor="middle" font-family="Rubik, sans-serif" font-weight="800" font-size="11" fill="#cfe0d5">plus ou moins ?</text></svg>`;
}

/* --------------------------- Jeux de réflexion (cartes du lobby) --------------------------- */
export function queensArtSVG() {
  const C = ['#f2a65a', '#8ecae6', '#e9d36c', '#c7a0d9', '#9ed67a'];
  const reg = ['00112', '00112', '33112', '33442', '34444'], Q = { '0,1': 1, '1,3': 1, '2,0': 1, '3,4': 1, '4,2': 1 };
  let h = '';
  reg.forEach((row, r) => [...row].forEach((g, c) => {
    h += `<rect x="${55 + c * 18}" y="${18 + r * 18}" width="18" height="18" fill="${C[+g]}" stroke="#0004"/>`;
    if (Q[r + ',' + c]) h += `<path transform="translate(${57 + c * 18} ${20 + r * 18}) scale(.58)" d="M3 18.5h18l-1.6-10-4.6 4.2L12 5.5l-2.8 7.2-4.6-4.2z" fill="#1a1400"/>`;
  }));
  return `<svg viewBox="0 0 200 145" class="art-queens" aria-hidden="true"><rect x="53" y="16" width="94" height="94" rx="4" fill="#0006"/>${h}<text x="100" y="134" text-anchor="middle" font-family="Rubik, sans-serif" font-weight="800" font-size="11" fill="#cfe0d5">une reine par couleur</text></svg>`;
}
export function tangoArtSVG() {
  const sun = (x, y) => `<g transform="translate(${x} ${y})"><circle r="6" fill="#ffb627"/><g stroke="#ffb627" stroke-width="2" stroke-linecap="round"><path d="M0-10v2M0 8v2M-10 0h2M8 0h2M-7-7l1.4 1.4M5.6 5.6 7 7M-7 7l1.4-1.4M5.6-5.6 7-7"/></g></g>`;
  const moon = (x, y) => `<path transform="translate(${x - 10} ${y - 10}) scale(.85)" d="M15.5 3.2a9 9 0 1 0 5.3 13.4A7.2 7.2 0 0 1 15.5 3.2z" fill="#7fb2ff"/>`;
  const g = ['SML', 'MSS', 'LMS'];
  let h = '';
  g.forEach((row, r) => [...row].forEach((v, c) => { const x = 66 + c * 34, y = 30 + r * 34; h += `<rect x="${x - 15}" y="${y - 15}" width="30" height="30" rx="5" fill="#ffffff12" stroke="#ffffff22"/>` + (v === 'S' ? sun(x, y) : v === 'M' ? moon(x, y) : ''); }));
  return `<svg viewBox="0 0 200 145" class="art-tango" aria-hidden="true">${h}<text x="83" y="34" text-anchor="middle" font-family="Bungee, sans-serif" font-size="12" fill="#f5c542">×</text><text x="117" y="102" text-anchor="middle" font-family="Bungee, sans-serif" font-size="12" fill="#f5c542">=</text><text x="100" y="134" text-anchor="middle" font-family="Rubik, sans-serif" font-weight="800" font-size="11" fill="#cfe0d5">soleils et lunes</text></svg>`;
}
export function pinpointArtSVG() {
  const c = ['Mercure', 'Vénus', '?', '?', '?'];
  return `<svg viewBox="0 0 200 145" class="art-pinpoint" aria-hidden="true">${c.map((t, i) => `<rect x="40" y="${10 + i * 22}" width="120" height="18" rx="5" fill="${t === '?' ? '#ffffff10' : '#2fb1ff33'}" stroke="${t === '?' ? '#ffffff22' : '#2fb1ff'}"/><text x="100" y="${23 + i * 22}" text-anchor="middle" font-family="Rubik, sans-serif" font-weight="700" font-size="11" fill="${t === '?' ? '#8fa597' : '#fff'}">${t}</text>`).join('')}
    <path d="M168 40s-9-9-9-16a9 9 0 0 1 18 0c0 7-9 16-9 16z" fill="#ff4d5e"/><circle cx="168" cy="24" r="3.4" fill="#fff"/></svg>`;
}
export function sudokuArtSVG() {
  const d = '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79';
  let h = '';
  for (let i = 0; i < 81; i++) { const r = Math.floor(i / 9), c = i % 9; if (d[i] !== '.') h += `<text x="${57 + c * 10 + 5}" y="${12 + r * 10 + 8}" text-anchor="middle" font-family="Rubik, sans-serif" font-weight="700" font-size="7.5" fill="${(r + c) % 5 ? '#eaf2ec' : '#f5c542'}">${d[i]}</text>`; }
  const lines = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => `<path d="M${57 + k * 10} 12v90M57 ${12 + k * 10}h90" stroke="${k % 3 ? '#ffffff26' : '#f5c54299'}" stroke-width="${k % 3 ? 0.6 : 1.4}"/>`).join('');
  return `<svg viewBox="0 0 200 145" class="art-sudoku" aria-hidden="true"><rect x="57" y="12" width="90" height="90" fill="#0005"/>${lines}${h}<text x="100" y="128" text-anchor="middle" font-family="Rubik, sans-serif" font-weight="800" font-size="11" fill="#cfe0d5">3 niveaux</text></svg>`;
}
export function snakeArtSVG() {
  const body = [[3, 5], [4, 5], [5, 5], [6, 5], [6, 4], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [10, 4]];
  return `<svg viewBox="0 0 200 145" class="art-snake" aria-hidden="true"><rect x="30" y="12" width="140" height="105" rx="6" fill="#10241a" stroke="#ffffff1a"/>
    ${body.map(([x, y], i) => `<rect x="${24 + x * 11}" y="${2 + y * 11 + 10}" width="10" height="10" rx="3" fill="${i === body.length - 1 ? '#3ddc84' : '#2fa866'}"/>`).join('')}
    <circle cx="${24 + 10 * 11 + 3}" cy="${2 + 4 * 11 + 16}" r="1.3" fill="#0a100c"/><circle cx="${24 + 10 * 11 + 7}" cy="${2 + 4 * 11 + 16}" r="1.3" fill="#0a100c"/>
    <path transform="translate(133 88) rotate(-25)" d="M-9 0a10 10 0 0 0 18 0a12 12 0 0 1-18 0z" fill="#ffd23f"/><text x="100" y="136" text-anchor="middle" font-family="Rubik, sans-serif" font-weight="800" font-size="11" fill="#cfe0d5">mange les bananes</text></svg>`;
}
export function demineurArtSVG() {
  const g = ['1.  2', '11 2*', ' 1*21', '11 1.', '*1  .'];
  const col = { 1: '#5fa8ff', 2: '#3ddc84' };
  let h = '';
  g.forEach((row, r) => [...row].forEach((v, c) => {
    const x = 60 + c * 16, y = 14 + r * 16, closed = v === '.' || v === '*';
    h += `<rect x="${x}" y="${y}" width="15" height="15" rx="2" fill="${closed ? '#2f5a3f' : '#0f1d15'}" stroke="#0006"/>`;
    if (v === '*') h += `<path d="M${x + 4} ${y + 12}V${y + 3}" stroke="#eaf2ec" stroke-width="1.2"/><path d="M${x + 4.6} ${y + 3}h6l-1.8 2.3 1.8 2.3h-6z" fill="#ff4d5e"/>`;
    else if (col[v]) h += `<text x="${x + 7.5}" y="${y + 11.5}" text-anchor="middle" font-family="Rubik, sans-serif" font-weight="800" font-size="10" fill="${col[v]}">${v}</text>`;
  }));
  return `<svg viewBox="0 0 200 145" class="art-demineur" aria-hidden="true">${h}<text x="100" y="114" text-anchor="middle" font-family="Bungee, sans-serif" font-size="13" fill="#f5c542">2:47</text><text x="100" y="134" text-anchor="middle" font-family="Rubik, sans-serif" font-weight="800" font-size="11" fill="#cfe0d5">contre la montre</text></svg>`;
}

export function scratchArtSVG() {
  const vals = ['50', '10', '50', '2', '50', '?', '5', '?', '?'];
  return `<svg viewBox="0 0 200 145" class="art-scratch" aria-hidden="true"><g transform="rotate(-6 100 70)"><rect x="40" y="14" width="120" height="112" rx="10" fill="#ffd23f" stroke="#c99a00" stroke-width="2"/>
    <text x="100" y="32" text-anchor="middle" font-family="Bungee, sans-serif" font-size="11" fill="#6b4a00">BANANE EXPRESS</text>
    ${vals.map((v, i) => { const x = 52 + (i % 3) * 33, y = 40 + Math.floor(i / 3) * 27; return v === '?' ? `<rect x="${x}" y="${y}" width="30" height="23" rx="5" fill="url(#scg)"/><path d="M${x + 6} ${y + 16} q6 -10 12 -2 t10 -6" stroke="#fff8" stroke-width="2" fill="none"/>` : `<rect x="${x}" y="${y}" width="30" height="23" rx="5" fill="#fff8e0"/><text x="${x + 15}" y="${y + 16}" text-anchor="middle" font-family="Rubik, sans-serif" font-weight="800" font-size="11" fill="${v === '50' ? '#c0001a' : '#3a2a00'}">${v}</text>`; }).join('')}
    <defs><linearGradient id="scg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#cfd6db"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#9aa5ad"/></linearGradient></defs></g></svg>`;
}
export function memoryArtSVG() {
  const card = (x, y, rot, up, fill) => `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-20" y="-27" width="40" height="54" rx="6" fill="${up ? '#fff8e0' : '#1d6b45'}" stroke="${up ? '#c99a00' : '#3ddc84'}" stroke-width="2"/>${up ? `<circle r="11" fill="${fill}"/>` : '<path d="M-10 -14h20M-10 0h20M-10 14h20" stroke="#3ddc8455" stroke-width="3"/>'}</g>`;
  return `<svg viewBox="0 0 200 145" class="art-memory" aria-hidden="true">${card(52, 62, -10, true, '#ffd23f')}${card(100, 58, 0, false)}${card(148, 62, 10, true, '#ffd23f')}${card(76, 100, 6, false)}${card(124, 100, -6, true, '#2fb1ff')}</svg>`;
}
export function crosswordArtSVG() {
  const g = ['BANANE', '.....', 'SINGE'];
  const cells = [[0, 0, 'B'], [0, 1, 'A'], [0, 2, 'N'], [0, 3, 'A'], [0, 4, 'N'], [0, 5, 'E'], [1, 1, ''], [2, 1, 'S'], [3, 1, ''], [4, 1, ''], [1, 4, ''], [2, 4, 'G'], [3, 4, 'E'], [2, 2, 'I'], [2, 3, 'N'], [2, 0, '']];
  return `<svg viewBox="0 0 200 145" class="art-crossword" aria-hidden="true">${cells.map(([r, c, ch]) => `<rect x="${46 + c * 18}" y="${22 + r * 18}" width="17" height="17" rx="2" fill="#f4f1e6" stroke="#0005"/>${ch ? `<text x="${54.5 + c * 18}" y="${35 + r * 18}" text-anchor="middle" font-family="Rubik, sans-serif" font-weight="800" font-size="12" fill="#1a2820">${ch}</text>` : ''}`).join('')}
    <text x="100" y="134" text-anchor="middle" font-family="Rubik, sans-serif" font-weight="800" font-size="11" fill="#cfe0d5">une grille par partie</text></svg>`;
}
