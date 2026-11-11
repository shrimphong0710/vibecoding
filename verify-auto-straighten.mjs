import assert from 'node:assert/strict';
import http from 'node:http';
import {createCamScannerHandler,straightenWithCamScanner} from './camscanner-api.mjs';
import worker from './dist/server/index.js';
import {editorHarness,createCanvas} from './qa-editor-harness.mjs';

function fixture(width,height,color){const c=createCanvas(width,height),x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,width,height);x.fillStyle='#111';x.fillRect(25,35,width-50,3);return c}
const input=fixture(600,400,'#ededdd'),output=fixture(360,480,'#fff'),image=input.toDataURL(),resultImage=output.toDataURL(),requests=[];
let mode='success',release;
async function transport(url,options){
  requests.push({url:String(url),options});
  if(mode==='auth')return new Response('',{status:401});
  if(mode==='rate')return new Response('',{status:429});
  if(mode==='slow')await new Promise((resolve,reject)=>{release=resolve;options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true})});
  if(String(url).includes('download_file'))return new Response(output.toBuffer('image/png'));
  return Response.json({code:200,tool_result:{success:true,data:{file_id:String(url).includes('upload_file')?'input-id':'result-id'}}});
}
function contract(){
  const calls=requests.slice(-3);assert.equal(calls.length,3);
  assert.match(calls[0].url,/upload_file\/execute$/);assert.equal(calls[0].options.headers['Content-Type'],'application/octet-stream');
  assert.match(calls[1].url,/image_hd\/execute$/);assert.deepEqual(JSON.parse(calls[1].options.body),{file_id:'input-id'});
  assert.match(calls[2].url,/download_file\/execute\?response_mode=raw$/);assert.deepEqual(JSON.parse(calls[2].options.body),{file_id:'result-id'});
}
assert.equal((await straightenWithCamScanner(image,{fetchImpl:transport})).image,resultImage);contract();
for(const [kind,code]of [['auth','CAMSCANNER_AUTH_REQUIRED'],['rate','RATE_LIMITED']]){mode=kind;await assert.rejects(straightenWithCamScanner(image,{fetchImpl:transport}),error=>error.code===code)}mode='success';
const handler=createCamScannerHandler({fetchImpl:transport}),server=http.createServer(async(req,res)=>{if(!await handler(req,res))res.writeHead(404).end()});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
try{
  const post=(pathname,body,extra={})=>fetch(origin+pathname,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...extra},body:typeof body==='string'?body:JSON.stringify(body)});
  let response=await post('/api/photo-correction/straighten',{image});assert.equal(response.status,200);assert.equal((await response.json()).image,resultImage);contract();
  const before=requests.length;assert.equal((await post('/api/photo-correction/straighten',{image},{Origin:'https://unrelated.example'})).status,403);assert.equal(requests.length,before);
  assert.equal((await post('/api/photo-correction/straighten','{')).status,400);
  assert.equal((await post('/api/photo-correction/straighten',{image:'invalid'})).status,400);
  assert.equal((await post('/api/handwriting-removal/erase',{image})).status,200);assert.match(requests.at(-2).url,/enhance_image\/execute$/);
  mode='slow';release=null;const pending=post('/api/photo-correction/straighten',{image});while(!release)await new Promise(r=>setTimeout(r,5));assert.equal((await post('/api/handwriting-removal/erase',{image})).status,409);mode='success';release();assert.equal((await pending).status,200);
}finally{await new Promise(r=>server.close(r))}
const originalFetch=globalThis.fetch;
try{
  globalThis.fetch=transport;const site='https://munji-test.chatgpt.site',post=(body,requestOrigin=site)=>worker.fetch(new Request(site+'/api/photo-correction/straighten',{method:'POST',headers:{Origin:requestOrigin,'Content-Type':'application/json'},body:typeof body==='string'?body:JSON.stringify(body)}));
  const response=await post({image});assert.equal(response.status,200);assert.equal((await response.json()).image,resultImage);contract();
  const before=requests.length;assert.equal((await post({image},'https://unrelated.example')).status,403);assert.equal(requests.length,before);
  assert.equal((await post('{')).status,400);assert.equal((await post({image:'invalid'})).status,400);
  mode='slow';release=null;const pending=post({image});while(!release)await new Promise(r=>setTimeout(r,5));assert.equal((await post({image})).status,409);mode='success';release();assert.equal((await pending).status,200);
}finally{globalThis.fetch=originalFetch}

