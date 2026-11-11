import assert from 'node:assert/strict';
import {editorHarness,createCanvas} from './qa-editor-harness.mjs';

const {ctx,element,run,fire,M,canvas}=await editorHarness();
const photo=createCanvas(600,400),p=photo.getContext('2d');p.fillStyle='#fff';p.fillRect(0,0,600,400);
const original=photo.toDataURL();M.state.questions.splice(0,M.state.questions.length,{...M.state.questions[0],id:'input-test',src:original,original,width:600,height:400});
await run('openEditor("input-test")');element('text-tool').onclick();
const textarea=element('photo-text');assert.equal(textarea.disabled,false,'new text must be immediately editable');assert.equal(textarea.value,'');

// Model the distinction between native typing and JavaScript value assignment.
// Browser IMEs own the live value/selection until compositionend; neither should
// be rewritten by a preview render, including after ordinary input or paste.
let value=textarea.value,writes=0;
Object.defineProperty(textarea,'value',{configurable:true,get:()=>value,set(next){writes++;value=String(next);textarea.selectionStart=textarea.selectionEnd=value.length}});
function nativeInput(next,position=next.length,isComposing=false){assert.equal(textarea.disabled,false);value=next;textarea.selectionStart=textarea.selectionEnd=position;textarea.oninput({target:textarea,isComposing});assert.equal(value,next);assert.equal(textarea.selectionStart,position);assert.equal(textarea.selectionEnd,position);assert.equal(writes,0,'input handlers must leave the live textarea value untouched')}

await fire('photo-text','compositionstart',{});
for(const syllable of ['ㅎ','하','한','한ㄱ','한그','한글'])nativeInput(syllable,syllable.length,true);
assert.equal(run('ed.textDraft.text'),'한글');
element('editor-apply').onclick();assert.equal(element('editor-dialog').open,true,'a pending composition must not be discarded by save');assert.equal(M.state.questions[0].textBoxes,undefined);
await fire('photo-text','compositionend',{});assert.equal(run('ed.textDraft.text'),'한글');assert.equal(writes,0);assert.equal(element('text-commit').disabled,false);
nativeInput('한글\nHello 123');nativeInput('한글\nHello X123',10);nativeInput('붙여넣기\n수학 x² + y² = 25');

// A late native value must be read before the empty-draft decision, even if its
// final input event and a save click arrive in a different order.
value='';textarea.oninput({target:textarea});assert.equal(run('ed.textDraft.text'),'');value='최종 입력';
element('text-commit').onclick();assert.equal(run('ed.textLayers[0].text'),'최종 입력');assert.equal(writes,0);
element('editor-apply').onclick();assert.equal(M.state.questions[0].textBoxes[0].text,'최종 입력');

await run('openEditor("input-test")');element('text-edit-tool').onclick();const id=M.state.questions[0].textBoxes[0].id;
await fire('text-layer-overlay','pointerdown',{target:{closest:selector=>selector==='[data-text-id]'?{dataset:{textId:id}}:null},pointerId:1,clientX:100,clientY:100,preventDefault(){},stopPropagation(){}});
await fire('text-layer-overlay','pointerup',{});assert.equal(value,'최종 입력');writes=0;
nativeInput('수정 입력');await fire('photo-text','compositionstart',{});nativeInput('수정 입력ㅎ',6,true);nativeInput('수정 입력한',6,true);await fire('photo-text','compositionend',{});element('text-commit').onclick();assert.equal(run('ed.textLayers.length'),1);assert.equal(run('ed.textLayers[0].text'),'수정 입력한');
element('text-tool').onclick();assert.equal(value,'','a new box must start empty, rather than copying the previous text');assert.equal(textarea.disabled,false);writes=0;nativeInput('두 번째');

const extra=['dotum','gulim','gungsuh','gulimche','verdana','trebuchet','times','courier'];
assert.equal(ctx.window.MunjiText.fonts.length,13);
for(const font of extra){assert.ok(element('photo-text-font').innerHTML.includes('value="'+font+'"'));element('photo-text-font').value=font;element('photo-text-font').oninput();assert.equal(run('ed.textDraft.font'),font);assert.notEqual(ctx.window.MunjiText.fontFamily(font),ctx.window.MunjiText.fontFamily('sans'));assert.equal(writes,0,'font changes preserve the input selection')}
element('photo-text-font').value='gungsuh';element('photo-text-font').oninput();element('text-commit').onclick();element('editor-apply').onclick();
const saved=run('validateProject('+JSON.stringify({app:'munji-studio',...M.state})+')');assert.equal(saved.questions[0].textBoxes[1].font,'gungsuh');assert.equal(saved.questions[0].textBoxes[1].text,'두 번째');
await run('openEditor("input-test")');assert.equal(run('ed.textLayers[1].font'),'gungsuh');assert.equal(canvas.width,600);
element('editor-dialog').close();clearTimeout(run('saveTimer'));clearTimeout(run('toastTimer'));
console.log(JSON.stringify({result:'passed',checks:['editable new text field','Korean IME composition without DOM value writes','ordinary input, insertion, newlines and paste preserve selection','save waits for composition and reads the final native value','saved text can be selected and edited again','new boxes start empty','eight new font choices and project persistence']},null,2));
