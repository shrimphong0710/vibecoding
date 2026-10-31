import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {projectKey} from './munji-runtime.mjs';
import {stopLegacyServer} from './munji-legacy-server.mjs';
const project=path.dirname(fileURLToPath(import.meta.url));
async function runtimeAt(url,fetchImpl){
  let response;try{response=await fetchImpl(url+'/api/runtime',{signal:AbortSignal.timeout(1200),cache:'no-store'})}catch{return null}
  if(!response.ok)return {legacy:true};
  try{return await response.json()}catch{return {legacy:true}}
}
async function spawnServer(root,port){
  const out=await fs.open(path.join(root,'.munji-server-output.log'),'a'),err=await fs.open(path.join(root,'.munji-server-error.log'),'a');
  try{const child=spawn(process.execPath,[path.join(root,'serve.mjs')],{cwd:root,env:{...process.env,PORT:String(port)},windowsHide:true,detached:true,stdio:['ignore',out.fd,err.fd]});await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject)});child.unref();return{pid:child.pid}}finally{await out.close();await err.close()}
}
function openBrowser(url){const child=spawn('cmd.exe',['/d','/c','start','',url],{windowsHide:true,stdio:'ignore'});child.on('error',()=>{});child.unref()}
export async function launchMunji({root=project,port=Number(process.env.PORT)||4173,fetchImpl=globalThis.fetch,startServer=spawnServer,stopLegacy=stopLegacyServer,showBrowser=openBrowser,delay=ms=>new Promise(r=>setTimeout(r,ms))}={}){
  if(!Number.isInteger(port)||port<1||port>65535)throw Error('유효한 실행 포트가 필요합니다.');
  const url='http://127.0.0.1:'+port,key=projectKey(root),existing=await runtimeAt(url,fetchImpl);
  if(existing){
    if(existing.legacy){
      await stopLegacy({root,port,url,fetchImpl});
    }else{
      if(existing.app!=='munji-studio'||existing.projectKey!==key)throw Error('다른 프로젝트가 이 포트를 사용하고 있어 종료하지 않았습니다.');
      const stopped=await fetchImpl(url+'/api/runtime/shutdown',{method:'POST',headers:{'Content-Type':'application/json',Origin:url},body:JSON.stringify({instanceId:existing.instanceId}),signal:AbortSignal.timeout(2000)});
      if(!stopped.ok)throw Error('기존 문지 서버를 종료하지 못했습니다. 다시 실행해 주세요.');
    }
    let gone=false;for(let i=0;i<30;i++){await delay(100);const current=await runtimeAt(url,fetchImpl);if(!current){gone=true;break}if(!existing.legacy&&current.instanceId!==existing.instanceId)throw Error('다른 문지 실행이 진행 중입니다. 잠시 후 다시 시도해 주세요.')}
    if(!gone)throw Error('기존 문지 서버가 종료되기를 기다리고 있습니다. 잠시 후 다시 실행해 주세요.');
  }
  const child=await startServer(root,port);let ready;
  for(let i=0;i<40;i++){await delay(150);const current=await runtimeAt(url,fetchImpl);if(current){if(current.app!=='munji-studio'||current.projectKey!==key||current.pid!==child.pid)throw Error('새 서버의 실행 정보를 확인하지 못했습니다.');ready=current;break}}
  if(!ready)throw Error('문지 서버가 시작되지 않았습니다. .munji-server-error.log를 확인해 주세요.');
  let connectivity;try{const response=await fetchImpl(url+'/api/camscanner/connectivity',{signal:AbortSignal.timeout(8000),cache:'no-store'});connectivity=await response.json()}catch{connectivity={reachable:false,error:'CHECK_FAILED',message:'CamScanner 접속 상태를 확인하지 못했습니다.'}}
  showBrowser(url);return{url,restarted:!!existing,pid:child.pid,connectivity};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const result=await launchMunji();console.log('Munji Studio: '+result.url);if(!result.connectivity.reachable){console.error(result.connectivity.message||'CamScanner 연결을 확인하지 못했습니다.');process.exitCode=2}else console.log('CamScanner network connection is reachable. Image processing has not been tested by startup.')}catch(error){console.error(error.message);process.exitCode=1}
}
