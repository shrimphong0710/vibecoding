import assert from 'node:assert/strict';
import {editorHarness} from './qa-editor-harness.mjs';

const {element,run,fire,setSelector,M}=await editorHarness();
const questions=Array.from(M.state.questions).slice(0,3).map((q,index)=>({...q,id:'sheet-test-'+index,breakBefore:index>0}));
M.state.questions.splice(0,M.state.questions.length,...questions);run('clearMultiSelection();selected=null;render()');assert.equal(M.pages.length,3);
const stage=element('canvas-stage');stage.clientWidth=500;stage.clientHeight=500;
stage.getBoundingClientRect=()=>({left:10,top:20,width:500,height:500,right:510,bottom:520});
const wrappers=questions.map((_,index)=>{
  const wrapper=element('test-page-'+index),paper=element('test-paper-'+index);wrapper.querySelector=selector=>{assert.equal(selector,'.paper');return paper};
  wrapper.getBoundingClientRect=()=>{const width=parseFloat(wrapper.style.width)||794*run('zoom'),height=parseFloat(wrapper.style.height)||1123*run('zoom'),left=10+Math.max(20,(500-width)/2)-stage.scrollLeft,top=45+index*(height+23)-stage.scrollTop;return{left,top,width,height,right:left+width,bottom:top+height}};return wrapper;
});
setSelector('#paper-stack > .paper-wrapper',wrappers);
run('let sheetTestRenders=0;const sheetTestOriginalRender=render;render=function(){sheetTestRenders++;return sheetTestOriginalRender()}');
const savedState=JSON.stringify(M.state),savedLayout=JSON.stringify(M.pages),captures=[];stage.setPointerCapture=id=>captures.push(id);
function event(extra={}){return{cancelable:true,defaultPrevented:false,stopped:false,preventDefault(){this.defaultPrevented=true},stopPropagation(){},stopImmediatePropagation(){this.stopped=true},...extra}}
async function pointer(type,id,x,y,pointerType='touch'){const e=event({type,pointerId:id,pointerType,clientX:x,clientY:y});await fire('canvas-stage',type,e);return e}
async function wheel(extra={}){const e=event({ctrlKey:false,deltaMode:0,deltaX:0,deltaY:20,clientX:250,clientY:200,...extra});await fire('canvas-stage','wheel',e);return e}
function zoom(value=.6){run(`setZoom(${value})`);stage.scrollLeft=60;stage.scrollTop=(1123*value+23)+100}
function anchor(x,y){return JSON.parse(JSON.stringify(run(`sheetViewportAnchor(${x},${y})`)))}
function near(a,b){assert.ok(Math.abs(a-b)<.001,`${a} must remain near ${b}`)}
zoom();const beforeWheel=run('zoom');assert.equal((await wheel()).defaultPrevented,false);assert.equal((await wheel({deltaX:30,deltaY:0})).defaultPrevented,false);assert.equal(run('zoom'),beforeWheel,'normal mouse and trackpad scrolling stays native');
let before=anchor(240,200);assert.equal(before.index,1);assert.equal((await wheel({ctrlKey:true,deltaY:-20,clientX:240,clientY:200})).defaultPrevented,true);let after=anchor(240,200);assert.equal(after.index,before.index);near(after.x,before.x);near(after.y,before.y);
assert.ok(run('zoom')>beforeWheel);assert.equal(run('autoFit'),false);assert.equal(element('zoom-value').textContent,Math.round(run('zoom')*100)+'%');assert.match(wrappers[1].querySelector('.paper').style.transform,/scale/);

zoom(.5);before=anchor(250,220);assert.equal(before.index,1);assert.equal((await pointer('pointerdown',1,200,220)).defaultPrevented,false,'a touch starts as a possible question tap');await pointer('pointerdown',2,300,220);await pointer('pointermove',1,150,220);await pointer('pointermove',2,350,220);assert.equal(run('zoom'),1);after=anchor(250,220);assert.equal(after.index,1);near(after.x,before.x);near(after.y,before.y);
await pointer('pointermove',1,180,250);await pointer('pointermove',2,380,250);after=anchor(280,250);assert.equal(after.index,1);near(after.x,before.x);near(after.y,before.y);assert.equal(run('zoom'),1,'pinch translation pans the same page');assert.ok(captures.includes(1)&&captures.includes(2));
await pointer('pointerup',2,380,250);const oldTop=stage.scrollTop;await pointer('pointermove',1,180,210);assert.equal(stage.scrollTop,oldTop+40);await pointer('pointerup',1,180,210);assert.equal(run('sheetTouches.size'),0);
const suppressed=event();await fire('canvas-stage','click',suppressed);assert.equal(suppressed.stopped,true,'finishing a pinch never selects a question');const double=event();await fire('canvas-stage','dblclick',double);assert.equal(double.stopped,true,'finishing a gesture never opens the editor');

