import assert from 'node:assert/strict';
import {editorHarness,createCanvas} from './qa-editor-harness.mjs';

const {ctx,element,run,fire,M,canvas}=await editorHarness();
const photo=createCanvas(800,1200),context=photo.getContext('2d');context.fillStyle='#879a72';context.fillRect(0,0,photo.width,photo.height);
const source=photo.toDataURL(),original=M.state.questions[0];M.state.questions.splice(0,M.state.questions.length,{...original,src:source,original:source,width:800,height:1200});
const wrap=element('editor-canvas-wrap'),surface=element('editor-canvas-surface');wrap.clientWidth=400;wrap.clientHeight=300;
wrap.getBoundingClientRect=()=>({left:10,top:20,width:400,height:300});
canvas.getBoundingClientRect=()=>{const width=parseFloat(surface.style.width)||800,height=parseFloat(surface.style.height)||1200;return{left:10+Math.max(20,(400-width)/2)-wrap.scrollLeft,top:20+Math.max(20,(300-height)/2)-wrap.scrollTop,width,height}};
surface.getBoundingClientRect=canvas.getBoundingClientRect;
await run('openEditor(state.questions[0].id)');await new Promise(r=>setTimeout(r,10));
const pixels=()=>canvas.toDataURL(),samePhoto=pixels();
function event(extra={}){return{cancelable:true,defaultPrevented:false,stopped:false,preventDefault(){this.defaultPrevented=true},stopPropagation(){},stopImmediatePropagation(){this.stopped=true},...extra}}
async function pointer(type,id,x,y,{pointerType='touch',target=canvas}={}){
  const e=event({type,pointerId:id,pointerType,clientX:x,clientY:y,target});await fire('editor-canvas-wrap',type,e);
  if(!e.stopped){if(target===canvas)await canvas['on'+type]?.(e);else await fire(target.id,type,e)}return e;
}
async function wheel(extra={}){const e=event({ctrlKey:false,deltaMode:0,deltaX:0,deltaY:30,clientX:210,clientY:170,...extra});await fire('editor-canvas-wrap','wheel',e);return e}
function zoom(value=1){run(`setEditorZoom(${value})`);wrap.scrollLeft=100;wrap.scrollTop=180}
function point(x,y){return run(`editorPoint({clientX:${x},clientY:${y}})`)}
function near(actual,expected){assert.ok(Math.abs(actual-expected)<1,`${actual} must stay near ${expected}`)}
zoom();const normalZoom=run('editorZoom');assert.equal((await wheel()).defaultPrevented,false,'plain mouse wheel keeps native scrolling');assert.equal((await wheel({deltaX:40,deltaY:0})).defaultPrevented,false,'two-finger trackpad scrolling stays native');assert.equal(run('editorZoom'),normalZoom);
let anchor=point(190,150);const trackpad=await wheel({ctrlKey:true,deltaY:-20,clientX:190,clientY:150});assert.equal(trackpad.defaultPrevented,true);assert.ok(run('editorZoom')>1);let after=point(190,150);near(after.x,anchor.x);near(after.y,anchor.y);
const enlarged=run('editorZoom');await wheel({ctrlKey:true,deltaY:10});assert.ok(run('editorZoom')<enlarged);await wheel({ctrlKey:true,deltaY:-1000,deltaMode:1});assert.equal(run('editorZoom'),2);await wheel({ctrlKey:true,deltaY:1000,deltaMode:2});assert.ok(run('editorZoom')<2);

zoom();const panStart={left:wrap.scrollLeft,top:wrap.scrollTop};assert.equal((await pointer('pointerdown',1,250,220)).defaultPrevented,true);await pointer('pointermove',1,220,180);assert.equal(wrap.scrollLeft,panStart.left+30);assert.equal(wrap.scrollTop,panStart.top+40);await pointer('pointerup',1,220,180);assert.equal(run('editorZoom'),1);
zoom(.5);anchor=point(230,140);await pointer('pointerdown',1,180,140);await pointer('pointerdown',2,280,140);await pointer('pointermove',1,130,140);await pointer('pointermove',2,330,140);assert.equal(run('editorZoom'),1);after=point(230,140);near(after.x,anchor.x);near(after.y,anchor.y);
await pointer('pointermove',1,150,170);await pointer('pointermove',2,350,170);after=point(250,170);near(after.x,anchor.x);near(after.y,anchor.y);assert.equal(run('editorZoom'),1,'moving pinch center pans without changing the final scale');
await pointer('pointerup',2,350,170);const remainingTop=wrap.scrollTop;await pointer('pointermove',1,150,150);assert.equal(wrap.scrollTop,remainingTop+20);await pointer('pointerup',1,150,150);assert.equal(run('editorTouches.size'),0);assert.equal(run('editorTouchGesture'),null);
assert.equal(pixels(),samePhoto);assert.equal(run('ed.history.length'),0);assert.equal(M.state.questions[0].src,source,'view gestures never edit the saved question');

