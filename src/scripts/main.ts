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
type Post = {id:string;author:string;title:string;content:string;category:string;created_at:string};
let posts: Post[] = [], filter = 'Todos';
async function load() { try { const response=await fetch('/api/posts',{cache:'no-store'}); const data=await response.json();if(!response.ok)throw Error(data.error); posts=data.posts; $('blog-status').textContent = `${posts.length} aportes compartidos · Actualización automática cada 15 segundos.`;render(); } catch { $('blog-status').textContent='No se pudo conectar con el servidor. Pulsa actualizar para reintentar.'; } }
function render() {
  const query = $<HTMLInputElement>('search').value.toLocaleLowerCase();
  const visible = posts.filter(p=>(filter==='Todos'||p.category===filter)&&`${p.title} ${p.content} ${p.author}`.toLocaleLowerCase().includes(query));
  const root = $('posts'); root.replaceChildren();
  if(!visible.length){const empty=document.createElement('div');empty.className='empty';empty.textContent=posts.length?'No hay aportes que coincidan con tu búsqueda.':'Este espacio empieza contigo. Comparte la primera idea para una Bagua más limpia.';root.append(empty);return;}
  visible.forEach(p=>{const card=document.createElement('article');card.className='post-card';const badge=document.createElement('span');badge.className='pill';badge.textContent=p.category;const title=document.createElement('h3');title.textContent=p.title;const content=document.createElement('p');content.textContent=p.content;const meta=document.createElement('div');meta.className='post-meta';const date=new Date(p.created_at);meta.textContent=`${p.author} · ${isNaN(date.getTime())?'':date.toLocaleDateString('es-PE',{day:'numeric',month:'short',year:'numeric'})}`;card.append(badge,title,content,meta);root.append(card);});
}
const dialog = $<HTMLDialogElement>('post-dialog'), form = $<HTMLFormElement>('post-form');
$('open-post').addEventListener('click',()=>{ $('form-status').textContent='';dialog.showModal(); });
$('close-post').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
form.addEventListener('submit',async event=>{event.preventDefault();const button=$<HTMLButtonElement>('submit-post');button.disabled=true;$('form-status').textContent='Publicando…';try{const response=await fetch('/api/posts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...Object.fromEntries(new FormData(form)),author:authorOf(form)})});const result=await response.json();if(!response.ok)throw Error(result.error||'No se pudo publicar.');await load();form.reset();dialog.close();$('blog-status').textContent='¡Aporte publicado! Ya pueden verlo los demás participantes.';}catch(error){$('form-status').textContent=error instanceof Error?error.message:'Error al publicar.';}finally{button.disabled=false;}});
document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter!;document.querySelectorAll('[data-filter]').forEach(el=>{el.classList.toggle('active',el===button);el.setAttribute('aria-pressed',String(el===button));});render();}));
$('search').addEventListener('input',render);$('refresh').addEventListener('click',load);setInterval(()=>{if(!document.hidden)load();},15000);load();

const qd = $<HTMLDialogElement>('quick-dialog'), qf = $<HTMLFormElement>('quick-form'), qt = $<HTMLTextAreaElement>('q-text');
$('open-quick').addEventListener('click',()=>{ $('q-status').textContent=''; qd.showModal(); });
$('close-quick').addEventListener('click',()=>qd.close());
qd.addEventListener('click',event=>{if(event.target===qd){const r=qd.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)qd.close();}});
qt.addEventListener('input',()=>{$('q-count').textContent=`${qt.value.length} / 200`;});
qf.addEventListener('submit',async event=>{event.preventDefault();const btn=$<HTMLButtonElement>('q-send');btn.disabled=true;$('q-status').textContent='Enviando…';try{const response=await fetch('/api/posts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({author:authorOf(qf),title:'Sugerencia',content:qt.value.trim(),category:'Sugerencia',website:String(new FormData(qf).get('website')||'')})});const result=await response.json();if(!response.ok)throw Error(result.error||'No se pudo enviar.');qf.reset();$('q-count').textContent='0 / 200';qd.close();$('blog-status').textContent='¡Gracias! Tu sugerencia fue enviada.';}catch(error){$('q-status').textContent=error instanceof Error?error.message:'Error al enviar.';}finally{btn.disabled=false;}});
