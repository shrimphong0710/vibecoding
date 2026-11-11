import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const project=path.dirname(fileURLToPath(import.meta.url));
const publicFiles=['index.html','style.css','bulk-edit.css','app.js','photo-tools.js','export.js'];
const assets={};
for(const name of publicFiles)assets['/'+name]=await readFile(path.join(project,'dist',name),'utf8');
assets['/']=assets['/index.html'];

const runtime=String.raw`
const CAMSCANNER_ORIGIN='https://ai-tools.camscanner.com';
const TYPES={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const MAX_IMAGE=10*1024*1024;
let busy=false;

class ServiceError extends Error{
  constructor(message,status=502,code='CAMSCANNER_ERROR'){super(message);this.status=status;this.code=code}
}
function json(status,data){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
function mimeOf(bytes){return bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71?'image/png':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':null}
function decodeImage(value){
  const match=typeof value==='string'&&/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if(!match||match[2].length%4!==0)throw new ServiceError('PNG 또는 JPG 사진을 사용해 주세요.',400,'INVALID_IMAGE');
  const binary=atob(match[2]);if(binary.length>MAX_IMAGE)throw new ServiceError('사진 용량을 10MB 이하로 줄여 주세요.',413,'IMAGE_TOO_LARGE');
  const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  if(!mimeOf(bytes))throw new ServiceError('사진을 읽지 못했어요.',400,'INVALID_IMAGE');return bytes;
}
function encodeBase64(bytes){let binary='';const size=32768;for(let i=0;i<bytes.length;i+=size)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(bytes.length,i+size)));return btoa(binary)}
async function limitedBytes(response,limit){
  const declared=Number(response.headers.get('content-length')||0);if(declared>limit)throw new ServiceError('CamScanner 응답 용량이 너무 큽니다.');
  if(!response.body){const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length>limit)throw new ServiceError('CamScanner 응답 용량이 너무 큽니다.');return bytes}
  const reader=response.body.getReader(),chunks=[];let total=0;
  while(true){const part=await reader.read();if(part.done)break;total+=part.value.length;if(total>limit){await reader.cancel();throw new ServiceError('CamScanner 응답 용량이 너무 큽니다.')}chunks.push(part.value)}
  const result=new Uint8Array(total);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length}return result;
}
async function requireSuccess(response){
  if(response.status>=300&&response.status<400)throw new ServiceError('CamScanner 연결 주소가 변경되어 요청을 처리하지 못했어요.',502,'UNEXPECTED_REDIRECT');
  if(response.status===401||response.status===403)throw new ServiceError('CamScanner에서 인증을 요구했습니다. 현재 공개 연동을 사용할 수 없어요.',502,'CAMSCANNER_AUTH_REQUIRED');
  if(response.status===429)throw new ServiceError('CamScanner 이용 한도 또는 요청 제한에 도달했어요. 잠시 뒤 다시 시도해 주세요.',429,'RATE_LIMITED');
  if(!response.ok)throw new ServiceError('CamScanner 서버가 요청을 처리하지 못했어요. 원본은 유지됩니다.');
}
async function fileId(response){
  await requireSuccess(response);let body;try{body=JSON.parse(new TextDecoder().decode(await limitedBytes(response,1024*1024)))}catch(error){if(error instanceof ServiceError)throw error;throw new ServiceError('CamScanner의 처리 응답을 읽지 못했어요.')}
  const id=body.tool_result?.data?.file_id;if(body.code!==200||body.tool_result?.success!==true||typeof id!=='string'||!id||id.length>2048)throw new ServiceError('CamScanner에서 사진을 처리하지 못했어요. 원본은 유지됩니다.');return id;
}
async function eraseWithCamScanner(image,signal){
  const bytes=decodeImage(image),post=(tool,options)=>fetch(CAMSCANNER_ORIGIN+'/v1/tools/'+tool,{method:'POST',...options,signal,redirect:'manual'});
  let input,output,response;
  try{
    input=await fileId(await post('upload_file/execute',{headers:{'Content-Type':'application/octet-stream'},body:bytes}));
    output=await fileId(await post('enhance_image/execute',{headers:{'Content-Type':'application/json'},body:JSON.stringify({file_id:input,enhance_mode:9,output_mode:'file_id'})}));
    response=await post('download_file/execute?response_mode=raw',{headers:{'Content-Type':'application/json'},body:JSON.stringify({file_id:output})});await requireSuccess(response);
  }catch(error){if(error instanceof ServiceError)throw error;console.error('CamScanner fetch failed',error?.name,error?.message,error?.cause?.message);if(signal.aborted)throw new ServiceError('CamScanner 처리 시간이 초과됐어요. 원본은 유지됩니다.',504,'TIMEOUT');throw new ServiceError('CamScanner에 접속하지 못했어요. 잠시 뒤 다시 시도해 주세요.',502,'CONNECTION_FAILED')}
  const result=await limitedBytes(response,20*1024*1024),mime=mimeOf(result);if(!mime)throw new ServiceError('CamScanner가 유효한 결과 사진을 반환하지 않았어요.');
  return{image:'data:'+mime+';base64,'+encodeBase64(result),provider:'CamScanner'};
}
async function handleApi(request,url){
  if(request.method==='GET'&&url.pathname==='/api/camscanner/status')return json(200,{provider:'CamScanner',requiresApiKey:false,workflow:'upload-enhance-download',mode:9});
  if(request.method==='GET'&&url.pathname==='/api/camscanner/connectivity'){
    try{const response=await fetch(CAMSCANNER_ORIGIN,{method:'HEAD'});return json(200,{reachable:true,httpStatus:response.status})}catch(error){console.error('CamScanner connectivity failed',error?.name,error?.message,error?.cause?.message);return json(502,{reachable:false,error:error?.name,message:error?.message,cause:error?.cause?.message})}
  }
  if(request.method!=='POST'||url.pathname!=='/api/camscanner/erase')return json(404,{error:'NOT_FOUND'});
  if(request.headers.get('Origin')!==url.origin)throw new ServiceError('문지 화면에서 다시 시도해 주세요.',403,'FORBIDDEN_ORIGIN');
  if(busy)throw new ServiceError('이전 사진을 처리 중이에요. 완료된 뒤 다시 시도해 주세요.',409,'BUSY');
  if(!String(request.headers.get('content-type')||'').startsWith('application/json'))throw new ServiceError('요청 형식이 올바르지 않습니다.',415,'INVALID_REQUEST');
  if(Number(request.headers.get('content-length')||0)>Math.ceil(MAX_IMAGE*4/3)+2048)throw new ServiceError('사진 용량이 너무 큽니다.',413,'IMAGE_TOO_LARGE');
  busy=true;try{const body=await request.json(),timeout=AbortSignal.timeout(120000),signal=AbortSignal.any([request.signal,timeout]);return json(200,await eraseWithCamScanner(body.image,signal))}finally{busy=false}
}
export default{
  async fetch(request){
    const url=new URL(request.url);
    try{
      if(url.pathname.startsWith('/api/camscanner/'))return await handleApi(request,url);
      if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
      const key=url.pathname==='/'?'/index.html':url.pathname,body=ASSETS[key];if(body===undefined)return new Response('Not found',{status:404});
      const extension=key.slice(key.lastIndexOf('.')),headers={'Content-Type':TYPES[extension]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
      return new Response(request.method==='HEAD'?null:body,{status:200,headers});
    }catch(error){return json(error instanceof ServiceError?error.status:500,{error:error instanceof ServiceError?error.code:'INTERNAL_ERROR',message:error instanceof ServiceError?error.message:'필기 제거에 실패했어요. 원본은 유지됩니다.'})}
  }
};
`;

const output='const ASSETS='+JSON.stringify(assets)+';\n'+runtime;
const target=path.join(project,'dist','server','index.js');
await mkdir(path.dirname(target),{recursive:true});
await writeFile(target,output,'utf8');
console.log(target);
