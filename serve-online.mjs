import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createCamScannerHandler} from './camscanner-api.mjs';

const project=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.txt':'text/plain; charset=utf-8'};

export function createOnlineServer({origin,root=path.join(project,'dist'),camScannerOptions={}}={}){
  const address=new URL(origin);
  if(address.protocol!=='https:'||address.username||address.password||address.pathname!=='/'||address.search||address.hash)throw new Error('Set MUNJI_PUBLIC_ORIGIN to the HTTPS origin of this site.');
  const canonicalOrigin=address.origin,assetRoot=path.resolve(root);
  const camscanner=createCamScannerHandler({...camScannerOptions,allowedOrigin:canonicalOrigin});
  return http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Cache-Control','no-store');
    try{
      const pathname=new URL(req.url,canonicalOrigin).pathname;
      if(pathname==='/healthz'&&['GET','HEAD'].includes(req.method)){
        res.writeHead(200,{'Content-Type':'application/json; charset=utf-8'}).end(req.method==='HEAD'?undefined:'{"status":"ok"}');return;
      }
      if(await camscanner(req,res))return;
      if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'}).end();return;}
      let filename=path.resolve(assetRoot,'.'+decodeURIComponent(pathname));
      if(filename!==assetRoot&&!filename.startsWith(assetRoot+path.sep)){res.writeHead(403).end('Forbidden');return;}
      if((await fs.stat(filename)).isDirectory())filename=path.join(filename,'index.html');
      const body=req.method==='HEAD'?undefined:await fs.readFile(filename);
      res.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream'}).end(body);
    }catch{
      if(!res.headersSent)res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});
      res.end('Not found');
    }
  });
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const origin=process.env.MUNJI_PUBLIC_ORIGIN||process.env.RENDER_EXTERNAL_URL;
  if(!origin)throw new Error('MUNJI_PUBLIC_ORIGIN or RENDER_EXTERNAL_URL is required.');
  const port=Number(process.env.PORT||10000);
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be a valid TCP port.');
  const server=createOnlineServer({origin});
  server.on('error',error=>{console.error(error.message);process.exitCode=1;});
  server.listen(port,'0.0.0.0',()=>console.log('Munji Studio online: '+origin));
}
