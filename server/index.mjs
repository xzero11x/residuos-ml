import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync,existsSync,statSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {randomUUID,createHmac,timingSafeEqual} from 'node:crypto';
const data=process.env.DATA_DIR||'./data';mkdirSync(data,{recursive:true});
const db=new DatabaseSync(`${data}/blog.sqlite`);
db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS posts(id TEXT PRIMARY KEY,author TEXT NOT NULL,title TEXT NOT NULL,content TEXT NOT NULL,category TEXT NOT NULL,created_at TEXT NOT NULL);`);
for(const col of ['dni TEXT','sector TEXT'])try{db.exec(`ALTER TABLE posts ADD COLUMN ${col}`);}catch{}
const password=process.env.ADMIN_PASSWORD;
if(!password||password.length<16)throw Error('Configura ADMIN_PASSWORD con al menos 16 caracteres');
const signature=v=>createHmac('sha256',password).update(v).digest('hex');
const equal=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);};
const authenticated=req=>{const token=/(?:^|; )bagua_admin=([^;]+)/.exec(req.headers.cookie||'')?.[1]||'';const [expiry,sig]=token.split('.');return Number(expiry)>Date.now()&&equal(sig||'',signature(expiry||''));};
const norm=t=>t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[@4]/g,'a').replace(/3/g,'e').replace(/[1!|]/g,'i').replace(/0/g,'o').replace(/[$5]/g,'s').replace(/7/g,'t');
const squash=t=>t.replace(/(.)\1+/g,'$1');
const BAD=new Set(['puta','puto','putas','putos','mierda','mrd','carajo','cojudo','cojuda','cojudez','huevon','huevona','weon','weona','ctm','concha','conchudo','pendejo','pendeja','imbecil','idiota','estupido','estupida','maricon','marica','cabron','chucha','verga','culo','joder','jodete','hdp','zorra','mongolo','retrasado','subnormal','tarado','tarada','culiao','mamahuevo','gilipollas','malnacido','basurero','asqueroso'].map(w=>squash(norm(w))));
const BAD_LONG=['conchatumadre','conchetumadre','reconchatumadre','hijueputa','hijodeputa','hijoeputa','malparido','cabezademazo'].map(w=>squash(norm(w)));
const SPAM=/https?:|www\.|\.(?:com|net|org|pe|io|xyz|ru|ly|me)\b|@[a-z0-9_]{3,}|\b\d{8,}\b|(?:\d[\s.-]?){9,}|(.)\1{7,}/i;
function blocked(text){
 const base=norm(String(text));
 if(SPAM.test(String(text).toLowerCase()))return true;
 const joined=base.replace(/\b(?:[a-z][\s.\-_*]+){2,}[a-z]\b/g,m=>m.replace(/[\s.\-_*]/g,''));
 const tokens=squash(joined).split(/[^a-zn]+/).filter(Boolean);
 if(tokens.some(w=>BAD.has(w)))return true;
 const compact=squash(joined.replace(/[^a-zn]/g,''));
 return BAD_LONG.some(w=>compact.includes(w));
}
const BLOCKED_MSG='Tu mensaje contiene palabras, enlaces o números no permitidos. Reescríbelo con respeto.';
const SECTORS=['Bagua centro','Sector norte','Sector sur','Sector oeste','Sector este'];
const REPORT_TYPES=['Acumulación de residuos','Punto crítico','Recojo no realizado','Otro'];
const limits=new Map();
function limited(req,kind,max){const key=`${kind}:${req.headers['x-client-ip']||req.headers['cf-connecting-ip']||req.socket.remoteAddress}`;const now=Date.now();if(limits.size>5000)for(const [k,v] of limits)if(v.until<now)limits.delete(k);let entry=limits.get(key);if(!entry||entry.until<now){entry={until:now+60000,count:0};limits.set(key,entry);}return ++entry.count>max;}
async function body(req){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>16000)throw Error('Mensaje demasiado largo.');}return JSON.parse(raw);}
const root=resolve('site');
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{
 const send=(status,value,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(value));};
 try{
  const url=new URL(req.url,'http://localhost');const path=url.pathname;
  if(path.startsWith('/api/')){
   if(!['GET','POST','DELETE'].includes(req.method))return send(405,{error:'Método no permitido.'});
   if(req.method!=='GET'&&req.headers.origin){let origin;try{origin=new URL(req.headers.origin).host;}catch{return send(403,{error:'Origen inválido.'});}if(origin!==req.headers.host)return send(403,{error:'Origen no permitido.'});}
   if(path==='/api/admin/login'&&req.method==='POST'){
    if(limited(req,'login',5))return send(429,{error:'Demasiados intentos. Espera un minuto.'});
    const input=await body(req);if(!equal(String(input.password||''),password))return send(401,{error:'Contraseña incorrecta.'});
    const expiry=String(Date.now()+8*3600000);return send(200,{ok:true},{'Set-Cookie':`bagua_admin=${expiry}.${signature(expiry)}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=28800${req.headers['x-forwarded-proto']==='https'?'; Secure':''}`});
   }
   if(path.startsWith('/api/admin/')){
    if(!authenticated(req))return send(401,{error:'Inicia sesión para acceder.'});
    if(path==='/api/admin/session'&&req.method==='GET')return send(200,{ok:true});
    if(path==='/api/admin/logout'&&req.method==='POST')return send(200,{ok:true},{'Set-Cookie':'bagua_admin=; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=0'});
    if(path==='/api/admin/posts'&&req.method==='GET')return send(200,{posts:db.prepare('SELECT * FROM posts ORDER BY created_at DESC').all()});
    if(path.startsWith('/api/admin/posts/')&&req.method==='DELETE'){const r=db.prepare('DELETE FROM posts WHERE id=?').run(path.split('/').pop());return send(r.changes?200:404,{ok:!!r.changes});}
    return send(404,{error:'Ruta no encontrada.'});
   }
   if(path==='/api/posts'&&req.method==='GET'){
    const limit=Math.min(60,Math.max(1,Number(url.searchParams.get('limit'))||6)),offset=Math.max(0,Number(url.searchParams.get('offset'))||0);
    const posts=db.prepare("SELECT id,author,sector,content,created_at FROM posts WHERE category='Sugerencia' ORDER BY created_at DESC LIMIT ? OFFSET ?").all(limit,offset);
    const total=db.prepare("SELECT COUNT(*) AS n FROM posts WHERE category='Sugerencia'").get().n;
    return send(200,{posts,total});
   }
   if(path==='/api/posts'&&req.method==='POST'){
    if(limited(req,'post',6))return send(429,{error:'Has enviado varios mensajes. Espera un minuto.'});
    const input=await body(req);if(!input||typeof input!=='object'||input.website)return send(400,{error:'Datos inválidos.'});
    const text=(v,min,max)=>typeof v==='string'&&v.trim().length>=min&&v.trim().length<=max;
    let post;
    if(input.category==='Sugerencia'){
     if(!text(input.author,2,40)||!text(input.content,5,200))return send(400,{error:'Revisa tu nombre (2–40) y tu sugerencia (5–200 caracteres).'});
     const sector=SECTORS.includes(input.sector)?input.sector:null;
     if(blocked(input.author)||blocked(input.content))return send(422,{error:BLOCKED_MSG});
     if(db.prepare("SELECT 1 FROM posts WHERE content=? AND created_at>? LIMIT 1").get(input.content.trim(),new Date(Date.now()-3600000).toISOString()))return send(409,{error:'Esa sugerencia ya fue enviada.'});
     post={id:randomUUID(),author:input.author.trim(),title:'Sugerencia',content:input.content.trim(),category:'Sugerencia',created_at:new Date().toISOString(),dni:null,sector};
    }else if(input.category==='Reporte'){
     if(!/^\d{8}$/.test(String(input.dni||'')))return send(400,{error:'Escribe los 8 dígitos de tu DNI.'});
     if(!SECTORS.includes(input.sector)||!REPORT_TYPES.includes(input.title)||!text(input.content,20,1000))return send(400,{error:'Completa el sector, el tipo de problema y una descripción de 20 a 1000 caracteres.'});
     if(blocked(input.content.replace(/\d{8,}/g,'')))return send(422,{error:BLOCKED_MSG});
     post={id:randomUUID(),author:'Anónimo',title:input.title,content:input.content.trim(),category:'Reporte',created_at:new Date().toISOString(),dni:String(input.dni),sector:input.sector};
    }else return send(400,{error:'Tipo de mensaje inválido.'});
    db.prepare('INSERT INTO posts(id,author,title,content,category,created_at,dni,sector) VALUES(?,?,?,?,?,?,?,?)').run(post.id,post.author,post.title,post.content,post.category,post.created_at,post.dni,post.sector);
    return send(201,{ok:true,post:{id:post.id,author:post.author,content:post.content,created_at:post.created_at,sector:post.sector}});
   }
   return send(404,{error:'Ruta no encontrada.'});
  }
  if(!['GET','HEAD'].includes(req.method))return send(405,{error:'Método no permitido.'});
  let file=resolve(root,'.'+decodeURIComponent(path));if(file!==root&&!file.startsWith(root+sep))return send(403,{error:'Acceso denegado.'});
  if(existsSync(file)&&statSync(file).isDirectory())file=resolve(file,'index.html');
  if(!existsSync(file)||!statSync(file).isFile())return send(404,{error:'Página no encontrada.'});
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':path.startsWith('/_astro/')?'public,max-age=31536000,immutable':'no-cache'});res.end(req.method==='HEAD'?undefined:readFileSync(file));
 }catch{send(400,{error:'No se pudo procesar la solicitud.'});}
});
server.requestTimeout=15000;server.listen(Number(process.env.PORT||4322),'0.0.0.0',()=>console.log('BaguaLimpia disponible en el puerto 4322'));