zoom();const panBefore={left:stage.scrollLeft,top:stage.scrollTop};await pointer('pointerdown',3,250,220);await pointer('pointermove',3,247,218);assert.equal(stage.scrollTop,panBefore.top,'small finger jitter remains a tap');await pointer('pointermove',3,220,180);assert.equal(stage.scrollLeft,panBefore.left+30);assert.equal(stage.scrollTop,panBefore.top+40);await pointer('pointercancel',3,220,180);assert.equal(run('sheetTouches.size'),0);
assert.equal(JSON.stringify(M.state),savedState);assert.equal(JSON.stringify(M.pages),savedLayout);assert.equal(run('undoStack.length'),0);assert.equal(run('sheetTestRenders'),0,'pinch only updates page scaling, without rebuilding document or question lists');

zoom(.6);await fire('canvas-stage','gesturestart',event({scale:1,clientX:240,clientY:200}));await fire('canvas-stage','gesturechange',event({scale:1.5,clientX:240,clientY:200}));assert.ok(Math.abs(run('zoom')-.9)<.001);await wheel({ctrlKey:true,deltaY:-20});assert.ok(Math.abs(run('zoom')-.9)<.001);await fire('canvas-stage','gestureend',event());await wheel({ctrlKey:true,deltaY:10});assert.ok(run('zoom')<.9);
for(let i=0;i<3;i++)await wheel({ctrlKey:true,deltaY:-1000,deltaMode:1});assert.equal(run('zoom'),5);assert.equal(element('zoom-value').textContent,'500%');for(let i=0;i<5;i++)await wheel({ctrlKey:true,deltaY:1000});assert.equal(run('zoom'),.25);

const questionNode=element('test-question-target');questionNode.dataset.id=questions[1].id;questionNode.closest=selector=>['.paper-question','[data-id]'].includes(selector)?questionNode:null;
await pointer('pointerdown',10,220,200);await pointer('pointerup',10,220,200);const tap=event({target:questionNode});await fire('canvas-stage','click',tap);assert.equal(tap.stopped,false);await fire('paper-stack','click',tap);assert.equal(run('selected'),questions[1].id,'normal touch still selects a question');
await pointer('pointerdown',11,220,200);const touchDrag=event({target:questionNode});await fire('canvas-stage','dragstart',touchDrag);assert.equal(touchDrag.stopped,true,'touch navigation does not reorder questions');await pointer('pointerup',11,220,200);
await pointer('pointerdown',20,220,200,'mouse');const payload=new Map(),mouseDrag=event({target:questionNode,dataTransfer:{setData:(type,value)=>payload.set(type,value)}});await fire('canvas-stage','dragstart',mouseDrag);assert.equal(mouseDrag.stopped,false);await fire('paper-stack','dragstart',mouseDrag);assert.equal(payload.get('text/plain'),questions[1].id,'mouse drag reordering remains available');

M.state.questions.splice(0);run('render()');assert.equal(stage.style.touchAction,'pan-x pan-y','empty preview keeps normal page touch scrolling');const emptyZoom=run('zoom');assert.equal((await wheel({ctrlKey:true,deltaY:-20})).defaultPrevented,false);await pointer('pointerdown',30,200,200);await pointer('pointermove',30,300,300);assert.equal(run('sheetTouches.size'),0);assert.equal(run('zoom'),emptyZoom);
clearTimeout(run('saveTimer'));clearTimeout(run('toastTimer'));
console.log(JSON.stringify({result:'passed',checks:['A4 multi-page pinch and moving-center anchor','normal wheel and trackpad scrolling','one-finger panning and remaining finger after pinch','question taps preserved','no accidental selection, editor opening, or touch reordering','mouse drag remains available','Safari trackpad compatibility without double scaling','zoom bounds and existing percentage display','document, layout and undo history unchanged','no full UI rebuild while zooming','empty-page touch scrolling']},null,2));
