// Only a generated worksheet is sent to the external provider; never user photos.
import fs from 'node:fs/promises';
import {createCanvas,Image} from './qa-editor-harness.mjs';
import {straightenWithCamScanner} from './camscanner-api.mjs';
const folder='qa/auto-straighten';await fs.mkdir(folder,{recursive:true});
const canvas=createCanvas(1100,900),x=canvas.getContext('2d');
x.fillStyle='#555b54';x.fillRect(0,0,1100,900);
x.translate(180,85);x.transform(1,.13,-.12,1,0,0);x.fillStyle='#fff';x.fillRect(0,0,740,680);
x.fillStyle='#111';x.font='bold 32px Malgun Gothic';x.fillText('비율 자동 조정 검증용 예시',45,70);x.font='24px Arial';
for(let i=0;i<8;i++){x.fillText(`${i+1}. Solve: 3x + ${i+2} = ${i+17}`,50,140+i*60);x.fillRect(50,154+i*60,630,2)}
await fs.writeFile(folder+'/before.png',canvas.toBuffer('image/png'));
try{
  const result=await straightenWithCamScanner(canvas.toDataURL(),{timeoutMs:120000}),image=new Image();image.src=result.image;await image.decode();
  const after=createCanvas(image.width,image.height);after.getContext('2d').drawImage(image,0,0);await fs.writeFile(folder+'/after.png',after.toBuffer('image/png'));
  const report={success:true,provider:result.provider,source:'generated synthetic worksheet only',before:{width:canvas.width,height:canvas.height},after:{width:image.width,height:image.height}};
  await fs.writeFile(folder+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(error){await fs.writeFile(folder+'/report.json',JSON.stringify({success:false,message:error.message},null,2));console.error(error.message);process.exitCode=1}
