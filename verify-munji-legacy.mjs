import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {launchMunji} from './launch-munji.mjs';
import {projectKey} from './munji-runtime.mjs';
import {stopLegacyServer} from './munji-legacy-server.mjs';

const root=await fs.mkdtemp(path.join(os.tmpdir(),'munji-legacy-'));
const foreign=await fs.mkdtemp(path.join(os.tmpdir(),'munji-foreign-'));
const oldSource=`import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';const root=path.join(process.cwd(),'dist');http.createServer(async(req,res)=>{try{res.end(await fs.readFile(path.join(root,new URL(req.url,'http://localhost').pathname)))}catch{res.writeHead(404).end()}}).listen(Number(process.env.PORT),'127.0.0.1');`;
const children=[];
async function port(){const s=http.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p}
async function oldServer(folder,p){
  await fs.mkdir(path.join(folder,'dist'));await fs.writeFile(path.join(folder,'serve.mjs'),oldSource);
  const child=spawn(process.execPath,[path.join(folder,'serve.mjs')],{cwd:folder,env:{...process.env,PORT:String(p)},windowsHide:true,stdio:'ignore'});children.push(child);
  for(let i=0;i<50;i++){try{await fetch('http://127.0.0.1:'+p+'/api/runtime');return child}catch{await new Promise(r=>setTimeout(r,50))}}
  throw Error('Temporary legacy server did not start');
}
const ownedPort=await port(),otherPort=await port();let replacement;
try{
  const legacy=await oldServer(root,ownedPort);
  for(const name of ['serve.mjs','munji-runtime.mjs','camscanner-api.mjs'])await fs.copyFile(new URL('./'+name,import.meta.url),path.join(root,name));
  await fs.writeFile(path.join(root,'dist','index.html'),'Munji startup test');
  replacement=await launchMunji({root,port:ownedPort,showBrowser:()=>{},fetchImpl:(url,options)=>url.endsWith('/api/camscanner/connectivity')?Promise.resolve(Response.json({reachable:true,processingVerified:false})):fetch(url,options)});
  assert.equal(replacement.restarted,true);assert.notEqual(replacement.pid,legacy.pid);
  const info=await(await fetch(replacement.url+'/api/runtime')).json();assert.equal(info.projectKey,projectKey(root));assert.equal(info.pid,replacement.pid);
  assert.equal(await(await fetch(replacement.url)).text(),'Munji startup test');
  assert.equal((await(await fetch(replacement.url+'/api/camscanner/status')).json()).provider,'CamScanner','restored server routes the external-service API');
  assert.deepEqual((await fs.readdir(path.join(root,'dist'))),['index.html'],'remove the temporary ownership proof');
  const unrelated=await oldServer(foreign,otherPort);
  await assert.rejects(launchMunji({root,port:otherPort,showBrowser:()=>{}}),/문지 폴더/);
  assert.equal(unrelated.exitCode,null);assert.equal((await fetch('http://127.0.0.1:'+otherPort+'/api/runtime')).status,404,'leave another folder server running');
  let stopped=false,requests=0;
  await assert.rejects(stopLegacyServer({root,port:otherPort,url:'http://test',fetchImpl:async url=>{
    requests++;const filename=new URL(url).pathname.slice(1);return new Response(requests===1?await fs.readFile(path.join(root,'dist',filename)):'changed');
  },getListener:async()=>12345,isNode:async()=>true,stop:()=>{stopped=true}}),/바뀌었/);
  assert.equal(stopped,false,'recheck ownership before stopping');
  assert.deepEqual(await fs.readdir(path.join(root,'dist')),['index.html']);
  console.log(JSON.stringify({result:'passed',realWindowsProcesses:true,checks:['legacy 404 runtime response','prove exact served folder','identify Node port owner','replace old PID with actual application server','runtime and CamScanner API wiring','keep original browser origin','leave another folder server running','recheck ownership before stop','clean proof files'],externalNetworkUsed:false},null,2));
}finally{
  if(replacement){try{const info=await(await fetch(replacement.url+'/api/runtime')).json();if(info.projectKey===projectKey(root))await fetch(replacement.url+'/api/runtime/shutdown',{method:'POST',headers:{Origin:replacement.url,'Content-Type':'application/json'},body:JSON.stringify({instanceId:info.instanceId})})}catch{}}
  for(const child of children)if(child.exitCode===null)child.kill();
  await new Promise(r=>setTimeout(r,600));
  for(const folder of [root,foreign]){
    for(const name of ['serve.mjs','munji-runtime.mjs','camscanner-api.mjs','.munji-server.json','.munji-server-output.log','.munji-server-error.log','dist/index.html'])await fs.unlink(path.join(folder,name)).catch(e=>{if(e.code!=='ENOENT')throw e});
    await fs.rmdir(path.join(folder,'dist'));await fs.rmdir(folder);
  }
}
