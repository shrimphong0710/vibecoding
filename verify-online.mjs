import assert from 'node:assert/strict';
import {createOnlineServer} from './serve-online.mjs';

const site='https://munji-test.onrender.com';
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
const imageBytes=Buffer.from(image.split(',')[1],'base64'),calls=[];
const transport=async(url,options)=>{
  calls.push({url,options});
  return url.includes('download_file')?new Response(imageBytes):Response.json({code:200,tool_result:{success:true,data:{file_id:'test-file'}}});
};
assert.throws(()=>createOnlineServer({origin:'http://untrusted.example'}),/HTTPS origin/);
const server=createOnlineServer({origin:site,camScannerOptions:{fetchImpl:transport}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const local='http://127.0.0.1:'+server.address().port;
const request=(pathname,options)=>fetch(local+pathname,options);
try{
  const page=await request('/');assert.equal(page.status,200);assert.equal(page.headers.get('www-authenticate'),null);assert.match(await page.text(),/문지/);
  assert.equal((await request('/healthz')).status,200);
  const css=await request('/style.css');assert.equal(css.status,200);assert.match(css.headers.get('content-type'),/text\/css/);
  const head=await request('/',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
  assert.equal((await request('/api/runtime')).status,404);
  assert.equal((await request('/api/runtime/shutdown',{method:'POST'})).status,405);
  assert.equal((await request('/%2e%2e%2fpackage.json')).status,403);
  const post=origin=>request('/api/camscanner/erase',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({image})});
  assert.equal((await post('https://unrelated.example')).status,403);assert.equal(calls.length,0);
  const erased=await post(site);assert.equal(erased.status,200);assert.equal((await erased.json()).image,image);assert.equal(calls.length,3);
  assert.match(calls[0].url,/upload_file\/execute$/);assert.match(calls[1].url,/enhance_image\/execute$/);assert.match(calls[2].url,/download_file\/execute\?response_mode=raw$/);
  assert.equal((await request('/api/camscanner/status')).status,200);
}finally{await new Promise(resolve=>server.close(resolve));}
console.log(JSON.stringify({result:'passed',checks:['public access without a password','health check','HTML and assets','HEAD requests','hosted same-origin image processing','cross-origin rejection','local runtime endpoints unavailable','path traversal rejection'],liveProviderCall:false},null,2));
