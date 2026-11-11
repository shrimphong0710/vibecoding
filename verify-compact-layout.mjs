import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {editorHarness} from './qa-editor-harness.mjs';

const {ctx,element,run,M}=await editorHarness();
vm.runInContext(await fs.readFile('dist/export.js','utf8'),ctx);
const copy=value=>JSON.parse(JSON.stringify(value)),settings=copy(M.state.settings),samples=copy(M.state.questions);
assert.equal(settings.margin,10);assert.equal(settings.gap,6);assert.equal(settings.solutionSpace,18);assert.equal(settings.layoutVersion,2);
const questions=Array.from({length:12},(_,i)=>({...copy(samples[i%4]),id:'compact-'+i}));M.state.questions.splice(0,M.state.questions.length,...questions);run('render()');
const pages=M.getLayout(),metrics=M.getSheetMetrics();assert.equal(pages.length,2);assert.deepEqual(Array.from(pages,page=>page.items.length),[6,6],'the representative 12-question set fits on two sheets instead of the former three');
assert.ok(metrics.titleSize>=22&&metrics.titleSize<25);assert.ok(metrics.titleTop+metrics.titleHeight<metrics.infoTop);assert.ok(metrics.top>=metrics.m+metrics.headerHeight+12);assert.ok(metrics.limit<=metrics.footerTop-8);assert.ok(metrics.footerTop+metrics.footerHeight<=1123-metrics.m);
for(const page of pages)for(const item of page.items){assert.ok(item.iw>321.38,'the default question image is wider than the previous 16 mm-margin layout');assert.ok(Math.abs(item.ih-item.q.height/item.q.width*item.iw)<.001,'standard question images retain their full dimensions rather than shrinking to force a fit');assert.equal(item.q.scale,100);assert.ok(Math.abs(item.space-18*794/210)<.001)}
assert.ok(element('paper-stack').innerHTML.includes('font-size:22px'));assert.ok(element('paper-stack').innerHTML.includes('top:'+metrics.footerTop+'px'));assert.ok(element('paper-stack').innerHTML.includes('height:'+metrics.questionHead+'px'));

// Record actual canvas drawing positions, rather than only testing the layout
// data, to catch a stale image/header/footer offset in exported files.
const create=ctx.document.createElement,drawn=[],text=[],lines=[];
ctx.document.createElement=tag=>{const canvas=create(tag);if(tag==='canvas'){const c=canvas.getContext('2d'),draw=c.drawImage.bind(c),fill=c.fillText.bind(c),line=c.lineTo.bind(c);c.drawImage=(image,...args)=>{drawn.push(args);return draw(image,...args)};c.fillText=(value,x,y,...args)=>{text.push({value,x,y,font:c.font});return fill(value,x,y,...args)};c.lineTo=(x,y)=>{lines.push([x,y]);return line(x,y)}}return canvas};
const output=await ctx.window.MunjiExport.renderPage(pages[0],0,pages.length,1.3);ctx.document.createElement=create;
assert.equal(drawn.length,6);for(let i=0;i<drawn.length;i++){const item=pages[0].items[i];assert.equal(drawn[i][0],item.x);assert.equal(drawn[i][1],item.y+metrics.questionHead);assert.ok(drawn[i][1]+drawn[i][3]<metrics.footerTop)}
assert.ok(text.some(item=>item.value===settings.title&&item.font.includes('22px')&&item.y===metrics.m+metrics.titleTop+2));assert.ok(lines.some(([x,y])=>x===794-metrics.m&&y===metrics.footerTop));assert.ok(text.some(item=>item.value==='01 / 02'&&item.y===metrics.footerTop+8));
await fs.mkdir('qa',{recursive:true});await fs.writeFile('qa/compact-layout-after.png',output.toBuffer('image/png'));

const validate=s=>run('validateProject('+JSON.stringify({app:'munji-studio',settings:s,questions:samples})+').settings');
const legacy={...settings,margin:16,gap:8,solutionSpace:36};delete legacy.layoutVersion;const migrated=validate(legacy);assert.deepEqual([migrated.margin,migrated.gap,migrated.solutionSpace,migrated.layoutVersion],[10,6,18,2]);
const custom=validate({...legacy,margin:12,gap:10,solutionSpace:30});assert.deepEqual([custom.margin,custom.gap,custom.solutionSpace],[12,10,30],'explicit custom spacing survives loading');
const manual=validate({...settings,margin:16,gap:8,solutionSpace:36});assert.deepEqual([manual.margin,manual.gap,manual.solutionSpace],[16,8,36],'a later manual choice of the old values is preserved');
const roundtrip=validate(settings);assert.deepEqual(copy(roundtrip),settings);

const variations=[{columns:1,margin:8,gap:4,solutionSpace:18},{columns:2,margin:30,gap:20,solutionSpace:75},{columns:2,solution:false,answerLine:false},{columns:2,solutionSpace:0,answerLine:true},{columns:2,lineStyle:'ruled'},{columns:1,lineStyle:'grid',answerLine:false}];
for(const variation of variations){Object.assign(M.state.settings,settings,variation);M.state.questions.splice(0,M.state.questions.length,...questions.map((q,i)=>({...q,height:i%5===0?3400:q.height,solution:i===2?24:null,breakBefore:i===7})));const layout=M.getLayout(),bounds=M.getSheetMetrics(),items=Array.from(layout).flatMap(page=>Array.from(page.items));assert.equal(items.length,12);for(const page of layout)for(const item of page.items){assert.ok(item.x>=bounds.m-.001);assert.ok(item.x+item.w<=794-bounds.m+.001);assert.ok(item.y>=bounds.top-.001);assert.ok(item.y+item.h<=bounds.limit+.001);assert.ok(item.ih>0);for(const other of page.items)if(other!==item)assert.ok(item.x+item.w<=other.x+.001||other.x+other.w<=item.x+.001||item.y+item.h<=other.y+.001||other.y+other.h<=item.y+.001,'question boxes cannot overlap')}assert.ok(items.find(item=>item.index===7).y===bounds.top,'manual page breaks remain effective')}
const html=await fs.readFile('dist/index.html','utf8');for(const[id,value]of [['margin',10],['column-gap',6],['solution-space',18]])assert.match(html,new RegExp('<input id="'+id+'"[^>]*value="'+value+'"'));
clearTimeout(run('saveTimer'));clearTimeout(run('toastTimer'));
console.log(JSON.stringify({result:'passed',defaultMarginsMm:10,defaultColumnGapMm:6,defaultSolutionSpaceMm:18,representativeQuestions:12,pagesBefore:3,pagesAfter:2,checks:['compact readable header and footer','more questions without shrinking the default photo scale','canvas export and A4 preview share geometry','no overlaps or footer clipping across layout variations','custom spacing and manual page breaks retained','legacy defaults migrate once and new choices persist']},null,2));
