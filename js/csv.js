const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
export function parseCSV(t) {
  t = t.replace(/^\uFEFF/, ''); const first = t.split(/\r?\n/)[0] || '';
  const sep = first.includes(';') && (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], c = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
    else if (ch === '"') q = true;
    else if (ch === sep) { row.push(c); c = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; row.push(c); c = ''; rows.push(row); row = []; }
    else c += ch;
  }
  if (c !== '' || row.length) { row.push(c); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim() !== ''));
}
const KEYS = { d: ['designation', 'nom', 'piece', 'libelle'], l: ['longueur', 'long', 'l', 'length'], w: ['largeur', 'larg', 'w', 'width'], q: ['quantite', 'qte', 'qty', 'nb', 'nombre'], g: ['fil', 'grain', 'sens'], ct: ['chanthaut', 'haut', 'cht'], cb: ['chantbas', 'bas', 'chb'], cl: ['chantgauche', 'gauche', 'chg'], cr: ['chantdroit', 'droit', 'chd'], n: ['remarque', 'remarques', 'note', 'commentaire'] };
const yes = v => { v = String(v || '').trim().toLowerCase(); return ['1', 'x', 'oui', 'o', 'true', 'vrai', 'y', 'yes'].includes(v) || +v > 0 ? 1 : 0; };
const nb = v => parseFloat(String(v).trim().replace(',', '.'));
export function mapRows(rows) {
  const errors = [], pieces = [];
  if (!rows.length) return { pieces, errors: ['Fichier vide'] };
  const col = {}; rows[0].forEach((h, i) => { const k = Object.keys(KEYS).find(k => KEYS[k].includes(norm(h))); if (k && !(k in col)) col[k] = i; });
  if (!('l' in col) || !('w' in col)) return { pieces, errors: ['En-têtes non reconnus : colonnes « longueur » et « largeur » requises en première ligne'] };
  rows.slice(1).forEach((r, i) => {
    const g = k => k in col ? (r[col[k]] ?? '') : '', L = nb(g('l')), W = nb(g('w')), Q = 'q' in col ? nb(g('q')) : 1;
    if (!(L > 0)) return errors.push(`Ligne ${i + 2} : longueur invalide « ${g('l')} »`);
    if (!(W > 0)) return errors.push(`Ligne ${i + 2} : largeur invalide « ${g('w')} »`);
    if (!(Q >= 1) || !Number.isInteger(Q)) return errors.push(`Ligne ${i + 2} : quantité invalide « ${g('q')} »`);
    const f = norm(g('g'));
    pieces.push({ d: g('d').trim() || `Pièce ${i + 1}`, l: L, w: W, q: Q, g: f[0] === 'h' ? 'h' : f[0] === 'v' ? 'v' : 'i', ct: yes(g('ct')), cb: yes(g('cb')), cl: yes(g('cl')), cr: yes(g('cr')), n: g('n').trim() });
  });
  return { pieces, errors };
}
