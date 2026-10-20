import {initDni,readDni} from './dni';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const days = $<HTMLInputElement>('days'), activity = $<HTMLInputElement>('activity'), capacity = $<HTMLInputElement>('capacity');
function simulate() {
  const d = Number(days.value), n = Number(activity.value), f = Number(capacity.value);
  const z = -2.2 + .17 * d + .42 * n - .28 * f;
  const score = Math.round(100 / (1 + Math.exp(-z)));
  $('days-value').textContent = `${d} ${d === 1 ? 'día' : 'días'}`;
  $('activity-value').textContent = String(n);
  $('capacity-value').textContent = `${f} por semana`;
  $('score').textContent = String(score);
  $('risk-label').textContent = score < 40 ? 'Riesgo bajo' : score < 60 ? 'Riesgo medio' : 'Riesgo alto';
  $('risk-advice').textContent = score < 40 ? 'Mantén el seguimiento habitual del sector.' : score < 60 ? 'Contrasta la estimación con la observación en campo.' : 'Prioriza la revisión preventiva de este sector.';
}
[days,activity,capacity].forEach(el=>el.addEventListener('input',simulate)); simulate();
const authorOf=(f:HTMLFormElement)=>{const d=new FormData(f);return String(d.get('alias')||'').trim();};
type Post = {id:string;author:string;sector:string|null;content:string;created_at:string};
let want = 6, total = 0;
async function load() {
  try {
    const response = await fetch(`/api/posts?limit=${want}`, {cache:'no-store'}); const data = await response.json(); if (!response.ok) throw Error(data.error);
    const posts: Post[] = data.posts; total = data.total;
    $('blog-status').textContent = posts.length ? '' : 'Aún no hay sugerencias. Deja la primera.';
    const root = $('posts'); root.replaceChildren();
    posts.forEach(p => {
      const card = document.createElement('article'); card.className = 'qcard';
      const text = document.createElement('p'); text.textContent = p.content;
      const who = document.createElement('div'); who.className = 'qwho';
      const avatar = document.createElement('span'); avatar.textContent = (p.author.trim()[0] || '?').toUpperCase();
      const name = document.createElement('small'); const date = new Date(p.created_at);
      name.textContent = [p.author, p.sector, isNaN(date.getTime()) ? '' : date.toLocaleDateString('es-PE', {day:'numeric', month:'short'})].filter(Boolean).join(' · ');
      who.append(avatar, name); card.append(text, who); root.append(card);
    });
    $('more').hidden = posts.length >= total || want >= 60;
  } catch { $('blog-status').textContent = 'No se pudo cargar las sugerencias. Reintentando…'; }
}
$('more').addEventListener('click', () => { want = Math.min(60, want + 6); load(); });
setInterval(() => { if (!document.hidden) load(); }, 15000); load();
const modal = (dlg: HTMLDialogElement) => dlg.addEventListener('click', event => { if (event.target === dlg) { const r = dlg.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dlg.close(); } });
const post = async (payload: object) => { const response = await fetch('/api/posts', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}); const result = await response.json().catch(() => ({})); if (!response.ok) throw Error(result.error || 'No se pudo enviar.'); return result; };
// Sugerencia rápida (pública)
const qd = $<HTMLDialogElement>('quick-dialog'), qf = $<HTMLFormElement>('quick-form'), qt = $<HTMLTextAreaElement>('q-text');
$('open-quick').addEventListener('click', () => { $('q-status').textContent = ''; qd.showModal(); });
$('close-quick').addEventListener('click', () => qd.close()); modal(qd);
qt.addEventListener('input', () => { $('q-count').textContent = `${qt.value.length} / 200`; });
qf.addEventListener('submit', async event => { event.preventDefault(); const btn = $<HTMLButtonElement>('q-send'); btn.disabled = true; $('q-status').textContent = 'Enviando…';
  try { const d = new FormData(qf); await post({author: authorOf(qf), sector: d.get('sector'), content: qt.value.trim(), category: 'Sugerencia', website: String(d.get('website') || '')}); qf.reset(); $('q-count').textContent = '0 / 200'; qd.close(); $('blog-status').textContent = '¡Gracias! Tu sugerencia ya es visible.'; await load(); }
  catch (error) { $('q-status').textContent = error instanceof Error ? error.message : 'Error al enviar.'; } finally { btn.disabled = false; } });
// Reporte (privado, con DNI)
const rd = $<HTMLDialogElement>('report-dialog'), rf = $<HTMLFormElement>('report-form'), rt = $<HTMLTextAreaElement>('r-text'); initDni(rf);
$('open-report').addEventListener('click', () => { $('r-status').textContent = ''; rd.showModal(); });
$('close-report').addEventListener('click', () => rd.close()); modal(rd);
rt.addEventListener('input', () => { $('r-count').textContent = `${rt.value.length} / 1000`; });
rf.addEventListener('submit', async event => { event.preventDefault(); const dni = readDni(rf); if (!dni) { $('r-status').textContent = 'Escribe los 8 dígitos de tu DNI.'; return; }
  const btn = $<HTMLButtonElement>('r-send'); btn.disabled = true; $('r-status').textContent = 'Enviando…';
  try { const d = new FormData(rf); await post({category: 'Reporte', dni, sector: d.get('sector'), title: d.get('title'), content: rt.value.trim(), website: String(d.get('website') || '')}); rf.reset(); $('r-count').textContent = '0 / 1000'; rd.close(); $('blog-status').textContent = '¡Reporte enviado! Lo revisará el personal autorizado.'; }
  catch (error) { $('r-status').textContent = error instanceof Error ? error.message : 'Error al enviar.'; } finally { btn.disabled = false; } });
