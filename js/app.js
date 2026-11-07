import { dims, pack, validate, placements, freeLeaves } from './engine.js';
import { parseCSV, mapRows } from './csv.js';
const VERSION = 2;
const $ = s => document.querySelector(s), esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const LS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, SV = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const PAL = [['Pétrole', '#2f6f8f'], ['Orange', '#e8590c'], ['Bleu', '#0a84ff'], ['Vert', '#2f9e44'], ['Rouge', '#e03131'], ['Violet', '#7048e8'], ['Rose', '#d6336c'], ['Turquoise', '#0c8599'], ['Ardoise', '#495057']];
let ST = { acc: '#2f6f8f', theme: 'auto', fold: {}, ...LS('cutopti-set', {}) }, DB = LS('cutopti-db', { folders: [], projects: [] });
const blank = () => ({ name: 'Sans titre', stock: [], pieces: [], P: { e: 1, sur: 5, kerf: 4.5, pref: 'long' } });
let S = blank(), curId = null, curFolder = null, res = null, cur = 0, zoom = 1, uid = 0, fm = null;
const GR = { i: 'Indifférent', h: 'Horizontal', v: 'Vertical' }, f1 = n => +(+n).toFixed(1);
const color = i => `hsl(${(i * 67) % 360},45%,82%)`;
const applyTheme = () => { document.documentElement.style.setProperty('--a', ST.acc); ST.theme === 'auto' ? document.documentElement.removeAttribute('data-theme') : document.documentElement.dataset.theme = ST.theme; SV('cutopti-set', ST); };
const td = (l, h, c = '') => `<td data-l="${l}" class="${c}">${h}</td>`;
const inN = (t, i, k, v) => `<input type="number" step="any" inputmode="decimal" data-t="${t}" data-i="${i}" data-k="${k}" value="${v ?? ''}">`;
const inT = (t, i, k, v) => `<input type="text" data-t="${t}" data-i="${i}" data-k="${k}" value="${esc(v)}">`;
const inG = (t, i, v) => `<select data-t="${t}" data-i="${i}" data-k="g">${Object.entries(GR).map(([k, l]) => `<option value="${k}"${k === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
const inC = (i, k, v) => `<input type="checkbox" data-t="pieces" data-i="${i}" data-k="${k}"${v ? ' checked' : ''}>`;
const blk = (key, title, body) => `<section class="blk${ST.fold[key] ? ' closed' : ''}"><button class="bh" data-fold="${key}"><span>${title}</span><i>›</i></button><div class="bb">${body}</div></section>`;
function left() {
  const pnEl = $('#pn'); if (document.activeElement !== pnEl) pnEl.value = S.name;
  const stock = S.stock.length ? `<table class="ed"><thead><tr><th>Longueur</th><th>Largeur</th><th>Qté</th><th>Sens du fil</th><th>Référence</th><th></th></tr></thead><tbody>${S.stock.map((s, i) => `<tr>${td('Longueur mm', inN('stock', i, 'l', s.l), 'd')}${td('Largeur mm', inN('stock', i, 'w', s.w), 'd')}${td('Qté', inN('stock', i, 'q', s.q), 'q')}${td('Sens du fil', inG('stock', i, s.g), 'f')}${td('Référence', inT('stock', i, 'r', s.r), 'n')}${td('', `<button class="del" data-act="delstock" data-i="${i}">✕</button>`, 'x')}</tr>`).join('')}</tbody></table>` : '<p class="mut">Aucun panneau. Appuyez sur « + Panneau ».</p>';
  const pieces = S.pieces.length ? `<table class="ed"><thead><tr><th>Désignation</th><th>Long.</th><th>Larg.</th><th>Qté</th><th>Sens du fil</th><th class="c">Chants</th><th></th></tr></thead><tbody>${S.pieces.map((p, i) => `<tr>${td('Désignation', inT('pieces', i, 'd', p.d), 'nm')}${td('Longueur', inN('pieces', i, 'l', p.l), 'd')}${td('Largeur', inN('pieces', i, 'w', p.w), 'd')}${td('Qté', inN('pieces', i, 'q', p.q), 'q')}${td('Sens du fil', inG('pieces', i, p.g), 'f')}${td('Chants', `<button class="chb" data-ch="open" data-i="${i}">${sq(p, 30)}</button>`, 'c')}${td('', `<button class="del" data-act="delpiece" data-i="${i}">✕</button>`, 'x')}</tr>`).join('')}</tbody></table>` : '<p class="mut">Aucune pièce. Appuyez sur « + Pièce » ou importez un CSV depuis le menu ☰.</p>';
  const P = S.P, pn = (k, l) => `<label>${l}<input type="number" step="any" inputmode="decimal" data-t="P" data-i="0" data-k="${k}" value="${P[k]}"></label>`;
  $('#left').innerHTML = blk('stock', 'Panneaux (stock)', `${stock}<div class="row"><button class="pri" data-act="addstock">+ Panneau</button></div>`)
    + blk('pieces', 'Pièces (cotes finies, chants compris)', `${pieces}<div class="row"><button class="pri" data-act="addpiece">+ Pièce</button></div>`)
    + blk('opts', '⚙ Options de coupe', `<div class="set">${pn('e', 'Épaisseur de chant (mm)')}${pn('sur', 'Marge de débit (mm)')}${pn('kerf', 'Trait de scie (mm)')}<label>Optimiser les chutes<select data-t="P" data-i="0" data-k="pref">${[['long', 'Longueur'], ['wide', 'Largeur'], ['area', 'Surface']].map(([k, l]) => `<option value="${k}"${P.pref === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label></div><p class="mut" style="font-size:13px">Le calcul minimise d'abord les panneaux, puis le nombre de coupes, puis maximise la chute selon l'option choisie.</p><div class="row"><button class="pri" data-act="calc">Calculer</button></div>`);
}
// Carré de chants : angles arrondis, traits rouges raccordés par un arc quand deux côtés voisins sont plaqués.
const sq = (p, size = 24) => { const t = +p.ct, r = +p.cr, b = +p.cb, l = +p.cl; let d = ''; if (t) d += 'M7 3H17'; if (r) d += 'M21 7V17'; if (b) d += 'M17 21H7'; if (l) d += 'M3 17V7'; if (t && r) d += 'M17 3A4 4 0 0 1 21 7'; if (r && b) d += 'M21 17A4 4 0 0 1 17 21'; if (b && l) d += 'M7 21A4 4 0 0 1 3 17'; if (l && t) d += 'M3 7A4 4 0 0 1 7 3'; return `<svg class="sq" width="${size}" height="${size}" viewBox="0 0 24 24" style="vertical-align:middle"><rect x="3" y="3" width="18" height="18" rx="4" fill="#fff" stroke="#b9bec2" stroke-width="1.3"/><path d="${d}" fill="none" stroke="#d11" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`; };
const fiche = () => `<table class="fiche"><thead><tr><th>Désignation</th><th>Long. débit</th><th>Larg. débit</th><th>Qté</th><th>Long. finie</th><th>Larg. finie</th><th>Chants</th></tr></thead><tbody>${S.pieces.filter(p => p.l > 0 && p.w > 0).map(p => { const d = dims(p, S.P); return `<tr><td>${esc(p.d)}</td><td>${f1(d.L)}</td><td>${f1(d.W)}</td><td>${p.q}</td><td>${f1(p.l)}</td><td>${f1(p.w)}</td><td>${sq(p)}</td></tr>`; }).join('')}</tbody></table>`;
const T = (x, y, t, sz, rot, fill, bold) => `<text x="${x}" y="${y}" font-size="${sz}" text-anchor="middle" dominant-baseline="central" fill="${fill}"${bold ? ' font-weight="700"' : ''}${rot ? ` transform="rotate(-90 ${x} ${y})"` : ''}>${esc(t)}</text>`;
function svg(sh, scale = 1, mini = false) {
  // Panneau affiché en PORTRAIT (grand côté vertical) pour remplir une feuille A4 portrait.
  const SW = sh.H, SH = sh.W, fs = Math.max(SW, SH) / 62, vb = mini ? [-fs, -fs, SW + 2 * fs, SH + 2 * fs] : [-fs, -fs * 2.2, SW + fs * 5.5, SH + fs * 6];
  let o = `<svg class="sheet" viewBox="${vb.join(' ')}" style="width:${mini ? 100 : 100 * scale}%">`;
  o += `<rect width="${SW}" height="${SH}" fill="#f6f6f6" stroke="#222" stroke-width="${fs / 8}"/>`;
  if (!mini) {
    const rd = '#c0392b', y = SH + fs * 2.4, x = SW + fs * 2.4, tk = fs * .5;
    o += `<line x1="0" y1="${y}" x2="${SW}" y2="${y}" stroke="${rd}"/><line x1="0" y1="${y - tk}" x2="0" y2="${y + tk}" stroke="${rd}"/><line x1="${SW}" y1="${y - tk}" x2="${SW}" y2="${y + tk}" stroke="${rd}"/>${T(SW / 2, y + fs * 1.4, SW, fs * 1.2, 0, rd)}`;
    o += `<line x1="${x}" y1="0" x2="${x}" y2="${SH}" stroke="${rd}"/><line x1="${x - tk}" y1="0" x2="${x + tk}" y2="0" stroke="${rd}"/><line x1="${x - tk}" y1="${SH}" x2="${x + tk}" y2="${SH}" stroke="${rd}"/>${T(x + fs * 1.4, SH / 2, SH, fs * 1.2, 1, rd)}`;
    if (sh.ref) o += `<text x="${SW}" y="${-fs * .6}" font-size="${fs * 1.2}" text-anchor="end" font-weight="700" fill="#333">${esc(sh.ref)}</text>`;
    for (const q of freeLeaves(sh)) { const l = { x: q.y, y: q.x, w: q.h, h: q.w }; o += `<rect x="${l.x}" y="${l.y}" width="${l.w}" height="${l.h}" fill="none" stroke="#bbb" stroke-width="${fs / 14}"/>`; if (l.w >= fs * 4 && l.h >= fs * 2.4) o += T(l.x + l.w / 2, l.y + fs * .9, f1(l.w), fs, 0, '#8a98a3'); if (l.h >= fs * 4 && l.w >= fs * 2.4) o += T(l.x + fs * .9, l.y + l.h / 2, f1(l.h), fs, 1, '#8a98a3'); }
  }
  const tp = { t: 'l', b: 'r', l: 't', r: 'b' };
  for (const p0 of placements(sh)) {
    const p = { x: p0.y, y: p0.x, w: p0.h, h: p0.w }, it = p0.item; o += `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${color(it.idx)}" stroke="#222" stroke-width="${fs / 10}"/>`;
    if (mini) continue;
    const ins = fs * .4, eng = { t: p0.rot ? 'r' : 't', r: p0.rot ? 'b' : 'r', b: p0.rot ? 'l' : 'b', l: p0.rot ? 't' : 'l' };
    for (const k of Object.keys(eng)) if (it.c[k]) { const sd = tp[eng[k]], [x1, y1, x2, y2] = sd === 't' ? [p.x + ins, p.y + ins, p.x + p.w - ins, p.y + ins] : sd === 'b' ? [p.x + ins, p.y + p.h - ins, p.x + p.w - ins, p.y + p.h - ins] : sd === 'l' ? [p.x + ins, p.y + ins, p.x + ins, p.y + p.h - ins] : [p.x + p.w - ins, p.y + ins, p.x + p.w - ins, p.y + p.h - ins]; o += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#d11" stroke-width="${fs / 8}" stroke-dasharray="${fs * .7} ${fs * .35}"/>`; }
    const band = fs * 1.5, W = String(f1(p.w)), H = String(f1(p.h)), nameFit = (w, h, z) => { const len = it.name.length * z * .62; return w >= h ? len <= w - z * .4 && h >= z * 1.2 : len <= h - z * .4 && w >= z * 1.2; };
    const dimsOK = p.w >= W.length * fs * .6 + fs * .6 && p.h >= H.length * fs * .6 + fs * .6 && p.w >= band * 1.2 && p.h >= band * 1.2, iw = p.w - band, ih = p.h - band;
    const z1 = dimsOK && [1, .8, .65].map(k => fs * k).find(z => nameFit(iw, ih, z));
    if (z1) o += T(p.x + p.w / 2, p.y + band / 2, W, fs, 0, '#111') + T(p.x + band / 2, p.y + p.h / 2, H, fs, 1, '#111') + T(p.x + band + iw / 2, p.y + band + ih / 2, it.name, z1, iw < ih, '#4a4a4a', 1);
    else { const z2 = [1, .8, .65, .5].map(k => fs * k).find(z => nameFit(p.w, p.h, z)); if (z2) o += T(p.x + p.w / 2, p.y + p.h / 2, it.name, z2, p.w < p.h, '#4a4a4a', 1); }
  }
  return o + '</svg>';
}
function right() {
  if (!S.stock.length || !S.pieces.length) { $('#right').innerHTML = '<p class="mut">Ajoutez au moins un panneau et une pièce pour lancer le calepinage.</p>'; res = null; return; }
  if (!res) { res = pack(S.P, S.stock, S.pieces); cur = 0; }
  const n = res.sheets.length, st = res.stats; cur = Math.min(cur, Math.max(0, n - 1)); const sh = res.sheets[cur];
  const errs = res.sheets.flatMap((s, i) => validate(s, S.P).map(e => `Panneau ${i + 1} : ${e}`));
  $('#right').innerHTML = `<div class="stats"><div>Panneaux nécessaires : <b>${st.needed}</b></div>${st.extra ? `<div>Panneaux supplémentaires : <b class="err">${st.extra}</b></div>` : ''}<div>Pièces placées : <b>${st.placed} / ${st.total}</b></div>${st.unplaced ? `<div>Pièces non placées : <b class="err">${st.unplaced}</b></div>` : ''}<div>Nombre de coupes : <b>${st.cuts}</b></div></div>
  ${res.unplaced.length ? `<div class="card err"><b>Pièces non placées</b>${res.unplaced.map(u => `<div>${esc(u.item.name)} — ${esc(u.reason)}</div>`).join('')}</div>` : ''}${errs.length ? `<div class="card err">Anomalie de découpe : ${errs.map(esc).join('<br>')}</div>` : ''}
  ${n ? `<div class="thumbs">${res.sheets.map((s, i) => `<button class="th${i === cur ? ' on' : ''}${s.virtual ? ' v' : ''}" data-cur="${i}">${svg(s, 1, true)}${i + 1}${s.ref ? ' · ' + esc(s.ref) : ''}${s.virtual ? ' · suppl.' : ''}</button>`).join('')}</div>
  <div class="row"><button data-act="prev">◀</button><b>Panneau ${cur + 1} / ${n}</b><button data-act="next">▶</button><button data-act="zout">−</button><button data-act="zin">+</button><span>${sh.ref ? '<b>' + esc(sh.ref) + '</b> — ' : ''}${sh.W} × ${sh.H} mm${sh.virtual ? ' — <b class="err">supplémentaire (hors stock)</b>' : ''}</span></div>
  <div class="sheetbox">${svg(sh, zoom)}</div>` : ''}
  <h2>Fiche de débit</h2><div class="card">${fiche()}</div>`;
}
function printView() {
  if (!S.pieces.length) return toast('Rien à imprimer');
  if (!res) res = pack(S.P, S.stock, S.pieces);
  $('#print').innerHTML = `<div class="pg"><h2>${esc(S.name)} — fiche de débit</h2>${fiche()}</div>` + res.sheets.map((s, i) => `<div class="pg"><h3>Panneau ${i + 1}/${res.sheets.length}${s.ref ? ' — ' + esc(s.ref) : ''} — ${s.W} × ${s.H} mm${s.virtual ? ' (supplémentaire)' : ''}</h3>${svg(s)}</div>`).join('');
  setTimeout(() => window.print(), 50);
}
function settings() {
  $('#settings').innerHTML = `<div class="row"><button data-act="back">‹ Retour</button><b>Réglages</b></div>
  <h2>Apparence</h2><div class="card"><div class="cap">Couleur de l'application</div><div class="sw">${PAL.map(([nm, x]) => `<button class="${ST.acc === x ? 'on' : ''}" style="background:${x}" title="${nm}" data-acc="${x}"></button>`).join('')}</div><div class="cap">Fond</div><div class="seg" style="margin-top:6px">${[['auto', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']].map(([k, nm]) => `<button class="${ST.theme === k ? 'on' : ''}" data-theme="${k}">${nm}</button>`).join('')}</div></div>
  <h2>Compte <small>(bientôt disponible)</small></h2><div class="card"><div class="r"><span class="mut">Identifiant du compte</span><span class="mut">— non connecté</span></div><div class="r"><span class="mut">Synchronisation des appareils</span><span class="mut">Inactive</span></div><div class="row"><button disabled>Changer de mot de passe</button><button disabled>Se déconnecter</button><button class="del" disabled>Supprimer mon compte</button></div><small class="mut">La connexion et la synchronisation entre appareils seront ajoutées dans une prochaine version.</small></div>
  <h2>Application</h2><div class="card"><div class="r"><button data-act="maj">Forcer la mise à jour</button><span class="mut">Version ${VERSION}</span></div></div>`;
}
const maj = () => { const r = navigator.serviceWorker ? navigator.serviceWorker.getRegistrations() : Promise.resolve([]); r.then(x => Promise.all(x.map(y => y.unregister()))).then(() => window.caches ? caches.keys() : []).then(k => Promise.all(k.map(y => caches.delete(y)))).then(() => location.reload()); };
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 1800); };
const dl = (name, data, type = 'application/json') => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
const csvOut = () => '\uFEFF' + [['Désignation', 'Longueur débit', 'Largeur débit', 'Quantité', 'Longueur finie', 'Largeur finie', 'Chant haut', 'Chant bas', 'Chant gauche', 'Chant droit'], ...S.pieces.map(p => { const d = dims(p, S.P); return [p.d, f1(d.L), f1(d.W), p.q, f1(p.l), f1(p.w), +p.ct || 0, +p.cb || 0, +p.cl || 0, +p.cr || 0]; })].map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\r\n');
const load = o => { if (!o || !Array.isArray(o.stock) || !Array.isArray(o.pieces) || !o.P) throw new Error('Fichier de projet invalide'); S = { name: o.name || 'Projet', stock: o.stock, pieces: o.pieces, P: o.P }; res = null; };
const all = () => { left(); right(); settings(); }, setTab = t => $('#app').dataset.tab = t;
// ---- Explorateur de projets (fonctionnement type ordinateur) ----
const fid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6), saveDB = () => SV('cutopti-db', DB), clone = o => JSON.parse(JSON.stringify(o));
let clip = null, lastTap = {}, chI = null;
const item = (k, id) => (k === 'f' ? DB.folders : DB.projects).find(x => x.id === id), childF = c => DB.folders.filter(f => f.p === c);
const isDesc = (id, t) => { while (t) { if (t === id) return true; t = item('f', t)?.p ?? null; } return false; };
const moveItem = (k, id, dest) => { if (k === 'f') item('f', id).p = dest; else item('p', id).f = dest; saveDB(); };
function cp(k, id, dest, top) {
  const x = item(k, id); if (k === 'p') { DB.projects.push({ id: fid(), n: top ? x.n + ' (copie)' : x.n, f: dest, d: clone(x.d), t: Date.now() }); return; }
  const kids = childF(id), ps = DB.projects.filter(p => p.f === id), nid = fid(); DB.folders.push({ id: nid, n: top ? x.n + ' (copie)' : x.n, p: dest }); kids.forEach(f => cp('f', f.id, nid)); ps.forEach(p => cp('p', p.id, nid));
}
function fmShow() {
  const d = $('#dlg'); if (!fm) { if (chI === null) d.hidden = true; return; } d.hidden = false;
  const path = []; let c = fm.cwd; while (c) { const f = item('f', c); if (!f) break; path.unshift(f); c = f.p; }
  const sel = fm.sel, has = !!sel, fol = childF(fm.cwd), prj = DB.projects.filter(p => p.f === fm.cwd);
  const row = (k, x) => `<div class="fr${sel && sel.k === k && sel.id === x.id ? ' sel' : ''}${clip && clip.cut && clip.id === x.id ? ' cutd' : ''}" data-row="${k}" data-id="${x.id}" draggable="true">${k === 'f' ? '📁' : '📄'} <span class="fn2">${esc(x.n)}</span><small>${k === 'p' ? new Date(x.t).toLocaleDateString('fr-FR') : 'Dossier'}</small></div>`;
  const tb = (a, l, dis) => `<button data-fm="${a}"${dis ? ' disabled' : ''}>${l}</button>`;
  d.innerHTML = `<div class="exp"><b>${fm.mode === 'open' ? 'Ouvrir' : 'Enregistrer sous'}</b><div class="tbar">${tb('up', '⬆ Parent', !fm.cwd)}${tb('mk', '+ Dossier')}${tb('ren', 'Renommer', !has)}${tb('cut', 'Couper', !has)}${tb('copy', 'Copier', !has)}${tb('paste', 'Coller', !clip)}${tb('del', 'Supprimer', !has)}</div>
  <div class="addr"><button data-fm="cd" data-id="">🏠 Racine</button>${path.map(f => `<span>›</span><button data-fm="cd" data-id="${f.id}">${esc(f.n)}</button>`).join('')}</div>
  <div class="list">${fol.map(f => row('f', f)).join('')}${prj.map(p => row('p', p)).join('')}${!fol.length && !prj.length ? '<p class="mut" style="padding:10px">Ce dossier est vide.</p>' : ''}</div>
  <div class="row">${fm.mode === 'save' ? `<label class="cap" style="flex:1 1 180px">Nom du fichier :<input id="fmn" value="${esc(fm.name)}"></label>` : ''}<button class="pri" data-fm="ok"${fm.mode === 'open' && !(sel && sel.k === 'p') ? ' disabled' : ''}>${fm.mode === 'open' ? 'Ouvrir' : 'Enregistrer'}</button><button data-fm="close">Annuler</button></div></div>`;
}
function chShow() {
  const d = $('#dlg'); if (chI === null) { if (!fm) d.hidden = true; return; } const p = S.pieces[chI]; d.hidden = false;
  d.innerHTML = `<div><b>Chants — ${esc(p.d || 'pièce')}</b><p class="mut">Cochez les côtés à plaquer (longueur à l'horizontale).</p><div class="chk">${[['ct', 'Haut'], ['cb', 'Bas'], ['cl', 'Gauche'], ['cr', 'Droit']].map(([k, l]) => `<label><input type="checkbox" id="ch-${k}"${+p[k] ? ' checked' : ''}>${l}</label>`).join('')}</div><div class="row"><button class="pri" data-ch="ok">Valider</button><button data-ch="no">Annuler</button></div></div>`;
}
function fmAct(a, el) {
  const id = el?.dataset?.id || null, s = fm.sel;
  if (a === 'cd') { fm.cwd = id; fm.sel = null; }
  else if (a === 'up') { fm.cwd = item('f', fm.cwd)?.p ?? null; fm.sel = null; }
  else if (a === 'mk') { const n = prompt('Nom du nouveau dossier :', 'Nouveau dossier'); if (n && n.trim()) { DB.folders.push({ id: fid(), n: n.trim(), p: fm.cwd }); saveDB(); } }
  else if (a === 'ren' && s) { const it = item(s.k, s.id), n = prompt('Nouveau nom :', it.n); if (n && n.trim()) { it.n = n.trim(); saveDB(); if (s.k === 'p' && s.id === curId) { S.name = it.n; left(); } } }
  else if ((a === 'cut' || a === 'copy') && s) clip = { ...s, cut: a === 'cut' };
  else if (a === 'paste' && clip) { const { k, id: cid, cut } = clip; if (!item(k, cid)) clip = null; else if (k === 'f' && isDesc(cid, fm.cwd)) alert('Impossible de placer un dossier dans lui-même.'); else { if (cut) { moveItem(k, cid, fm.cwd); clip = null; } else { cp(k, cid, fm.cwd, true); saveDB(); } } }
  else if (a === 'del' && s) { if (!confirm('Supprimer définitivement ' + (s.k === 'f' ? 'ce dossier et tout son contenu ?' : 'ce projet ?'))) return; if (s.k === 'p') DB.projects = DB.projects.filter(x => x.id !== s.id); else { const ids = DB.folders.filter(f => isDesc(s.id, f.id)).map(f => f.id); DB.folders = DB.folders.filter(f => !ids.includes(f.id)); DB.projects = DB.projects.filter(p => !ids.includes(p.f)); } if (!DB.projects.some(p => p.id === curId)) curId = null; fm.sel = null; saveDB(); }
  else if (a === 'ok') {
    if (fm.mode === 'open') { if (!(s && s.k === 'p')) return; const p = item('p', s.id); load(clone(p.d)); curId = p.id; curFolder = p.f; fm = null; all(); setTab('data'); }
    else { const n = ($('#fmn').value || '').trim(); if (!n) return; const ex = DB.projects.find(x => x.f === fm.cwd && x.n === n); S.name = n; if (ex) { if (!confirm(`« ${n} » existe déjà dans ce dossier. Le remplacer ?`)) return; ex.d = clone(S); ex.t = Date.now(); curId = ex.id; } else { curId = fid(); DB.projects.push({ id: curId, n, f: fm.cwd, d: clone(S), t: Date.now() }); } curFolder = fm.cwd; saveDB(); fm = null; left(); toast('Projet enregistré'); }
  } else if (a === 'close') fm = null;
  fmShow();
}
const ACT = {
  menu: () => { $('#menu').hidden = !$('#menu').hidden; },
  addstock: () => { S.stock.push({ l: '', w: '', q: 1, g: 'i', r: '' }); res = null; all(); }, addpiece: () => { S.pieces.push({ d: '', l: '', w: '', q: 1, g: 'i', ct: 0, cb: 0, cl: 0, cr: 0 }); res = null; all(); },
  delstock: i => { if (confirm('Supprimer ce panneau ?')) { S.stock.splice(i, 1); res = null; all(); } }, delpiece: i => { if (confirm('Supprimer cette pièce ?')) { S.pieces.splice(i, 1); res = null; all(); } },
  calc: () => { res = null; right(); setTab('result'); }, prev: () => { cur = Math.max(0, cur - 1); right(); }, next: () => { cur = Math.min(res.sheets.length - 1, cur + 1); right(); },
  zin: () => { zoom = Math.min(6, zoom * 1.5); right(); }, zout: () => { zoom = Math.max(1, zoom / 1.5); right(); },
  new: () => { if (confirm('Créer un nouveau projet ? Les modifications non enregistrées seront perdues.')) { S = blank(); curId = null; res = null; all(); setTab('data'); } },
  open: () => { fm = { mode: 'open', cwd: curFolder, sel: null }; fmShow(); }, saveas: () => { fm = { mode: 'save', cwd: curFolder, sel: null, name: S.name }; fmShow(); },
  save: () => { const p = DB.projects.find(x => x.id === curId); if (p) { p.d = clone(S); p.t = Date.now(); saveDB(); toast('Projet enregistré'); } else ACT.saveas(); },
  export: () => dl((S.name || 'projet') + '.cutopti.json', JSON.stringify(S)), expcsv: () => dl((S.name || 'projet') + '-fiche-de-debit.csv', csvOut(), 'text/csv;charset=utf-8'),
  import: () => $('#file').click(), csv: () => $('#csv').click(), print: printView, settings: () => { setTab('settings'); }, back: () => setTab('data'), maj
};
document.addEventListener('click', e => {
  if (!e.target.closest('#menu,#mb')) $('#menu').hidden = true;
  const dlg = e.target.closest('[data-fm]'); if (dlg) return fmAct(dlg.dataset.fm, dlg);
  const ch = e.target.closest('[data-ch]'); if (ch) { const a = ch.dataset.ch; if (a === 'open') chI = +ch.dataset.i; else { if (a === 'ok') { const p = S.pieces[chI]; for (const k of ['ct', 'cb', 'cl', 'cr']) p[k] = +$('#ch-' + k).checked; res = null; left(); right(); } chI = null; } chShow(); return; }
  const rw = e.target.closest('[data-row]'); if (rw && fm) { const k = rw.dataset.row, id = rw.dataset.id, now = Date.now(); fm.sel = { k, id }; if (lastTap.id === id && now - lastTap.t < 450) { lastTap = {}; if (k === 'f') { fm.cwd = id; fm.sel = null; } else if (fm.mode === 'open') return fmAct('ok'); } else { lastTap = { id, t: now }; if (k === 'p' && fm.mode === 'save') fm.name = item('p', id).n; } return fmShow(); }
  const b = e.target.closest('[data-tab],[data-act],[data-cur],[data-fold],[data-acc],[data-theme]'); if (!b) return;
  if (b.dataset.act && b.closest('#menu')) $('#menu').hidden = true;
  if (b.dataset.tab) { setTab(b.dataset.tab); if (b.dataset.tab === 'result') right(); }
  else if (b.dataset.cur) { cur = +b.dataset.cur; right(); }
  else if (b.dataset.fold) { ST.fold[b.dataset.fold] = ST.fold[b.dataset.fold] ? 0 : 1; SV('cutopti-set', ST); b.closest('.blk').classList.toggle('closed'); }
  else if (b.dataset.acc) { ST.acc = b.dataset.acc; applyTheme(); settings(); }
  else if (b.dataset.theme) { ST.theme = b.dataset.theme; applyTheme(); settings(); }
  else ACT[b.dataset.act](b.dataset.i !== undefined ? +b.dataset.i : undefined);
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'csv') { const r = new FileReader(); r.onload = () => { let { pieces, errors } = mapRows(parseCSV(r.result)); pieces = pieces.filter(p => fits(p) || (errors.push(`« ${p.d} » est plus grande que les panneaux : ignorée`), false)); if (!pieces.length) return alert('Aucune ligne valide.\n' + errors.join('\n')); const prev = pieces.slice(0, 5).map(p => `${p.d} ${p.l}×${p.w} ×${p.q}`).join('\n'); if (confirm(`${pieces.length} pièce(s) valide(s) :\n${prev}\n${errors.length ? errors.length + ' ligne(s) en erreur :\n' + errors.slice(0, 8).join('\n') + '\n' : ''}Ajouter au projet ?`)) { S.pieces.push(...pieces); res = null; all(); } }; r.readAsText(el.files[0]); el.value = ''; return; }
  if (el.id === 'file') { const r = new FileReader(); r.onload = () => { try { load(JSON.parse(r.result)); curId = null; all(); } catch (x) { alert('Import impossible : ' + x.message); } }; r.readAsText(el.files[0]); el.value = ''; return; }
  const d = el.dataset; if (!d.k) return; const v = el.type === 'checkbox' ? +el.checked : el.type === 'number' ? (el.value === '' ? '' : +el.value) : el.value;
  const obj = d.t === 'P' ? S.P : S[d.t][+d.i], old = obj[d.k]; obj[d.k] = v;
  const bad = S.pieces.find(p => p.l > 0 && p.w > 0 && !fits(p));
  if (bad) { obj[d.k] = old; el.type === 'checkbox' ? el.checked = !!old : el.value = old ?? ''; const mx = S.stock.filter(s => s.l > 0 && s.w > 0); alert(`Saisie refusée : la pièce « ${bad.d || 'sans nom'} » (${bad.l} × ${bad.w} mm, marge de débit comprise) est plus grande que les panneaux du stock (le plus grand : ${Math.max(...mx.map(s => Math.max(s.l, s.w)))} × ${Math.max(...mx.map(s => Math.min(s.l, s.w)))} mm).`); return; }
  res = null; right();
});
const fits = p => { const d = dims(p, S.P), a = Math.max(d.pl, d.pw), b = Math.min(d.pl, d.pw), st = S.stock.filter(s => s.l > 0 && s.w > 0); return !st.length || st.some(s => Math.max(s.l, s.w) >= a && Math.min(s.l, s.w) >= b); };
document.addEventListener('input', e => { if (e.target.id === 'pn') S.name = e.target.value; if (e.target.id === 'fmn' && fm) fm.name = e.target.value; });
document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); ACT.save(); } });
document.addEventListener('dragstart', e => { const r = e.target.closest('[data-row]'); if (r) e.dataTransfer.setData('text/plain', r.dataset.row + ':' + r.dataset.id); });
document.addEventListener('dragover', e => { if (fm && e.target.closest('[data-row=f]')) e.preventDefault(); });
document.addEventListener('drop', e => { const r = e.target.closest('[data-row=f]'); if (!r || !fm) return; e.preventDefault(); const [k, id] = e.dataTransfer.getData('text/plain').split(':'); if (k === 'f' && (id === r.dataset.id || isDesc(id, r.dataset.id))) return alert('Impossible de placer un dossier dans lui-même.'); moveItem(k, id, r.dataset.id); fmShow(); });
applyTheme(); all();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(() => {});