zoom();await fire('editor-canvas-wrap','gesturestart',event({scale:1,clientX:190,clientY:150}));await fire('editor-canvas-wrap','gesturechange',event({scale:1.5,clientX:190,clientY:150}));assert.equal(run('editorZoom'),1.5,'Safari trackpad gesture changes local zoom');await wheel({ctrlKey:true,deltaY:-20});assert.equal(run('editorZoom'),1.5,'simultaneous wheel and native gesture do not double zoom');await fire('editor-canvas-wrap','gestureend',event());await wheel({ctrlKey:true,deltaY:10});assert.ok(run('editorZoom')<1.5);

zoom();element('eraser-tool').onclick();element('eraser-mode').value='all';const beforeStroke=pixels();await pointer('pointerdown',10,180,150);await pointer('pointermove',10,200,170);assert.notEqual(pixels(),beforeStroke);assert.equal(run('ed.history.length'),1);
await pointer('pointerdown',11,300,170);assert.equal(pixels(),beforeStroke,'starting a pinch rolls back an unfinished eraser stroke');assert.equal(run('ed.history.length'),0);assert.equal(run('ed.drag'),false);await pointer('pointermove',11,340,170);await pointer('pointerup',11,340,170);await pointer('pointerup',10,200,170);assert.equal(pixels(),beforeStroke);
await pointer('pointerdown',12,180,150);assert.notEqual(pixels(),beforeStroke);await pointer('pointercancel',12,180,150);assert.equal(pixels(),beforeStroke,'system cancellation restores an unfinished touch stroke');assert.equal(run('ed.history.length'),0);
await pointer('pointerdown',13,180,150,{pointerType:'mouse'});await pointer('pointermove',13,200,170,{pointerType:'mouse'});await pointer('pointerup',13,200,170,{pointerType:'mouse'});assert.notEqual(pixels(),beforeStroke,'mouse editing still works');await element('editor-undo').onclick();assert.equal(pixels(),beforeStroke);

element('crop-tool').onclick();await new Promise(r=>setTimeout(r,10));zoom();const corners=JSON.stringify(run('ed.perspective.points')),handle=element('perspective-handle-0');handle.closest=selector=>selector==='.perspective-handle'?handle:null;
await pointer('pointerdown',20,130,100,{target:handle});await pointer('pointermove',20,150,120,{target:handle});assert.notEqual(JSON.stringify(run('ed.perspective.points')),corners);
await pointer('pointerdown',21,280,180);assert.equal(JSON.stringify(run('ed.perspective.points')),corners,'pinch restores the unfinished corner drag');await pointer('pointermove',21,320,180);assert.equal(JSON.stringify(run('ed.perspective.points')),corners,'pinch does not change crop geometry');await pointer('pointerup',21,320,180);await pointer('pointerup',20,150,120);element('perspective-cancel').onclick();

zoom();await pointer('pointerdown',30,120,120);await pointer('pointerdown',31,250,120);element('editor-dialog').close();assert.equal(run('editorTouches.size'),0);assert.equal(run('editorTouchGesture'),null);await run('openEditor(state.questions[0].id)');await new Promise(r=>setTimeout(r,10));const reopenedZoom=run('editorZoom');await pointer('pointermove',31,350,120);assert.equal(run('editorZoom'),reopenedZoom,'old pointers cannot affect a reopened editor');
assert.equal(pixels(),samePhoto);assert.equal(canvas.width,800);assert.equal(canvas.height,1200);assert.equal(run('ed.history.length'),0);assert.equal(wrap.style.touchAction,'none','custom touch handling is scoped to the preview');
element('editor-dialog').close();clearTimeout(run('saveTimer'));clearTimeout(run('toastTimer'));
console.log(JSON.stringify({result:'passed',checks:['native mouse and trackpad scrolling preserved','trackpad pinch and pointer anchor','Safari gestures without double scaling','one-finger image panning','two-finger pinch and moving center','single finger after pinch','unchanged source pixels and history','safe transition from erasing and crop handles','touch cancellation','mouse editing preserved','gesture cleanup on close and reopen']},null,2));
