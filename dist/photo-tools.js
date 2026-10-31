'use strict';
(() => {
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function validateImage(image){if(!Number.isInteger(image?.width)||!Number.isInteger(image?.height)||image.width<1||image.height<1||image.data?.length!==image.width*image.height*4)throw Error('유효하지 않은 이미지입니다.')}
  function estimatePaper(image){
    const {width:w,height:h,data:d}=image,tile=clamp(Math.round(w/24),24,64),cols=Math.ceil(w/tile),rows=Math.ceil(h/tile),maps=Array.from({length:4},()=>new Float32Array(cols*rows));
    for(let ty=0;ty<rows;ty++)for(let tx=0;tx<cols;tx++){
      const x0=tx*tile,y0=ty*tile,x1=Math.min(w,x0+tile),y1=Math.min(h,y0+tile),hist=new Uint32Array(256);let count=0;
      for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=(y*w+x)*4;if(d[i+3]<250)continue;hist[Math.round(d[i]*.299+d[i+1]*.587+d[i+2]*.114)]++;count++}
      let sum=0,level=255;for(let v=0;v<256;v++){sum+=hist[v];if(sum>=count*.82){level=v;break}}
      let rr=0,gg=0,bb=0,samples=0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=(y*w+x)*4,l=Math.round(d[i]*.299+d[i+1]*.587+d[i+2]*.114);if(l>=level&&l>=155&&Math.max(d[i],d[i+1],d[i+2])-Math.min(d[i],d[i+1],d[i+2])<45&&d[i+3]>=250){rr+=d[i];gg+=d[i+1];bb+=d[i+2];samples++}}
      const p=ty*cols+tx;const valid=samples>=Math.max(4,count*.06);maps[0][p]=valid?rr/samples:0;maps[1][p]=valid?gg/samples:0;maps[2][p]=valid?bb/samples:0;maps[3][p]=valid?1:0;
    }
    function sample(x,y,out){const gx=clamp((x+.5)/tile-.5,0,cols-1),gy=clamp((y+.5)/tile-.5,0,rows-1),x0=Math.floor(gx),y0=Math.floor(gy),x1=Math.min(cols-1,x0+1),y1=Math.min(rows-1,y0+1),dx=gx-x0,dy=gy-y0;for(let k=0;k<4;k++)out[k]=(maps[k][y0*cols+x0]*(1-dx)+maps[k][y0*cols+x1]*dx)*(1-dy)+(maps[k][y1*cols+x0]*(1-dx)+maps[k][y1*cols+x1]*dx)*dy;if(out[3]>0)for(let k=0;k<3;k++)out[k]/=out[3];return out}
    return{sample,tile};
  }
  function checkShape(c,labels,w){
    if(c.w*c.h>200000||c.w<8||c.h<8||c.w/c.h<.4||c.w/c.h>3.5||c.area>c.w*c.h*.48)return false;
    const points=[];for(let x=c.x;x<c.x+c.w;x++){let min=Infinity,max=-1;for(let y=c.y;y<c.y+c.h;y++)if(labels[y*w+x]===c.id){min=Math.min(min,y);max=Math.max(max,y)}if(max>=0)points.push([x,(min+max)/2])}
    if(points.length<c.w*.7)return false;let turn=0;for(let i=1;i<points.length;i++)if(points[i][1]>points[turn][1])turn=i;
    if(turn<points.length*.12||turn>points.length*.62)return false;
    const a=points[0],b=points[turn],z=points[points.length-1];if(b[1]-a[1]<c.h*.18||b[1]-z[1]<c.h*.45)return false;
    const error=(start,end)=>{let e=0;const p=points[start],q=points[end];for(let i=start;i<=end;i++){const target=p[1]+(q[1]-p[1])*(points[i][0]-p[0])/Math.max(1,q[0]-p[0]);e+=Math.abs(points[i][1]-target)}return e/Math.max(1,end-start+1)/c.h};
    return error(0,turn)<.18&&error(turn,points.length-1)<.18;
  }
  function analyzeHandwriting(image,options={}){
    validateImage(image);const started=performance.now(),w=image.width,h=image.height,n=w*h;
    // Own an immutable baseline. Detection never changes the supplied ImageData.
    const source={width:w,height:h,data:new Uint8ClampedArray(image.data)},d=source.data,paper=estimatePaper(source),contrast=new Uint8Array(n),fg=new Uint8Array(n),labels=new Uint32Array(n),queue=new Uint32Array(n),components=[],sample=new Float32Array(4);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=y*w+x,i=p*4;paper.sample(x,y,sample);const bg=sample[0]*.299+sample[1]*.587+sample[2]*.114,l=d[i]*.299+d[i+1]*.587+d[i+2]*.114;contrast[p]=clamp(Math.round(bg-l),0,255);if(d[i+3]>=250&&sample[3]>.75&&(contrast[p]>=12||Math.max(d[i],d[i+1],d[i+2])-Math.min(d[i],d[i+1],d[i+2])>30&&contrast[p]>=7))fg[p]=1}
    for(let start=0;start<n;start++)if(fg[start]&&!labels[start]){
      if(components.length>=20000)throw Error('획이 너무 많아 안전하게 분석하지 못했어요. 사진을 필요한 문제 부분으로 잘라 주세요.');const id=components.length+1,c={id,x:w,y:h,right:0,bottom:0,area:0,perimeter:0,dark:0,colored:0,sumX:0,sumY:0,sumXX:0,sumYY:0,sumXY:0};let head=0,tail=1;queue[0]=start;labels[start]=id;
      while(head<tail){const p=queue[head++],x=p%w,y=Math.floor(p/w),i=p*4,l=d[i]*.299+d[i+1]*.587+d[i+2]*.114;c.area++;c.x=Math.min(c.x,x);c.y=Math.min(c.y,y);c.right=Math.max(c.right,x);c.bottom=Math.max(c.bottom,y);c.sumX+=x;c.sumY+=y;c.sumXX+=x*x;c.sumYY+=y*y;c.sumXY+=x*y;if(l<100)c.dark++;if(Math.max(d[i],d[i+1],d[i+2])-Math.min(d[i],d[i+1],d[i+2])>35)c.colored++;
        if(x===0||!fg[p-1])c.perimeter++;if(x===w-1||!fg[p+1])c.perimeter++;if(y===0||!fg[p-w])c.perimeter++;if(y===h-1||!fg[p+w])c.perimeter++;
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=w||yy>=h)continue;const q=yy*w+xx;if(fg[q]&&!labels[q]){labels[q]=id;queue[tail++]=q}}
      }
      c.w=c.right-c.x+1;c.h=c.bottom-c.y+1;c.cx=c.sumX/c.area;c.cy=c.sumY/c.area;c.thickness=2*c.area/Math.max(1,c.perimeter);const xx=c.sumXX/c.area-c.cx*c.cx,yy=c.sumYY/c.area-c.cy*c.cy,xy=c.sumXY/c.area-c.cx*c.cy,trace=xx+yy,delta=Math.sqrt((xx-yy)**2+4*xy*xy);c.linearity=trace?(trace+delta)/Math.max(.001,trace-delta):1;c.check=checkShape(c,labels,w);components.push(c);
    }
    const glyphs=components.filter(c=>c.area>=6&&c.h>=6&&c.h<=Math.max(30,h*.12)&&c.w/c.h<2.2&&!c.check),heights=glyphs.map(c=>c.h).sort((a,b)=>a-b),typicalHeight=heights.length>=3?heights[Math.floor(heights.length/2)]:clamp(Math.round(h/30),10,28),cell=Math.max(16,typicalHeight*2),grid=new Map();
    for(const c of glyphs){const key=Math.floor(c.cx/cell)+','+Math.floor(c.cy/cell);if(!grid.has(key))grid.set(key,[]);grid.get(key).push(c)}
    const rect=options.rect||{x:0,y:0,w,h},intersects=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y,protectionRects=Array.isArray(options.protectionRects)?options.protectionRects:[],mode=['ink','pen'].includes(options.mode)?options.mode:'pencil',strength=clamp(Number(options.strength??55),0,100);
    for(const c of components){
      c.status='preserve';c.reason='원문 여부를 확정할 수 없어 보존';c.kind=c.check?'check':c.colored/c.area>.4?'colored':'stroke';c.score=0;
      if(!intersects(c,rect)||c.area<4||strength===0)continue;
      const gx=Math.floor(c.cx/cell),gy=Math.floor(c.cy/cell);let row=0,left=0,right=0,near=0;
      for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)for(const other of (grid.get((gx+dx)+','+(gy+dy))||[])){if(other.id===c.id)continue;const distance=Math.max(0,Math.max(other.x-c.right,c.x-other.right,other.y-c.bottom,c.y-other.bottom));if(distance<typicalHeight*2.5)near++;if(Math.abs(other.cy-c.cy)<typicalHeight*.65&&Math.abs(other.cx-c.cx)<Math.max(c.w/2,typicalHeight)*1.5+typicalHeight*2){row++;if(other.cx<c.cx)left++;else right++}}
      c.nearText=near;c.rowNeighbors=row;c.overlap=false;
      const longLine=Math.max(c.w,c.h)>typicalHeight*2.8&&c.linearity>16,largeGraphic=!c.check&&c.w>typicalHeight*4&&c.h>typicalHeight*3,printedRow=row>=2&&c.h<typicalHeight*1.9&&(!c.check||c.h<=typicalHeight*1.15||left&&right),mixedCrossing=!c.check&&c.w>typicalHeight*2.4&&c.h>typicalHeight*1.5&&near>=2&&c.dark/c.area>.18;
      if(protectionRects.some(r=>intersects(c,r))){c.status='protected';c.reason='사용자가 지정한 보호 영역';continue}
      if(largeGraphic||mixedCrossing){c.status='protected';c.overlap=true;c.kind='overlap';c.reason='도형·그래프 또는 원문과 겹쳐 연결된 획 보존';continue}
      if(printedRow||longLine&&near>=2||c.check&&left&&right){c.status='protected';c.kind='print';c.reason='글자 행·수학 기호·연속된 인쇄 획 보존';continue}
      const eligible=mode==='ink'?c.colored/c.area>.3:mode==='pen'?c.dark/c.area>.2||c.check:c.colored/c.area<.25&&(c.dark/c.area<.35||c.check)&&strength>0;
      if(!eligible)continue;
      // Geometry produces review proposals, never a semantic claim that a stroke is handwriting.
      c.status='review';c.score=c.check?.9:c.colored/c.area>.3?.8:longLine?.35:.6;
      c.reason=c.check?'체크 모양 · 인쇄 기호일 수도 있어 확인 필요':longLine?'직선 획 · 분수선이나 도형일 수도 있어 확인 필요':mode==='pen'?'검은 획 · 숫자·기호와 구별 불확실':c.colored/c.area>.3?'색 획 · 인쇄 그림과 구별 불확실':'회색 획 · 옅은 인쇄와 구별 불확실';
    }
    const protectedMask=new Uint8Array(n),uncertainMask=new Uint8Array(n),lookup=[null,...components];for(let p=0;p<n;p++){const c=lookup[labels[p]];if(!c)continue;if(c.status==='protected')protectedMask[p]=1;else if(c.status==='review')uncertainMask[p]=1}
    // Keep anti-aliased outlines around known print, not just its black cores.
    const radius=typicalHeight>32?2:1,printPixels=new Uint8Array(protectedMask);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=y*w+x;if(!printPixels[p])continue;for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<w&&yy<h)protectedMask[yy*w+xx]=1}}
    return{version:2,width:w,height:h,source,paper,contrast,labels,components,protectedMask,uncertainMask,scope:{x:clamp(Math.floor(rect.x),0,w),y:clamp(Math.floor(rect.y),0,h),w:Math.max(0,Math.min(w-rect.x,rect.w)),h:Math.max(0,Math.min(h-rect.y,rect.h))},stroke:options.stroke||null,typicalHeight,elapsedMs:performance.now()-started,stats:{review:components.filter(c=>c.status==='review').length,protected:components.filter(c=>c.status==='protected').length,overlap:components.filter(c=>c.overlap).length}};
  }
  function restoreHandwriting(analysis,options={}){
    if(analysis?.version!==2)throw Error('먼저 필기 후보를 탐지해 주세요.');const{width:w,height:h,source,labels,protectedMask,contrast,scope}=analysis,n=w*h,data=new Uint8ClampedArray(source.data),mask=new Uint8Array(n),approved=new Set((options.confirmedIds||[]).map(Number)),lookup=[null,...analysis.components],stroke=options.stroke||analysis.stroke,sample=new Float32Array(4);let changedPixels=0,blockedPixels=0;
    if(!approved.size)return{width:w,height:h,data,mask,stats:{changedPixels,blockedPixels,confirmedComponents:0}};
    const inScope=(x,y)=>x>=scope.x&&y>=scope.y&&x<scope.x+scope.w&&y<scope.y+scope.h;
    const inStroke=(x,y)=>{if(!stroke)return true;const vx=stroke.to.x-stroke.from.x,vy=stroke.to.y-stroke.from.y,len=vx*vx+vy*vy,t=len?clamp(((x+.5-stroke.from.x)*vx+(y+.5-stroke.from.y)*vy)/len,0,1):0;return Math.hypot(x+.5-stroke.from.x-t*vx,y+.5-stroke.from.y-t*vy)<=stroke.radius};
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=y*w+x,c=lookup[labels[p]];if(c?.status!=='review'||!approved.has(c.id)||!inScope(x,y)||!inStroke(x,y))continue;if(protectedMask[p]){blockedPixels++;continue}mask[p]=1;
      // Include faint edge pixels of this confirmed component only. Never fill its bounding box.
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=w||yy>=h)continue;const q=yy*w+xx;if(!protectedMask[q]&&contrast[q]>=3&&(!labels[q]||labels[q]===c.id)&&inScope(xx,yy)&&inStroke(xx,yy))mask[q]=1}
    }
    for(let p=0;p<n;p++)if(mask[p]){const x=p%w,y=Math.floor(p/w);analysis.paper.sample(x,y,sample);if(sample[3]<.95){mask[p]=0;blockedPixels++;continue}const i=p*4;let different=false;for(let k=0;k<3;k++){const v=Math.round(sample[k]);if(data[i+k]!==v)different=true;data[i+k]=v}if(different)changedPixels++}
    return{width:w,height:h,data,mask,stats:{changedPixels,blockedPixels,confirmedComponents:analysis.components.filter(c=>c.status==='review'&&approved.has(c.id)).length}};
  }
  // Compatibility entrypoint: no confirmation means a byte-identical, conservative result.
  function cleanHandwriting(image,options={}){const analysis=analyzeHandwriting(image,options),result=restoreHandwriting(analysis,{confirmedIds:options.confirmedIds||[],stroke:options.stroke});image.data.set(result.data);return image}
  function layoutText(ctx,d,bounds){
    const size=clamp(Number(d.size)||32,8,120),padding=6,lineHeight=Math.ceil(size*1.4),font=(d.bold?'700 ':'400 ')+size+'px "Noto Sans KR","Malgun Gothic",Arial,sans-serif',maxWidth=Math.max(1,bounds.width-padding*2),lines=[];
    ctx.save();ctx.font=font;
    for(const paragraph of String(d.text||'').replace(/\t/g,'    ').split(/\r?\n/)){
      let line='';for(const ch of paragraph){if(line&&ctx.measureText(line+ch).width>maxWidth){lines.push(line);line=ch}else line+=ch}lines.push(line);
    }
    const width=Math.ceil(Math.max(1,...lines.map(line=>ctx.measureText(line).width)))+padding*2,height=lines.length*lineHeight+padding*2;ctx.restore();
    return {lines,font,padding,lineHeight,width,height,x:clamp(Number(d.x)||0,0,Math.max(0,bounds.width-width)),y:clamp(Number(d.y)||0,0,Math.max(0,bounds.height-height)),fits:width<=bounds.width&&height<=bounds.height&&!!String(d.text||'').trim()};
  }
  function drawText(ctx,d,layout){
    ctx.save();ctx.font=layout.font;ctx.textBaseline='top';ctx.textAlign='left';
    if(d.background){ctx.fillStyle='#fff';ctx.fillRect(layout.x,layout.y,layout.width,layout.height)}
    ctx.fillStyle=/^#[0-9a-f]{6}$/i.test(d.color)?d.color:'#242924';
    layout.lines.forEach((line,i)=>ctx.fillText(line,layout.x+layout.padding,layout.y+layout.padding+i*layout.lineHeight));ctx.restore();
  }
  window.MunjiPhoto={analyzeHandwriting,restoreHandwriting,cleanHandwriting,layoutText,drawText};
})();
