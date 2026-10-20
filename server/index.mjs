import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync,existsSync,statSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {randomUUID,createHmac,timingSafeEqual} from 'node:crypto';
const data=process.env.DATA_DIR||'./data';mkdirSync(data,{recursive:true});
const db=new DatabaseSync(`${data}/blog.sqlite`);
db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS posts(id TEXT PRIMARY KEY,author TEXT NOT NULL,title TEXT NOT NULL,content TEXT NOT NULL,category TEXT NOT NULL,created_at TEXT NOT NULL);`);
const password=process.env.ADMIN_PASSWORD;
if(!password||password.length<16)throw Error('Configura ADMIN_PASSWORD con al menos 16 caracteres');
const signature=v=>createHmac('sha256',password).update(v).digest('hex');
const equal=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);};
const authenticated=req=>{const token=/(?:^|; )bagua_admin=([^;]+)/.exec(req.headers.cookie||'')?.[1]||'';const [expiry,sig]=token.split('.');return Number(expiry)>Date.now()&&equal(sig||'',signature(expiry||''));};
const limits=new Map();
function limited(req,kind,max){const key=`${kind}:${req.headers['cf-connecting-ip']||req.socket.remoteAddress}`;const now=Date.now();if(limits.size>5000)for(const [k,v] of limits)if(v.until<now)limits.delete(k);let entry=limits.get(key);if(!entry||entry.until<now){entry={until:now+60000,count:0};limits.set(key,entry);}return ++entry.count>max;}
async function body(req){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>16000)throw Error('Mensaje demasiado largo.');}return JSON.parse(raw);}
const root=resolve('site');
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2'};
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
    if(path==='/api/admin/logout'&&req.method==='POST')return send(200,{ok:true},{'Set-Cookie':'bagua_admin=; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=0'});
    if(path==='/api/admin/posts'&&req.method==='GET')return send(200,{posts:db.prepare('SELECT * FROM posts ORDER BY created_at DESC').all()});
    if(path.startsWith('/api/admin/posts/')&&req.method==='DELETE'){const r=db.prepare('DELETE FROM posts WHERE id=?').run(path.split('/').pop());return send(r.changes?200:404,{ok:!!r.changes});}
    return send(404,{error:'Ruta no encontrada.'});
   }
   if(path==='/api/posts'&&req.method==='GET'){const quick=url.searchParams.get('type')==='quick';return send(200,{posts:db.prepare(`SELECT * FROM posts WHERE category${quick?'=':'!='}'Sugerencia' ORDER BY created_at DESC LIMIT 200`).all()});}
   if(path==='/api/posts'&&req.method==='POST'){
    if(limited(req,'post',8))return send(429,{error:'Has enviado varios aportes. Espera un minuto.'});
    const input=await body(req);if(!input||typeof input!=='object')return send(400,{error:'Datos inválidos.'});
    const quickPost=input.category==='Sugerencia';if(quickPost)input.title='Sugerencia';
    for(const [field,min,max] of quickPost?[['author',2,60],['content',5,200]]:[['author',2,60],['title',5,120],['content',20,3000]])if(typeof input[field]!=='string'||input[field].trim().length<min||input[field].trim().length>max)return send(400,{error:`Revisa ${field}: entre ${min} y ${max} caracteres.`});
    if(!['Experiencia','Idea','Reporte','Sugerencia'].includes(input.category)||input.website)return send(400,{error:'Aporte inválido.'});
    const post={id:randomUUID(),author:input.author.trim(),title:String(input.title).trim(),content:input.content.trim(),category:input.category,created_at:new Date().toISOString()};
    db.prepare('INSERT INTO posts VALUES(?,?,?,?,?,?)').run(...Object.values(post));return send(201,{post});
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