const {ctx,element,run,M,canvas}=await editorHarness();const original=M.state.questions[0];let calls=0,lastUpload;
ctx.fetch=async(route,options)=>{
  assert.equal(route,'/api/photo-correction/straighten');calls++;lastUpload=JSON.parse(options.body).image;
  if(mode==='slow'||mode==='stale')await new Promise((resolve,reject)=>{release=resolve;if(mode==='slow')options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true})});
  return{ok:mode!=='failure',json:async()=>mode==='failure'?{message:'service unavailable'}:{image:mode==='invalid'?'data:image/png;base64,YQ==':resultImage}};
};
const pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
async function reopen(){mode='success';M.state.questions.splice(0,M.state.questions.length,{...original,src:image,original:image,width:600,height:400});await run('openEditor(state.questions[0].id)')}
await reopen();await element('auto-straighten').onclick();assert.equal(calls,1);assert.equal(canvas.width,360);assert.equal(canvas.height,480);assert.deepEqual(pixels(canvas),pixels(output));assert.equal(run('ed.history.length'),1);assert.equal(element('auto-straighten-comparison').hidden,false);
element('straighten-before').onclick();assert.equal(canvas.width,600);assert.equal(canvas.height,400);assert.deepEqual(pixels(canvas),pixels(input));
element('straighten-result').onclick();assert.deepEqual(pixels(canvas),pixels(output));assert.equal(calls,1,'comparison uses no network');
element('straighten-before').onclick();element('editor-apply').onclick();assert.equal(M.state.questions[0].width,360);assert.equal(M.state.questions[0].height,480);assert.equal(M.state.questions[0].original,image,'save retains original');
await reopen();await element('auto-straighten').onclick();await element('editor-undo').onclick();assert.deepEqual(pixels(canvas),pixels(input));assert.equal(element('auto-straighten-comparison').hidden,true);
await element('auto-straighten').onclick();element('straighten-before').onclick();element('auto-straighten-manual').onclick();assert.equal(canvas.width,360);assert.ok(run('!!ed.perspective'));element('perspective-cancel').onclick();assert.deepEqual(pixels(canvas),pixels(output));
await reopen();mode='failure';await element('auto-straighten').onclick();assert.deepEqual(pixels(canvas),pixels(input));assert.equal(run('ed.history.length'),0);assert.match(element('auto-straighten-status').textContent,/service unavailable/);
mode='invalid';await element('auto-straighten').onclick();assert.deepEqual(pixels(canvas),pixels(input));assert.equal(run('ed.history.length'),0);
await reopen();mode='slow';release=null;const pending=element('auto-straighten').onclick();while(!release)await new Promise(r=>setTimeout(r,5));const before=calls;assert.equal(element('editor-apply').disabled,true);assert.equal(element('crop-tool').disabled,true);await element('auto-straighten').onclick();assert.equal(calls,before,'duplicate clicks do not upload twice');element('auto-straighten-stop').onclick();await pending;assert.deepEqual(pixels(canvas),pixels(input));assert.equal(element('auto-straighten').disabled,false);assert.equal(run('ed.history.length'),0);
await reopen();mode='stale';release=null;const stale=element('auto-straighten').onclick();while(!release)await new Promise(r=>setTimeout(r,5));await run('openEditor(state.questions[0].id)');release();await stale;assert.deepEqual(pixels(canvas),pixels(input));assert.equal(run('ed.history.length'),0);
await reopen();ctx.location.protocol='file:';const fileCalls=calls;await element('auto-straighten').onclick();assert.equal(calls,fileCalls);assert.match(element('auto-straighten-status').textContent,/Start-Munji/);ctx.location.protocol='http:';
await element('auto-straighten').onclick();element('straighten-before').onclick();mode='success';await element('auto-straighten').onclick();assert.equal((await M.loadImage(lastUpload)).width,360,'repeated adjustment uses the applied result');
await element('reset-photo').onclick();assert.deepEqual(pixels(canvas),pixels(input));assert.equal(element('auto-straighten-comparison').hidden,true);
clearTimeout(run('toastTimer'));clearTimeout(run('saveTimer'));element('editor-dialog').close();
console.log(JSON.stringify({result:'passed',liveProviderCall:false,checks:['official image_hd automatic crop request on Node and Worker','changed photo proportions','same-origin validation','malformed input','provider errors','shared concurrency guard','one-click apply','before and after at different sizes','save from before view','original preservation','undo and restore','manual correction after AI','failure and cancellation preserve pixels','duplicate click prevention','stale response protection','standalone guidance']},null,2));
