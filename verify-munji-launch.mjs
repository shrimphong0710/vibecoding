// Exercise the real Windows child-process launcher on an isolated local port.
// The temporary server has a fake connectivity response and never uses the internet.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {launchMunji} from './launch-munji.mjs';
import {projectKey} from './munji-runtime.mjs';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'munji-launch-test-')),runtimeUrl=new URL('./munji-runtime.mjs',import.meta.url).href;
const reservation=http.createServer();await new Promise(r=>reservation.listen(0,'127.0.0.1',r));const port=reservation.address().port;await new Promise(r=>reservation.close(r));
const source=`import http from 'node:http';import path from 'node:path';import{fileURLToPath}from'node:url';import{createRuntimeHandler}from ${JSON.stringify(runtimeUrl)};const root=path.dirname(fileURLToPath(import.meta.url));const runtime=createRuntimeHandler({root,onShutdown:()=>{server.close();server.closeAllConnections()}});const server=http.createServer(async(req,res)=>{if(await runtime.handle(req,res))return;res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({reachable:true,processingVerified:false}))});server.listen(Number(process.env.PORT),'127.0.0.1');`;
await fs.writeFile(path.join(root,'serve.mjs'),source);const origin='http://127.0.0.1:'+port;let openings=0;
try{
  const first=await launchMunji({root,port,showBrowser:()=>{openings++}});assert.equal(first.restarted,false);assert.equal(first.connectivity.reachable,true);
  const second=await launchMunji({root,port,showBrowser:()=>{openings++}});assert.equal(second.restarted,true);assert.notEqual(second.pid,first.pid);assert.equal(openings,2);
  const runtime=await(await fetch(origin+'/api/runtime')).json();assert.equal(runtime.pid,second.pid);assert.equal(runtime.projectKey,projectKey(root));
  console.log(JSON.stringify({result:'passed',realChildProcesses:true,checks:['hidden detached Node startup','actual HTTP readiness','old process replaced with a new PID','same project identity','isolated local port'],externalNetworkUsed:false},null,2));
}finally{
  try{const runtime=await(await fetch(origin+'/api/runtime')).json();if(runtime.app==='munji-studio'&&runtime.projectKey===projectKey(root))await fetch(origin+'/api/runtime/shutdown',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({instanceId:runtime.instanceId})})}catch{}
  await new Promise(r=>setTimeout(r,500));
  for(const name of ['serve.mjs','.munji-server-output.log','.munji-server-error.log'])await fs.unlink(path.join(root,name)).catch(error=>{if(error.code!=='ENOENT')throw error});
  await fs.rmdir(root);
}
