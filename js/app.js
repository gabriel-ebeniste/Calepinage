import { dims, pack, validate, placements, stats, removePiece, insertAt, placeFirst } from './engine.js';
import { parseCSV, mapRows } from './csv.js';
const $ = s => document.querySelector(s), esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const blank = () => ({ name: 'Sans titre', stock: [{ l: 2800, w: 2070, q: 1, g: 'i', n: '' }], pieces: [{ d: 'Côté', l: 800, w: 500, q: 2, g: 'i', ct: 1, cb: 1, cl: 1, cr: 1, n: '' }], P: { e: 1, sur: 5, kerf: 4.5, pref: 'long' }, locks: [] });
let hist = [], fut = [], sel = null, msg = '';
let S = blank(), tab = 'stock', res = null, cur = 0, zoom = 1;
const TABS = [['stock', 'Stocks'], ['pieces', 'Pièces'], ['params', 'Réglages'], ['layout', 'Calepinage'], ['pdf', 'PDF']];
const GR = { i: 'Indifférent', h: 'Horizontal', v: 'Vertical' };
const num = (t, i, k, lab, v) => `<label>${lab}<input type="number" step="any" inputmode="decimal" data-t="${t}" data-i="${i}" data-k="${k}" value="${v ?? ''}"></label>`;
const txt = (t, i, k, lab, v) => `<label class="w">${lab}<input type="text" data-t="${t}" data-i="${i}" data-k="${k}" value="${esc(v)}"></label>`;
const grain = (t, i, v) => `<label>Fil<select data-t="${t}" data-i="${i}" data-k="g">${Object.entries(GR).map(([k, l]) => `<option value="${k}"${k === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>`;
const chk = (i, k, lab, v) => `<label class="chk">${lab}<input type="checkbox" data-t="pieces" data-i="${i}" data-k="${k}"${v ? ' checked' : ''}></label>`;
const color = i => `hsla(${(i * 67) % 360},55%,70%,.7)`;
function view() {
  $('#pname').textContent = S.name;
  $('#nav').innerHTML = TABS.map(([k, l]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('');
  const m = $('#main');
  if (tab === 'stock') m.innerHTML = S.stock.map((s, i) => `<div class="card"><div class="row">${num('stock', i, 'l', 'Longueur mm', s.l)}${num('stock', i, 'w', 'Largeur mm', s.w)}${num('stock', i, 'q', 'Qté', s.q)}${grain('stock', i, s.g)}${txt('stock', i, 'n', 'Remarque', s.n)}<button class="del" data-act="delstock" data-i="${i}">Suppr.</button></div></div>`).join('') + '<button class="pri" data-act="addstock">+ Panneau</button>';
  else if (tab === 'pieces') m.innerHTML = S.pieces.map((p, i) => { const d = dims(p, S.P); return `<div class="card"><div class="row">${txt('pieces', i, 'd', 'Désignation', p.d)}${num('pieces', i, 'l', 'Longueur', p.l)}${num('pieces', i, 'w', 'Largeur', p.w)}${num('pieces', i, 'q', 'Qté', p.q)}${grain('pieces', i, p.g)}</div><div class="row" style="margin-top:6px">${chk(i, 'ct', 'Chant haut', p.ct)}${chk(i, 'cb', 'bas', p.cb)}${chk(i, 'cl', 'gauche', p.cl)}${chk(i, 'cr', 'droit', p.cr)}${txt('pieces', i, 'n', 'Remarque', p.n)}<button class="del" data-act="delpiece" data-i="${i}">Suppr.</button></div><small>Débit : ${d.L} × ${d.W} mm — calepinage (surcote) : ${d.pl} × ${d.pw} mm</small></div>`; }).join('') + '<div class="row"><button class="pri" data-act="addpiece">+ Pièce</button><button data-act="csv">Importer CSV</button></div>';
  else if (tab === 'params') m.innerHTML = `<div class="card"><div class="row">${num('P', 0, 'e', 'Épaisseur chant mm', S.P.e)}${num('P', 0, 'sur', 'Surcote par côté mm', S.P.sur)}${num('P', 0, 'kerf', 'Trait de scie mm', S.P.kerf)}<label>Chutes<select data-t="P" data-i="0" data-k="pref">${[['long', 'Plutôt longues'], ['wide', 'Plutôt larges'], ['area', 'Surface de chute']].map(([k, l]) => `<option value="${k}"${S.P.pref === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label></div></div><p><small>Installer sur iPhone : Safari → Partager → « Sur l'écran d'accueil ». Les projets sont stockés sur l'appareil ; pour passer de l'iPhone à l'ordinateur, utiliser Exporter / Importer (aucune synchronisation automatique).</small></p>`;
  else if (tab === 'layout') layout(m);
  else m.innerHTML = '<div class="card"><p>Fiche de débit + un calepinage par panneau. Sur iPhone : Imprimer → partager → « Enregistrer au format PDF » (via les fonctions d\'impression d\'iOS).</p><button class="pri" data-act="print">Imprimer / Exporter PDF</button></div>';
}
function svg(sh, scale = 1) {
  const fs = Math.max(sh.W, sh.H) / 55; let o = `<svg class="sheet" viewBox="-8 -8 ${sh.W + 16} ${sh.H + 16}" style="width:${100 * scale}%"><rect width="${sh.W}" height="${sh.H}" fill="#eef0f1" stroke="#1f2a33" stroke-width="${fs / 6}"/>`;
  for (const p of placements(sh)) {
    const it = p.item, lk = (S.locks || []).includes(it.id), on = sel === it.id;
    o += `<g data-id="${it.id}" style="touch-action:none;cursor:${lk ? 'not-allowed' : 'grab'}"><rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${color(it.idx)}" stroke="${on ? '#2f6f8f' : '#333'}" stroke-width="${on ? fs / 4 : fs / 12}"${lk ? ` stroke-dasharray="${fs / 2} ${fs / 4}"` : ''}/>`;
    const side = { t: p.rot ? 'r' : 't', r: p.rot ? 'b' : 'r', b: p.rot ? 'l' : 'b', l: p.rot ? 't' : 'l' }, sw = fs / 3;
    for (const [k, sd] of Object.entries(side)) if (it.c[k]) { const [x1, y1, x2, y2] = sd === 't' ? [p.x, p.y, p.x + p.w, p.y] : sd === 'b' ? [p.x, p.y + p.h, p.x + p.w, p.y + p.h] : sd === 'l' ? [p.x, p.y, p.x, p.y + p.h] : [p.x + p.w, p.y, p.x + p.w, p.y + p.h]; o += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#b3392b" stroke-width="${sw}"/>`; }
    if (p.w > fs * 5 && p.h > fs * 2.2) { o += `<text x="${p.x + p.w / 2}" y="${p.y + p.h / 2}" font-size="${fs}" text-anchor="middle" fill="#1f2a33" pointer-events="none">${lk ? '🔒 ' : ''}${esc(it.name)}</text>`; if (p.h > fs * 3.6 && p.w > fs * 9) o += `<text x="${p.x + p.w / 2}" y="${p.y + p.h / 2 + fs * 1.2}" font-size="${fs * .8}" text-anchor="middle" fill="#333" pointer-events="none">${it.L}×${it.W}</text>`; }
    o += '</g>';
  }
  return o + '</svg>';
}
function layout(m) {
  if (!res) { res = pack(S.P, S.stock, S.pieces); cur = 0; }
  const n = res.sheets.length; cur = Math.min(cur, Math.max(0, n - 1)); const sh = res.sheets[cur];
  const placed = res.sheets.reduce((a, x) => a + placements(x).length, 0);
  const st = res.stats = stats(res, S.stock.map(s => ({ q: +s.q || 0 })), placed + res.unplaced.length);
  const errs = res.sheets.flatMap((s, i) => validate(s, S.P).map(e => `Panneau ${i + 1} : ${e}`));
  const sp = sel && sh && placements(sh).find(p => p.item.id === sel), lk = sel && (S.locks || []).includes(sel);
  const stat = `<div class="stats"><div>Disponibles : <b>${st.available}</b></div><div>Nécessaires : <b>${st.needed}</b></div><div>Supplémentaires : <b>${st.extra}</b></div><div>Pièces : <b>${st.placed}/${st.total}</b> placées</div><div>Non placées : <b>${st.unplaced}</b></div><div>Surface utilisée : <b>${(st.used / 1e6).toFixed(2)} m²</b></div><div>Chute : <b>${(st.scrap / 1e6).toFixed(2)} m² (${st.scrapPct.toFixed(1)} %)</b></div><div class="${errs.length ? 'err' : 'ok'}">Validation guillotine : <b>${errs.length ? 'ÉCHEC' : 'OK'}</b></div></div>`;
  m.innerHTML = `<div class="row" style="margin-bottom:8px"><button data-act="prev">◀</button><b>Panneau ${n ? cur + 1 : 0} / ${n}</b><button data-act="next">▶</button><button data-act="zout">−</button><button data-act="zin">+</button><button data-act="undo"${hist.length ? '' : ' disabled'}>↶ Annuler</button><button data-act="redo"${fut.length ? '' : ' disabled'}>↷ Rétablir</button><button class="pri" data-act="reopt">Réoptimiser</button></div>
  ${msg ? `<div class="card err">${esc(msg)}</div>` : ''}${sp ? `<div class="row" style="margin-bottom:8px"><span>Sélection : <b>${esc(sp.item.name)}</b></span><button data-act="${lk ? 'unlock' : 'lock'}">${lk ? 'Déverrouiller' : 'Verrouiller'}</button></div>` : ''}
  <div class="lay"><div>${sh ? `<p style="margin:4px 0">${sh.W} × ${sh.H} mm — <b class="${sh.virtual ? 'err' : ''}">${sh.virtual ? 'panneau supplémentaire (virtuel)' : 'panneau en stock'}</b></p><div class="sheetbox">${svg(sh, zoom)}</div><small>Glissez une pièce sur une zone de chute libre : elle se cale dans son coin (coupes guillotine + trait de scie). Touchez une pièce pour la sélectionner.</small>` : '<p>Aucun panneau.</p>'}</div><div>${stat}<div class="card" id="unz" style="margin-top:8px;${res.unplaced.length ? 'border-color:#b3392b' : ''}"><b>Pièces non placées</b><br><small>Déposez ici une pièce pour la retirer du panneau.</small>${res.unplaced.map((u, i) => `<div class="row" style="margin-top:6px"><span style="flex:1">${esc(u.item.name)} <small class="err">${esc(u.reason)}</small></span><button data-act="placeun" data-i="${i}">Placer</button></div>`).join('')}</div>${errs.length ? `<div class="card err">${errs.map(esc).join('<br>')}</div>` : ''}</div></div>`;
}
function printView() {
  if (!res) res = pack(S.P, S.stock, S.pieces);
  $('#print').innerHTML = `<h2>${esc(S.name)} — fiche de débit</h2><table><tr><th>Désignation</th><th>Débit L×l (mm)</th><th>Qté</th><th>Chants (H B G D)</th></tr>${S.pieces.map(p => { const d = dims(p, S.P); return `<tr><td>${esc(p.d)}</td><td>${d.L} × ${d.W}</td><td>${p.q}</td><td>${[p.ct, p.cb, p.cl, p.cr].map(x => x ? '■' : '–').join(' ')}</td></tr>`; }).join('')}</table>` + res.sheets.map((s, i) => `<h3>Panneau ${i + 1}/${res.sheets.length} — ${s.W} × ${s.H} mm${s.virtual ? ' (supplémentaire)' : ''}</h3>${svg(s)}`).join('');
  setTimeout(() => window.print(), 50);
}
const dl = (name, data) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
const DB = () => JSON.parse(localStorage.getItem('calepinage-projets') || '{}');
const snap = () => JSON.stringify({ res, locks: S.locks }), restore = j => { const o = JSON.parse(j); res = o.res; S.locks = o.locks; }, commit = b => { hist.push(b); fut = []; msg = ''; };
const load = o => { if (!o || !Array.isArray(o.stock) || !Array.isArray(o.pieces) || !o.P) throw new Error('Fichier de projet invalide'); S = o; S.locks = o.locks || []; res = o.layout || null; hist = []; fut = []; sel = null; msg = ''; };
const ACT = {
  addstock: () => S.stock.push({ l: 2800, w: 2070, q: 1, g: 'i', n: '' }), addpiece: () => S.pieces.push({ d: '', l: 500, w: 300, q: 1, g: 'i', ct: 0, cb: 0, cl: 0, cr: 0, n: '' }),
  delstock: i => confirm('Supprimer ce panneau ?') && S.stock.splice(i, 1), delpiece: i => confirm('Supprimer cette pièce ?') && S.pieces.splice(i, 1),
  prev: () => cur = Math.max(0, cur - 1), next: () => cur = Math.min(res.sheets.length - 1, cur + 1), zin: () => zoom = Math.min(6, zoom * 1.5), zout: () => zoom = Math.max(1, zoom / 1.5), reopt: () => { if (res && !confirm('Réoptimiser réorganise toutes les pièces (verrouillées comprises). Continuer ?')) return; if (res) commit(snap()); res = null; },
  undo: () => { if (hist.length) { fut.push(snap()); restore(hist.pop()); msg = ''; } }, redo: () => { if (fut.length) { hist.push(snap()); restore(fut.pop()); msg = ''; } },
  lock: () => { if (sel) { commit(snap()); S.locks.push(sel); } }, unlock: () => { commit(snap()); S.locks = S.locks.filter(x => x !== sel); },
  placeun: i => { const b = snap(), u = res.unplaced[i]; if (placeFirst([res.sheets[cur], ...res.sheets.filter((_, k) => k !== cur)].filter(Boolean), u.item, S.P)) { res.unplaced.splice(i, 1); commit(b); } else msg = 'Aucune zone libre assez grande (ou fil incompatible) : déposez la pièce à la main ou réoptimisez.'; },
  csv: () => $('#csv').click(),
  new: () => { if (confirm('Créer un nouveau projet ? Les modifications non enregistrées seront perdues.')) { S = blank(); res = null; } },
  save: () => { S.layout = res; const n = prompt('Nom du projet :', S.name); if (n) { S.name = n; const d = DB(); d[n] = S; localStorage.setItem('calepinage-projets', JSON.stringify(d)); } },
  open: () => { const d = DB(), k = Object.keys(d); if (!k.length) return alert('Aucun projet enregistré sur cet appareil.'); const n = prompt('Ouvrir :\n' + k.join('\n'), k[0]); if (n && d[n]) load(d[n]); else if (n) alert('Projet introuvable.'); },
  export: () => { S.layout = res; dl((S.name || 'projet') + '.calepinage.json', JSON.stringify(S)); }, import: () => $('#file').click(), print: () => printView()
};
document.addEventListener('click', e => { const b = e.target.closest('[data-tab],[data-act]'); if (!b) return; if (b.dataset.tab) tab = b.dataset.tab; else { ACT[b.dataset.act](b.dataset.i !== undefined ? +b.dataset.i : undefined); if (b.dataset.act !== 'print' && !['prev', 'next', 'zin', 'zout'].includes(b.dataset.act) ) res = b.dataset.act === 'save' || b.dataset.act === 'open' || b.dataset.act === 'export' ? res : res; } if (b.dataset.act !== 'print') view(); });
document.addEventListener('change', e => { const el = e.target; if (el.id === 'csv') { const r = new FileReader(); r.onload = () => { const { pieces, errors } = mapRows(parseCSV(r.result)); if (!pieces.length) return alert('Aucune ligne valide.\n' + errors.join('\n')); const prev = pieces.slice(0, 5).map(p => `${p.d} ${p.l}×${p.w} ×${p.q}`).join('\n'); if (confirm(`${pieces.length} pièce(s) valide(s) :\n${prev}\n${errors.length ? errors.length + ' ligne(s) en erreur :\n' + errors.slice(0, 8).join('\n') + '\n' : ''}Ajouter au projet ?`)) { S.pieces.push(...pieces); res = null; hist = []; fut = []; view(); } }; r.readAsText(el.files[0]); el.value = ''; return; }
    if (el.id === 'file') { const r = new FileReader(); r.onload = () => { try { load(JSON.parse(r.result)); view(); } catch (x) { alert('Import impossible : ' + x.message); } }; r.readAsText(el.files[0]); el.value = ''; return; } const d = el.dataset; if (!d.k) return; const v = el.type === 'checkbox' ? +el.checked : el.type === 'number' ? +el.value : el.value; (d.t === 'P' ? S.P : S[d.t][+d.i])[d.k] = v; res = null; hist = []; fut = []; S.locks = []; if (d.t === 'pieces') view(); });
let drag = null;
const pt = (sv, e) => { const p = sv.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(sv.getScreenCTM().inverse()); };
document.addEventListener('pointerdown', e => { const g = e.target.closest('g[data-id]'); if (!g || tab !== 'layout' || !g.closest('.sheetbox')) return; const id = g.dataset.id; sel = id; if (S.locks.includes(id)) { msg = 'Pièce verrouillée : déverrouillez-la pour la déplacer.'; view(); return; } msg = ''; drag = { id, g, sv: g.ownerSVGElement, s: pt(g.ownerSVGElement, e), cx: e.clientX, cy: e.clientY, moved: false }; g.setPointerCapture(e.pointerId); });
document.addEventListener('pointermove', e => { if (!drag) return; if (Math.hypot(e.clientX - drag.cx, e.clientY - drag.cy) > 6) drag.moved = true; if (drag.moved) { const p = pt(drag.sv, e); drag.g.setAttribute('transform', `translate(${p.x - drag.s.x} ${p.y - drag.s.y})`); } });
document.addEventListener('pointerup', e => {
  if (!drag) return; const d = drag; drag = null; if (!d.moved) return view();
  const sh = res.sheets[cur], orig = placements(sh).find(p => p.item.id === d.id), p = pt(d.sv, e), b = snap();
  const un = document.elementFromPoint(e.clientX, e.clientY)?.closest('#unz'), pc = removePiece(sh, d.id);
  if (un) { res.unplaced.push({ item: pc.item, reason: 'Retirée manuellement' }); commit(b); }
  else { const r = insertAt(sh, pc.item, orig.x + p.x - d.s.x + 1, orig.y + p.y - d.s.y + 1, S.P, pc.rot); if (r.ok) commit(b); else { restore(b); msg = r.reason; } }
  view();
});
document.addEventListener('keydown', e => { if (!(e.ctrlKey || e.metaKey)) return; const k = e.key.toLowerCase(); if (k === 'z') ACT.undo(); else if (k === 'y') ACT.redo(); else if (k === 's') ACT.save(); else return; e.preventDefault(); view(); });
view();
if ('serviceWorker' in navigator) { navigator.serviceWorker.register('service-worker.js'); let r = false; navigator.serviceWorker.addEventListener('controllerchange', () => { if (r) return; r = true; if (sessionStorage.getItem('sw-first')) location.reload(); sessionStorage.setItem('sw-first', '1'); }); }
