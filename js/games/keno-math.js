// Keno : 40 numéros, 10 tirés. Tables de gains (× la mise) selon le nombre de numéros choisis (1 à 10) et de numéros sortis.
// Calculées pour un RTP de 99 % (loi hypergéométrique), voir tools/keno-rtp.mjs.
export const KENO_N = 40, KENO_DRAW = 10;
export const KENO_TABLES = {
  low: [
    [0,3.96],
    [0,2,3.83],
    [0,0,6.18,12],
    [0,0,3.33,6.33,12],
    [0,0,2.13,4.03,7.68,15],
    [0,0,0,5.6,10,20,38],
    [0,0,0,3.46,6.58,12,24,45],
    [0,0,0,2.35,4.47,8.48,16,31,58],
    [0,0,0,0,5.84,11,21,40,76,144],
    [0,0,0,0,3.86,7.34,14,26,50,96,182],
  ],
  medium: [
    [0,3.96],
    [0,1.74,5.56],
    [0,0,5.65,18],
    [0,0,2.72,8.71,28],
    [0,0,0,8.67,28,89],
    [0,0,0,4.41,14,45,144],
    [0,0,0,0,15,43,149,476],
    [0,0,0,0,7.58,24,77,247,791],
    [0,0,0,0,0,26,89,271,868,2779],
    [0,0,0,0,0,14,45,143,458,1467,4694],
  ],
  high: [
    [0,3.96],
    [0,0,17.15],
    [0,0,4.49,31],
    [0,0,0,18,122],
    [0,0,0,5.99,42,294],
    [0,0,0,0,25,167,1205],
    [0,0,0,0,0,116,803,5667],
    [0,0,0,0,0,41,290,2017,10000],
    [0,0,0,0,0,0,211,1479,10000,10000],
    [0,0,0,0,0,0,83,573,4047,10000,10000],
  ],
};
const C = (n, k) => { if (k < 0 || k > n) return 0; let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; };
// Probabilité de toucher h numéros sur k choisis
export const kenoP = (k, h) => (C(k, h) * C(KENO_N - k, KENO_DRAW - h)) / C(KENO_N, KENO_DRAW);
export const kenoRTP = (risk, k) => KENO_TABLES[risk][k - 1].reduce((s, m, h) => s + m * kenoP(k, h), 0);
