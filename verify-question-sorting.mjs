import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {editorHarness} from './qa-editor-harness.mjs';

const {ctx,element,run,M}=await editorHarness();
const copy=value=>JSON.parse(JSON.stringify(value)),sample=copy(M.state.questions[0]);
const titles=['문제 10','문제 2','문제 1','가형 2','가형 10','나형 1'],levels=[4,2,2,1,5,3];
const fixtures=titles.map((title,index)=>({...copy(sample),id:'sort-'+index,title,difficulty:levels[index],answer:'answer-'+index,breakBefore:index===2,solution:index+2}));
ctx.sortFixtures=fixtures;
function reset(count=6){run('state.questions=sortFixtures.slice(0,'+count+').map(q=>({...q}));undoStack=[];redoStack=[];selected=state.questions[0]?.id||null;selectedIds=new Set();render()')}
function choose(mode){const control=element('sort-button');control.value=mode;control.onchange({target:control});assert.equal(control.value,'','the control returns to the sort-method label, allowing repeat actions')}
function ids(){return Array.from(M.state.questions,q=>q.id)}
function order(indexes){return indexes.map(index=>'sort-'+index)}
function verifyState(expected){assert.deepEqual(ids(),order(expected));assert.deepEqual(Array.from(M.pages).filter(page=>!page.answerKey).flatMap(page=>Array.from(page.items,item=>item.q.id)),ids(),'A4 pages use the sorted order');assert.deepEqual([...element('question-list').innerHTML.matchAll(/data-id="([^"]+)"/g)].map(match=>match[1]),ids(),'the question list uses the sorted order');for(const q of M.state.questions)assert.deepEqual(copy(q),fixtures.find(original=>original.id===q.id),'sorting preserves photo, answer, difficulty and layout data')}

const cases=[['difficulty-asc',[3,1,2,5,0,4]],['difficulty-desc',[4,0,5,1,2,3]],['name-asc',[3,4,5,2,1,0]],['name-desc',[0,1,2,5,4,3]],['reverse',[5,4,3,2,1,0]]];
for(const[mode,expected]of cases){reset();run('selectedIds=new Set(["sort-1","sort-4"]);selected="sort-4"');choose(mode);verifyState(expected);assert.deepEqual(copy(run('[...selectedIds].sort()')),['sort-1','sort-4'],'multi-selection remains attached to the same questions');assert.equal(run('selected'),'sort-4');assert.equal(run('undoStack.length'),1);element('undo-button').onclick();verifyState([0,1,2,3,4,5]);element('redo-button').onclick();verifyState(expected);const saved=run('validateProject('+JSON.stringify({app:'munji-studio',...M.state})+')');assert.deepEqual(Array.from(saved.questions,q=>q.answer),Array.from(M.state.questions,q=>q.answer),'project round trip preserves the sorted order');}

reset();ctx.Math=Object.create(Math);ctx.Math.random=()=>0;choose('shuffle');verifyState([1,2,3,4,5,0]);const firstShuffle=ids();choose('shuffle');verifyState([2,3,4,5,0,1]);assert.equal(run('undoStack.length'),2);element('undo-button').onclick();assert.deepEqual(ids(),firstShuffle);element('redo-button').onclick();verifyState([2,3,4,5,0,1]);
reset();ctx.Math.random=()=>0.999999;choose('shuffle');verifyState([0,1,2,3,4,5]);assert.equal(run('undoStack.length'),0,'a random identity permutation does not add an empty undo step');
reset();choose('difficulty-asc');const history=run('undoStack.length');choose('difficulty-asc');assert.equal(run('undoStack.length'),history,'an already sorted list does not add empty history');choose('unrecognized');assert.equal(run('undoStack.length'),history);

reset();run('bulkCorrectionJob={mode:"straighten"};syncBulkCorrectionUI()');assert.equal(element('sort-button').disabled,true);choose('reverse');verifyState([0,1,2,3,4,5]);run('bulkCorrectionJob=null;syncBulkCorrectionUI()');assert.equal(element('sort-button').disabled,false);
for(const count of [0,1]){reset(count);assert.equal(element('sort-button').disabled,true);choose('shuffle');assert.equal(M.state.questions.length,count);assert.equal(run('undoStack.length'),0)}

const html=await fs.readFile('dist/index.html','utf8');const control=html.match(/<select id="sort-button"[\s\S]*?<\/select>/)?.[0];assert.ok(control);assert.match(control,/aria-label="정렬 방식"/);assert.match(control,/<option value="" disabled selected hidden>정렬 방식<\/option>/);assert.equal((control.match(/<option /g)||[]).length,7);for(const mode of ['shuffle',...cases.map(([mode])=>mode)])assert.ok(control.includes('value="'+mode+'"'));assert.ok(!html.includes('>난이도순<'));
clearTimeout(run('saveTimer'));clearTimeout(run('toastTimer'));
console.log(JSON.stringify({result:'passed',checks:['six native sort choices beside select-all','stable difficulty ascending and descending','Korean name order with natural numeric sorting','reverse and repeatable Fisher-Yates shuffle','question list and A4 preview order agree','selection, images, answers and layout metadata preserved','undo, redo and project round trip','no-op, empty, single-question and busy-batch guards']},null,2));
