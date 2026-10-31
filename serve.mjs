import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createCamScannerHandler} from './camscanner-api.mjs';
import {createRuntimeHandler} from './munji-runtime.mjs';
const project=path.dirname(fileURLToPath(import.meta.url)),root=path.join(project,'dist');
const port=Number(process.env.PORT)||4173;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8'};
const camscanner=createCamScannerHandler();
const runtime=createRuntimeHandler({root:project,onShutdown:()=>{server.close();server.closeAllConnections()}});
const server=http.createServer(async(req,res)=>{
  try{
    if(await runtime.handle(req,res)||await camscanner(req,res))return;
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'}).end();return}
    let p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(p!==root&&!p.startsWith(root+path.sep)){res.writeHead(403).end();return}
    if((await fs.stat(p)).isDirectory())p=path.join(p,'index.html');
    const body=req.method==='HEAD'?undefined:await fs.readFile(p);
    res.writeHead(200,{'Content-Type':types[path.extname(p)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});
    res.end(body);
  }catch{if(!res.headersSent)res.writeHead(404);res.end('Not found')}
});
server.listen(port,'127.0.0.1',async()=>{
  const url='http://127.0.0.1:'+port;
  try{await fs.writeFile(path.join(project,'.munji-server.json'),JSON.stringify({...runtime.info,url},null,2))}catch(error){console.error('Could not save runtime information: '+error.message)}
  console.log('Munji Studio: '+url);
});
server.on('error',error=>{console.error(error.message);process.exitCode=1});
