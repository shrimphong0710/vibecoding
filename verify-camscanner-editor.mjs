import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';

export async function verifyCamScannerEditor({ctx,element,M,createCanvas}){
  const original=[...M.state.questions],W=600,H=300;
  const clean=createCanvas(W,H),cx=clean.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,W,H);cx.fillStyle='#111';cx.font='24px Arial';cx.fillText('x + 2 = 5',30,55);
  const marked=createCanvas(W,H),mx=marked.getContext('2d');mx.drawImage(clean,0,0);mx.fillStyle='#888';mx.fillRect(50,210,120,3);
  const question={...original[0],src:marked.toDataURL(),original:marked.toDataURL(),width:W,height:H};
  const editor=element('editor-canvas'),pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data,run=s=>vm.runInContext(s,ctx);
  let mode='success',calls=0,release,lastUpload;
  ctx.location={protocol:'http:'};ctx.AbortController=AbortController;
  const localAnalyze=ctx.window.MunjiPhoto.analyzeHandwriting;
  ctx.window.MunjiPhoto.analyzeHandwriting=()=>{throw Error('Automatic removal must use the external provider')};
  ctx.fetch=async(route,options)=>{
    assert.equal(route,'/api/camscanner/erase');calls++;
    assert.equal(options.method,'POST');lastUpload=await M.loadImage(JSON.parse(options.body).image);
    if(mode==='slow'||mode==='stale')await new Promise((resolve,reject)=>{release=resolve;if(mode==='slow')options.signal.addEventListener('abort',()=>reject(new DOMException('Abort','AbortError')),{once:true})});
    const output=createCanvas(lastUpload.width,lastUpload.height),ox=output.getContext('2d');
    ox.drawImage(clean,lastUpload.width===W?0:-40,lastUpload.height===H?0:-190);
    if(mode==='invalid'){output.width=40;output.height=200}
    return{ok:mode!=='error',json:async()=>mode==='error'?{message:'CamScanner test unavailable'}:{image:output.toDataURL(),provider:'CamScanner'}};
  };
  async function reopen(){question.src=question.original;M.state.questions.splice(0,M.state.questions.length,question);await run('openEditor(state.questions[0].id)')}
  async function undo(){await element('editor-undo').onclick()}
  try{
    const html=await fs.readFile('dist/index.html','utf8');
    assert.ok(!/cleanup-preview|cleanup-commit|cleanup-candidates|cleanup-cancel|data-clean-view="detect"|필기 제거 미리보기|확인한 필기만/.test(html),'remove preview and candidate confirmation elements entirely');
    assert.equal((html.match(/data-clean-view=/g)||[]).length,2,'comparison has only before and after');
    await reopen();assert.equal(run('ed.cleanup.scope'),'all');assert.equal(element('cleanup-run').disabled,false,'no mandatory range or checkbox');
    await element('cleanup-run').onclick();assert.equal(calls,1);assert.equal(run('ed.history.length'),1);assert.deepEqual(pixels(editor),pixels(clean),'one click immediately applies the actual returned image');assert.equal(element('cleanup-comparison').hidden,false);
    const comparisonCalls=calls;
    for(let i=0;i<3;i++){element('clean-view-before').onclick();assert.deepEqual(pixels(editor),pixels(marked));element('clean-view-result').onclick();assert.deepEqual(pixels(editor),pixels(clean))}
    assert.equal(calls,comparisonCalls,'comparison never calls the service');
    element('clean-view-before').onclick();element('editor-apply').onclick();
    const saved=await M.loadImage(question.src),savedCanvas=createCanvas(W,H);savedCanvas.getContext('2d').drawImage(saved,0,0);assert.deepEqual(pixels(savedCanvas),pixels(clean),'save result even while before image is displayed');assert.equal(question.original,marked.toDataURL());
    await reopen();await element('filter-ink').onclick();assert.deepEqual(pixels(editor),pixels(clean),'color handwriting shortcut uses the same direct apply flow');
    await undo();assert.deepEqual(pixels(editor),pixels(marked));assert.equal(element('cleanup-comparison').hidden,true,'normal undo restores the source and clears comparison');
    await element('cleanup-run').onclick();element('clean-view-before').onclick();await element('cleanup-run').onclick();
    const upload=createCanvas(W,H);upload.getContext('2d').drawImage(lastUpload,0,0);assert.deepEqual(pixels(upload),pixels(clean),'repeated removal starts from the applied result when before is displayed');await undo();await undo();
    mode='error';await element('cleanup-run').onclick();assert.deepEqual(pixels(editor),pixels(marked));assert.equal(run('ed.cleanupComparison'),null);assert.equal(run('ed.history.length'),0,'failed removal creates no history entry');assert.match(element('cleanup-status').textContent,/unavailable/);
    mode='invalid';await element('cleanup-run').onclick();assert.deepEqual(pixels(editor),pixels(marked),'invalid output preserves the source');
    mode='success';run("ed.cleanup.scope='area';ed.cleanup.rect={x:40,y:190,w:160,h:60}");await element('cleanup-run').onclick();assert.equal(lastUpload.width,160);assert.equal(lastUpload.height,60);assert.deepEqual(pixels(editor),pixels(clean),'compose selected region into the unchanged original');await undo();
    run("ed.cleanup.scope='all';ed.cleanup.protectionRects=[{x:50,y:210,w:40,h:3}]");await element('cleanup-run').onclick();
    const expected=createCanvas(W,H),xp=expected.getContext('2d');xp.drawImage(clean,0,0);xp.fillStyle='#888';xp.fillRect(50,210,40,3);assert.deepEqual(pixels(editor),pixels(expected),'preserve explicitly protected pixels');await undo();
    mode='slow';release=null;const pending=element('cleanup-run').onclick();while(!release)await new Promise(r=>setTimeout(r,5));
    assert.equal(element('cleanup-run').disabled,true);assert.equal(element('editor-apply').disabled,true);assert.equal(element('editor-undo').disabled,true);
    const before=calls;await element('cleanup-run').onclick();element('editor-apply').onclick();assert.equal(calls,before,'duplicate click cannot upload twice');assert.equal(element('editor-dialog').open,true,'do not save an in-flight job');
    element('cleanup-stop').onclick();await pending;assert.equal(run('ed.remoteJob'),null);assert.deepEqual(pixels(editor),pixels(marked));assert.equal(element('cleanup-run').disabled,false);
    mode='success';await element('cleanup-run').onclick();element('clean-view-before').onclick();element('crop-tool').onclick();assert.deepEqual(pixels(editor),pixels(clean),'switching tools uses the applied result');assert.equal(run('ed.cleanupComparison'),null);await undo();assert.deepEqual(pixels(editor),pixels(marked));
    mode='stale';release=null;const stale=element('cleanup-run').onclick();while(!release)await new Promise(r=>setTimeout(r,5));
    await run('openEditor(state.questions[0].id)');release();await stale;assert.deepEqual(pixels(editor),pixels(marked),'late responses cannot replace a newly opened editor image');
    mode='success';element('eraser-tool').onclick();
    editor.onpointerdown({clientX:45,clientY:370,pointerId:1,preventDefault(){}});editor.onpointermove({clientX:90,clientY:405,pointerId:1});
    const prior=calls;await editor.onpointerup({clientX:90,clientY:405,pointerId:1});assert.equal(calls,prior+1,'pencil brush calls the same automatic provider without component review');assert.ok(run('!!ed.cleanupComparison'));
    console.log('CamScanner editor: one-click apply, only before/after comparison, save and edit from before view, repeated removal, undo, selection/protection, brush, failure, cancellation, duplicate and stale response guards passed (stub provider).');
  }finally{
    ctx.window.MunjiPhoto.analyzeHandwriting=localAnalyze;M.state.questions.splice(0,M.state.questions.length,...original);delete ctx.fetch;delete ctx.location;
  }
}
