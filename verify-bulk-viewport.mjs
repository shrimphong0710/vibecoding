import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {editorHarness,createCanvas} from './qa-editor-harness.mjs';

const {ctx,element,run,fire,resize,M,canvas}=await editorHarness();
const expectedErrors=[];ctx.console={...console,error:(...args)=>expectedErrors.push(args)};
function fixture(width,height,color){const c=createCanvas(width,height),x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,width,height);return c.toDataURL()}
const original=M.state.questions[0],inputs=['#dddabc','#bcddef','#efbccd'].map((color,i)=>({...original,id:'batch-'+i,src:fixture(300,500+i*100,color),original:fixture(300,500+i*100,color),width:300,height:500+i*100,title:'검증 '+i}));
const outputs=[fixture(180,240,'#fff'),fixture(240,160,'#fff'),fixture(200,250,'#fff')];
let calls=0,active=0,maxActive=0,mode='success',release;
ctx.fetch=async(route,options)=>{
  assert.equal(route,'/api/photo-correction/straighten');const index=calls++;active++;maxActive=Math.max(active,maxActive);
  try{
    if(mode==='cancel'&&index===1||mode==='stale'&&index===0)await new Promise((resolve,reject)=>{release=resolve;options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true})});
    await new Promise(resolve=>setTimeout(resolve,2));
    return{ok:mode!=='failure'||index!==1,json:async()=>mode==='failure'&&index===1?{message:'test provider unavailable'}:{image:outputs[index%3]}};
  }finally{active--}
};
async function reset(){M.state.questions.splice(0,M.state.questions.length,...inputs.map(q=>({...q})));run('clearMultiSelection();selected=null;undoStack=[];redoStack=[];bulkCorrectionMessage="";render()');calls=0;active=0;maxActive=0;mode='success';release=null}
const click=(id,filter)=>fire('selected-question-content','click',{target:{closest:selector=>selector==='[data-bulk-filter]'&&filter?{id,dataset:{bulkFilter:filter}}:selector==='button'?{id}:null}});
await reset();run('toggleAllQuestions()');assert.match(element('selected-question-content').innerHTML,/id="bulk-auto-straighten"/);
await click('bulk-auto-straighten','straighten');assert.equal(calls,3);assert.equal(maxActive,1,'external requests are sequential');
for(let i=0;i<3;i++){assert.equal(M.state.questions[i].src,outputs[i]);assert.equal(M.state.questions[i].original,inputs[i].original)}
assert.deepEqual(Array.from(M.state.questions,q=>[q.width,q.height]),[[180,240],[240,160],[200,250]]);assert.equal(run('undoStack.length'),1);assert.match(element('bulk-correction-status').textContent,/3개 사진의 비율 자동 조정/);
element('undo-button').onclick();assert.deepEqual(Array.from(M.state.questions,q=>q.src),inputs.map(q=>q.src),'one undo restores the complete batch');
await reset();run('toggleQuestionSelection(state.questions[0].id);toggleQuestionSelection(state.questions[1].id)');await click('bulk-auto-straighten','straighten');assert.equal(calls,2);assert.equal(M.state.questions[2].src,inputs[2].src,'unselected photos stay unchanged');
await reset();run('toggleAllQuestions()');mode='failure';await click('bulk-auto-straighten','straighten');assert.equal(calls,3);assert.equal(M.state.questions[1].src,inputs[1].src);assert.equal(M.state.questions[2].src,outputs[2]);assert.match(element('bulk-correction-status').textContent,/1개는 현재 사진/);
await reset();run('toggleAllQuestions()');mode='cancel';const pending=click('bulk-auto-straighten','straighten');while(!release)await new Promise(r=>setTimeout(r,2));assert.equal(element('bulk-auto-straighten').disabled,true);assert.equal(element('bulk-handwriting').disabled,true);await click('bulk-auto-straighten','straighten');assert.equal(calls,2,'duplicate batch cannot start');await click('bulk-correction-stop');await pending;assert.equal(M.state.questions[0].src,outputs[0]);assert.equal(M.state.questions[1].src,inputs[1].src);assert.equal(M.state.questions[2].src,inputs[2].src);assert.equal(element('bulk-auto-straighten').disabled,false);assert.match(element('bulk-correction-status').textContent,/1개까지.*중단/);
await reset();run('toggleAllQuestions()');mode='stale';const stale=click('bulk-auto-straighten','straighten');while(!release)await new Promise(r=>setTimeout(r,2));const replacement=fixture(300,500,'#444');M.state.questions[0].src=replacement;release();await stale;assert.equal(M.state.questions[0].src,replacement,'late batch result never overwrites a newer edit');
await reset();run('toggleAllQuestions()');ctx.location.protocol='file:';await click('bulk-auto-straighten','straighten');assert.equal(calls,0);assert.match(element('bulk-correction-status').textContent,/Start-Munji/);ctx.location.protocol='http:';

