// Moteur de calepinage guillotine — sans dépendance DOM, testable avec Node.
export const dims = (p, P) => {
  const L = p.l - P.e * ((+p.cl || 0) + (+p.cr || 0));
  const W = p.w - P.e * ((+p.ct || 0) + (+p.cb || 0));
  return { L, W, pl: L + 2 * P.sur, pw: W + 2 * P.sur };
};
const axisOf = (pg, rot) => pg === 'i' ? null : ((pg === 'h') === !rot ? 'x' : 'y');
export const okGrain = (pg, sg, rot) => { const a = axisOf(pg, rot); return a === null || a === (sg === 'v' ? 'y' : 'x'); };
const orients = (it, sg) => [{ w: it.pl, h: it.pw, rot: false }, { w: it.pw, h: it.pl, rot: true }].filter(o => okGrain(it.g, sg, o.rot));
const cmp = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
const leaves = (n, out = []) => { if (n.cut) { leaves(n.a, out); leaves(n.b, out); } else if (!n.piece) out.push(n); return out; };
const allLeaves = (n, out = []) => { if (n.cut) { allLeaves(n.a, out); allLeaves(n.b, out); } else out.push(n); return out; };

function split(n, axis, pos, k) {
  n.cut = { axis, pos, kerf: k };
  if (axis === 'v') { n.a = { x: n.x, y: n.y, w: pos, h: n.h }; n.b = { x: n.x + pos + k, y: n.y, w: n.w - pos - k, h: n.h }; }
  else { n.a = { x: n.x, y: n.y, w: n.w, h: pos }; n.b = { x: n.x, y: n.y + pos + k, w: n.w, h: n.h - pos - k }; }
}
function firstAxis(lf, o, P) {
  const k = P.kerf, sc = first => {
    const r = first === 'v'
      ? [[lf.w - o.w - k, lf.h], [o.w, lf.h - o.h - k]]
      : [[lf.w, lf.h - o.h - k], [lf.w - o.w - k, o.h]];
    const big = r.filter(([w, h]) => w > 0 && h > 0).sort((a, b) => b[0] * b[1] - a[0] * a[1])[0];
    if (!big) return 0;
    return P.pref === 'wide' ? Math.min(...big) : P.pref === 'area' ? big[0] * big[1] : Math.max(...big);
  };
  return sc('v') >= sc('h') ? 'v' : 'h';
}
export const countCuts = n => n.cut ? 1 + countCuts(n.a) + countCuts(n.b) : 0;
export const freeLeaves = sh => leaves(sh.root);
function place(lf, o, it, P, sm = 'auto') {
  const k = P.kerf; let t = lf;
  const sv = () => { if (t.w - o.w > k) { split(t, 'v', o.w, k); t = t.a; } };
  const sh = () => { if (t.h - o.h > k) { split(t, 'h', o.h, k); t = t.a; } };
  (sm === 'auto' ? firstAxis(lf, o, P) : sm) === 'v' ? (sv(), sh()) : (sh(), sv());
  t.piece = { item: it, w: o.w, h: o.h, rot: o.rot };
}
export function buildItems(P, pieces) {
  const items = [];
  pieces.forEach((p, i) => {
    const d = dims(p, P);
    for (let n = 0; n < (+p.q || 0); n++) items.push({ id: `${i}-${n}`, idx: i, name: p.d || 'Pièce ' + (i + 1), g: p.g || 'i', ...d, c: { t: +p.ct || 0, b: +p.cb || 0, l: +p.cl || 0, r: +p.cr || 0 } });
  });
  return items;
}
const fitKey = (lf, o, k, mode) => { const dw = lf.w - o.w, dh = lf.h - o.h, ar = lf.w * lf.h - o.w * o.h, nc = (dw > k ? 1 : 0) + (dh > k ? 1 : 0); return mode === 0 ? [Math.min(dw, dh), ar] : mode === 1 ? [ar, Math.min(dw, dh)] : mode === 2 ? [Math.max(dw, dh), ar] : [nc, Math.min(dw, dh), ar]; };
function run(items, stock, P, fit, sm) {
  const sheets = [], avail = stock.map(s => +s.q || 0), unplaced = [];
  for (const it of items) {
    let best = null;
    for (const sh of sheets) for (const lf of leaves(sh.root)) for (const o of orients(it, sh.g))
      if (o.w <= lf.w && o.h <= lf.h) { const sc = fitKey(lf, o, P.kerf, fit); if (!best || cmp(sc, best.sc) < 0) best = { sh, lf, o, sc }; }
    if (!best) {
      const c = stock.map((s, i) => ({ s, i })).filter(({ s }) => orients(it, s.g).some(o => o.w <= s.l && o.h <= s.w));
      if (!c.length) { unplaced.push({ item: it, reason: `Pièce trop grande ou fil incompatible (${it.pl} × ${it.pw} mm avec surcote)` }); continue; }
      const real = c.filter(x => avail[x.i] > 0).sort((a, b) => a.s.l * a.s.w - b.s.l * b.s.w)[0];
      const x = real || c.sort((a, b) => b.s.l * b.s.w - a.s.l * a.s.w)[0];
      if (real) avail[x.i]--;
      const sh = { si: x.i, ref: x.s.r || '', W: x.s.l, H: x.s.w, g: x.s.g, virtual: !real, root: { x: 0, y: 0, w: x.s.l, h: x.s.w } };
      sheets.push(sh);
      best = { sh, lf: sh.root, o: orients(it, sh.g).find(o => o.w <= sh.W && o.h <= sh.H) };
    }
    place(best.lf, best.o, it, P, sm);
  }
  return { sheets, unplaced };
}
// Meilleure chute libre par panneau selon la préférence (longueur / largeur / surface).
function chuteScore(r, P) { let s = 0; for (const sh of r.sheets) { let b = 0; for (const l of leaves(sh.root)) { const v = P.pref === 'wide' ? Math.min(l.w, l.h) : P.pref === 'area' ? l.w * l.h : Math.max(l.w, l.h); if (v > b) b = v; } s += b; } return s; }
export function pack(P, stockIn, piecesIn) {
  const stock = stockIn.filter(s => s.l > 0 && s.w > 0).map(s => ({ l: Math.max(+s.l, +s.w), w: Math.min(+s.l, +s.w), q: +s.q || 0, g: s.g || 'i', r: s.r || '' }));
  const items = buildItems(P, piecesIn.filter(p => p.l > 0 && p.w > 0));
  const keys = [it => it.pl * it.pw, it => Math.max(it.pl, it.pw), it => it.pw, it => it.pl];
  let seed = 12345; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  let best = null;
  if (stock.length) for (let pass = 0; pass < 8; pass++) for (const kf of keys) {
    const nz = pass ? new Map(items.map(it => [it, 1 + (rnd() - .5) * .3])) : null, f = it => kf(it) * (nz ? nz.get(it) : 1);
    const sorted = [...items].sort((a, b) => f(b) - f(a));
    for (let fit = 0; fit < 4; fit++) for (const sm of ['auto', 'v', 'h']) {
      const r = run(sorted, stock, P, fit, sm);
      // Priorités : toutes les pièces placées > panneaux hors stock > surface de panneaux > nombre de coupes > chute demandée
      const key = [r.unplaced.length, r.sheets.filter(s => s.virtual).length, r.sheets.reduce((s, x) => s + x.W * x.H, 0), r.sheets.reduce((s, x) => s + countCuts(x.root), 0), -chuteScore(r, P)];
      if (!best || cmp(key, best.key) < 0) best = { r, key };
    }
  }
  const r = best ? best.r : { sheets: [], unplaced: items.map(it => ({ item: it, reason: 'Aucun panneau en stock' })) };
  r.stats = stats(r, stock, items.length);
  return r;
}
export function stats(r, stock, total) {
  const area = r.sheets.reduce((s, x) => s + x.W * x.H, 0);
  const used = r.sheets.reduce((s, x) => s + placements(x).reduce((a, p) => a + p.w * p.h, 0), 0);
  return { available: stock.reduce((s, x) => s + x.q, 0), needed: r.sheets.length, extra: r.sheets.filter(s => s.virtual).length, total, placed: total - r.unplaced.length, unplaced: r.unplaced.length, used, scrap: area - used, scrapPct: area ? (area - used) / area * 100 : 0, cuts: r.sheets.reduce((s, x) => s + countCuts(x.root), 0) };
}
export const placements = sh => allLeaves(sh.root).filter(n => n.piece).map(n => ({ x: n.x, y: n.y, w: n.piece.w, h: n.piece.h, rot: n.piece.rot, item: n.piece.item }));
// Validateur indépendant : recalcule la géométrie de chaque coupe et contrôle chaque feuille.
export function validate(sh, P) {
  const err = [], E = 1e-6;
  const rec = (n, path) => {
    if (n.cut) {
      const { axis, pos, kerf } = n.cut, tot = axis === 'v' ? n.w : n.h;
      if (Math.abs(kerf - P.kerf) > E) err.push(`Trait de scie incorrect (${path || 'racine'})`);
      if (!(pos > 0 && pos + kerf < tot)) { err.push(`Coupe ${axis} non traversante ou hors zone (${path || 'racine'})`); return; }
      const ea = axis === 'v' ? { x: n.x, y: n.y, w: pos, h: n.h } : { x: n.x, y: n.y, w: n.w, h: pos };
      const eb = axis === 'v' ? { x: n.x + pos + kerf, y: n.y, w: n.w - pos - kerf, h: n.h } : { x: n.x, y: n.y + pos + kerf, w: n.w, h: n.h - pos - kerf };
      [[n.a, ea, 'a'], [n.b, eb, 'b']].forEach(([c, e, s]) => {
        if (!c || ['x', 'y', 'w', 'h'].some(k => Math.abs(c[k] - e[k]) > E)) err.push(`Zone enfant incohérente (${path}${s})`); else rec(c, path + s);
      });
    } else if (n.piece) {
      const p = n.piece, it = p.item, ew = p.rot ? it.pw : it.pl, eh = p.rot ? it.pl : it.pw;
      if (Math.abs(p.w - ew) > E || Math.abs(p.h - eh) > E) err.push(`Dimensions de ${it.name} ≠ prédébit`);
      if (p.w > n.w + E || p.h > n.h + E) err.push(`${it.name} dépasse sa zone de coupe`);
      if (!okGrain(it.g, sh.g, p.rot)) err.push(`${it.name} : fil non respecté`);
    }
  };
  rec(sh.root, '');
  return err;
}
