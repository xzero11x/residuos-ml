import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {randomBytes} from 'node:crypto';
test('publicación compartida, acceso privado, persistencia y eliminación',async()=>{
 const parent=resolve(tmpdir()),dir=mkdtempSync(join(parent,'bagua-test-'));
 const password=randomBytes(24).toString('hex');const base='http://127.0.0.1:14322';let child;
 async function start(){child=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,PORT:'14322',DATA_DIR:dir,ADMIN_PASSWORD:password},stdio:'ignore'});for(let i=0;i<60;i++){try{if((await fetch(base+'/api/posts')).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('Servidor no arrancó');}
 async function stop(){if(!child||child.exitCode!==null)return;await new Promise(r=>{child.once('exit',r);child.kill();});}
 try{
  await start();
  assert.equal((await fetch(base+'/api/admin/posts')).status,401);
  assert.equal((await fetch(base+'/api/posts',{method:'POST',body:JSON.stringify({title:'x'})})).status,400);
  const input={author:'Prueba de integración',title:'Aporte de prueba',content:'Mensaje temporal para verificar el almacenamiento compartido.',category:'Idea'};
  assert.equal((await fetch(base+'/api/posts',{method:'POST',headers:{Origin:'https://otro.example'},body:JSON.stringify(input)})).status,403);
  const created=await fetch(base+'/api/posts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});assert.equal(created.status,201);const {post}=await created.json();
  assert.equal((await(await fetch(base+'/api/posts')).json()).posts[0].id,post.id);
  await stop();await start();
  assert.equal((await(await fetch(base+'/api/posts')).json()).posts[0].id,post.id);
  assert.equal((await fetch(base+'/api/admin/login',{method:'POST',body:JSON.stringify({password:'incorrecta'})})).status,401);
  const login=await fetch(base+'/api/admin/login',{method:'POST',body:JSON.stringify({password})});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
  const list=await fetch(base+'/api/admin/posts',{headers:{Cookie:cookie}});assert.equal((await list.json()).posts.length,1);
  assert.equal((await fetch(base+'/api/admin/posts/'+post.id,{method:'DELETE',headers:{Cookie:cookie}})).status,200);
  assert.equal((await(await fetch(base+'/api/posts')).json()).posts.length,0);
 }finally{await stop();if(resolve(dir).startsWith(parent+sep)&&dir.includes('bagua-test-'))rmSync(dir,{recursive:true,force:true});}
});
