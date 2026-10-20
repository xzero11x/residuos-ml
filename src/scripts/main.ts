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
const authorOf=(f:HTMLFormElement)=>{const d=new FormData(f);const a=String(d.get('alias')||'').trim(),s=String(d.get('sector')||'');return s?`${a} · ${s}`:a;};
type Post = {id:string;author:string;content:string;created_at:string};
async function load() {
  try {
    const response = await fetch('/api/posts?type=quick', {cache:'no-store'}); const data = await response.json(); if (!response.ok) throw Error(data.error);
    const posts: Post[] = data.posts.slice(0, 9);
    $('blog-status').textContent = posts.length ? '' : 'Aún no hay sugerencias. Deja la primera.';
    const root = $('posts'); root.replaceChildren();
    posts.forEach(p => {
      const card = document.createElement('article'); card.className = 'qcard';
      const text = document.createElement('p'); text.textContent = p.content;
      const who = document.createElement('div'); who.className = 'qwho';
      const avatar = document.createElement('span'); avatar.textContent = (p.author.trim()[0] || '?').toUpperCase();
      const name = document.createElement('small'); const date = new Date(p.created_at);
      name.textContent = `${p.author}${isNaN(date.getTime()) ? '' : ' · ' + date.toLocaleDateString('es-PE', {day:'numeric', month:'short'})}`;
      who.append(avatar, name); card.append(text, who); root.append(card);
    });
  } catch { $('blog-status').textContent = 'No se pudo cargar las sugerencias. Reintentando…'; }
}
setInterval(() => { if (!document.hidden) load(); }, 15000); load();
const qd = $<HTMLDialogElement>('quick-dialog'), qf = $<HTMLFormElement>('quick-form'), qt = $<HTMLTextAreaElement>('q-text');
$('open-quick').addEventListener('click',()=>{ $('q-status').textContent=''; qd.showModal(); });
$('close-quick').addEventListener('click',()=>qd.close());
qd.addEventListener('click',event=>{if(event.target===qd){const r=qd.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)qd.close();}});
qt.addEventListener('input',()=>{$('q-count').textContent=`${qt.value.length} / 200`;});
qf.addEventListener('submit',async event=>{event.preventDefault();const btn=$<HTMLButtonElement>('q-send');btn.disabled=true;$('q-status').textContent='Enviando…';try{const response=await fetch('/api/posts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({author:authorOf(qf),title:'Sugerencia',content:qt.value.trim(),category:'Sugerencia',website:String(new FormData(qf).get('website')||'')})});const result=await response.json();if(!response.ok)throw Error(result.error||'No se pudo enviar.');qf.reset();$('q-count').textContent='0 / 200';qd.close();$('blog-status').textContent='¡Gracias! Tu sugerencia ya es visible.';await load();}catch(error){$('q-status').textContent=error instanceof Error?error.message:'Error al enviar.';}finally{btn.disabled=false;}});
