import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {editorHarness,createCanvas} from './qa-editor-harness.mjs';

const {ctx,element,run,M,canvas}=await editorHarness();
const photo=createCanvas(600,240),context=photo.getContext('2d'),source=context.createImageData(600,240);
for(let y=0;y<240;y++)for(let x=0;x<600;x++){const i=(y*600+x)*4;source.data[i]=x%256;source.data[i+1]=(x*3+y)%256;source.data[i+2]=(x+y*5)%256;source.data[i+3]=255}context.putImageData(source,0,0);
const original=photo.toDataURL();M.state.questions.splice(0,M.state.questions.length,{...M.state.questions[0],id:'live-adjust',src:original,original,width:600,height:240});
const pixels=()=>canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
const copy=value=>JSON.parse(JSON.stringify(value));
function adjusted(base,brightness,contrast){const result=new Uint8ClampedArray(base),c=contrast*2,f=259*(c+255)/(255*(259-c));for(let i=0;i<result.length;i+=4)for(let k=0;k<3;k++)result[i+k]=f*(base[i+k]-128)+128+brightness*1.6;return result}
function input(key,value){element(key).value=String(value);element(key).oninput({target:element(key)})}
async function open(){await run('openEditor("live-adjust")')}
await open();const controls=element('photo-adjust-options');assert.equal(controls.hidden,true);assert.equal(element('editor-undo').disabled,true);
element('apply-adjust').onclick();assert.equal(controls.hidden,false);assert.deepEqual(pixels(),source.data);assert.equal(run('ed.history.length'),0,'opening the sliders must not edit the photo');
input('brightness',50);assert.deepEqual(pixels(),adjusted(source.data,50,0),'the input event immediately changes photo pixels');assert.equal(element('brightness-value').textContent,'50');assert.equal(element('editor-undo').disabled,false);assert.equal(M.state.questions[0].src,original);
run('ed.cleanup.scope="area";ed.cleanup.rect={x:20,y:20,w:120,h:80};showCleanupGuide()');assert.ok(run('ed.guide'));
input('brightness',20);assert.deepEqual(pixels(),adjusted(source.data,20,0),'slider positions use the original pixels, not the previous preview');
assert.equal(run('ed.guide'),null,'selection guides must not restore an older preview later');
input('brightness',70);input('brightness',0);assert.deepEqual(pixels(),source.data,'returning to zero restores details even after clipping');assert.equal(element('editor-undo').disabled,true);
input('contrast',70);input('contrast',-40);assert.deepEqual(pixels(),adjusted(source.data,0,-40));input('contrast',0);assert.deepEqual(pixels(),source.data);
input('brightness',25);input('contrast',30);assert.deepEqual(pixels(),adjusted(source.data,25,30),'both sliders combine against one base image');
element('apply-adjust').onclick();assert.equal(controls.hidden,true);element('apply-adjust').onclick();assert.equal(controls.hidden,false);assert.equal(element('brightness').value,'25');assert.equal(element('contrast').value,'30');assert.deepEqual(pixels(),adjusted(source.data,25,30),'toggling the controls never applies the adjustment twice');
run('showCleanupGuide()');await element('editor-undo').onclick();assert.deepEqual(pixels(),source.data);assert.equal(run('ed.guide'),null);assert.equal(+element('brightness').value,0);assert.equal(+element('contrast').value,0);assert.equal(run('ed.history.length'),0,'one undo cancels the whole live adjustment');

element('text-edit-tool').onclick();input('photo-text','편집 가능한 텍스트');input('photo-text-size',22);input('photo-text-color','#b02030');element('text-commit').onclick();const boxes=copy(run('ed.textLayers'));
input('brightness',18);assert.deepEqual(pixels(),adjusted(source.data,18,0));assert.deepEqual(copy(run('ed.textLayers')),boxes,'live adjustments preserve separate text and its styling');
await element('filter-bw').onclick();assert.equal(run('ed.adjustment'),null);assert.equal(+element('brightness').value,0);await element('editor-undo').onclick();assert.deepEqual(pixels(),adjusted(source.data,18,0),'undoing a later filter returns to the live-adjusted photo');assert.deepEqual(copy(run('ed.textLayers')),boxes);
await element('editor-undo').onclick();assert.deepEqual(pixels(),source.data,'a second undo reverts just the brightness change');assert.deepEqual(copy(run('ed.textLayers')),boxes);

input('brightness',32);input('contrast',-15);const savedPixels=new Uint8ClampedArray(pixels());element('editor-apply').onclick();assert.equal(element('editor-dialog').open,false);assert.notEqual(M.state.questions[0].src,original);assert.equal(M.state.questions[0].original,original);assert.equal(M.state.questions[0].textBoxes[0].text,boxes[0].text);
await open();assert.deepEqual(pixels(),savedPixels,'save and reopen include the live preview without a separate apply click');assert.equal(controls.hidden,true);assert.equal(+element('brightness').value,0);assert.equal(+element('contrast').value,0);
input('brightness',10);assert.deepEqual(pixels(),adjusted(savedPixels,10,0),'reopening starts from the saved photo');await element('reset-photo').onclick();assert.deepEqual(pixels(),source.data);await element('editor-undo').onclick();assert.deepEqual(pixels(),adjusted(savedPixels,10,0));await element('editor-undo').onclick();assert.deepEqual(pixels(),savedPixels);

// Starting an adjustment from an AI before/after comparison must use the result,
// and later save/tool transitions must not replace it with the stale result.
const result=context.createImageData(600,240);result.data.set(adjusted(savedPixels,8,0));ctx.comparisonResult=result;ctx.comparisonBefore=canvas.getContext('2d').getImageData(0,0,600,240);
run('ed.cleanupComparison={before:comparisonBefore,after:comparisonResult,view:"before"}');input('brightness',12);assert.deepEqual(pixels(),adjusted(result.data,12,0));element('editor-apply').onclick();await open();assert.deepEqual(pixels(),adjusted(result.data,12,0));
const persisted=new Uint8ClampedArray(pixels());input('contrast',25);element('editor-dialog').close();await open();assert.deepEqual(pixels(),persisted,'closing without saving discards the new preview');
run('ed.remoteJob={kind:"straighten"};syncEditorTools()');assert.equal(element('brightness').disabled,true);assert.equal(element('contrast').disabled,true);assert.equal(element('apply-adjust').disabled,true);input('brightness',50);assert.deepEqual(pixels(),persisted,'busy remote jobs cannot be changed by a slider event');run('ed.remoteJob=null;syncEditorTools()');

const html=await fs.readFile('dist/index.html','utf8');assert.ok(!html.includes('data-filter="denoise"'));assert.equal((html.match(/id="apply-adjust"/g)||[]).length,1);assert.match(html,/<div id="photo-adjust-options"[^>]* hidden>/);
for(const id of ['brightness','contrast'])assert.match(html,new RegExp('<input type="range" id="'+id+'" min="-70" max="70" value="0">'),'the existing round-thumb range control and bounds are retained');
element('editor-dialog').close();clearTimeout(run('saveTimer'));clearTimeout(run('toastTimer'));
console.log(JSON.stringify({result:'passed',checks:['quick button replaces noise reduction and toggles hidden sliders','brightness and contrast update pixels immediately','non-accumulating previews, clipped detail recovery and exact zero reset','combined sliders and repeated show/hide','single-step undo and later filter undo order','editable text remains separate','save, reopen and original restoration','AI comparison transitions retain adjustments','cancelled edits and busy-job guards','existing range controls retained']},null,2));
