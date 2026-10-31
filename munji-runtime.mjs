import {createHash,randomUUID} from 'node:crypto';
import path from 'node:path';
export const projectKey=root=>createHash('sha256').update(path.resolve(root).toLowerCase()).digest('hex');
export function createRuntimeHandler({root,onShutdown}){
  const info={app:'munji-studio',projectKey:projectKey(root),instanceId:randomUUID(),pid:process.pid,startedAt:new Date().toISOString()};
  async function handle(req,res){
    const pathname=new URL(req.url,'http://localhost').pathname;if(!pathname.startsWith('/api/runtime'))return false;
    const expected='http://'+req.headers.host,send=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body))};
    if(!['127.0.0.1','localhost','[::1]'].includes(new URL(expected).hostname)||req.headers.origin&&req.headers.origin!==expected){send(403,{error:'FORBIDDEN_ORIGIN'});return true}
    if(pathname==='/api/runtime'&&req.method==='GET'){send(200,info);return true}
    if(pathname==='/api/runtime/shutdown'&&req.method==='POST'){
      if(req.headers.origin!==expected||Number(req.headers['content-length']||0)>1024){send(403,{error:'FORBIDDEN_ORIGIN'});return true}
      let text='',body;try{for await(const chunk of req){text+=chunk;if(text.length>1024)throw Error('large')}body=JSON.parse(text)}catch{send(400,{error:'INVALID_REQUEST'});return true}
      if(body.instanceId!==info.instanceId){send(409,{error:'STALE_INSTANCE'});return true}
      send(200,{stopping:true});setTimeout(onShutdown,100);return true;
    }
    send(404,{error:'NOT_FOUND'});return true;
  }
  return{info,handle};
}
