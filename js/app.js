import { dims, pack, validate, placements } from './engine.js';
import { parseCSV, mapRows } from './csv.js';
const $ = s => document.querySelector(s), esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const blank = () => ({ name: 'Sans titre', stock: [{ l: 2800, w: 2070, q: 1, g: 'i', n: '' }], pieces: [{ d: 'Côté', l: 800, w: 500, q: 2, g: 'i', ct: 1, cb: 1, cl: 1, cr: 1, n: '' }], P: { e: 1, sur: 5, kerf: 4.5, pref: 'long' } });
let S = blank(), res = null, cur = 0, zoom = 1, uid = 0;
const GR = { i: 'Indifférent', h: 'Horizontal', v: 'Vertical' };
const color = i => `hsla(${(i * 67) % 360},55%,70%,.75)`;
const td = (l, h, c = '') => `<td data-l="${l}" class="${c}">${h}</td>`;
const inN = (t, i, k, v) => `<input type="number" step="any" inputmode="decimal" data-t="${t}" data-i="${i}" data-k="${k}" value="${v ?? ''}">`;
const inT = (t, i, k, v) => `<input type="text" data-t="${t}" data-i="${i}" data-k="${k}" value="${esc(v)}">`;
const inG = (t, i, v) => `<select data-t="${t}" data-i="${i}" data-k="g">${Object.entries(GR).map(([k, l]) => `<option value="${k}"${k === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
const inC = (i, k, v) => `<input type="checkbox" data-t="pieces" data-i="${i}" data-k="${k}"${v ? ' checked' : ''}>`;
const deb = (p) => { const d = dims(p, S.P); return `${d.L} × ${d.W}`; };
function left() {
  $('#pname').textContent = S.name;
  $('#left').innerHTML = `<h3>Panneaux (stock)</h3><table><thead><tr><th>Longueur</th><th>Largeur</th><th>Qté</th><th>Fil</th><th>Remarque</th><th></th></tr></thead><tbody>${S.stock.map((s, i) => `<tr>${td('Longueur mm', inN('stock', i, 'l', s.l))}${td('Largeur mm', inN('stock', i, 'w', s.w))}${td('Qté', inN('stock', i, 'q', s.q))}${td('Fil', inG('stock', i, s.g))}${td('Remarque', inT('stock', i, 'n', s.n), 'rm')}${td('', `<button class="del" data-act="delstock" data-i="${i}">✕</button>`, 'x')}</tr>`).join('')}</tbody></table><div class="row"><button class="pri" data-act="addstock">+ Panneau</button></div>
  <h3>Pièces (dimensions finies, chants compris)</h3><table><thead><tr><th>Désignation</th><th>Long.</th><th>Larg.</th><th>Qté</th><th>Fil</th><th title="Chant haut">↑</th><th title="Chant bas">↓</th><th title="Chant gauche">←</th><th title="Chant droit">→</th><th>Débit</th><th></th></tr></thead><tbody>${S.pieces.map((p, i) => `<tr>${td('Désignation', inT('pieces', i, 'd', p.d), 'nm')}${td('Longueur', inN('pieces', i, 'l', p.l))}${td('Largeur', inN('pieces', i, 'w', p.w))}${td('Qté', inN('pieces', i, 'q', p.q))}${td('Fil', inG('pieces', i, p.g))}${td('Chant haut', inC(i, 'ct', p.ct), 'c')}${td('Chant bas', inC(i, 'cb', p.cb), 'c')}${td('Chant gauche', inC(i, 'cl', p.cl), 'c')}${td('Chant droit', inC(i, 'cr', p.cr), 'c')}${td('Débit', `<span class="deb" data-deb="${i}">${deb(p)}</span>`, 'c')}${td('', `<button class="del" data-act="delpiece" data-i="${i}">✕</button>`, 'x')}</tr>`).join('')}</tbody></table><div class="row"><button class="pri" data-act="addpiece">+ Pièce</button><button data-act="csv">Importer CSV</button></div>
  <h3>Réglages de débit</h3><div class="set card"><label>Épaisseur de chant (mm)<input type="number" step="any" inputmode="decimal" data-t="P" data-i="0" data-k="e" value="${S.P.e}"></label><label>Surcote par côté (mm)<input type="number" step="any" inputmode="decimal" data-t="P" data-i="0" data-k="sur" value="${S.P.sur}"></label><label>Trait de scie (mm)<input type="number" step="any" inputmode="decimal" data-t="P" data-i="0" data-k="kerf" value="${S.P.kerf}"></label><label>Chutes<select data-t="P" data-i="0" data-k="pref">${[['long', 'Plutôt longues'], ['wide', 'Plutôt larges'], ['area', 'Surface de chute']].map(([k, l]) => `<option value="${k}"${S.P.pref === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label></div>
  <div class="row"><button class="pri" data-act="calc">Calculer le calepinage</button></div>
  <details><summary>Installer sur l'iPhone</summary><p>Ouvrir le site dans Safari → Partager → « Sur l'écran d'accueil ». Les projets restent sur l'appareil : pour passer de l'iPhone à l'ordinateur, utiliser Exporter / Importer (pas de synchronisation automatique).</p></details>`;
}
function svg(sh, scale = 1, mini = false) {
  const fs = Math.max(sh.W, sh.H) / 55, m = mini ? fs : fs * 3.4, id = 'h' + uid++;
  let o = `<svg class="sheet" viewBox="${-m} ${-m} ${sh.W + 2 * m} ${sh.H + 2 * m}" style="width:${mini ? 100 : 100 * scale}%"><defs><pattern id="${id}" width="${fs}" height="${fs}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="${fs}" stroke="#c9ced2" stroke-width="${fs / 8}"/></pattern></defs><rect width="${sh.W}" height="${sh.H}" fill="url(#${id})" stroke="#1f2a33" stroke-width="${fs / 6}"/>`;
  if (!mini) o += `<text x="${sh.W / 2}" y="${-fs}" font-size="${fs * 1.2}" text-anchor="middle">${sh.W}</text><text transform="translate(${-fs} ${sh.H / 2}) rotate(-90)" font-size="${fs * 1.2}" text-anchor="middle">${sh.H}</text>`;
  for (const p of placements(sh)) {
    const it = p.item; o += `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${color(it.idx)}" stroke="#333" stroke-width="${fs / 12}"/>`;
    if (mini) continue;
    const side = { t: p.rot ? 'r' : 't', r: p.rot ? 'b' : 'r', b: p.rot ? 'l' : 'b', l: p.rot ? 't' : 'l' };
    for (const [k, sd] of Object.entries(side)) if (it.c[k]) { const [x1, y1, x2, y2] = sd === 't' ? [p.x, p.y, p.x + p.w, p.y] : sd === 'b' ? [p.x, p.y + p.h, p.x + p.w, p.y + p.h] : sd === 'l' ? [p.x, p.y, p.x, p.y + p.h] : [p.x + p.w, p.y, p.x + p.w, p.y + p.h]; o += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#b3392b" stroke-width="${fs / 3}"/>`; }
    if (p.w > fs * 5 && p.h > fs * 2.2) { o += `<text x="${p.x + p.w / 2}" y="${p.y + p.h / 2}" font-size="${fs}" text-anchor="middle" fill="#1f2a33">${esc(it.name)}</text>`; if (p.h > fs * 3.6 && p.w > fs * 9) o += `<text x="${p.x + p.w / 2}" y="${p.y + p.h / 2 + fs * 1.2}" font-size="${fs * .85}" text-anchor="middle" fill="#333">${p.w} × ${p.h}</text>`; }
  }
  return o + '</svg>';
}
const usedPct = s => placements(s).reduce((a, p) => a + p.w * p.h, 0) / (s.W * s.H) * 100;
function cuts(sh) { const out = []; const rec = n => { if (n.cut) { const v = n.cut.axis === 'v'; out.push(`${v ? 'Verticale' : 'Horizontale'} : ${+n.cut.pos.toFixed(1)} mm depuis le bord ${v ? 'gauche' : 'haut'} de la zone ${+n.w.toFixed(1)} × ${+n.h.toFixed(1)}`); rec(n.a); rec(n.b); } }; rec(sh.root); return out; }
function right() {
  if (!res) { res = pack(S.P, S.stock, S.pieces); cur = 0; }
  const n = res.sheets.length, st = res.stats; cur = Math.min(cur, Math.max(0, n - 1)); const sh = res.sheets[cur];
  const errs = res.sheets.flatMap((s, i) => validate(s, S.P).map(e => `Panneau ${i + 1} : ${e}`));
  $('#right').innerHTML = `<div class="stats"><div>Panneaux disponibles : <b>${st.available}</b></div><div>Nécessaires : <b>${st.needed}</b></div><div>Supplémentaires : <b class="${st.extra ? 'err' : ''}">${st.extra}</b></div><div>Pièces placées : <b>${st.placed}/${st.total}</b></div><div>Non placées : <b class="${st.unplaced ? 'err' : ''}">${st.unplaced}</b></div><div>Surface utilisée : <b>${(st.used / 1e6).toFixed(2)} m²</b></div><div>Chute : <b>${(st.scrap / 1e6).toFixed(2)} m² (${st.scrapPct.toFixed(1)} %)</b></div><div class="${errs.length ? 'err' : 'ok'}">Contrôle guillotine : <b>${errs.length ? 'ÉCHEC' : 'OK'}</b></div></div>
  ${res.unplaced.length ? `<div class="card err"><b>Pièces non placées</b>${res.unplaced.map(u => `<div>${esc(u.item.name)} — ${esc(u.reason)}</div>`).join('')}</div>` : ''}${errs.length ? `<div class="card err">${errs.map(esc).join('<br>')}</div>` : ''}
  ${n ? `<div class="thumbs">${res.sheets.map((s, i) => `<button class="th${i === cur ? ' on' : ''}${s.virtual ? ' v' : ''}" data-cur="${i}">${svg(s, 1, true)}${i + 1} · ${usedPct(s).toFixed(0)} %${s.virtual ? ' · suppl.' : ''}</button>`).join('')}</div>
  <div class="row"><button data-act="prev">◀</button><b>Panneau ${cur + 1} / ${n}</b><button data-act="next">▶</button><button data-act="zout">−</button><button data-act="zin">+</button><span>${sh.W} × ${sh.H} mm — <b class="${sh.virtual ? 'err' : ''}">${sh.virtual ? 'supplémentaire (hors stock)' : 'en stock'}</b> — ${usedPct(sh).toFixed(1)} % utilisé</span></div>
  <div class="sheetbox">${svg(sh, zoom)}</div><small>Dimensions affichées = prédébit (surcote comprise). Traits rouges = chants.</small>
  <details><summary>Ordre de coupe (${cuts(sh).length} coupes)</summary><ol>${cuts(sh).map(c => `<li>${c}</li>`).join('')}</ol></details>` : '<p>Aucun panneau calculé.</p>'}`;
}
function printView() {
  if (!res) res = pack(S.P, S.stock, S.pieces);
  $('#print').innerHTML = `<h2>${esc(S.name)} — fiche de débit</h2><table><tr><th>Désignation</th><th>Débit L×l (mm)</th><th>Qté</th><th>Chants (H B G D)</th></tr>${S.pieces.map(p => `<tr><td>${esc(p.d)}</td><td>${deb(p)}</td><td>${p.q}</td><td>${[p.ct, p.cb, p.cl, p.cr].map(x => x ? '■' : '–').join(' ')}</td></tr>`).join('')}</table>` + res.sheets.map((s, i) => `<h3>Panneau ${i + 1}/${res.sheets.length} — ${s.W} × ${s.H} mm${s.virtual ? ' (supplémentaire)' : ''}</h3>${svg(s)}<ol>${cuts(s).map(c => `<li>${c}</li>`).join('')}</ol>`).join('');
  setTimeout(() => window.print(), 50);
}
const dl = (name, data) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
const DB = () => JSON.parse(localStorage.getItem('calepinage-projets') || '{}');
const load = o => { if (!o || !Array.isArray(o.stock) || !Array.isArray(o.pieces) || !o.P) throw new Error('Fichier de projet invalide'); S = { name: o.name || 'Projet', stock: o.stock, pieces: o.pieces, P: o.P }; res = null; };
const setTab = t => $('#app').dataset.tab = t, all = () => { left(); right(); };
const ACT = {
  addstock: () => { S.stock.push({ l: 2800, w: 2070, q: 1, g: 'i', n: '' }); res = null; all(); }, addpiece: () => { S.pieces.push({ d: '', l: 500, w: 300, q: 1, g: 'i', ct: 0, cb: 0, cl: 0, cr: 0, n: '' }); res = null; all(); },
  delstock: i => { if (confirm('Supprimer ce panneau ?')) { S.stock.splice(i, 1); res = null; all(); } }, delpiece: i => { if (confirm('Supprimer cette pièce ?')) { S.pieces.splice(i, 1); res = null; all(); } },
  calc: () => { res = null; right(); setTab('result'); }, prev: () => { cur = Math.max(0, cur - 1); right(); }, next: () => { cur = Math.min(res.sheets.length - 1, cur + 1); right(); },
  zin: () => { zoom = Math.min(6, zoom * 1.5); right(); }, zout: () => { zoom = Math.max(1, zoom / 1.5); right(); },
  new: () => { if (confirm('Créer un nouveau projet ? Les modifications non enregistrées seront perdues.')) { S = blank(); res = null; all(); } },
  save: () => { const n = prompt('Nom du projet :', S.name); if (n) { S.name = n; const d = DB(); d[n] = S; localStorage.setItem('calepinage-projets', JSON.stringify(d)); left(); } },
  open: () => { const d = DB(), k = Object.keys(d); if (!k.length) return alert('Aucun projet enregistré sur cet appareil.'); const n = prompt('Ouvrir :\n' + k.join('\n'), k[0]); if (n && d[n]) { load(d[n]); all(); } else if (n) alert('Projet introuvable.'); },
  export: () => dl((S.name || 'projet') + '.calepinage.json', JSON.stringify(S)), import: () => $('#file').click(), csv: () => $('#csv').click(), print: printView
};
document.addEventListener('click', e => { const b = e.target.closest('[data-tab],[data-act],[data-cur]'); if (!b) return; if (b.dataset.tab) { setTab(b.dataset.tab); if (b.dataset.tab === 'result') right(); } else if (b.dataset.cur) { cur = +b.dataset.cur; right(); } else ACT[b.dataset.act](b.dataset.i !== undefined ? +b.dataset.i : undefined); });
document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'csv') { const r = new FileReader(); r.onload = () => { const { pieces, errors } = mapRows(parseCSV(r.result)); if (!pieces.length) return alert('Aucune ligne valide.\n' + errors.join('\n')); const prev = pieces.slice(0, 5).map(p => `${p.d} ${p.l}×${p.w} ×${p.q}`).join('\n'); if (confirm(`${pieces.length} pièce(s) valide(s) :\n${prev}\n${errors.length ? errors.length + ' ligne(s) en erreur :\n' + errors.slice(0, 8).join('\n') + '\n' : ''}Ajouter au projet ?`)) { S.pieces.push(...pieces); res = null; all(); } }; r.readAsText(el.files[0]); el.value = ''; return; }
  if (el.id === 'file') { const r = new FileReader(); r.onload = () => { try { load(JSON.parse(r.result)); all(); } catch (x) { alert('Import impossible : ' + x.message); } }; r.readAsText(el.files[0]); el.value = ''; return; }
  const d = el.dataset; if (!d.k) return; const v = el.type === 'checkbox' ? +el.checked : el.type === 'number' ? +el.value : el.value;
  (d.t === 'P' ? S.P : S[d.t][+d.i])[d.k] = v; res = null;
  if (d.t === 'pieces' || d.t === 'P') document.querySelectorAll('[data-deb]').forEach(s => s.textContent = deb(S.pieces[+s.dataset.deb]));
  right();
});
all();
if ('serviceWorker' in navigator) { navigator.serviceWorker.register('service-worker.js'); let r = false; navigator.serviceWorker.addEventListener('controllerchange', () => { if (r) return; r = true; if (sessionStorage.getItem('sw-first')) location.reload(); sessionStorage.setItem('sw-first', '1'); }); }
