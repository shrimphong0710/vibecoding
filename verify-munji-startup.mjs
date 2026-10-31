import assert from 'node:assert/strict';
import http from 'node:http';
import {launchMunji} from './launch-munji.mjs';
import {createRuntimeHandler,projectKey} from './munji-runtime.mjs';
const root=process.cwd(),key=projectKey(root);
async function launchCase({existing=null,deny=false,shutdownStatus=200}={}){
  let current=existing,starts=0,stops=0,opened,checks=0;
  const fetchImpl=async(url,options={})=>{
    if(url.endsWith('/api/runtime')){if(!current)throw new TypeError('Not listening');return Response.json(current)}
    if(url.endsWith('/api/runtime/shutdown')){stops++;assert.equal(options.headers.Origin,'http://127.0.0.1:4173');assert.equal(JSON.parse(options.body).instanceId,existing.instanceId);if(shutdownStatus===200)current=null;return Response.json({stopping:shutdownStatus===200},{status:shutdownStatus})}
    if(url.endsWith('/api/camscanner/connectivity')){checks++;return Response.json(deny?{reachable:false,error:'LOCAL_NETWORK_DENIED',message:'Run Start-Munji.cmd'}:{reachable:true,processingVerified:false})}
    throw Error('Unexpected request');
  };
  let result,error;try{result=await launchMunji({root,fetchImpl,startServer:async()=>{starts++;current={app:'munji-studio',projectKey:key,instanceId:'new-instance',pid:12345};return{pid:12345}},showBrowser:url=>{opened=url},delay:async()=>{}})}catch(e){error=e}
  return{result,error,starts,stops,checks,opened};
}
const fresh=await launchCase();assert.equal(fresh.error,undefined);assert.equal(fresh.starts,1);assert.equal(fresh.result.restarted,false);assert.equal(fresh.opened,'http://127.0.0.1:4173');
const owned={app:'munji-studio',projectKey:key,instanceId:'old-instance',pid:11111},restart=await launchCase({existing:owned});assert.equal(restart.result.restarted,true);assert.equal(restart.stops,1);assert.equal(restart.starts,1);assert.equal(restart.checks,1,'startup checks connectivity without uploading an image');
const unrelated=await launchCase({existing:{...owned,projectKey:'unrelated'}});assert.ok(unrelated.error);assert.equal(unrelated.stops,0,'never shut down an unrelated project');assert.equal(unrelated.starts,0);
const stale=await launchCase({existing:owned,shutdownStatus:409});assert.ok(stale.error);assert.equal(stale.starts,0,'do not spawn over a server that has not stopped');
const denied=await launchCase({existing:owned,deny:true});assert.equal(denied.result.connectivity.reachable,false);assert.equal(denied.result.connectivity.error,'LOCAL_NETWORK_DENIED');
let shutdowns=0;const runtime=createRuntimeHandler({root,onShutdown:()=>{shutdowns++}}),server=http.createServer((req,res)=>runtime.handle(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
try{
  const info=await(await fetch(origin+'/api/runtime')).json();assert.equal(info.projectKey,key);
  const stop=(instanceId,requestOrigin=origin)=>fetch(origin+'/api/runtime/shutdown',{method:'POST',headers:{'Content-Type':'application/json',Origin:requestOrigin},body:JSON.stringify({instanceId})});
  assert.equal((await stop(info.instanceId,'https://unrelated.example')).status,403);assert.equal((await stop('wrong-instance')).status,409);assert.equal(shutdowns,0);
  assert.equal((await stop(info.instanceId)).status,200);await new Promise(r=>setTimeout(r,150));assert.equal(shutdowns,1);
}finally{await new Promise(r=>server.close(r))}
console.log(JSON.stringify({result:'passed',checks:['fresh launch','replace the existing server from the same project','never stop another project','wait for old server to stop','stale-instance protection','same-origin shutdown','network preflight without document upload','report blocked network without claiming success'],networkPrivilegeEscalation:false},null,2));
