import assert from 'node:assert/strict';
import { dims, pack, validate, placements } from '../js/engine.js';
const P0 = { e: 1, sur: 0, kerf: 4.5, pref: 'long' };
const pc = (o) => ({ d: 'P', l: 100, w: 50, q: 1, g: 'i', ct: 0, cb: 0, cl: 0, cr: 0, ...o });
const st = (l, w, q = 1, g = 'i') => ({ l, w, q, g });
let n = 0; const t = (name, f) => { f(); n++; console.log('OK  ' + name); };
t('1 débit 798×498', () => { const d = dims(pc({ l: 800, w: 500, ct: 1, cb: 1, cl: 1, cr: 1 }), P0); assert.equal(d.L, 798); assert.equal(d.W, 498); });
t('2 surcote 808×508', () => { const d = dims(pc({ l: 800, w: 500, ct: 1, cb: 1, cl: 1, cr: 1 }), { ...P0, sur: 5 }); assert.equal(d.pl, 808); assert.equal(d.pw, 508); });
const PK = { e: 0, sur: 0, kerf: 4, pref: 'long' };
t('3+4 trait de scie : 48+4+48=100 tient, 49+4+49 non', () => {
  let r = pack(PK, [st(100, 100)], [pc({ l: 48, w: 100, q: 2 })]); assert.equal(r.sheets.length, 1); assert.equal(r.unplaced.length, 0); assert.deepEqual(validate(r.sheets[0], PK), []);
  r = pack(PK, [st(100, 100)], [pc({ l: 49, w: 100, q: 2 })]); assert.equal(r.sheets.length, 2);
});
t('5 pièce trop grande signalée', () => { const r = pack(PK, [st(100, 100)], [pc({ l: 500, w: 500 })]); assert.equal(r.unplaced.length, 1); });
t('6 stock insuffisant sans blocage', () => { const r = pack(PK, [st(100, 100, 1)], [pc({ l: 90, w: 90, q: 3 })]); assert.equal(r.unplaced.length, 0); assert.equal(r.stats.extra, 2); assert.equal(r.stats.needed, 3); });
t('7 fil horizontal respecté', () => { const r = pack(PK, [st(200, 100, 1, 'h')], [pc({ l: 60, w: 30, q: 4, g: 'h' })]); placements(r.sheets[0]).forEach(p => assert.equal(p.rot, false)); });
t('7b fil vertical sur panneau horizontal : pièce tournée', () => { const r = pack(PK, [st(200, 100, 1, 'h')], [pc({ l: 60, w: 30, g: 'v' })]); assert.equal(placements(r.sheets[0])[0].rot, true); });
t('8 rotation autorisée si indifférent', () => { const r = pack(PK, [st(100, 60)], [pc({ l: 55, w: 95 })]); assert.equal(r.unplaced.length, 0); assert.equal(placements(r.sheets[0])[0].rot, true); });
t('12 validateur détecte un arbre invalide', () => { const r = pack(PK, [st(100, 100)], [pc({ l: 48, w: 100, q: 2 })]); const s = r.sheets[0]; s.root.cut.kerf = 1; assert.ok(validate(s, PK).length > 0); });
t('13 plusieurs formats', () => { const r = pack(PK, [st(100, 100), st(300, 200)], [pc({ l: 250, w: 150 }), pc({ l: 40, w: 40 })]); assert.equal(r.unplaced.length, 0); r.sheets.forEach(s => assert.deepEqual(validate(s, PK), [])); });
t('14 chutes non remplies artificiellement', () => { const r = pack(PK, [st(1000, 1000)], [pc({ l: 100, w: 100 })]); assert.equal(placements(r.sheets[0]).length, 1); assert.ok(r.stats.scrapPct > 98); });
t('lot pseudo-aléatoire : tous les arbres valides', () => { let s = 1; const rnd = () => (s = s * 16807 % 2147483647) / 2147483647; const pcs = Array.from({ length: 12 }, () => pc({ l: 100 + rnd() * 700 | 0, w: 80 + rnd() * 400 | 0, q: 1 + rnd() * 3 | 0 })); const P = { e: 1, sur: 5, kerf: 4.5, pref: 'area' }; const r = pack(P, [st(2800, 2070, 1), st(1200, 600, 2)], pcs); assert.equal(r.unplaced.length, 0); r.sheets.forEach(x => assert.deepEqual(validate(x, P), [])); });

import { removePiece, insertAt } from '../js/engine.js';
import { parseCSV, mapRows } from '../js/csv.js';
t('9 déplacement manuel sans réorganisation globale', () => {
  const P = { e: 0, sur: 0, kerf: 4, pref: 'long' }; const r = pack(P, [st(400, 100)], [pc({ l: 90, w: 100, q: 1, d: 'A' }), pc({ l: 100, w: 100, q: 1, d: 'B' })]);
  const sh = r.sheets[0], before = Object.fromEntries(placements(sh).map(p => [p.item.id, [p.x, p.y]])), id = placements(sh)[0].item.id, other = placements(sh).find(p => p.item.id !== id).item.id;
  const pcx = removePiece(sh, id); const res = insertAt(sh, pcx.item, 395, 5, P, pcx.rot);
  assert.ok(res.ok); assert.deepEqual(validate(sh, P), []); const after = Object.fromEntries(placements(sh).map(p => [p.item.id, [p.x, p.y]])); assert.deepEqual(after[other], before[other]); assert.equal(placements(sh).length, 2);
});
t('9b dépôt sur zone occupée refusé avec explication', () => {
  const P = { e: 0, sur: 0, kerf: 4, pref: 'long' }; const r = pack(P, [st(400, 100)], [pc({ l: 100, w: 100, q: 2 })]); const sh = r.sheets[0], ps = placements(sh), pcx = removePiece(sh, ps[0].item.id);
  const o = insertAt(sh, pcx.item, ps[1].x + 5, ps[1].y + 5, P, pcx.rot); assert.equal(o.ok, false); assert.ok(o.reason.length > 10);
});
t('15 import CSV ; et , avec virgule décimale et erreurs', () => {
  let r = mapRows(parseCSV('Désignation;Longueur;Largeur;Quantité;Fil;Chant haut;Chant bas;Chant gauche;Chant droit;Remarque\nCôté;800,5;500;8;H;1;0;oui;x;ok\nBad;abc;10;1;;;;;;'));
  assert.equal(r.pieces.length, 1); assert.equal(r.pieces[0].l, 800.5); assert.equal(r.pieces[0].q, 8); assert.equal(r.pieces[0].g, 'h'); assert.equal(r.pieces[0].cl, 1); assert.equal(r.pieces[0].cb, 0); assert.equal(r.errors.length, 1);
  r = mapRows(parseCSV('nom,longueur,largeur,qte\nA,100,50,2')); assert.equal(r.pieces[0].q, 2);
});
console.log(`\n${n} tests réussis. Non exécutés : 10, 11, 16, 17, 18 (interface / navigateur requis).`);
