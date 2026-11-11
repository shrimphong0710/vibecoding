// Public HTTP workflow published by CS-CamScanner/CamScanner-skills:
// upload_file -> enhance_image (mode 9) -> download_file (raw).
export const CAMSCANNER_ORIGIN='https://ai-tools.camscanner.com';
const MAX_IMAGE=10*1024*1024,MAX_BODY=Math.ceil(MAX_IMAGE*4/3)+2048;
class ServiceError extends Error{constructor(message,status=502,code='CAMSCANNER_ERROR'){super(message);this.status=status;this.code=code}}
function networkFailure(error){
  const causes=[error,error?.cause,...(error?.cause?.errors||[])],codes=causes.map(e=>e?.code);
  if(codes.some(code=>['EACCES','EPERM'].includes(code)))return new ServiceError('문지 서버의 외부 접속이 차단되어 있어요. 폴더의 Start-Munji.cmd를 직접 실행해 서버를 다시 시작해 주세요.',503,'LOCAL_NETWORK_DENIED');
  if(codes.some(code=>['ENOTFOUND','EAI_AGAIN'].includes(code)))return new ServiceError('CamScanner 주소를 찾지 못했어요. 인터넷 연결과 DNS 설정을 확인해 주세요.',502,'DNS_FAILED');
  if(codes.some(code=>['CERT_HAS_EXPIRED','DEPTH_ZERO_SELF_SIGNED_CERT','UNABLE_TO_VERIFY_LEAF_SIGNATURE','SELF_SIGNED_CERT_IN_CHAIN'].includes(code)))return new ServiceError('CamScanner 보안 연결을 확인하지 못했어요. 실행 환경의 인증서 설정을 확인해 주세요.',502,'TLS_FAILED');
  return new ServiceError('CamScanner에 접속하지 못했어요. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.',502,'CONNECTION_FAILED');
}
export async function probeCamScanner({fetchImpl=globalThis.fetch,timeoutMs=6000}={}){
  try{const response=await fetchImpl(CAMSCANNER_ORIGIN,{method:'HEAD',signal:AbortSignal.timeout(timeoutMs),redirect:'error'});return{reachable:true,httpStatus:response.status,provider:'CamScanner',processingVerified:false}}
  catch(error){const failure=networkFailure(error);return{reachable:false,error:failure.code,message:failure.message,provider:'CamScanner',processingVerified:false}}
}
function imageBytes(value){
  const match=typeof value==='string'&&/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if(!match||match[2].length%4!==0)throw new ServiceError('PNG 또는 JPG 사진을 사용해 주세요.',400,'INVALID_IMAGE');
  const data=Buffer.from(match[2],'base64');if(data.length>MAX_IMAGE)throw new ServiceError('사진 용량을 10MB 이하로 줄여 주세요.',413,'IMAGE_TOO_LARGE');
  if(!imageMime(data))throw new ServiceError('사진을 읽지 못했어요.',400,'INVALID_IMAGE');return data;
}
function imageMime(data){if(data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return'image/png';if(data[0]===255&&data[1]===216&&data[2]===255)return'image/jpeg';return null}
async function limitedBytes(response,limit){
  const declared=Number(response.headers.get('content-length')||0);if(declared>limit)throw new ServiceError('CamScanner 응답 용량이 너무 큽니다.');
  const chunks=[];let total=0;for await(const chunk of response.body){total+=chunk.length;if(total>limit)throw new ServiceError('CamScanner 응답 용량이 너무 큽니다.');chunks.push(chunk)}return Buffer.concat(chunks);
}
async function requireSuccess(response){
  if(response.status===401||response.status===403)throw new ServiceError('CamScanner에서 인증을 요구했습니다. 현재 공개 연동을 사용할 수 없어요.',502,'CAMSCANNER_AUTH_REQUIRED');
  if(response.status===429)throw new ServiceError('CamScanner 이용 한도 또는 요청 제한에 도달했어요. 잠시 뒤 다시 시도해 주세요.',429,'RATE_LIMITED');
  if(!response.ok)throw new ServiceError('CamScanner 서버가 요청을 처리하지 못했어요. 원본은 유지됩니다.');
}
async function fileId(response){
  await requireSuccess(response);let body;try{body=JSON.parse((await limitedBytes(response,1024*1024)).toString('utf8'))}catch(error){if(error instanceof ServiceError)throw error;throw new ServiceError('CamScanner의 처리 응답을 읽지 못했어요.')}
  const id=body.tool_result?.data?.file_id;
  if(body.code!==200||body.tool_result?.success!==true||typeof id!=='string'||!id||id.length>2048)throw new ServiceError('CamScanner에서 사진을 처리하지 못했어요. 원본은 유지됩니다.');
  return id;
}
async function processWithCamScanner(image,{fetchImpl=globalThis.fetch,signal=new AbortController().signal,timeoutMs=120000,straighten=false}={}){
  const bytes=imageBytes(image),requestSignal=AbortSignal.any([signal,AbortSignal.timeout(timeoutMs)]);
  const post=(tool,options)=>fetchImpl(CAMSCANNER_ORIGIN+'/v1/tools/'+tool,{method:'POST',...options,signal:requestSignal,redirect:'error'});
  try{
    const input=await fileId(await post('upload_file/execute',{headers:{'Content-Type':'application/octet-stream'},body:bytes}));
    const tool=straighten?'image_hd/execute':'enhance_image/execute';
    const parameters=straighten?{file_id:input}:{file_id:input,enhance_mode:9,output_mode:'file_id'};
    const output=await fileId(await post(tool,{headers:{'Content-Type':'application/json'},body:JSON.stringify(parameters)}));
    const response=await post('download_file/execute?response_mode=raw',{headers:{'Content-Type':'application/json'},body:JSON.stringify({file_id:output})});await requireSuccess(response);
    const result=await limitedBytes(response,30*1024*1024),mime=imageMime(result);if(!mime)throw new ServiceError('CamScanner가 유효한 결과 사진을 반환하지 않았어요.');
    return{image:'data:'+mime+';base64,'+result.toString('base64'),provider:'CamScanner'};
  }catch(error){
    if(signal.aborted)throw new ServiceError(straighten?'비율 자동 조정을 취소했어요.':'필기 제거를 취소했어요.',499,'CANCELLED');
    if(requestSignal.aborted)throw new ServiceError('CamScanner 처리 시간이 초과됐어요. 원본은 유지됩니다.',504,'TIMEOUT');
    if(error instanceof ServiceError)throw error;
    throw networkFailure(error);
  }
}
export function eraseWithCamScanner(image,options={}){return processWithCamScanner(image,{...options,straighten:false})}
export function straightenWithCamScanner(image,options={}){return processWithCamScanner(image,{...options,straighten:true})}
async function readJson(req){
  if(!String(req.headers['content-type']||'').startsWith('application/json'))throw new ServiceError('요청 형식이 올바르지 않습니다.',415,'INVALID_REQUEST');
  if(Number(req.headers['content-length']||0)>MAX_BODY)throw new ServiceError('사진 용량이 너무 큽니다.',413,'IMAGE_TOO_LARGE');
  let size=0;const parts=[];for await(const part of req){size+=part.length;if(size>MAX_BODY)throw new ServiceError('사진 용량이 너무 큽니다.',413,'IMAGE_TOO_LARGE');parts.push(part)}
  try{return JSON.parse(Buffer.concat(parts).toString('utf8'))}catch{throw new ServiceError('요청 내용을 읽지 못했어요.',400,'INVALID_REQUEST')}
}
function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))}
export function createCamScannerHandler(options={}){
  const allowedOrigin=options.allowedOrigin?new URL(options.allowedOrigin).origin:null;
  let busy=false;
  return async(req,res)=>{
    const requestedPath=new URL(req.url,'http://localhost').pathname;
    const straighten=requestedPath==='/api/photo-correction/straighten';
    const pathname=requestedPath.replace(/^\/api\/handwriting-removal\//,'/api/camscanner/');
    if(!straighten&&!pathname.startsWith('/api/camscanner/'))return false;
    try{
      const expected=allowedOrigin||'http://'+req.headers.host;
      if((!allowedOrigin&&!['127.0.0.1','localhost','[::1]'].includes(new URL(expected).hostname))||(req.headers.origin&&req.headers.origin!==expected))throw new ServiceError('문지 화면에서 다시 시도해 주세요.',403,'FORBIDDEN_ORIGIN');
      if(req.method==='GET'&&pathname==='/api/camscanner/status'){send(res,200,{provider:'CamScanner',requiresApiKey:false,workflow:'upload-enhance-download',mode:9});return true}
      if(req.method==='GET'&&pathname==='/api/camscanner/connectivity'){send(res,200,await probeCamScanner(options));return true}
      if(req.method!=='POST'||(!straighten&&pathname!=='/api/camscanner/erase')){send(res,404,{error:'NOT_FOUND'});return true}
      if(req.headers.origin!==expected)throw new ServiceError('문지 화면에서 다시 시도해 주세요.',403,'FORBIDDEN_ORIGIN');
      if(busy)throw new ServiceError('이전 사진을 처리 중이에요. 완료된 뒤 다시 시도해 주세요.',409,'BUSY');
      busy=true;const controller=new AbortController(),cancel=()=>{if(!res.writableEnded)controller.abort()};res.on('close',cancel);
      try{const body=await readJson(req),processImage=straighten?straightenWithCamScanner:eraseWithCamScanner,result=await processImage(body.image,{...options,signal:controller.signal});if(!res.destroyed)send(res,200,result)}finally{busy=false;res.off('close',cancel)}
    }catch(error){const message=error instanceof ServiceError?error.message:'사진 보정에 실패했어요. 원본은 유지됩니다.';if(!res.destroyed&&!res.headersSent)send(res,error instanceof ServiceError?error.status:500,{error:error instanceof ServiceError?error.code:'INTERNAL_ERROR',message:straighten?message.replace(/필기 제거/g,'비율 자동 조정'):message})}
    return true;
  };
}