const portrait=fixture(600,1800,'#acccba');M.state.questions.splice(0,M.state.questions.length,{...inputs[0],src:portrait,original:portrait,width:600,height:1800});
const wrap=element('editor-canvas-wrap'),surface=element('editor-canvas-surface');wrap.clientWidth=600;wrap.clientHeight=400;
wrap.getBoundingClientRect=()=>({left:10,top:30,width:wrap.clientWidth,height:wrap.clientHeight});
canvas.getBoundingClientRect=()=>({left:30-wrap.scrollLeft,top:50-wrap.scrollTop,width:parseFloat(surface.style.width)||600,height:parseFloat(surface.style.height)||1800});surface.getBoundingClientRect=canvas.getBoundingClientRect;
await run('openEditor(state.questions[0].id)');await new Promise(r=>setTimeout(r,10));
assert.equal(surface.style.width,'120px');assert.equal(surface.style.height,'360px');assert.equal(element('editor-zoom-value').textContent,'20%','tall photo fits viewport on open');
const unchanged=canvas.toDataURL();element('editor-zoom-actual').onclick();assert.equal(surface.style.width,'600px');assert.equal(surface.style.height,'1800px');assert.equal(element('editor-zoom-value').textContent,'100%');
element('editor-zoom-range').oninput({target:{value:'200'}});assert.equal(surface.style.width,'1200px');assert.equal(surface.style.height,'3600px');assert.equal(element('editor-zoom-in').disabled,true);assert.ok(wrap.scrollTop>0);
wrap.scrollLeft=250;wrap.scrollTop=900;const box=canvas.getBoundingClientRect(),point=run(`editorPoint({clientX:${box.left+box.width*.25},clientY:${box.top+box.height*.5}})`);assert.equal(point.x,150);assert.equal(point.y,900,'editing coordinates remain correct after zoom and scrolling');
element('crop-tool').onclick();await new Promise(r=>setTimeout(r,10));assert.equal(element('perspective-overlay').style.width,'1200px');assert.equal(element('perspective-overlay').style.height,'3600px');element('perspective-cancel').onclick();
element('editor-zoom-fit').onclick();assert.equal(wrap.scrollTop,0);assert.equal(wrap.scrollLeft,0);assert.equal(surface.style.height,'360px');
wrap.clientWidth=400;wrap.clientHeight=250;resize();await new Promise(r=>setTimeout(r,10));assert.equal(surface.style.height,'210px','fit responds to available viewport height');
element('editor-zoom-range').oninput({target:{value:'5'}});assert.equal(element('editor-zoom-out').disabled,true);assert.equal(canvas.toDataURL(),unchanged,'view zoom does not resample or alter the stored photo');assert.equal(canvas.width,600);assert.equal(canvas.height,1800);assert.equal(run('ed.history.length'),0);
const html=await fs.readFile('dist/index.html','utf8'),css=await fs.readFile('dist/bulk-edit.css','utf8');assert.match(html,/id="editor-canvas-wrap" tabindex="0" role="region"/);assert.match(css,/#editor-canvas-wrap\{[^}]*overflow:auto/);assert.match(css,/#editor-canvas\{[^}]*max-width:none;max-height:none/);
element('editor-dialog').close();clearTimeout(run('saveTimer'));clearTimeout(run('toastTimer'));
console.log(JSON.stringify({result:'passed',liveProviderCall:false,checks:['select all and subset ratio correction','sequential requests and changed proportions','one-step batch undo','original preservation','partial provider failure','cancel preserves completed photos','duplicate batch prevention','newer edits protected','standalone guidance','portrait fit on open','5–200% viewport zoom without resampling','zoom center and scroll','editing coordinates and crop handles after zoom','fit reacts to resize','keyboard accessible scroll region']},null,2));
