import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire('C:/Users/LG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];let fixture,calls=0;
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',async route=>{
    if(route.request().url().endsWith('/api/camscanner/erase')){calls++;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({image:fixture.clean,provider:'CamScanner'})});return}
    if(!route.request().url().startsWith('http://127.0.0.1:4173/')&&!route.request().url().startsWith('data:')){await route.abort();return}
    await route.continue();
  });
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  fixture=await page.evaluate(async()=>{
    const canvas=document.createElement('canvas');canvas.width=600;canvas.height=300;
    const x=canvas.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,600,300);x.fillStyle='#111';x.font='24px Arial';x.fillText('x + 2 = 5',30,55);
    const clean=canvas.toDataURL();x.fillStyle='#888';x.fillRect(50,210,120,3);const marked=canvas.toDataURL();
    const q={...window.Munji.state.questions[0],src:marked,original:marked,width:600,height:300};window.Munji.state.questions.splice(0,window.Munji.state.questions.length,q);
    await openEditor(q.id);return{clean,marked};
  });
  assert.equal(await page.locator('#cleanup-candidates, #cleanup-preview, #cleanup-commit').count(),0);
  assert.equal(await page.locator('[data-clean-view]').count(),2);
  assert.equal(await page.locator('#cleanup-run').isEnabled(),true);
  await page.locator('#cleanup-run').click();await page.waitForFunction(()=>document.querySelector('#cleanup-comparison').hidden===false);
  assert.equal(await page.locator('#editor-canvas').evaluate(canvas=>canvas.toDataURL()),fixture.clean);
  await page.locator('#editor-dialog').screenshot({path:'qa/cleanup-after.png'});
  await page.locator('[data-clean-view="before"]').click();assert.equal(await page.locator('#editor-canvas').evaluate(canvas=>canvas.toDataURL()),fixture.marked);
  assert.equal(await page.locator('[data-clean-view="before"]').getAttribute('aria-pressed'),'true');
  await page.locator('#editor-dialog').screenshot({path:'qa/cleanup-before.png'});
  await page.locator('[data-clean-view="result"]').click();assert.equal(await page.locator('#editor-canvas').evaluate(canvas=>canvas.toDataURL()),fixture.clean);
  await page.locator('[data-clean-view="before"]').click();await page.locator('#editor-apply').click();
  assert.equal(await page.evaluate(()=>window.Munji.state.questions[0].src),fixture.clean);
  assert.equal(calls,1);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result:'passed',browser:'Microsoft Edge (isolated headless context)',checks:['actual page and DOM load without errors','no preview or check controls','one-click result','before/after comparison','save cleaned result from before view'],externalService:'stubbed',userBrowserStorageTouched:false},null,2));
}finally{await browser.close()}
