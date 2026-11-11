import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';

const require=createRequire(path.resolve(path.dirname(process.execPath),'..','node_modules','package.json'));
export const {createCanvas,Image,ImageData}=require('@napi-rs/canvas');

export async function editorHarness(){
  const elements=new Map(),listeners=new Map();
  function element(id){
    if(elements.has(id))return elements.get(id);
    const el=id.includes('canvas')&&!id.includes('wrap')&&!id.includes('stage')?createCanvas(500,500):{};
    const classes=new Set();
    Object.assign(el,{id,value:'0',min:'0',max:'100',innerHTML:'',textContent:'',checked:false,hidden:false,disabled:false,open:false,clientWidth:700,scrollLeft:0,scrollTop:0,style:{},dataset:{},classes,files:[],
      classList:{add(...names){names.forEach(n=>classes.add(n))},remove(...names){names.forEach(n=>classes.delete(n))},toggle(name,force){const active=force??!classes.has(name);active?classes.add(name):classes.delete(name);return active}},
      setAttribute(){},addEventListener(type,fn){const key=id+':'+type;listeners.set(key,[...(listeners.get(key)||[]),fn])},
      querySelector(selector){return element(id+' '+selector)},getBoundingClientRect(){return{left:0,top:0,width:500,height:500}},
      showModal(){this.open=true},close(){this.open=false;for(const fn of listeners.get(id+':close')||[])fn()},
      click(){return this.onclick?.({target:this})},append(){},remove(){},focus(){},scrollIntoView(){},setPointerCapture(){},releasePointerCapture(){},hasPointerCapture(){return true}
    });elements.set(id,el);return el;
  }
  const filters=['original','bw','eco','sharpen','shadow','ink'].map(filter=>{const el=element('filter-'+filter);el.dataset.filter=filter;return el});
  const views=['before','result'].map(view=>{const el=element('straighten-'+view);el.dataset.straightenView=view;return el});
  const cleanViews=['before','result'].map(view=>{const el=element('clean-view-'+view);el.dataset.cleanView=view;return el});
  const scopes=['area','all'].map(scope=>{const el=element('clean-scope-'+scope);el.dataset.cleanScope=scope;return el});
  const document={querySelector:s=>element(s.startsWith('#')?s.slice(1):s),querySelectorAll:s=>({'[data-filter]':filters,'[data-straighten-view]':views,'[data-clean-view]':cleanViews,'[data-clean-scope]':scopes}[s]||[]),
    createElement:tag=>tag==='canvas'?createCanvas(10,10):element('created-'+elements.size),fonts:{ready:Promise.resolve()},addEventListener(){},body:{append(){}}};
  const ctx={document,window:{addEventListener(){}},Image,ImageData,crypto:globalThis.crypto,TextEncoder,Uint8Array,Uint8ClampedArray,Float32Array,Float64Array,DataView,Blob,URL,performance,console,setTimeout,clearTimeout,atob,btoa,Math,Date,Promise,AbortController,DOMException,
    location:{protocol:'http:'},ResizeObserver:class{observe(){}},requestAnimationFrame:fn=>setTimeout(fn,0),indexedDB:{open(){throw Error('isolated test storage')}}};
  ctx.window.window=ctx.window;vm.createContext(ctx);
  for(const filename of ['dist/photo-tools.js','dist/app.js'])vm.runInContext(await fs.readFile(filename,'utf8'),ctx);
  const run=code=>vm.runInContext(code,ctx);
  await new Promise(r=>setTimeout(r,50));
  return{ctx,element,elements,filters,run,M:ctx.window.Munji,canvas:element('editor-canvas')};
}
