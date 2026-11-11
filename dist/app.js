'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const icons={brand:'<path d="M7 4h17l8 8v28H7z" fill="#25564b" stroke="none"/><path d="M24 4v9h8" fill="#87a18a" stroke="none"/><path d="M14 20h11M14 26h11M14 32h6" stroke="#f4edda" stroke-width="2.2"/>',upload:'<path d="M12 16V4m-4 4 4-4 4 4M4 15v5h16v-5"/>',download:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',save:'<path d="M4 3h14l3 3v15H3V3zm3 0v7h10V3M7 21v-8h10v8"/>',help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.3 2.4c-.8.3-.8 1.2-.8 2.1M12 17h.01"/>',down:'<path d="m6 9 6 6 6-6"/>',more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',grip:'<path d="M8 5h.01M8 12h.01M8 19h.01M15 5h.01M15 12h.01M15 19h.01" stroke-width="3"/>',sort:'<path d="M8 4v16m-4-4 4 4 4-4M14 5h7m-7 5h5m-5 5h3"/>',shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/>',folder:'<path d="M3 7V4h6l3 3h9v14H3z"/>',page:'<path d="M5 3h10l4 4v14H5zm10 0v5h4M8 12h8M8 16h6"/>',pages:'<path d="M8 7h10l3 3v12H8zM4 17H2V2h12v2"/>',undo:'<path d="m7 4-4 4 4 4M3 8h10a7 7 0 0 1 0 14"/>',redo:'<path d="m17 4 4 4-4 4m4-4H11a7 7 0 0 0 0 14"/>',minus:'<path d="M5 12h14"/>',plus:'<path d="M5 12h14M12 5v14"/>',expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',type:'<path d="M4 5V3h16v2M12 3v18m-4 0h8"/>',layout:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18"/>',pencil:'<path d="m4 16 12-12 4 4L8 20l-5 1zM14 6l4 4"/>',sparkles:'<path d="m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7zM20 2v4m-2-2h4"/>',bulb:'<path d="M8 16c0-3-3-3.5-3-7a7 7 0 0 1 14 0c0 3.5-3 4-3 7zm1 4h6m-5 3h4"/>',leaf:'<path d="M20 3C8 2 2 8 5 15c3 6 13 5 15-12zM4 21 16 9"/>',star:'<path d="m12 2.5 2.9 6 6.6 1-4.8 4.6 1.2 6.6-5.9-3.1-5.9 3.1 1.2-6.6-4.8-4.6 6.6-1z"/>',image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',close:'<path d="m5 5 14 14M19 5 5 19"/>',check:'<path d="m4 12 5 5L20 6"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',crop:'<path d="M6 3v15h15M3 6h15v15"/>',eraser:'<path d="m3 15 11-12 7 7-11 12H8zm5 4 7-7M10 22h12"/>',rotate:'<path d="M20 8V3m0 5h-5M20 8a9 9 0 1 0 1 8"/>',contrast:'<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',up:'<path d="m6 14 6-6 6 6"/>'};
function icon(name){return '<svg viewBox="'+(name==='brand'?'0 0 38 44':'0 0 24 24')+'" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(icons[name]||icons.page)+'</svg>'}
function hydrateIcons(root=document){root.querySelectorAll('[data-icon]').forEach(e=>e.innerHTML=icon(e.dataset.icon))}hydrateIcons();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);
const defaults={title:'수학, 한 장의 성장',subtitle:'수학 · 실력 다지기',date:'',nameField:true,columns:2,margin:16,gap:8,divider:true,solution:true,solutionSpace:36,lineStyle:'blank',stars:true,answerLine:true,answerKey:false};
let state={settings:{...defaults},questions:[]},selected=null,selectedIds=new Set(),undoStack=[],redoStack=[],zoom=0.7,autoFit=true,pages=[],saveTimer,db,toastTimer,bulkCorrectionJob=null,bulkCorrectionMessage='';
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3400)}
function starsHTML(value,cls=''){return '<div class="stars '+cls+'">'+[1,2,3,4,5].map(i=>'<button type="button" class="star-button '+(i<=value?'filled':'')+'" data-star="'+i+'" aria-label="난이도 '+i+'점" aria-pressed="'+(i<=value)+'">'+icon('star')+'</button>').join('')+'</div>'}
function remember(){undoStack.push(JSON.stringify(state));if(undoStack.length>25)undoStack.shift();redoStack=[]}
function update(fn,{history=true,sync=false}={}){if(history)remember();fn();render();if(sync)syncSettings();saveSoon()}
function selectedQuestions(){return state.questions.filter(q=>selectedIds.has(q.id))}
function commonSelectionValue(items,getter){if(!items.length)return null;const first=getter(items[0]);return items.every(q=>Object.is(getter(q),first))?first:null}
function clearMultiSelection(){selectedIds.clear()}
function saveSoon(){clearTimeout(saveTimer);$('#save-status').innerHTML='<i class="status-dot"></i> 저장 중…';saveTimer=setTimeout(async()=>{try{if(!db)throw Error('no storage');await new Promise((resolve,reject)=>{const t=db.transaction('work','readwrite');t.objectStore('work').put(JSON.parse(JSON.stringify(state)),'current');t.oncomplete=resolve;t.onerror=()=>reject(t.error)});$('#save-status').innerHTML='<i class="status-dot"></i> 이 기기에 저장됨'}catch{$('#save-status').textContent='프로젝트 파일로 저장해 주세요'}},500)}
function loadImage(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('이미지를 읽을 수 없어요'));im.src=src})}
function sampleImage(index){const c=document.createElement('canvas');c.width=680;c.height=[235,285,235,245][index];const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.fillStyle='#252b25';x.font='20px "Malgun Gothic",sans-serif';const text=(s,y)=>x.fillText(s,2,y);const math=(s,y)=>{x.font='25px Georgia,"Malgun Gothic",serif';text(s,y);x.font='20px "Malgun Gothic",sans-serif'};
if(index===0){text('이차방정식 x² - 5x + 6 = 0 의 두 근을',27);text('α, β 라 할 때, α² + β² 의 값을 구하시오.',63);math('x² - 5x + 6 = 0',119);text('① 10     ② 11     ③ 12     ④ 13     ⑤ 14',193)}
if(index===1){text('그림에서 AB = AC 인 이등변삼각형 ABC의',27);text('꼭짓각 A의 크기가 40°일 때, ∠B를 구하시오.',63);x.lineWidth=2;x.strokeStyle='#424c40';x.beginPath();x.moveTo(310,100);x.lineTo(205,248);x.lineTo(415,248);x.closePath();x.stroke();x.font='19px Georgia';x.fillText('A',304,92);x.fillText('B',183,266);x.fillText('C',423,266);x.fillText('40°',299,146);x.beginPath();x.arc(310,100,29,.95,2.2);x.stroke();x.font='20px "Malgun Gothic",sans-serif'}
if(index===2){text('함수 f(x) = x³ - 3x² + 2 에 대하여',27);text('x = 2 에서의 미분계수 f′(2)의 값을 구하시오.',63);math('f(x) = x³ - 3x² + 2',127);text('① -2      ② -1      ③ 0      ④ 1      ⑤ 2',195)}
if(index===3){text('다음 두 조건을 만족시키는 일차함수',27);text('y = ax + b 에 대하여 a + b 의 값을 구하시오.',63);x.strokeStyle='#bbbfb4';x.strokeRect(12,92,650,104);text('(가) 그래프가 점 (1, 5)를 지난다.',130);text('(나) 그래프의 기울기는 2이다.',170)}return c.toDataURL('image/png')}
function makeSamples(){return ['이차방정식과 두 근','이등변삼각형의 각도','다항함수의 미분계수','일차함수의 식'].map((title,i)=>{const src=sampleImage(i);return{id:uid(),title,src,original:src,width:680,height:[235,285,235,245][i],difficulty:[2,3,4,2][i],answer:['④ 13','70°','③ 0','5'][i],type:'예시',solution:null,scale:100,breakBefore:false}})}
function getLayout(){const s=state.settings,px=794/210,m=s.margin*px,g=s.gap*px,cw=(794-2*m-(s.columns-1)*g)/s.columns,top=m+111,limit=1123-m-29;let list=[],page={items:[],answerKey:false},y=top,row=[],rowHeight=0;const pushPage=()=>{if(page.items.length)list.push(page);page={items:[],answerKey:false};y=top;row=[];rowHeight=0};for(let i=0;i<state.questions.length;i++){const q=state.questions[i];if(q.breakBefore&&page.items.length)pushPage();let iw=cw*q.scale/100,ih=q.height/q.width*iw;const space=s.solution?(q.solution??s.solutionSpace)*px:0;const maxH=limit-top;ih=Math.min(ih,Math.max(40,maxH-25-space-(s.answerLine?25:8)-22));let h=25+ih+space+(s.answerLine?25:8)+22;if(h>maxH){h=maxH;ih=Math.max(30,h-25-space-(s.answerLine?25:8)-22)}if(row.length===s.columns){y+=rowHeight+18;row=[];rowHeight=0}if(y+h>limit&&page.items.length){pushPage()}const col=row.length;const item={q,index:i,x:m+col*(cw+g),y,w:cw,h,iw,ih,space};page.items.push(item);row.push(item);rowHeight=Math.max(rowHeight,h)}if(page.items.length)list.push(page);if(s.answerKey&&state.questions.length){const measure=document.createElement('canvas').getContext('2d');measure.font='12px Noto Sans KR,Malgun Gothic,Arial,sans-serif';const maxWidth=794-2*m-48;let answers=[],used=0;for(let i=0;i<state.questions.length;i++){const q=state.questions[i];let lines=1,line='';for(const ch of (q.answer||'정답 미입력')){if(measure.measureText(line+ch).width>maxWidth&&line){lines++;line=ch}else line+=ch}const h=Math.max(49,lines*18+29);if(used+h>limit-(top+10)&&answers.length){list.push({answerKey:true,answers,items:[]});answers=[];used=0}answers.push({q,index:i,h});used+=h}if(answers.length)list.push({answerKey:true,answers,items:[]})}return list}
function fitZoom(){const stage=$('#canvas-stage');return Math.max(.22,Math.min(.95,(stage.clientWidth-44)/794))}
function render(){const validIds=new Set(state.questions.map(q=>q.id));selectedIds=new Set([...selectedIds].filter(id=>validIds.has(id)));if(selected&&!validIds.has(selected))selected=state.questions[0]?.id||null;pages=getLayout();if(autoFit)zoom=fitZoom();renderList();renderPreview();renderSelected();$('#question-count').textContent=state.questions.length;$('#crumb-title').textContent=state.settings.title||'제목 없는 문제지';$('#page-summary').textContent=pages.length+'페이지 · 총 '+state.questions.length+'문제';$('#zoom-value').textContent=Math.round(zoom*100)+'%';$('#undo-button').disabled=!undoStack.length;$('#redo-button').disabled=!redoStack.length;$('#export-button').disabled=!state.questions.length}
function renderList(){const levels=['','기초','기본','보통','심화','최상'],count=selectedIds.size,all=!!state.questions.length&&count===state.questions.length;$('#question-list').innerHTML=state.questions.map((q,i)=>{const checked=selectedIds.has(q.id),active=checked||q.id===selected;return '<article class="question-card '+(active?'selected ':'')+(checked?'multi-selected':'')+'" draggable="true" data-id="'+q.id+'" tabindex="0" aria-label="'+(i+1)+'번 '+esc(q.title)+'"><div class="question-topline"><button type="button" class="question-select" data-select-question="'+q.id+'" aria-label="'+esc(q.title)+' 선택" aria-pressed="'+checked+'">'+(checked?icon('check'):'')+'</button><span class="question-num">'+String(i+1).padStart(2,'0')+'</span><span>'+esc(q.title.length>13?q.title.slice(0,13)+'…':q.title)+'</span><span class="question-type">'+esc(q.type)+'</span><button class="icon-button" data-delete="'+q.id+'" aria-label="이 문제 삭제">'+icon('close')+'</button></div><img class="question-thumb" src="'+q.src+'" alt="'+esc(q.title)+'"><div class="question-card-bottom">'+starsHTML(q.difficulty)+'<span class="difficulty-label">'+levels[q.difficulty]+'</span><button class="edit-photo" data-edit="'+q.id+'">'+icon('sparkles')+'사진 보정</button></div></article>'}).join('');const allButton=$('#select-all-questions');allButton.disabled=!state.questions.length;allButton.classList.toggle('active',all);allButton.setAttribute('aria-pressed',String(all));allButton.querySelector('.select-all-label').textContent=all?'전체 해제':'전체 선택';const status=$('#selection-status');status.hidden=!count;status.textContent=count+'개 문제를 선택했어요'}
function paperHeader(answerKey=false){const s=state.settings,m=s.margin*794/210;return '<div class="paper-header" style="top:'+m+'px;left:'+m+'px;width:'+(794-2*m)+'px"><div class="paper-meta">'+esc(s.subtitle||'MY WORKSHEET')+(answerKey?' · ANSWER KEY':'')+'</div><h2>'+esc(s.title||'제목 없는 문제지')+(answerKey?' · 정답':'')+'</h2><div class="paper-info"><span>'+esc(s.date||'차근차근 풀어보세요. 오늘도 한 걸음 더.')+'</span>'+(s.nameField?'<span class="name-blank">이름 __________________　 날짜 ____________</span>':'')+'</div></div>'}
function renderPreview(){syncSheetTouchAvailability();const s=state.settings,m=s.margin*794/210,g=s.gap*794/210;$('#canvas-empty').hidden=!!state.questions.length;$('#paper-stack').innerHTML=pages.map((p,i)=>'<div class="paper-wrapper" style="width:'+(794*zoom)+'px;height:'+(1123*zoom)+'px"><div class="paper" style="transform:scale('+zoom+')">'+paperHeader(p.answerKey)+(s.divider&&s.columns===2&&!p.answerKey?'<div class="paper-column-divider" style="left:397px;top:'+(m+111)+'px;height:'+(1123-m-29-m-111)+'px"></div>':'')+(p.answerKey?'<div class="answer-key-content" style="position:absolute;left:'+m+'px;right:'+m+'px;top:'+(m+121)+'px">'+p.answers.map(a=>'<div class="answer-key-row" style="height:'+a.h+'px"><b>'+String(a.index+1).padStart(2,'0')+'</b><span>'+esc(a.q.answer||'정답 미입력')+'</span></div>').join('')+'</div>':p.items.map(it=>'<article class="paper-question '+((selectedIds.has(it.q.id)||it.q.id===selected)?'selected':'')+'" data-id="'+it.q.id+'" draggable="true" style="left:'+it.x+'px;top:'+it.y+'px;width:'+it.w+'px;height:'+it.h+'px"><div class="paper-question-head"><span class="paper-question-number">'+String(it.index+1).padStart(2,'0')+'</span>'+(s.stars?'<span class="paper-stars">'+'★'.repeat(it.q.difficulty)+'☆'.repeat(5-it.q.difficulty)+'</span>':'')+'</div><img class="paper-problem-image" src="'+it.q.src+'" style="width:'+it.iw+'px;height:'+it.ih+'px;object-fit:contain;object-position:left top" alt="'+esc(it.q.title)+'">'+(s.solution?'<div class="solution-area '+s.lineStyle+'" style="height:'+it.space+'px">'+(s.lineStyle==='blank'?'<span class="solution-label">풀이</span>':'')+'</div>':'')+(s.answerLine?'<div class="paper-answer">답 ____________________</div>':'')+'</article>').join(''))+'<div class="paper-footer" style="left:'+m+'px;width:'+(794-2*m)+'px"><span>'+esc(s.subtitle||'나의 문제지')+'</span><span>'+String(i+1).padStart(2,'0')+' / '+String(pages.length).padStart(2,'0')+'</span></div></div><div class="page-caption">'+(p.answerKey?'정답지':'문제지')+' · '+(i+1)+'페이지</div></div>').join('')}
function renderSelected(){const items=selectedQuestions(),q=state.questions.find(q=>q.id===selected);let html;if(items.length>1){const difficulty=commonSelectionValue(items,q=>q.difficulty)??0,scale=commonSelectionValue(items,q=>q.scale),solution=commonSelectionValue(items,q=>q.solution??state.settings.solutionSpace),pageBreak=commonSelectionValue(items,q=>q.breakBefore);html='<section class="settings-section bulk-editor"><div class="bulk-heading"><span class="bulk-count">'+items.length+'</span><div><h4>선택한 문제 일괄 편집</h4></div></div><div class="bulk-preview-strip">'+items.slice(0,5).map(q=>'<img src="'+q.src+'" alt="">').join('')+(items.length>5?'<span>+'+(items.length-5)+'</span>':'')+'</div><label class="field-label">난이도 '+(difficulty?'':'· 값이 서로 달라요')+'</label>'+starsHTML(difficulty,'editor-stars bulk-stars')+'</section><section class="settings-section bulk-photo-tools"><h4>선택 사진 일괄 보정</h4><div class="filter-grid bulk-filter-grid"><button type="button" data-bulk-filter="bw">'+icon('contrast')+'흑백</button><button type="button" data-bulk-filter="sharpen">'+icon('sparkles')+'선명하게</button><button type="button" data-bulk-filter="shadow">'+icon('sun')+'그림자 제거</button><button type="button" data-bulk-filter="original">'+icon('image')+'원본 복원</button></div><button type="button" class="button primary full bulk-auto-straighten" id="bulk-auto-straighten" data-bulk-filter="straighten">'+icon('sparkles')+'비율 자동 조정</button><button type="button" class="button secondary full bulk-handwriting" id="bulk-handwriting">'+icon('eraser')+'필기 제거</button><button type="button" class="button secondary full" id="bulk-correction-stop" hidden>처리 중단</button><p id="bulk-correction-status" class="bulk-correction-status" role="status" aria-live="polite">'+esc(bulkCorrectionMessage||'')+'</p></section><section class="settings-section bulk-controls"><h4>사진과 배치</h4><div class="range-label"><label for="bulk-scale">사진 크기</label><output>'+(scale===null?'혼합':scale+'%')+'</output></div><input type="range" id="bulk-scale" min="50" max="100" step="5" value="'+(scale??100)+'"><div class="range-label"><label for="bulk-solution">풀이 공간</label><output>'+(solution===null?'혼합':solution+' mm')+'</output></div><input type="range" id="bulk-solution" min="0" max="75" value="'+(solution??state.settings.solutionSpace)+'"><button class="text-button" id="bulk-reset-space">모두 문제지 기본값 사용</button><label class="toggle-row"><span>모두 새 페이지에서 시작</span><input type="checkbox" id="bulk-break" '+(pageBreak===true?'checked':'')+'><span class="toggle"></span></label><button class="button secondary full" id="clear-selection">선택 해제</button><button class="button full delete-button" id="bulk-delete">'+icon('trash')+'선택한 '+items.length+'개 문제 삭제</button></section>'}else if(q){html='<section class="settings-section"><h4>'+String(state.questions.indexOf(q)+1).padStart(2,'0')+'　선택한 문제</h4><img class="selected-preview" src="'+q.src+'" alt="선택한 문제"><label class="field-label">난이도</label>'+starsHTML(q.difficulty,'editor-stars')+'<label class="field-label" for="selected-name">문제 이름</label><input class="text-input" id="selected-name" maxlength="100" value="'+esc(q.title)+'"><label class="field-label" for="selected-answer">정답</label><input class="text-input" id="selected-answer" maxlength="300" value="'+esc(q.answer)+'"><button class="button secondary full" id="selected-edit" style="margin-top:14px">'+icon('sparkles')+'사진 보정하기</button></section><section class="settings-section"><h4>이 문제의 배치</h4><div class="range-label"><label for="question-scale">사진 크기</label><output>'+q.scale+'%</output></div><input type="range" id="question-scale" min="50" max="100" step="5" value="'+q.scale+'"><div class="range-label"><label for="question-solution">개별 풀이 공간</label><output>'+(q.solution??state.settings.solutionSpace)+' mm</output></div><input type="range" id="question-solution" min="0" max="75" value="'+(q.solution??state.settings.solutionSpace)+'"><button class="text-button" id="reset-question-space">문제지 기본값 사용</button><label class="toggle-row"><span>새 페이지에서 시작</span><input type="checkbox" id="question-break" '+(q.breakBefore?'checked':'')+'><span class="toggle"></span></label><div class="selected-commands"><button id="move-prev" class="button secondary" '+(state.questions.indexOf(q)===0?'disabled':'')+'>'+icon('up')+'앞으로</button><button id="move-next" class="button secondary" '+(state.questions.indexOf(q)===state.questions.length-1?'disabled':'')+'>'+icon('down')+'뒤로</button></div><button class="button full delete-button" id="selected-delete">'+icon('trash')+'이 문제 삭제</button></section>'}else html='<div class="question-settings-empty"></div>';$('#selected-question-content').innerHTML=html;const bulkBreak=$('#bulk-break');if(bulkBreak)bulkBreak.indeterminate=commonSelectionValue(items,q=>q.breakBefore)===null;$$('#selected-question-content input[type=range]').forEach(paintRange);syncBulkCorrectionUI()}
function syncBulkCorrectionUI(){
  const busy=!!bulkCorrectionJob;
  $$('[data-bulk-filter]').forEach(button=>button.disabled=busy);
  const run=$('#bulk-handwriting'),stop=$('#bulk-correction-stop'),status=$('#bulk-correction-status');
  if(run){run.disabled=busy;run.innerHTML=icon('eraser')+(busy&&bulkCorrectionJob.mode==='handwriting'?'필기 제거 중…':'필기 제거')}
  const straighten=$('#bulk-auto-straighten');
  if(straighten){straighten.disabled=busy;straighten.innerHTML=icon('sparkles')+(busy&&bulkCorrectionJob.mode==='straighten'?'비율 자동 조정 중…':'비율 자동 조정')}
  if(stop)stop.hidden=!busy;
  if(status)status.textContent=bulkCorrectionMessage||'';
}
function setBulkCorrectionStatus(message){bulkCorrectionMessage=message;const status=$('#bulk-correction-status');if(status)status.textContent=message}
function applyPixelFilter(data,w,h,mode){
  const d=data.data;
  if(mode==='shadow'){
    const grey=new Float32Array(w*h),sum=new Float64Array((w+1)*(h+1));
    for(let y=0;y<h;y++){let row=0;for(let x=0;x<w;x++){const i=y*w+x;grey[i]=d[i*4]*.299+d[i*4+1]*.587+d[i*4+2]*.114;row+=grey[i];sum[(y+1)*(w+1)+x+1]=sum[y*(w+1)+x+1]+row}}
    const rad=Math.max(12,Math.round(w/25));
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const a=Math.max(0,x-rad),b=Math.min(w,x+rad),c=Math.max(0,y-rad),f=Math.min(h,y+rad),avg=(sum[f*(w+1)+b]-sum[c*(w+1)+b]-sum[f*(w+1)+a]+sum[c*(w+1)+a])/((b-a)*(f-c)),i=(y*w+x)*4;for(let k=0;k<3;k++)d[i+k]=Math.min(255,d[i+k]*255/Math.max(75,avg))}
  }else if(mode==='sharpen'){
    const original=new Uint8ClampedArray(d);
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=(y*w+x)*4;for(let k=0;k<3;k++)d[i+k]=original[i+k]*3-(original[i-4+k]+original[i+4+k]+original[i-w*4+k]+original[i+w*4+k])*.5}
  }else if(mode==='bw'){
    for(let i=0;i<d.length;i+=4){const grey=.299*d[i]+.587*d[i+1]+.114*d[i+2];d[i]=d[i+1]=d[i+2]=grey}
  }else throw Error('지원하지 않는 일괄 보정이에요.');
  return data;
}
async function canvasFromImage(src){const image=await loadImage(src),canvas=document.createElement('canvas');canvas.width=image.naturalWidth||image.width;canvas.height=image.naturalHeight||image.height;const context=canvas.getContext('2d',{willReadFrequently:true});context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0);return{canvas,context}}
async function createLocalBulkResult(question,mode){
  if(mode==='original'){const image=await loadImage(question.original);return{id:question.id,src:question.original,width:image.naturalWidth||image.width,height:image.naturalHeight||image.height}}
  const{canvas,context}=await canvasFromImage(question.src),data=context.getImageData(0,0,canvas.width,canvas.height);applyPixelFilter(data,canvas.width,canvas.height,mode);context.putImageData(data,0,0);return{id:question.id,src:canvas.toDataURL('image/png'),width:canvas.width,height:canvas.height};
}
async function requestBulkRemoteCorrection(question,jobSignal,mode){
  const{canvas}=await canvasFromImage(question.src);let image=canvas.toDataURL('image/png');if(image.length>14e6)image=canvas.toDataURL('image/jpeg',.98);if(image.length>14e6)throw Error('사진 용량이 너무 커요.');
  const controller=new AbortController(),abort=()=>controller.abort(),timer=setTimeout(()=>controller.abort(),125000);jobSignal.addEventListener('abort',abort,{once:true});if(jobSignal.aborted)controller.abort();
  try{
    if(mode==='straighten'){
      const output=await requestStraightenedImage(image,controller.signal);
      if(controller.signal.aborted)throw new DOMException('Aborted','AbortError');
      return{id:question.id,source:question.src,src:output.toDataURL('image/png'),width:output.width,height:output.height};
    }
    const response=await fetch('/api/handwriting-removal/erase',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image}),signal:controller.signal});
    let payload;try{payload=await response.json()}catch{throw Error('필기 제거 서버 응답을 읽지 못했어요.')}
    if(!response.ok)throw Error(payload.message||'필기를 제거하지 못했어요.');
    if(typeof payload.image!=='string'||!/^data:image\/(?:png|jpeg);base64,/.test(payload.image))throw Error('유효한 필기 제거 결과를 받지 못했어요.');
    const result=await loadImage(payload.image),width=result.naturalWidth||result.width,height=result.naturalHeight||result.height;
    if(!width||!height||Math.abs((width/height)/(canvas.width/canvas.height)-1)>.02)throw Error('결과 사진의 비율이 달라요.');
    const output=document.createElement('canvas');output.width=canvas.width;output.height=canvas.height;const context=output.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,output.width,output.height);context.drawImage(result,0,0,output.width,output.height);
    if(controller.signal.aborted)throw new DOMException('Aborted','AbortError');
    return{id:question.id,source:question.src,src:output.toDataURL('image/png'),width:output.width,height:output.height};
  }finally{clearTimeout(timer);jobSignal.removeEventListener('abort',abort)}
}
async function runBulkCorrection(mode){
  if(bulkCorrectionJob)return;
  const questions=selectedQuestions().map(question=>({...question}));if(questions.length<2){toast('두 개 이상의 문제 사진을 선택해 주세요.');return}
  const label=mode==='straighten'?'비율 자동 조정':mode==='handwriting'?'필기 제거':'사진 보정';
  if(['straighten','handwriting'].includes(mode)&&typeof location!=='undefined'&&location.protocol==='file:'){setBulkCorrectionStatus('Start-Munji.cmd로 실행하거나 온라인 문지에서 '+label+'을 사용해 주세요.');return}
  const job={mode,total:questions.length,completed:0,failed:0,controller:new AbortController()};bulkCorrectionJob=job;setBulkCorrectionStatus(label+' 준비 중…');syncBulkCorrectionUI();
  const results=[];
  try{
    if(mode==='handwriting'||mode==='straighten'){
      for(const question of questions){if(job.controller.signal.aborted)break;try{results.push(await requestBulkRemoteCorrection(question,job.controller.signal,mode))}catch(error){if(!job.controller.signal.aborted){job.failed++;console.error('일괄 '+label+' 실패',question.title,error)}}finally{job.completed++;setBulkCorrectionStatus(label+' 중 · '+Math.min(job.completed,job.total)+' / '+job.total)}}
    }else{
      for(const question of questions){if(job.controller.signal.aborted)break;try{results.push(await createLocalBulkResult(question,mode))}catch(error){job.failed++;console.error('일괄 사진 보정 실패',question.title,error)}job.completed++;setBulkCorrectionStatus('사진 보정 중 · '+job.completed+' / '+job.total);await new Promise(resolve=>setTimeout(resolve,16))}
    }
    const applicable=results.filter(result=>{const question=state.questions.find(q=>q.id===result.id);return question&&(!result.source||question.src===result.source)}),stopped=job.controller.signal.aborted,success=applicable.length,skipped=results.length-success;
    bulkCorrectionJob=null;bulkCorrectionMessage=stopped?success+'개까지 '+label+'하고 중단했어요.':job.failed||skipped?success+'개 '+label+' 완료 · '+(job.failed+skipped)+'개는 현재 사진을 유지했어요.':success+'개 사진의 '+label+'을 완료했어요.';
    if(success)update(()=>{for(const result of applicable){const question=state.questions.find(q=>q.id===result.id);question.src=result.src;question.width=result.width;question.height=result.height}});else renderSelected();
    toast(bulkCorrectionMessage);
  }catch(error){bulkCorrectionJob=null;bulkCorrectionMessage='일괄 보정을 완료하지 못했어요. 원본은 유지됩니다.';console.error('일괄 보정 실패',error);renderSelected();toast(bulkCorrectionMessage)}
}
function stopBulkCorrection(){if(!bulkCorrectionJob)return;bulkCorrectionJob.controller.abort();setBulkCorrectionStatus('처리를 중단하고 완료된 사진을 정리하고 있어요…');syncBulkCorrectionUI()}
function syncSettings(){const s=state.settings;const text={'sheet-title':'title','sheet-subtitle':'subtitle','sheet-date':'date',margin:'margin','column-gap':'gap','solution-space':'solutionSpace'};Object.entries(text).forEach(([id,k])=>$('#'+id).value=s[k]);const checks={'name-field':'nameField',divider:'divider','solution-toggle':'solution','show-stars':'stars','answer-line':'answerLine','answer-key':'answerKey'};Object.entries(checks).forEach(([id,k])=>$('#'+id).checked=s[k]);$('#col-one').classList.toggle('active',s.columns===1);$('#col-two').classList.toggle('active',s.columns===2);$$('[data-line]').forEach(b=>b.classList.toggle('active',s.lineStyle===b.dataset.line));$('#margin-value').innerHTML=s.margin+' <small>mm</small>';$('#gap-value').innerHTML=s.gap+' <small>mm</small>';$('#solution-value').innerHTML=s.solutionSpace+' <small>mm</small>';$('#solution-controls').hidden=!s.solution;$$('input[type=range]').forEach(paintRange)}
function paintRange(e){const percent=(e.value-e.min)/(e.max-e.min)*100;e.style.background='linear-gradient(to right,#91a87c '+percent+'%,#e5eadc '+percent+'%)'}
function selectQuestion(id,tab=false){if(bulkCorrectionJob)return toast('일괄 보정이 끝난 뒤 선택을 바꿔 주세요.');bulkCorrectionMessage='';clearMultiSelection();selected=id;renderList();renderPreview();renderSelected();if(tab)switchTab('question')}
function toggleQuestionSelection(id){if(bulkCorrectionJob)return toast('일괄 보정이 끝난 뒤 선택을 바꿔 주세요.');bulkCorrectionMessage='';if(selectedIds.has(id))selectedIds.delete(id);else selectedIds.add(id);selected=selectedIds.size?[...selectedIds][0]:null;renderList();renderPreview();renderSelected();switchTab('question')}
function toggleAllQuestions(){if(bulkCorrectionJob)return toast('일괄 보정이 끝난 뒤 선택을 바꿔 주세요.');bulkCorrectionMessage='';const all=state.questions.length>0&&selectedIds.size===state.questions.length;selectedIds=all?new Set():new Set(state.questions.map(q=>q.id));selected=all?null:state.questions[0]?.id||null;renderList();renderPreview();renderSelected();switchTab('question')}
function switchTab(tab){const a=tab==='layout';$('#layout-tab').classList.toggle('active',a);$('#question-tab').classList.toggle('active',!a);$('#layout-tab').setAttribute('aria-selected',a);$('#question-tab').setAttribute('aria-selected',!a);$('#layout-settings').hidden=!a;$('#question-settings').hidden=a}
function removeQuestion(id){if(bulkCorrectionJob)return toast('일괄 보정이 끝난 뒤 문제를 삭제해 주세요.');update(()=>{state.questions=state.questions.filter(q=>q.id!==id);selectedIds.delete(id);if(selected===id)selected=selectedIds.size?[...selectedIds][0]:state.questions[0]?.id||null});toast('문제를 삭제했어요.')}
function removeSelectedQuestions(){const ids=new Set(selectedIds),count=ids.size;if(!count)return;update(()=>{state.questions=state.questions.filter(q=>!ids.has(q.id));selectedIds.clear();selected=state.questions[0]?.id||null});toast(count+'개 문제를 삭제했어요.')}
async function addFiles(files){const arr=[...files];if(!arr.length)return;const images=arr.filter(f=>/^image\/(jpeg|png|webp)$/.test(f.type)||/\.(jpe?g|png|webp)$/i.test(f.name));if(images.length!==arr.length)toast('JPG, PNG, WEBP 사진을 선택해 주세요.');if(!images.length)return;if(state.questions.length+images.length>100){toast('한 프로젝트에 최대 100문제까지 추가할 수 있어요.');return}$('#layout-status').textContent='사진을 읽고 있어요…';const results=[];for(const f of images){try{if(f.size>30*1024*1024)throw Error('size');const url=URL.createObjectURL(f);let im;try{im=await loadImage(url)}finally{URL.revokeObjectURL(url)}const ratio=Math.min(1,1800/Math.max(im.naturalWidth,im.naturalHeight));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.naturalWidth*ratio));c.height=Math.max(1,Math.round(im.naturalHeight*ratio));const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(im,0,0,c.width,c.height);const src=c.toDataURL('image/png');results.push({id:uid(),title:f.name.replace(/\.[^.]+$/,'').slice(0,100),src,original:src,width:c.width,height:c.height,difficulty:3,answer:'',type:'사진',solution:null,scale:100,breakBefore:false})}catch{toast(f.name+' 파일을 읽지 못했어요. 30MB 이하의 사진을 사용해 주세요.')}}if(results.length){update(()=>{state.questions.push(...results);clearMultiSelection();selected=results[0].id});toast(results.length+'개의 문제 사진을 추가했어요.')}$('#layout-status').textContent='자동 배치 완료';$('#file-input').value=''}
$('#upload-zone').onclick=$('#empty-upload').onclick=()=>$('#file-input').click();$('#file-input').onchange=e=>addFiles(e.target.files);const zone=$('#upload-zone');zone.ondragover=e=>{e.preventDefault();zone.classList.add('drag-over')};zone.ondragleave=()=>zone.classList.remove('drag-over');zone.ondrop=e=>{e.preventDefault();zone.classList.remove('drag-over');addFiles(e.dataTransfer.files)};
$('#layout-tab').onclick=()=>switchTab('layout');$('#question-tab').onclick=()=>switchTab('question');$('#help-button').onclick=()=>$('#help-dialog').showModal();$('#library-menu').onclick=()=>$('#help-dialog').showModal();
$('#question-list').addEventListener('click',e=>{const c=e.target.closest('.question-card');if(!c)return;const id=c.dataset.id;if(e.target.closest('[data-select-question]'))return toggleQuestionSelection(id);if(e.target.closest('[data-delete]'))return removeQuestion(id);if(e.target.closest('[data-edit]'))return openEditor(id);const st=e.target.closest('[data-star]');if(st){clearMultiSelection();selected=id;return update(()=>state.questions.find(q=>q.id===id).difficulty=+st.dataset.star)}selectQuestion(id)});
$('#question-list').addEventListener('keydown',e=>{if(e.target.matches('.question-card')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();selectQuestion(e.target.dataset.id,true)}});
$('#paper-stack').addEventListener('click',e=>{const q=e.target.closest('.paper-question');if(q)selectQuestion(q.dataset.id,true)});$('#paper-stack').addEventListener('dblclick',e=>{const q=e.target.closest('.paper-question');if(q)openEditor(q.dataset.id)});
for(const area of [$('#question-list'),$('#paper-stack')]){area.addEventListener('dragstart',e=>{const c=e.target.closest('[data-id]');if(!c)return;e.dataTransfer.setData('text/plain',c.dataset.id);e.dataTransfer.effectAllowed='move';c.classList.add('dragging')});area.addEventListener('dragend',()=>$$('.dragging').forEach(c=>c.classList.remove('dragging')));area.addEventListener('dragover',e=>{if(e.target.closest('[data-id]'))e.preventDefault()});area.addEventListener('drop',e=>{const c=e.target.closest('[data-id]');if(!c)return;e.preventDefault();const from=e.dataTransfer.getData('text/plain'),to=c.dataset.id;if(from===to||!state.questions.some(q=>q.id===from))return;update(()=>{const a=state.questions.findIndex(q=>q.id===from),b=state.questions.findIndex(q=>q.id===to);const[q]=state.questions.splice(a,1);state.questions.splice(b,0,q);selected=q.id});toast('문제 순서를 바꿨어요.')})}
$('#sort-button').onclick=()=>{update(()=>state.questions.sort((a,b)=>a.difficulty-b.difficulty));toast('난이도가 낮은 순서로 정렬했어요.')};
$('#select-all-questions').onclick=toggleAllQuestions;
for(const[id,key]of Object.entries({'sheet-title':'title','sheet-subtitle':'subtitle','sheet-date':'date'})){const el=$('#'+id);el.addEventListener('focus',()=>remember(),{capture:true});el.oninput=()=>update(()=>state.settings[key]=el.value,{history:false})}
for(const[id,key]of Object.entries({'name-field':'nameField',divider:'divider','solution-toggle':'solution','show-stars':'stars','answer-line':'answerLine','answer-key':'answerKey'}))$('#'+id).onchange=e=>{update(()=>state.settings[key]=e.target.checked);syncSettings()};
for(const[id,key]of Object.entries({margin:'margin','column-gap':'gap','solution-space':'solutionSpace'})){const el=$('#'+id);el.addEventListener('pointerdown',remember);el.addEventListener('keydown',e=>{if(e.key.startsWith('Arrow'))remember()});el.oninput=()=>{update(()=>state.settings[key]=+el.value,{history:false});syncSettings()}}
$('#col-one').onclick=()=>update(()=>state.settings.columns=1,{sync:true});$('#col-two').onclick=()=>update(()=>state.settings.columns=2,{sync:true});$$('[data-line]').forEach(b=>b.onclick=()=>update(()=>state.settings.lineStyle=b.dataset.line,{sync:true}));
$('#selected-question-content').addEventListener('click',e=>{const items=selectedQuestions(),st=e.target.closest('[data-star]'),filter=e.target.closest('[data-bulk-filter]');if(items.length>1&&filter)return runBulkCorrection(filter.dataset.bulkFilter);if(items.length>1&&st){if(bulkCorrectionJob)return toast('사진 보정이 끝난 뒤 난이도를 바꿔 주세요.');return update(()=>items.forEach(q=>q.difficulty=+st.dataset.star))}const b=e.target.closest('button');if(items.length>1&&b){if(b.id==='bulk-correction-stop')return stopBulkCorrection();if(b.id==='bulk-handwriting')return runBulkCorrection('handwriting');if(bulkCorrectionJob)return toast('사진 보정이 끝날 때까지 잠시 기다려 주세요.');if(b.id==='bulk-reset-space')return update(()=>items.forEach(q=>q.solution=null));if(b.id==='bulk-delete')return removeSelectedQuestions();if(b.id==='clear-selection'){bulkCorrectionMessage='';clearMultiSelection();selected=null;render();return}return}const q=state.questions.find(q=>q.id===selected);if(!q)return;if(st)return update(()=>q.difficulty=+st.dataset.star);if(!b)return;if(b.id==='selected-edit')openEditor(q.id);if(b.id==='selected-delete')removeQuestion(q.id);if(b.id==='reset-question-space')update(()=>q.solution=null);if(['move-prev','move-next'].includes(b.id)){const i=state.questions.indexOf(q),j=i+(b.id==='move-prev'?-1:1);if(j>=0&&j<state.questions.length)update(()=>[state.questions[i],state.questions[j]]=[state.questions[j],state.questions[i]])}});
$('#selected-question-content').addEventListener('change',e=>{const items=selectedQuestions(),bulkKey={'bulk-scale':'scale','bulk-solution':'solution','bulk-break':'breakBefore'}[e.target.id];if(items.length>1&&bulkKey){if(bulkCorrectionJob){renderSelected();return toast('사진 보정이 끝난 뒤 배치를 바꿔 주세요.')}return update(()=>items.forEach(q=>q[bulkKey]=e.target.type==='checkbox'?e.target.checked:+e.target.value))}const q=state.questions.find(q=>q.id===selected);if(!q)return;const k={'selected-name':'title','selected-answer':'answer','question-scale':'scale','question-solution':'solution','question-break':'breakBefore'}[e.target.id];if(k)update(()=>q[k]=e.target.type==='checkbox'?e.target.checked:e.target.type==='range'?+e.target.value:e.target.value)});
$('#auto-layout').onclick=()=>{update(()=>state.questions.forEach(q=>{q.breakBefore=false;q.scale=100;q.solution=null}));$$('.paper').forEach(p=>p.classList.add('auto-highlight'));toast('사진 크기와 개별 배치를 기본값으로 정돈했어요.')};
$('#undo-button').onclick=()=>{if(!undoStack.length)return;redoStack.push(JSON.stringify(state));state=JSON.parse(undoStack.pop());render();syncSettings();saveSoon()};$('#redo-button').onclick=()=>{if(!redoStack.length)return;undoStack.push(JSON.stringify(state));state=JSON.parse(redoStack.pop());render();syncSettings();saveSoon()};
function sheetViewportAnchor(clientX,clientY){
  let nearest=null,distance=Infinity;
  $$('#paper-stack > .paper-wrapper').forEach((page,index)=>{const rect=page.getBoundingClientRect();if(!rect.width||!rect.height)return;const dx=Math.max(rect.left-clientX,0,clientX-rect.right),dy=Math.max(rect.top-clientY,0,clientY-rect.bottom),d=dx*dx+dy*dy;if(d<distance){distance=d;nearest={index,x:Math.max(0,Math.min(1,(clientX-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(clientY-rect.top)/rect.height))}}});
  return nearest;
}
function setZoom(value,focus=null){
  if(!Number.isFinite(value))return;
  const stage=$('#canvas-stage'),stageRect=stage.getBoundingClientRect(),clientX=Number.isFinite(focus?.clientX)?focus.clientX:stageRect.left+stage.clientWidth/2,clientY=Number.isFinite(focus?.clientY)?focus.clientY:stageRect.top+stage.clientHeight/2,anchor=focus?.anchor||sheetViewportAnchor(clientX,clientY);
  autoFit=false;zoom=Math.max(.25,Math.min(1.5,value));
  const wrappers=$$('#paper-stack > .paper-wrapper');
  if(wrappers.length){for(const wrapper of wrappers){wrapper.style.width=794*zoom+'px';wrapper.style.height=1123*zoom+'px';wrapper.querySelector('.paper').style.transform='scale('+zoom+')'}}else renderPreview();
  $('#zoom-value').textContent=Math.round(zoom*100)+'%';
  if(anchor&&wrappers[anchor.index]){const rect=wrappers[anchor.index].getBoundingClientRect();stage.scrollLeft=Math.max(0,stage.scrollLeft+rect.left+rect.width*anchor.x-clientX);stage.scrollTop=Math.max(0,stage.scrollTop+rect.top+rect.height*anchor.y-clientY)}
}
$('#zoom-out').onclick=()=>setZoom(zoom-.1);$('#zoom-in').onclick=()=>setZoom(zoom+.1);$('#fit-button').onclick=$('#zoom-value').onclick=()=>{autoFit=true;render()};window.addEventListener('resize',()=>{if(autoFit)render()});
const sheetViewport=$('#canvas-stage'),sheetTouches=new Map();
let sheetTouchGesture=null,sheetNativeGesture=null,sheetSuppressClick=false;
sheetViewport.style.touchAction='none';
function consumeSheetGesture(event){if(event.cancelable!==false)event.preventDefault();event.stopImmediatePropagation?.()}
function resetSheetTouch(){for(const id of sheetTouches.keys())try{sheetViewport.releasePointerCapture(id)}catch{}sheetTouches.clear();sheetTouchGesture=null;sheetNativeGesture=null;sheetSuppressClick=false}
function syncSheetTouchAvailability(){sheetViewport.style.touchAction=pages.length?'none':'pan-x pan-y';if(!pages.length)resetSheetTouch()}
function sheetPinchGeometry(){const[a,b]=[...sheetTouches.values()];return{clientX:(a.clientX+b.clientX)/2,clientY:(a.clientY+b.clientY)/2,distance:Math.max(4,Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY))}}
function beginSheetPinch(){
  const point=sheetPinchGeometry();sheetNativeGesture=null;sheetSuppressClick=true;sheetTouchGesture={kind:'pinch',zoom,distance:point.distance,anchor:sheetViewportAnchor(point.clientX,point.clientY)};
  for(const id of sheetTouches.keys())try{sheetViewport.setPointerCapture(id)}catch{}
}
sheetViewport.addEventListener('pointerdown',event=>{
  if(event.pointerType!=='touch'){resetSheetTouch();return}if(!pages.length)return;
  if(!sheetTouches.size)sheetSuppressClick=false;
  sheetTouches.set(event.pointerId,{clientX:event.clientX,clientY:event.clientY});
  if(sheetTouches.size>1){beginSheetPinch();consumeSheetGesture(event)}else sheetTouchGesture={kind:'pan',moved:false,start:{clientX:event.clientX,clientY:event.clientY},last:{clientX:event.clientX,clientY:event.clientY}};
},{capture:true,passive:false});
sheetViewport.addEventListener('pointermove',event=>{
  if(event.pointerType!=='touch'||!sheetTouches.has(event.pointerId)||!sheetTouchGesture)return;
  sheetTouches.set(event.pointerId,{clientX:event.clientX,clientY:event.clientY});const gesture=sheetTouchGesture;
  if(sheetTouches.size>1){const point=sheetPinchGeometry();setZoom(gesture.zoom*point.distance/gesture.distance,{...point,anchor:gesture.anchor});consumeSheetGesture(event)}else if(gesture.kind==='pan'){
    if(!gesture.moved&&Math.hypot(event.clientX-gesture.start.clientX,event.clientY-gesture.start.clientY)<6)return;
    gesture.moved=true;sheetSuppressClick=true;try{sheetViewport.setPointerCapture(event.pointerId)}catch{}
    sheetViewport.scrollLeft=Math.max(0,sheetViewport.scrollLeft+gesture.last.clientX-event.clientX);sheetViewport.scrollTop=Math.max(0,sheetViewport.scrollTop+gesture.last.clientY-event.clientY);gesture.last={clientX:event.clientX,clientY:event.clientY};consumeSheetGesture(event);
  }
},{capture:true,passive:false});
function endSheetTouch(event){
  if(event.pointerType!=='touch'||!sheetTouches.has(event.pointerId))return;
  const handled=sheetTouchGesture?.kind==='pinch'||sheetTouchGesture?.moved;
  sheetTouches.delete(event.pointerId);if(sheetTouches.size>1)beginSheetPinch();else if(sheetTouches.size===1){const point=[...sheetTouches.values()][0];sheetTouchGesture={kind:'pan',moved:true,start:{...point},last:{...point}}}else{sheetTouchGesture=null;sheetNativeGesture=null}
  if(handled)consumeSheetGesture(event);
}
sheetViewport.addEventListener('pointerup',endSheetTouch,{capture:true,passive:false});sheetViewport.addEventListener('pointercancel',endSheetTouch,{capture:true,passive:false});
sheetViewport.addEventListener('click',event=>{if(sheetSuppressClick)consumeSheetGesture(event)},{capture:true});
sheetViewport.addEventListener('dblclick',event=>{if(sheetSuppressClick)consumeSheetGesture(event)},{capture:true});
sheetViewport.addEventListener('dragstart',event=>{if(sheetTouches.size)consumeSheetGesture(event)},{capture:true});
sheetViewport.addEventListener('wheel',event=>{
  if(!pages.length||!event.ctrlKey||event.cancelable===false)return;event.preventDefault();if(sheetNativeGesture||sheetTouches.size>1)return;
  const unit=event.deltaMode===1?16:event.deltaMode===2?sheetViewport.clientHeight:1,delta=Math.max(-100,Math.min(100,event.deltaY*unit));setZoom(zoom*Math.exp(-delta*.01),event);
},{passive:false});
sheetViewport.addEventListener('gesturestart',event=>{
  if(!pages.length||event.cancelable===false)return;event.preventDefault();if(sheetTouches.size>1)return;
  const rect=sheetViewport.getBoundingClientRect(),clientX=Number.isFinite(event.clientX)?event.clientX:rect.left+sheetViewport.clientWidth/2,clientY=Number.isFinite(event.clientY)?event.clientY:rect.top+sheetViewport.clientHeight/2;
  sheetNativeGesture={zoom,scale:Math.max(.01,Number(event.scale)||1),clientX,clientY,anchor:sheetViewportAnchor(clientX,clientY)};
},{passive:false});
sheetViewport.addEventListener('gesturechange',event=>{
  if(!pages.length||event.cancelable===false)return;event.preventDefault();const gesture=sheetNativeGesture;if(!gesture||sheetTouches.size>1||!Number.isFinite(event.scale)||event.scale<=0)return;
  setZoom(gesture.zoom*event.scale/gesture.scale,{...gesture,clientX:Number.isFinite(event.clientX)?event.clientX:gesture.clientX,clientY:Number.isFinite(event.clientY)?event.clientY:gesture.clientY});
},{passive:false});
sheetViewport.addEventListener('gestureend',event=>{if(sheetNativeGesture&&event.cancelable!==false)event.preventDefault();sheetNativeGesture=null},{passive:false});
window.addEventListener('blur',resetSheetTouch);
$('#export-button').onclick=()=>$('#export-dialog').showModal();
function download(data,name,type){const blob=data instanceof Blob?data:new Blob([data],{type:type||'application/octet-stream'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),10000)}
$('#project-save').onclick=()=>{download(JSON.stringify({app:'munji-studio',version:1,savedAt:new Date().toISOString(),...state}),fileName()+'.munji','application/json');toast('다시 편집할 수 있는 프로젝트를 저장했어요.')};
$('#open-project').onclick=()=>$('#project-input').click();$('#project-input').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>200*1024*1024)throw Error('프로젝트 파일이 너무 커요.');const data=JSON.parse(await f.text());const next=validateProject(data);update(()=>{state=next;clearMultiSelection();selected=state.questions[0]?.id||null},{sync:true});toast('프로젝트를 불러왔어요.')}catch(err){toast(err.message||'프로젝트를 읽지 못했어요.')}e.target.value=''};
function validateProject(data){if(data.app!=='munji-studio'||!Array.isArray(data.questions)||data.questions.length>100||!data.settings)throw Error('문지에서 저장한 프로젝트 파일을 선택해 주세요.');const s={...defaults};for(const key of Object.keys(defaults))if(data.settings[key]!==undefined)s[key]=data.settings[key];for(const key of ['title','subtitle','date'])s[key]=String(s[key]).slice(0,100);s.columns=s.columns===1?1:2;s.margin=Math.max(8,Math.min(30,Number(s.margin)||16));s.gap=Math.max(4,Math.min(20,Number(s.gap)||8));s.solutionSpace=Math.max(0,Math.min(75,Number(s.solutionSpace)||0));s.lineStyle=['blank','ruled','grid'].includes(s.lineStyle)?s.lineStyle:'blank';for(const k of ['nameField','divider','solution','stars','answerLine','answerKey'])s[k]=!!s[k];const questions=data.questions.map(q=>{if(!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(q.src)||!Number.isFinite(q.width)||!Number.isFinite(q.height)||q.width<=0||q.height<=0||q.width>20000||q.height>20000)throw Error('유효하지 않은 사진이 포함돼 있어요.');return{id:uid(),title:String(q.title||'문제').slice(0,100),answer:String(q.answer||'').slice(0,300),type:q.type==='예시'?'예시':'사진',difficulty:Math.max(1,Math.min(5,Math.round(+q.difficulty)||3)),width:q.width,height:q.height,src:q.src,original:/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(q.original)?q.original:q.src,scale:Math.max(50,Math.min(100,Number(q.scale)||100)),solution:q.solution===null?null:Math.max(0,Math.min(75,Number(q.solution)||0)),breakBefore:!!q.breakBefore}});return{settings:s,questions}}
function fileName(){return(state.settings.title||'나의 문제지').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,70)}
$('#new-sheet').onclick=()=>{update(()=>{state={settings:{...defaults,title:'나의 첫 문제지',subtitle:''},questions:[]};clearMultiSelection();selected=null},{sync:true});$('#help-dialog').close();toast('새 문제지를 준비했어요. 사진을 추가해 주세요.')};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#editor-dialog').open){e.preventDefault();if(ed?.tool==='crop')cancelPerspective();else $('#editor-dialog').close()}if(e.key==='Enter'&&ed?.tool==='crop'&&!e.target.matches('button,input,textarea')){e.preventDefault();applyPerspectiveCorrection()}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!e.target.matches('input,textarea')&&!$('dialog[open]')){e.preventDefault();(e.shiftKey?$('#redo-button'):$('#undo-button')).click()}});
$$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}}));
let ed=null;const ec=$('#editor-canvas'),ex=ec.getContext('2d',{willReadFrequently:true}),photoTools=window.MunjiPhoto;
const perspectiveEdges=[[0,1],[1,2],[2,3],[3,0]];
let perspectivePreviewTimer=0,perspectivePreviewToken=0;
let editorZoom=1,editorAutoFit=true;
function syncEditorViewport(){
  if(!ed)return;
  const wrap=$('#editor-canvas-wrap'),surface=$('#editor-canvas-surface');
  if(editorAutoFit&&wrap.clientWidth>40&&wrap.clientHeight>40)editorZoom=Math.max(.05,Math.min(1,(wrap.clientWidth-40)/ec.width,(wrap.clientHeight-40)/ec.height));
  surface.style.width=Math.max(1,Math.round(ec.width*editorZoom))+'px';surface.style.height=Math.max(1,Math.round(ec.height*editorZoom))+'px';
  $('#editor-zoom-range').value=String(Math.round(editorZoom*100));$('#editor-zoom-value').textContent=Math.round(editorZoom*100)+'%';
  $('#editor-zoom-out').disabled=editorZoom<=.05;$('#editor-zoom-in').disabled=editorZoom>=2;
  $('#editor-zoom-fit').classList.toggle('active',editorAutoFit);$('#editor-zoom-fit').setAttribute('aria-pressed',String(editorAutoFit));
  if(ed.perspective)syncPerspectiveOverlay();
}
function resetEditorViewport(){resetEditorTouch();editorZoom=1;editorAutoFit=true;const wrap=$('#editor-canvas-wrap');wrap.scrollLeft=wrap.scrollTop=0}
function editorViewportAnchor(clientX,clientY){
  const rect=ec.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(clientX-rect.left)/Math.max(1,rect.width))),y:Math.max(0,Math.min(1,(clientY-rect.top)/Math.max(1,rect.height)))};
}
function setEditorZoom(value,focus=null){
  if(!ed||!Number.isFinite(value))return;
  const wrap=$('#editor-canvas-wrap'),wrapRect=wrap.getBoundingClientRect(),clientX=Number.isFinite(focus?.clientX)?focus.clientX:wrapRect.left+wrap.clientWidth/2,clientY=Number.isFinite(focus?.clientY)?focus.clientY:wrapRect.top+wrap.clientHeight/2,anchor=focus?.anchor||editorViewportAnchor(clientX,clientY);
  editorAutoFit=false;editorZoom=Math.max(.05,Math.min(2,value));syncEditorViewport();
  const rect=ec.getBoundingClientRect();wrap.scrollLeft=Math.max(0,wrap.scrollLeft+rect.left+rect.width*anchor.x-clientX);wrap.scrollTop=Math.max(0,wrap.scrollTop+rect.top+rect.height*anchor.y-clientY);
}
$('#editor-zoom-out').onclick=()=>setEditorZoom(editorZoom/1.2);
$('#editor-zoom-in').onclick=()=>setEditorZoom(editorZoom*1.2);
$('#editor-zoom-range').oninput=event=>setEditorZoom(+event.target.value/100);
$('#editor-zoom-actual').onclick=()=>setEditorZoom(1);
$('#editor-zoom-fit').onclick=()=>{editorAutoFit=true;syncEditorViewport();$('#editor-canvas-wrap').scrollLeft=$('#editor-canvas-wrap').scrollTop=0};
const editorViewport=$('#editor-canvas-wrap'),editorTouches=new Map();
let editorTouchGesture=null,editorNativeGesture=null;
editorViewport.style.touchAction='none';
function consumeEditorGesture(event){if(event.cancelable!==false)event.preventDefault();event.stopImmediatePropagation?.()}
function resetEditorTouch(){
  for(const id of editorTouches.keys())try{editorViewport.releasePointerCapture(id)}catch{}
  editorTouches.clear();editorTouchGesture=null;editorNativeGesture=null;
}
function cancelEditorTouchEdit(){
  const gesture=editorTouchGesture;if(gesture?.kind!=='edit'||gesture.session!==ed)return;
  ec.onpointercancel?.();drawEditorPixels(gesture.before);ed.history=gesture.history;ed.drag=false;ed.base=null;ed.brushBase=null;
  if(gesture.text&&ed.textDraft){Object.assign(ed.textDraft,gesture.text);redrawTextDraft()}
  if(gesture.points&&ed.perspective){ed.perspective.points=gesture.points;ed.perspective.drag=null;syncPerspectiveOverlay();schedulePerspectivePreview(true)}
  syncEditorUndo();
}
function editorPinchGeometry(){
  const [a,b]=[...editorTouches.values()];return{clientX:(a.clientX+b.clientX)/2,clientY:(a.clientY+b.clientY)/2,distance:Math.max(4,Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY))};
}
function beginEditorPinch(){
  cancelEditorTouchEdit();editorNativeGesture=null;const point=editorPinchGeometry();
  editorTouchGesture={kind:'pinch',session:ed,zoom:editorZoom,distance:point.distance,anchor:editorViewportAnchor(point.clientX,point.clientY)};
  for(const id of editorTouches.keys())try{editorViewport.setPointerCapture(id)}catch{}
}
editorViewport.addEventListener('pointerdown',event=>{
  if(!ed||event.pointerType!=='touch')return;
  editorTouches.set(event.pointerId,{clientX:event.clientX,clientY:event.clientY});
  if(editorTouches.size>1){beginEditorPinch();consumeEditorGesture(event);return}
  const handle=event.target?.closest?.('.perspective-handle');
  if(!handle&&(!ed.tool||ed.tool==='crop'||ed.remoteJob)){
    editorTouchGesture={kind:'pan',session:ed,last:{clientX:event.clientX,clientY:event.clientY}};
    try{editorViewport.setPointerCapture(event.pointerId)}catch{}consumeEditorGesture(event);
  }else{
    editorTouchGesture={kind:'edit',session:ed,before:ex.getImageData(0,0,ec.width,ec.height),history:ed.history.slice(),text:ed.textDraft?{x:ed.textDraft.x,y:ed.textDraft.y}:null,points:ed.perspective?.points.map(point=>({...point}))};
  }
},{capture:true,passive:false});
editorViewport.addEventListener('pointermove',event=>{
  if(event.pointerType!=='touch'||!editorTouches.has(event.pointerId))return;
  editorTouches.set(event.pointerId,{clientX:event.clientX,clientY:event.clientY});
  const gesture=editorTouchGesture;if(!gesture||gesture.session!==ed){resetEditorTouch();return}
  if(editorTouches.size>1){
    const point=editorPinchGeometry();setEditorZoom(gesture.zoom*point.distance/gesture.distance,{...point,anchor:gesture.anchor});consumeEditorGesture(event);
  }else if(gesture.kind==='pan'){
    editorViewport.scrollLeft=Math.max(0,editorViewport.scrollLeft+gesture.last.clientX-event.clientX);editorViewport.scrollTop=Math.max(0,editorViewport.scrollTop+gesture.last.clientY-event.clientY);
    gesture.last={clientX:event.clientX,clientY:event.clientY};consumeEditorGesture(event);
  }
},{capture:true,passive:false});
function endEditorTouch(event){
  if(event.pointerType!=='touch'||!editorTouches.has(event.pointerId))return;
  const handled=editorTouchGesture?.kind!=='edit'||event.type==='pointercancel';
  if(event.type==='pointercancel')cancelEditorTouchEdit();editorTouches.delete(event.pointerId);
  if(editorTouches.size>=2)beginEditorPinch();else if(editorTouches.size===1)editorTouchGesture={kind:'pan',session:ed,last:{...[...editorTouches.values()][0]}};else resetEditorTouch();
  if(handled)consumeEditorGesture(event);
}
editorViewport.addEventListener('pointerup',endEditorTouch,{capture:true,passive:false});
editorViewport.addEventListener('pointercancel',endEditorTouch,{capture:true,passive:false});
editorViewport.addEventListener('wheel',event=>{
  if(!ed||!event.ctrlKey||event.cancelable===false)return;
  event.preventDefault();if(editorNativeGesture||editorTouches.size>1)return;
  const unit=event.deltaMode===1?16:event.deltaMode===2?editorViewport.clientHeight:1,delta=Math.max(-100,Math.min(100,event.deltaY*unit));
  setEditorZoom(editorZoom*Math.exp(-delta*.01),event);
},{passive:false});
editorViewport.addEventListener('gesturestart',event=>{
  if(!ed||event.cancelable===false)return;event.preventDefault();if(editorTouches.size>1)return;
  const rect=editorViewport.getBoundingClientRect(),clientX=Number.isFinite(event.clientX)?event.clientX:rect.left+editorViewport.clientWidth/2,clientY=Number.isFinite(event.clientY)?event.clientY:rect.top+editorViewport.clientHeight/2;
  editorNativeGesture={session:ed,zoom:editorZoom,scale:Math.max(.01,Number(event.scale)||1),clientX,clientY,anchor:editorViewportAnchor(clientX,clientY)};
},{passive:false});
editorViewport.addEventListener('gesturechange',event=>{
  if(!ed||event.cancelable===false)return;event.preventDefault();const gesture=editorNativeGesture;
  if(!gesture||gesture.session!==ed||editorTouches.size>1||!Number.isFinite(event.scale)||event.scale<=0)return;
  setEditorZoom(gesture.zoom*event.scale/gesture.scale,{...gesture,clientX:Number.isFinite(event.clientX)?event.clientX:gesture.clientX,clientY:Number.isFinite(event.clientY)?event.clientY:gesture.clientY});
},{passive:false});
editorViewport.addEventListener('gestureend',event=>{if(editorNativeGesture&&event.cancelable!==false)event.preventDefault();editorNativeGesture=null},{passive:false});
$('#editor-dialog').addEventListener('close',resetEditorTouch);
function ensurePerspectivePreview(){
  let panel=$('#perspective-live-preview');if(panel)return panel;
  panel=document.createElement('aside');panel.id='perspective-live-preview';panel.className='perspective-live-preview';panel.hidden=true;panel.setAttribute('aria-label','실시간 원근 보정 미리보기');
  panel.innerHTML='<div class="perspective-preview-heading"><span>LIVE DESKEW</span><b>실시간 정면 보정</b><small id="perspective-preview-size">—</small></div><div class="perspective-preview-canvas"><canvas id="perspective-preview-canvas"></canvas></div>';
  $('#editor-preview-row').append(panel);return panel;
}
function perspectiveMid(a,b){return{x:(a.x+b.x)/2,y:(a.y+b.y)/2}}
function perspectiveDistance(a,b){return Math.hypot(b.x-a.x,b.y-a.y)}
function perspectiveArea(points){return points.reduce((sum,p,i)=>sum+p.x*points[(i+1)%4].y-p.y*points[(i+1)%4].x,0)/2}
function validPerspectivePoints(points){
  if(points.length!==4||Math.abs(perspectiveArea(points))<64)return false;
  if(points.some((p,i)=>perspectiveDistance(p,points[(i+1)%4])<8))return false;
  const turns=points.map((p,i)=>{const b=points[(i+1)%4],c=points[(i+2)%4];return(b.x-p.x)*(c.y-b.y)-(b.y-p.y)*(c.x-b.x)});
  return turns.every(v=>v>0)||turns.every(v=>v<0);
}
function perspectiveGridPath(points){
  const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}),line=(a,b)=>`M${a.x} ${a.y}L${b.x} ${b.y}`;
  return[1/3,2/3].flatMap(t=>[line(lerp(points[0],points[3],t),lerp(points[1],points[2],t)),line(lerp(points[0],points[1],t),lerp(points[3],points[2],t))]).join('');
}
function syncPerspectiveOverlay(){
  const p=ed?.perspective,overlay=$('#perspective-overlay'),panel=ensurePerspectivePreview();if(!p){overlay.hidden=true;panel.hidden=true;return}
  const surface=$('#editor-canvas-surface'),canvasRect=ec.getBoundingClientRect(),surfaceRect=surface.getBoundingClientRect();
  if(!canvasRect.width||!canvasRect.height)return;
  overlay.hidden=false;panel.hidden=false;
  Object.assign(overlay.style,{left:(canvasRect.left-surfaceRect.left)+'px',top:(canvasRect.top-surfaceRect.top)+'px',width:canvasRect.width+'px',height:canvasRect.height+'px'});
  const svg=overlay.querySelector('svg');svg.setAttribute('viewBox',`0 0 ${ec.width} ${ec.height}`);
  const q=p.points,outline=`M${q[0].x} ${q[0].y}L${q[1].x} ${q[1].y}L${q[2].x} ${q[2].y}L${q[3].x} ${q[3].y}Z`;
  $('#perspective-outline').setAttribute('d',outline);$('#perspective-grid').setAttribute('d',perspectiveGridPath(q));
  $('#perspective-mask').setAttribute('d',`M0 0H${ec.width}V${ec.height}H0Z${outline}`);
  const handles=[...q,perspectiveMid(q[0],q[1]),perspectiveMid(q[1],q[2]),perspectiveMid(q[2],q[3]),perspectiveMid(q[3],q[0])];
  handles.forEach((point,i)=>{const handle=$('#perspective-handle-'+i);handle.style.left=(point.x/ec.width*canvasRect.width)+'px';handle.style.top=(point.y/ec.height*canvasRect.height)+'px';handle.setAttribute('aria-valuetext',`${Math.round(point.x)}, ${Math.round(point.y)}`)});
  const metrics=photoTools.perspectiveMetrics(q);$('#perspective-status').textContent=`${metrics.width} × ${metrics.height}px · 입력 ${metrics.angle.toFixed(1)}° → 결과 0° · 수평/수직 보정`;
}
function schedulePerspectivePreview(precise=false){
  const session=ed,p=session?.perspective;if(!p)return;
  const token=++perspectivePreviewToken;clearTimeout(perspectivePreviewTimer);
  perspectivePreviewTimer=setTimeout(()=>requestAnimationFrame(()=>{
    if(token!==perspectivePreviewToken||ed!==session||session.perspective!==p)return;
    try{
      const corrected=photoTools.correctPerspective(p.base,p.points,{maxDimension:precise?560:320}),canvas=$('#perspective-preview-canvas'),cx=canvas.getContext('2d');canvas.width=corrected.width;canvas.height=corrected.height;cx.putImageData(new ImageData(corrected.data,corrected.width,corrected.height),0,0);$('#perspective-preview-size').textContent=`${corrected.metrics.width} × ${corrected.metrics.height}px`;
    }catch(error){console.error('실시간 원근 보정 미리보기 실패',error)}
  }),precise?0:35);
}
function beginPerspective(){
  if(!ed||ed.perspective)return;
  const insetX=Math.max(2,ec.width*.045),insetY=Math.max(2,ec.height*.045);
  ed.perspective={base:ex.getImageData(0,0,ec.width,ec.height),beforeURL:ec.toDataURL(),points:[{x:insetX,y:insetY},{x:ec.width-insetX,y:insetY},{x:ec.width-insetX,y:ec.height-insetY},{x:insetX,y:ec.height-insetY}],drag:null,applying:false};
  $('.editor-workspace').classList.add('perspective-mode');$('#perspective-status').hidden=false;$('#perspective-actions').hidden=false;$('#perspective-apply').disabled=$('#perspective-cancel').disabled=false;ensurePerspectivePreview().hidden=false;
  requestAnimationFrame(()=>{syncEditorViewport();schedulePerspectivePreview(true)});
}
function finishPerspectiveMode(){
  $('.editor-workspace').classList.remove('perspective-mode');$('#perspective-overlay').hidden=true;ensurePerspectivePreview().hidden=true;$('#perspective-status').hidden=true;$('#perspective-actions').hidden=true;
  if(ed){ed.perspective=null;ed.tool=null}syncEditorTools();syncEditorViewport();
}
function cancelPerspective(options={}){
  const p=ed?.perspective;if(!p)return;
  if(p.base&&ec.width===p.base.width&&ec.height===p.base.height)ex.putImageData(p.base,0,0);
  finishPerspectiveMode();if(!options.silent)toast('자르기·기울기 보정을 취소했어요.');
}
function applyPerspectiveCorrection(){
  const session=ed,p=session?.perspective;if(!p||p.applying)return;
  p.applying=true;$('#perspective-apply').disabled=$('#perspective-cancel').disabled=true;$('#perspective-status').textContent='원본 해상도로 정밀 보정 중…';
  requestAnimationFrame(()=>setTimeout(()=>{
    try{
      if(ed!==session||session.perspective!==p)return;
      const corrected=photoTools.correctPerspective(p.base,p.points,{maxDimension:4096});ec.width=corrected.width;ec.height=corrected.height;ex.putImageData(new ImageData(corrected.data,corrected.width,corrected.height),0,0);pushEditorHistory(p.beforeURL);finishPerspectiveMode();resetCleanupGeometry();toast('자르기·기울기 보정을 완료했어요.');
    }catch(error){console.error('원근 보정 실패',error);p.applying=false;$('#perspective-apply').disabled=$('#perspective-cancel').disabled=false;syncPerspectiveOverlay();toast(error.message||'원근 보정을 적용하지 못했어요.')}
  },25));
}
function movePerspectiveHandle(index,dx,dy){
  const p=ed?.perspective;if(!p||p.applying)return;
  const next=p.points.map(point=>({...point})),indices=index<4?[index]:perspectiveEdges[index-4];
  for(const i of indices){next[i].x=Math.max(0,Math.min(ec.width,next[i].x+dx));next[i].y=Math.max(0,Math.min(ec.height,next[i].y+dy))}
  if(validPerspectivePoints(next)){p.points=next;syncPerspectiveOverlay();schedulePerspectivePreview()}
}
for(let i=0;i<8;i++){
  const handle=$('#perspective-handle-'+i);if(!handle)continue;
  handle.addEventListener('pointerdown',event=>{const p=ed?.perspective;if(!p||p.applying)return;event.preventDefault();event.stopPropagation();handle.setPointerCapture(event.pointerId);p.drag={index:i,startX:event.clientX,startY:event.clientY,points:p.points.map(point=>({...point}))};handle.focus()});
  handle.addEventListener('pointermove',event=>{const p=ed?.perspective,drag=p?.drag;if(!drag||drag.index!==i||!handle.hasPointerCapture(event.pointerId))return;event.preventDefault();const rect=ec.getBoundingClientRect(),mx=(event.clientX-drag.startX)*ec.width/rect.width,my=(event.clientY-drag.startY)*ec.height/rect.height,next=drag.points.map(point=>({...point}));if(i<4){next[i].x=Math.max(0,Math.min(ec.width,next[i].x+mx));next[i].y=Math.max(0,Math.min(ec.height,next[i].y+my))}else{const[a,b]=perspectiveEdges[i-4],pa=drag.points[a],pb=drag.points[b],length=Math.hypot(pb.x-pa.x,pb.y-pa.y)||1,nx=-(pb.y-pa.y)/length,ny=(pb.x-pa.x)/length,amount=mx*nx+my*ny;for(const pointIndex of[a,b]){next[pointIndex].x=Math.max(0,Math.min(ec.width,drag.points[pointIndex].x+nx*amount));next[pointIndex].y=Math.max(0,Math.min(ec.height,drag.points[pointIndex].y+ny*amount))}}if(validPerspectivePoints(next)){p.points=next;syncPerspectiveOverlay();schedulePerspectivePreview()}});
  const end=event=>{const p=ed?.perspective;if(!p?.drag||p.drag.index!==i)return;p.drag=null;try{handle.releasePointerCapture(event.pointerId)}catch{}schedulePerspectivePreview(true)};handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
  handle.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const step=event.shiftKey?5:1;movePerspectiveHandle(i,event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0,event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0)});
}
$('#perspective-cancel').onclick=()=>cancelPerspective();$('#perspective-apply').onclick=applyPerspectiveCorrection;
new ResizeObserver(()=>{if(ed)requestAnimationFrame(syncEditorViewport)}).observe($('#editor-canvas-wrap'));
function setEditorCanvas(im){ec.width=im.naturalWidth||im.width;ec.height=im.naturalHeight||im.height;ex.fillStyle='#fff';ex.fillRect(0,0,ec.width,ec.height);ex.drawImage(im,0,0);syncEditorViewport()}
function pushEditorHistory(src){ed.history.push(src);if(ed.history.length>15)ed.history.shift();syncEditorUndo()}
function syncEditorUndo(){if(ed)$('#editor-undo').disabled=!!ed.remoteJob||(!ed.history.length&&!ed.textDraft)}
function clearEditorGuide(){if(ed?.guide){ex.putImageData(ed.guide,0,0);ed.guide=null}}
function showCleanupGuide(){clearEditorGuide();if(!ed?.cleanup.rect||ed.cleanup.scope!=='area'||ed.cleanupComparison||ed.textDraft)return;ed.guide=ex.getImageData(0,0,ec.width,ec.height);const r=ed.cleanup.rect;ex.save();ex.strokeStyle='#6a8e50';ex.lineWidth=Math.max(1,ec.width/ec.getBoundingClientRect().width);ex.setLineDash([6*ex.lineWidth,4*ex.lineWidth]);ex.strokeRect(r.x,r.y,r.w,r.h);ex.restore()}
function syncCleanupUI(){
  if(!ed)return;
  const c=ed.cleanup,p=ed.cleanupComparison,busy=!!ed.remoteJob;
  $$('[data-clean-scope]').forEach(b=>{b.classList.toggle('active',b.dataset.cleanScope===c.scope);b.disabled=busy});
  $$('[data-clean-view]').forEach(b=>{const active=b.dataset.cleanView===(p?.view||'result');b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));b.disabled=busy});
  $('#cleanup-run').disabled=busy||(c.scope==='area'&&!c.rect);
  $('#cleanup-run').textContent=busy&&ed.remoteJob.kind!=='straighten'?'필기 제거 중…':'필기 제거';
  $('#cleanup-stop').hidden=!busy||ed.remoteJob.kind==='straighten';
  $('#cleanup-comparison').hidden=!p;
  $('#cleanup-select').hidden=c.scope!=='area';
  $('#cleanup-select').disabled=busy;
  $('#cleanup-select').innerHTML=icon('crop')+(c.rect?'지울 영역 다시 지정':'지울 영역 지정하기');
  $('#cleanup-protect-select').disabled=$('#cleanup-protect-clear').disabled=busy;
  $('#cleanup-protection-count').textContent='추가 보호 영역 '+(c.protectionRects?.length||0)+'개';
  $('#cleanup-status').textContent=busy?(ed.remoteJob.kind==='straighten'?'비율 자동 조정 중…':'필기를 제거하고 있어요.'):ed.cleanupMessage||'';
  $('#cleanup-status').classList.toggle('is-error',!!ed.cleanupError);
  $('#editor-apply').disabled=busy;
  ec.setAttribute('aria-busy',String(busy));
  syncEditorUndo();
  syncStraightenUI();
}
function resetCleanupGeometry(){clearEditorGuide();ed.cleanup.rect=null;ed.cleanup.protectionRects=[];ed.cleanupComparison=null;ed.cleanupMessage='';ed.cleanupError=false;ed.straightenComparison=null;ed.straightenMessage='';ed.straightenError=false;syncCleanupUI()}
function textDraftOptions(){return{text:$('#photo-text').value,size:+$('#photo-text-size').value,color:$('#photo-text-color').value,bold:$('#photo-text-bold').checked,background:$('#photo-text-background').checked}}
function redrawTextDraft(){const d=ed?.textDraft;if(!d)return;Object.assign(d,textDraftOptions());ex.putImageData(d.base,0,0);const layout=photoTools.layoutText(ex,d,{width:ec.width,height:ec.height});d.x=layout.x;d.y=layout.y;d.layout=layout;photoTools.drawText(ex,d,layout);if(d.text.trim()){ex.save();ex.strokeStyle=layout.fits?'#6f9651':'#ba745c';ex.lineWidth=Math.max(1,ec.width/ec.getBoundingClientRect().width);ex.setLineDash([5*ex.lineWidth,4*ex.lineWidth]);ex.strokeRect(layout.x,layout.y,layout.width,layout.height);ex.restore()}$('#photo-text-size-value').textContent=d.size+' px';$('#text-commit').disabled=!layout.fits;$('#text-draft-status').textContent=d.text.trim()&&!layout.fits?'텍스트가 사진보다 커요. 글자 크기나 내용을 줄여 주세요.':'';$('#text-draft-status').classList.toggle('is-error',!!d.text.trim()&&!layout.fits);syncEditorUndo()}
function discardTextDraft(){if(ed?.textDraft){ex.putImageData(ed.textDraft.base,0,0);ed.textDraft=null}syncEditorUndo()}
function commitTextDraft(){const d=ed?.textDraft;if(!d)return true;if(!d.text.trim()){discardTextDraft();return true}redrawTextDraft();if(!d.layout.fits){toast('글자 크기나 내용을 줄여 사진 안에 맞춰 주세요.');return false}ex.putImageData(d.base,0,0);photoTools.drawText(ex,d,d.layout);ed.textDraft=null;pushEditorHistory(d.before);return true}
function showCleanupComparison(view){
  const p=ed?.cleanupComparison;if(!p||ed.remoteJob)return;
  clearEditorGuide();p.view=view==='before'?'before':'result';
  ex.putImageData(p.view==='before'?p.before:p.after,0,0);syncCleanupUI();
}
function restoreCleanupResult(){
  const p=ed?.cleanupComparison;if(!p)return;
  ex.putImageData(p.after,0,0);p.view='result';
}
function finishPendingEdits(){
  if(!ed||ed.remoteJob)return false;
  if(ed.perspective)cancelPerspective({silent:true});
  if(!commitTextDraft())return false;
  clearEditorGuide();restoreCleanupResult();restoreStraightenResult();return true;
}
function drawEditorPixels(image){ec.width=image.width;ec.height=image.height;ex.putImageData(image,0,0);syncEditorViewport()}
function syncStraightenUI(){
  if(!ed)return;
  const busy=!!ed.remoteJob,working=ed.remoteJob?.kind==='straighten',comparison=ed.straightenComparison;
  $('#auto-straighten').disabled=busy;
  $('#auto-straighten').innerHTML=icon('sparkles')+(working?'비율 자동 조정 중…':'비율 자동 조정');
  $('#auto-straighten-stop').hidden=!working;
  $('#auto-straighten-comparison').hidden=!comparison;
  $('#auto-straighten-manual').hidden=!comparison;
  $('#auto-straighten-manual').disabled=busy;
  $('#auto-straighten-status').textContent=working?'사진의 문서 영역과 기울기를 분석하고 있어요…':ed.straightenMessage||'';
  $('#auto-straighten-status').classList.toggle('is-error',!!ed.straightenError);
  $$('[data-straighten-view]').forEach(button=>{button.disabled=busy;const active=button.dataset.straightenView===(comparison?.view||'result');button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))});
}
function restoreStraightenResult(){const comparison=ed?.straightenComparison;if(comparison){drawEditorPixels(comparison.after);comparison.view='result';syncStraightenUI()}}
function showStraightenComparison(view){
  const comparison=ed?.straightenComparison;if(!comparison||ed.remoteJob)return;
  if(ed.perspective)cancelPerspective({silent:true});
  comparison.view=view==='before'?'before':'result';drawEditorPixels(comparison.view==='before'?comparison.before:comparison.after);syncStraightenUI();
}
async function requestStraightenedImage(image,signal){
  const response=await fetch('/api/photo-correction/straighten',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image}),signal});
  let payload;try{payload=await response.json()}catch{throw Error('비율 자동 조정 서버 응답을 읽지 못했어요.')}
  if(!response.ok)throw Error(payload.message||'비율 자동 조정을 완료하지 못했어요.');
  if(typeof payload.image!=='string'||!/^data:image\/(?:png|jpeg);base64,/.test(payload.image))throw Error('유효한 보정 사진을 받지 못했어요.');
  const result=await loadImage(payload.image),width=result.naturalWidth||result.width,height=result.naturalHeight||result.height;
  if(width<16||height<16||width*height>40e6)throw Error('보정 사진의 크기를 확인하지 못했어요.');
  const scale=Math.min(1,2400/Math.max(width,height)),output=document.createElement('canvas');output.width=Math.max(1,Math.round(width*scale));output.height=Math.max(1,Math.round(height*scale));
  const context=output.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,output.width,output.height);context.drawImage(result,0,0,output.width,output.height);return output;
}
async function startAutoStraighten(){
  if(!ed||ed.remoteJob||!finishPendingEdits())return;
  if(typeof location!=='undefined'&&location.protocol==='file:'){ed.straightenError=true;ed.straightenMessage='Start-Munji.cmd로 실행하거나 온라인 문지에서 비율 자동 조정을 사용해 주세요.';syncStraightenUI();return}
  const session=ed,before=ex.getImageData(0,0,ec.width,ec.height),beforeURL=ec.toDataURL();
  let image=beforeURL;if(image.length>14e6)image=ec.toDataURL('image/jpeg',.98);
  if(image.length>14e6){session.straightenError=true;session.straightenMessage='사진 용량이 너무 커요. 사진 크기를 줄여 다시 시도해 주세요.';syncStraightenUI();return}
  session.tool=null;session.straightenError=false;session.straightenMessage='';
  const job={kind:'straighten',controller:new AbortController(),timedOut:false};session.remoteJob=job;
  const timer=setTimeout(()=>{job.timedOut=true;job.controller.abort()},125000);syncEditorTools();syncCleanupUI();
  try{
    const output=await requestStraightenedImage(image,job.controller.signal);
    if(ed!==session||session.remoteJob!==job||job.controller.signal.aborted)return;
    const after=output.getContext('2d').getImageData(0,0,output.width,output.height);
    drawEditorPixels(after);resetCleanupGeometry();session.straightenComparison={before,after,view:'result'};pushEditorHistory(beforeURL);
    session.straightenMessage='비율 자동 조정을 완료했어요.';toast('비율 자동 조정 결과를 반영했어요.');
  }catch(error){
    if(ed===session&&session.remoteJob===job){session.straightenError=!job.controller.signal.aborted||job.timedOut;session.straightenMessage=job.controller.signal.aborted?(job.timedOut?'비율 자동 조정 시간이 초과됐어요. 현재 사진은 유지됩니다.':'비율 자동 조정을 중단했어요. 현재 사진은 유지됩니다.'):(error.message||'비율 자동 조정에 실패했어요.')+' 현재 사진은 유지됩니다.';}
  }finally{clearTimeout(timer);if(ed===session&&session.remoteJob===job){session.remoteJob=null;syncCleanupUI();syncEditorTools()}}
}
$('#auto-straighten').onclick=startAutoStraighten;
$('#auto-straighten-stop').onclick=()=>ed?.remoteJob?.controller.abort();
$('#auto-straighten-manual').onclick=()=>setEditorTool('crop');
$$('[data-straighten-view]').forEach(button=>button.onclick=()=>showStraightenComparison(button.dataset.straightenView));
function cancelHandwritingRemoval(){ed?.remoteJob?.controller.abort()}
async function startHandwritingRemoval(){
  if(!ed||ed.remoteJob||ed.cleanup.scope==='area'&&!ed.cleanup.rect)return;
  if(!finishPendingEdits())return;
  ed.straightenComparison=null;ed.straightenMessage='';syncStraightenUI();
  if(typeof location!=='undefined'&&location.protocol==='file:'){
    ed.cleanupError=true;ed.cleanupMessage='Start-Munji.cmd로 문지를 실행한 뒤 필기를 제거해 주세요.';syncCleanupUI();return;
  }
  const session=ed,base=ex.getImageData(0,0,ec.width,ec.height),beforeURL=ec.toDataURL();
  const r=session.cleanup.scope==='area'?session.cleanup.rect:{x:0,y:0,w:ec.width,h:ec.height};
  const x=Math.max(0,Math.min(ec.width-1,Math.round(r.x))),y=Math.max(0,Math.min(ec.height-1,Math.round(r.y)));
  const w=Math.max(1,Math.min(ec.width-x,Math.round(r.w))),h=Math.max(1,Math.min(ec.height-y,Math.round(r.h)));
  const upload=document.createElement('canvas');upload.width=w;upload.height=h;
  upload.getContext('2d').putImageData(base,-x,-y);
  let image=upload.toDataURL('image/png');
  if(image.length>14e6)image=upload.toDataURL('image/jpeg',.98);
  if(image.length>14e6){session.cleanupError=true;session.cleanupMessage='사진 용량이 커요. 지울 영역을 작게 지정해 주세요.';syncCleanupUI();return}
  session.tool=null;session.cleanupMessage='';session.cleanupError=false;
  const job={controller:new AbortController(),timedOut:false};session.remoteJob=job;
  const timer=setTimeout(()=>{job.timedOut=true;job.controller.abort()},125000);
  syncEditorTools();syncCleanupUI();
  try{
    const response=await fetch('/api/handwriting-removal/erase',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image}),signal:job.controller.signal});
    let payload;try{payload=await response.json()}catch{throw Error('필기 제거 서버 응답을 읽지 못했어요. Start-Munji.cmd를 다시 실행해 주세요.')}
    if(!response.ok)throw Error(payload.message||'필기를 제거하지 못했어요. 원본은 유지됩니다.');
    if(typeof payload.image!=='string'||!/^data:image\/(?:png|jpeg);base64,/.test(payload.image))throw Error('유효한 필기 제거 결과를 받지 못했어요.');
    const result=await loadImage(payload.image),rw=result.naturalWidth||result.width,rh=result.naturalHeight||result.height;
    if(!rw||!rh||Math.abs((rw/rh)/(w/h)-1)>.02)throw Error('결과 사진의 비율이 달라 원본을 유지했어요.');
    if(ed!==session||session.remoteJob!==job||job.controller.signal.aborted)return;
    const output=document.createElement('canvas');output.width=base.width;output.height=base.height;
    const ox=output.getContext('2d');ox.putImageData(base,0,0);ox.drawImage(result,x,y,w,h);
    const after=ox.getImageData(0,0,output.width,output.height);
    for(const p of session.cleanup.protectionRects||[]){
      const left=Math.max(0,Math.floor(p.x)),top=Math.max(0,Math.floor(p.y)),right=Math.min(base.width,Math.ceil(p.x+p.w)),bottom=Math.min(base.height,Math.ceil(p.y+p.h));
      for(let yy=top;yy<bottom;yy++){const a=(yy*base.width+left)*4,b=(yy*base.width+right)*4;after.data.set(base.data.subarray(a,b),a)}
    }
    session.cleanupComparison={before:base,after,view:'result'};
    ex.putImageData(after,0,0);pushEditorHistory(beforeURL);
    session.cleanupMessage='필기를 제거했어요.';
    toast('필기 제거 결과를 반영했어요.');
  }catch(error){
    if(ed===session&&session.remoteJob===job){
      session.cleanupError=!job.controller.signal.aborted||job.timedOut;
      session.cleanupMessage=job.controller.signal.aborted?(job.timedOut?'필기 제거 시간이 초과됐어요. 원본은 유지됩니다.':'필기 제거를 취소했어요. 원본은 유지됩니다.'):(error.message||'필기를 제거하지 못했어요. 원본은 유지됩니다.');
    }
  }finally{
    clearTimeout(timer);
    if(ed===session&&session.remoteJob===job){session.remoteJob=null;syncCleanupUI();syncEditorTools()}
  }
}
function editorRemember(){if(!finishPendingEdits())return false;ed.cleanupComparison=null;ed.straightenComparison=null;ed.straightenMessage='';syncCleanupUI();pushEditorHistory(ec.toDataURL());return true}
function syncEditorTools(){
  if(!ed)return;
  for(const[id,tool]of[['crop-tool','crop'],['eraser-tool','erase'],['text-tool','text'],['cleanup-select','clean-select'],['cleanup-protect-select','protect-select']]){const button=$('#'+id);button.classList.toggle('auto-button',ed.tool===tool);button.disabled=!!ed.remoteJob}
  for(const id of ['rotate-tool','reset-photo','apply-adjust'])$('#'+id).disabled=!!ed.remoteJob;
  $$('[data-filter]').forEach(button=>button.disabled=!!ed.remoteJob);
  $('#brush-control').hidden=ed.tool!=='erase';$('#eraser-options').hidden=ed.tool!=='erase';$('#text-options').hidden=ed.tool!=='text';$('#brush-cursor').hidden=true;
  ec.style.cursor=ed.tool==='erase'?'none':['clean-select','protect-select'].includes(ed.tool)?'crosshair':ed.tool==='text'?'move':'default';
  ec.style.touchAction=['erase','text','clean-select','protect-select'].includes(ed.tool)?'none':'pan-x pan-y';
  $('#editor-hint-text').textContent='';
  $('#editor-hint').hidden=ed.tool!=='crop';
  $('#perspective-status').hidden=ed.tool!=='crop';$('#perspective-actions').hidden=ed.tool!=='crop';syncEditorUndo();syncStraightenUI();
}
function setEditorTool(tool){if(!ed||ed.remoteJob)return;const next=ed.tool===tool?null:tool;if(ed.perspective){cancelPerspective({silent:true});if(next===null)return}if(!finishPendingEdits())return;ed.cleanupComparison=null;ed.straightenComparison=null;ed.straightenMessage='';syncCleanupUI();ed.tool=next;if(next==='text'){$('#photo-text').value='';ed.textDraft={base:ex.getImageData(0,0,ec.width,ec.height),before:ec.toDataURL(),x:ec.width*.1,y:ec.height*.1,...textDraftOptions()};redrawTextDraft()}if(next==='crop')beginPerspective();syncEditorTools();if(next==='text'){$('#text-options').scrollIntoView?.({block:'nearest'});$('#photo-text').focus?.()}}
async function openEditor(id){if(bulkCorrectionJob)return toast('일괄 보정을 마친 뒤 사진을 편집해 주세요.');cancelHandwritingRemoval();const q=state.questions.find(q=>q.id===id);if(!q)return;let image;try{image=await loadImage(q.src)}catch(error){console.error('문제 사진 읽기 실패',error);toast('문제 사진을 읽지 못했어요. 사진을 다시 추가해 주세요.');return}try{ed={id,history:[],tool:null,rating:q.difficulty,drag:false,textDraft:null,cleanupComparison:null,remoteJob:null,cleanupMessage:'',cleanupError:false,guide:null,cleanup:{scope:'all',rect:null,protectionRects:[]}};resetEditorViewport();setEditorCanvas(image);$('#editor-name').value=q.title;$('#editor-answer').value=q.answer;$('#brightness').value=$('#contrast').value=0;$('#brightness-value').textContent=$('#contrast-value').textContent='0';$('#eraser-mode').value='pencil';$('#brush-size').value=24;$('#photo-text').value='';$('#photo-text-size').value=Math.max(8,Math.min(48,Math.round(ec.width/20),Math.floor((ec.height-12)/1.4)));$('#photo-text-color').value='#242924';$('#photo-text-bold').checked=false;$('#photo-text-background').checked=false;['brightness','contrast','brush-size','photo-text-size'].forEach(id=>paintRange($('#'+id)));$('#editor-stars').innerHTML=starsHTML(ed.rating);$$('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter==='original'));syncEditorTools();syncCleanupUI();const dialog=$('#editor-dialog');if(!dialog.open)dialog.showModal();requestAnimationFrame(syncEditorViewport)}catch(error){console.error('사진 보정창 초기화 실패',error);toast('사진 보정창을 열지 못했어요. 새로고침 후 다시 시도해 주세요.')}}
$('#editor-close').onclick=()=>{cancelPerspective({silent:true});cancelHandwritingRemoval();$('#editor-dialog').close()};$('#editor-dialog').addEventListener('close',()=>{cancelPerspective({silent:true});cancelHandwritingRemoval()});$('#editor-dialog').addEventListener('cancel',()=>{cancelPerspective({silent:true});cancelHandwritingRemoval()});$('#crop-tool').onclick=()=>setEditorTool('crop');$('#eraser-tool').onclick=()=>setEditorTool('erase');$('#text-tool').onclick=()=>setEditorTool('text');$('#cleanup-select').onclick=()=>setEditorTool('clean-select');
$('#editor-undo').onclick=async()=>{
  if(!ed||ed.remoteJob)return;
  if(ed.textDraft){discardTextDraft();ed.tool=null;syncEditorTools();return}
  clearEditorGuide();ed.cleanupComparison=null;
  if(!ed.history.length)return;
  setEditorCanvas(await loadImage(ed.history.pop()));resetCleanupGeometry();ed.tool=null;syncEditorTools();
};
$('#reset-photo').onclick=async()=>{if(!editorRemember())return;const q=state.questions.find(q=>q.id===ed.id);setEditorCanvas(await loadImage(q.original));ed.tool=null;resetCleanupGeometry();syncEditorTools();toast('원본 사진으로 복원했어요.')};
$('#rotate-tool').onclick=()=>{if(!editorRemember())return;const c=document.createElement('canvas');c.width=ec.height;c.height=ec.width;const cx=c.getContext('2d');cx.translate(c.width/2,c.height/2);cx.rotate(Math.PI/2);cx.drawImage(ec,-ec.width/2,-ec.height/2);setEditorCanvas(c);ed.tool=null;resetCleanupGeometry();syncEditorTools()};
$('#editor-stars').onclick=e=>{const b=e.target.closest('[data-star]');if(b){ed.rating=+b.dataset.star;$('#editor-stars').innerHTML=starsHTML(ed.rating)}};
for(const id of ['photo-text','photo-text-size','photo-text-color','photo-text-bold','photo-text-background']){$('#'+id).oninput=()=>{if(id==='photo-text-size')paintRange($('#'+id));redrawTextDraft()};$('#'+id).onchange=$('#'+id).oninput}
$('#text-commit').onclick=()=>{if(commitTextDraft()){ed.tool=null;syncEditorTools();toast('텍스트를 사진에 넣었어요.')}};$('#text-cancel').onclick=()=>{discardTextDraft();ed.tool=null;syncEditorTools()};
$$('[data-clean-scope]').forEach(b=>b.onclick=()=>{if(!ed||ed.remoteJob)return;clearEditorGuide();ed.cleanup.scope=b.dataset.cleanScope;showCleanupGuide();syncCleanupUI()});
$('#cleanup-run').onclick=startHandwritingRemoval;
$('#cleanup-stop').onclick=cancelHandwritingRemoval;
$$('[data-clean-view]').forEach(b=>b.onclick=()=>showCleanupComparison(b.dataset.cleanView));
$('#cleanup-protect-select').onclick=()=>setEditorTool('protect-select');
$('#cleanup-protect-clear').onclick=()=>{if(!ed||ed.remoteJob)return;ed.cleanup.protectionRects=[];syncCleanupUI()};
function editorPoint(e){const r=ec.getBoundingClientRect();return{x:Math.max(0,Math.min(ec.width,(e.clientX-r.left)*ec.width/r.width)),y:Math.max(0,Math.min(ec.height,(e.clientY-r.top)*ec.height/r.height))}}
function brushCursor(e){if(ed?.tool!=='erase')return;const cursor=$('#brush-cursor'),r=$('#editor-canvas-surface').getBoundingClientRect();cursor.hidden=false;cursor.style.left=(e.clientX-r.left)+'px';cursor.style.top=(e.clientY-r.top)+'px';cursor.style.width=cursor.style.height=$('#brush-size').value+'px'}
function eraseStroke(from,to){const radius=(+$('#brush-size').value||24)*ec.width/ec.getBoundingClientRect().width/2;if($('#eraser-mode').value==='pencil'){if(!ed.brushBase)return;ed.brushPoints.push(to);const points=ed.brushPoints;ed.brushBounds={x:Math.max(0,Math.floor(Math.min(...points.map(p=>p.x))-radius)),y:Math.max(0,Math.floor(Math.min(...points.map(p=>p.y))-radius)),right:Math.min(ec.width,Math.ceil(Math.max(...points.map(p=>p.x))+radius)),bottom:Math.min(ec.height,Math.ceil(Math.max(...points.map(p=>p.y))+radius))};ex.putImageData(ed.brushBase,0,0);ex.save();ex.strokeStyle='#d2954c88';ex.fillStyle='#d2954c66';ex.lineCap=ex.lineJoin='round';ex.lineWidth=radius*2;ex.beginPath();ex.moveTo(points[0].x,points[0].y);for(const p of points)ex.lineTo(p.x,p.y);ex.stroke();ex.beginPath();ex.arc(to.x,to.y,radius,0,Math.PI*2);ex.fill();ex.restore()}else{ex.save();ex.fillStyle=ex.strokeStyle='#fff';ex.lineCap=ex.lineJoin='round';ex.lineWidth=radius*2;ex.beginPath();ex.moveTo(from.x,from.y);ex.lineTo(to.x,to.y);ex.stroke();ex.beginPath();ex.arc(to.x,to.y,radius,0,Math.PI*2);ex.fill();ex.restore()}}
ec.onpointerdown=e=>{if(ed?.remoteJob){e.preventDefault();return}if(!ed?.tool||ed.tool==='crop')return;e.preventDefault();ec.setPointerCapture(e.pointerId);ed.start=ed.last=editorPoint(e);if(ed.tool==='text'){const d=ed.textDraft;if(!d)return;const p=ed.start,l=d.layout;ed.textOffset=l&&p.x>=l.x&&p.x<=l.x+l.width&&p.y>=l.y&&p.y<=l.y+l.height?{x:p.x-d.x,y:p.y-d.y}:{x:0,y:0};d.x=p.x-ed.textOffset.x;d.y=p.y-ed.textOffset.y;ed.drag=true;redrawTextDraft();return}if(ed.tool==='clean-select'||ed.tool==='protect-select'){if(!finishPendingEdits())return;ed.base=ex.getImageData(0,0,ec.width,ec.height)}else if(ed.tool==='erase'&&$('#eraser-mode').value==='pencil'){if(!finishPendingEdits())return;ed.brushBase=ex.getImageData(0,0,ec.width,ec.height);ed.brushPoints=[ed.start]}else{if(!editorRemember())return}ed.drag=true;if(ed.tool==='erase')eraseStroke(ed.start,ed.start)};
ec.onpointermove=e=>{brushCursor(e);if(!ed?.drag)return;const p=editorPoint(e);if(ed.tool==='text'){ed.textDraft.x=p.x-ed.textOffset.x;ed.textDraft.y=p.y-ed.textOffset.y;redrawTextDraft()}else if(ed.tool==='erase'){eraseStroke(ed.last,p);ed.last=p}else if(ed.tool==='crop'||ed.tool==='clean-select'||ed.tool==='protect-select'){ex.putImageData(ed.base,0,0);const x=Math.min(ed.start.x,p.x),y=Math.min(ed.start.y,p.y),w=Math.abs(p.x-ed.start.x),h=Math.abs(p.y-ed.start.y);ex.save();ex.fillStyle='#15332455';ex.fillRect(0,0,ec.width,y);ex.fillRect(0,y+h,ec.width,ec.height-y-h);ex.fillRect(0,y,x,h);ex.fillRect(x+w,y,ec.width-x-w,h);ex.strokeStyle='#8daf67';ex.lineWidth=2*ec.width/ec.getBoundingClientRect().width;ex.strokeRect(x,y,w,h);ex.restore()}};
ec.onpointerup=e=>{if(!ed?.drag)return;ed.drag=false;if(ed.tool==='erase'&&$('#eraser-mode').value==='pencil'&&ed.brushBase){ex.putImageData(ed.brushBase,0,0);ed.brushBase=null;const b=ed.brushBounds;ed.cleanup.rect={x:b.x,y:b.y,w:b.right-b.x,h:b.bottom-b.y};ed.cleanup.scope='area';ed.cleanup.mode='pencil';ed.tool=null;syncEditorTools();syncCleanupUI();return startHandwritingRemoval()}if(ed.tool==='text')return;if(ed.tool==='crop'||ed.tool==='clean-select'||ed.tool==='protect-select'){const tool=ed.tool,p=editorPoint(e),x=Math.round(Math.min(ed.start.x,p.x)),y=Math.round(Math.min(ed.start.y,p.y)),w=Math.round(Math.abs(p.x-ed.start.x)),h=Math.round(Math.abs(p.y-ed.start.y));ex.putImageData(ed.base,0,0);ed.base=null;if(w>7&&h>7){if(tool==='crop'){const data=ex.getImageData(x,y,Math.min(w,ec.width-x),Math.min(h,ec.height-y));ec.width=data.width;ec.height=data.height;ex.putImageData(data,0,0);resetCleanupGeometry();toast('선택한 영역으로 잘랐어요.')}else if(tool==='protect-select'){ed.cleanup.protectionRects.push({x,y,w,h});syncCleanupUI();toast('선택한 영역의 원문 획을 보호합니다.')}else{ed.cleanup.rect={x,y,w:Math.min(w,ec.width-x),h:Math.min(h,ec.height-y)};ed.cleanup.scope='area';syncCleanupUI();showCleanupGuide()}}ed.tool=null;syncEditorTools()}};
ec.onpointercancel=()=>{if(ed?.brushBase){ex.putImageData(ed.brushBase,0,0);ed.brushBase=null}if(ed?.drag&&['crop','clean-select','protect-select'].includes(ed.tool)&&ed.base){ex.putImageData(ed.base,0,0);ed.base=null}if(ed)ed.drag=false;$('#brush-cursor').hidden=true};ec.onpointerleave=()=>$('#brush-cursor').hidden=true;$('#brush-size').oninput=e=>paintRange(e.target);
function applyFilter(mode){if(mode==='ink')return startHandwritingRemoval();if(!editorRemember())return;const data=ex.getImageData(0,0,ec.width,ec.height);if(mode==='eco'){const d=data.data;for(let i=0;i<d.length;i+=4){const grey=.299*d[i]+.587*d[i+1]+.114*d[i+2];d[i]=d[i+1]=d[i+2]=grey>170?255:Math.max(0,grey-50)}}else applyPixelFilter(data,ec.width,ec.height,mode);ex.putImageData(data,0,0)}
$$('[data-filter]').forEach(b=>b.onclick=async()=>{if(!ed||!finishPendingEdits())return;const mode=b.dataset.filter;if(mode==='ink'){ed.cleanup.scope='all';syncCleanupUI();return startHandwritingRemoval()}if(mode==='original'){if(!editorRemember())return;setEditorCanvas(await loadImage(state.questions.find(q=>q.id===ed.id).original));resetCleanupGeometry()}else{b.disabled=true;await new Promise(r=>setTimeout(r,20));try{applyFilter(mode)}catch(error){console.error('사진 보정 실패',error);toast('사진을 보정하지 못했어요.')}finally{b.disabled=false}}$$('[data-filter]').forEach(v=>v.classList.toggle('active',v===b));ed.tool=null;syncEditorTools()});
for(const key of ['brightness','contrast'])$('#'+key).oninput=e=>{$('#'+key+'-value').textContent=e.target.value;paintRange(e.target)};
$('#apply-adjust').onclick=()=>{if(!editorRemember())return;const data=ex.getImageData(0,0,ec.width,ec.height),b=+$('#brightness').value*1.6,c=+$('#contrast').value*2,f=(259*(c+255))/(255*(259-c));for(let i=0;i<data.data.length;i+=4)for(let k=0;k<3;k++)data.data[i+k]=f*(data.data[i+k]-128)+128+b;ex.putImageData(data,0,0);$('#brightness').value=$('#contrast').value=0;$('#brightness-value').textContent=$('#contrast-value').textContent='0';paintRange($('#brightness'));paintRange($('#contrast'))};
$('#editor-apply').onclick=()=>{if(!ed||ed.remoteJob)return;if(ed.perspective){applyPerspectiveCorrection();return}if(ed.brushBase){ex.putImageData(ed.brushBase,0,0);ed.brushBase=null;ed.drag=false}if(ed.drag&&['clean-select','protect-select'].includes(ed.tool)&&ed.base){ex.putImageData(ed.base,0,0);ed.base=null;ed.drag=false}if(!finishPendingEdits())return;const q=state.questions.find(q=>q.id===ed.id);if(!q)return;update(()=>{q.src=ec.toDataURL('image/png');q.width=ec.width;q.height=ec.height;q.difficulty=ed.rating;q.title=$('#editor-name').value||'문제';q.answer=$('#editor-answer').value;clearMultiSelection();selected=q.id});$('#editor-dialog').close();toast('텍스트와 사진 보정을 문제지에 적용했어요.')};
async function init(){state.questions=makeSamples();clearMultiSelection();selected=state.questions[0].id;try{db=await new Promise((resolve,reject)=>{const r=indexedDB.open('munji-studio',1);r.onupgradeneeded=()=>r.result.createObjectStore('work');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});const saved=await new Promise((resolve,reject)=>{const t=db.transaction('work');const r=t.objectStore('work').get('current');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});if(saved?.settings&&Array.isArray(saved.questions)){state=validateProject({app:'munji-studio',...saved});clearMultiSelection();selected=state.questions[0]?.id||null}}catch{$('#save-status').textContent='프로젝트 파일로 저장 가능'}render();syncSettings();document.fonts.ready.then(()=>renderPreview())}init();
window.Munji={get state(){return state},get pages(){return pages},getLayout,loadImage,download,fileName,toast};
