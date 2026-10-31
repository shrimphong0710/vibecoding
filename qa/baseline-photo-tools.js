'use strict';
(() => {
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v)};
  function cleanHandwriting(image,options={}){
    const {data:d,width:w,height:h}=image;
    const strength=clamp(Number(options.strength??55),0,100),protect=options.protect!==false,mode=options.mode==='ink'?'ink':'pencil';
    if(!strength||!w||!h)return image;
    const tile=clamp(Math.round(w/24),24,64),cols=Math.ceil(w/tile),rows=Math.ceil(h/tile),background=new Float32Array(cols*rows),paperR=new Float32Array(cols*rows),paperG=new Float32Array(cols*rows),paperB=new Float32Array(cols*rows);
    for(let ty=0;ty<rows;ty++)for(let tx=0;tx<cols;tx++){
      const hist=new Uint32Array(256),x0=tx*tile,y0=ty*tile,x1=Math.min(w,x0+tile),y1=Math.min(h,y0+tile);let count=0;
      for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
        const i=(y*w+x)*4,l=Math.round(d[i]*.299+d[i+1]*.587+d[i+2]*.114);hist[l]++;count++;
      }
      const target=count*.87;let sum=0,level=255;for(let i=0;i<256;i++){sum+=hist[i];if(sum>=target){level=i;break}}
      const bi=ty*cols+tx;background[bi]=Math.max(160,level);let rr=0,gg=0,bb=0,samples=0;
      for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=(y*w+x)*4,l=Math.round(d[i]*.299+d[i+1]*.587+d[i+2]*.114);if(l>=level&&l>=160&&Math.max(d[i],d[i+1],d[i+2])-Math.min(d[i],d[i+1],d[i+2])<65){rr+=d[i];gg+=d[i+1];bb+=d[i+2];samples++}}
      paperR[bi]=samples?rr/samples:255;paperG[bi]=samples?gg/samples:255;paperB[bi]=samples?bb/samples:255;
    }
    const normalized=new Uint8Array(w*h),dark=protect?new Uint8Array(w*h):null;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const gx=clamp((x+.5)/tile-.5,0,cols-1),gy=clamp((y+.5)/tile-.5,0,rows-1),x0=Math.floor(gx),y0=Math.floor(gy),x1=Math.min(cols-1,x0+1),y1=Math.min(rows-1,y0+1),dx=gx-x0,dy=gy-y0;
      const bg=(background[y0*cols+x0]*(1-dx)+background[y0*cols+x1]*dx)*(1-dy)+(background[y1*cols+x0]*(1-dx)+background[y1*cols+x1]*dx)*dy;
      const p=y*w+x,i=p*4,l=d[i]*.299+d[i+1]*.587+d[i+2]*.114,n=clamp(Math.round(l*255/bg),0,255);
      normalized[p]=n;if(dark&&n<88&&Math.max(d[i],d[i+1],d[i+2])-Math.min(d[i],d[i+1],d[i+2])<40)dark[p]=1;
    }
    let left=0,top=0,right=w,bottom=h;
    if(options.rect){const r=options.rect;left=clamp(Math.floor(r.x),0,w);top=clamp(Math.floor(r.y),0,h);right=clamp(Math.ceil(r.x+r.w),left,w);bottom=clamp(Math.ceil(r.y+r.h),top,h)}
    const stroke=options.stroke;
    if(stroke){left=Math.max(left,Math.floor(Math.min(stroke.from.x,stroke.to.x)-stroke.radius));right=Math.min(right,Math.ceil(Math.max(stroke.from.x,stroke.to.x)+stroke.radius));top=Math.max(top,Math.floor(Math.min(stroke.from.y,stroke.to.y)-stroke.radius));bottom=Math.min(bottom,Math.ceil(Math.max(stroke.from.y,stroke.to.y)+stroke.radius))}
    const cutoff=230-strength*(protect?1.35:2.08),pad=1;
    for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
      const p=y*w+x,i=p*4,r=d[i],g=d[i+1],b=d[i+2],max=Math.max(r,g,b),spread=max-Math.min(r,g,b),n=normalized[p];let amount=0;
      if(mode==='pencil'){
        if(n>=248)continue;
        if(spread>40&&spread/Math.max(1,max)>.18)continue;
        if(dark&&n<235){let keep=false;for(let yy=Math.max(0,y-pad);yy<=Math.min(h-1,y+pad)&&!keep;yy++)for(let xx=Math.max(0,x-pad);xx<=Math.min(w-1,x+pad);xx++)if(dark[yy*w+xx]){keep=true;break}if(keep)continue}
        amount=smooth((n-(cutoff-15))/30);
      }else{
        const minimum=40-strength*.3;if(spread<minimum||spread/Math.max(1,max)<.2-strength*.001)continue;
        amount=smooth((spread-minimum)/18);
      }
      if(stroke){const vx=stroke.to.x-stroke.from.x,vy=stroke.to.y-stroke.from.y,len=vx*vx+vy*vy,t=len?clamp(((x+.5-stroke.from.x)*vx+(y+.5-stroke.from.y)*vy)/len,0,1):0,distance=Math.hypot(x+.5-stroke.from.x-t*vx,y+.5-stroke.from.y-t*vy);amount*=smooth((stroke.radius-distance)/Math.max(1,stroke.radius*.13))}
      if(amount>0){
        const gx=clamp((x+.5)/tile-.5,0,cols-1),gy=clamp((y+.5)/tile-.5,0,rows-1),x0=Math.floor(gx),y0=Math.floor(gy),x1=Math.min(cols-1,x0+1),y1=Math.min(rows-1,y0+1),dx=gx-x0,dy=gy-y0;
        const sample=map=>(map[y0*cols+x0]*(1-dx)+map[y0*cols+x1]*dx)*(1-dy)+(map[y1*cols+x0]*(1-dx)+map[y1*cols+x1]*dx)*dy;
        d[i]=r+(sample(paperR)-r)*amount;d[i+1]=g+(sample(paperG)-g)*amount;d[i+2]=b+(sample(paperB)-b)*amount;
      }
    }
    return image;
  }
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
  window.MunjiPhoto={cleanHandwriting,layoutText,drawText};
})();
