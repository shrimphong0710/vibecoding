// Test the actual .cmd wrapper with spaces/Korean in its path, without opening
// a browser or starting the application. The launch target is a temporary stub.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'munji 시작 파일 test ')),command=path.join(root,'Start-Munji.cmd');
await fs.copyFile(new URL('./Start-Munji.cmd',import.meta.url),command);
await fs.writeFile(path.join(root,'launch-munji.mjs'),"console.log('MUNJI_LAUNCH_WRAPPER_OK');\n");
try{
  const child=spawn('"'+command+'"',[],{shell:'cmd.exe',windowsHide:true,stdio:['pipe','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',b=>{stdout+=b});child.stderr.on('data',b=>{stderr+=b});child.stdin.end();
  const timer=setTimeout(()=>child.kill(),6000);const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve)});clearTimeout(timer);
  assert.ok(stdout.includes('MUNJI_LAUNCH_WRAPPER_OK'),JSON.stringify({code,stdout,stderr}));assert.equal(code,0);
  console.log(JSON.stringify({result:'passed',checks:['actual CMD wrapper','Korean and spaces in path','cached Node executable discovery'],browserOpened:false,externalNetworkUsed:false},null,2));
}finally{await new Promise(r=>setTimeout(r,100));await fs.unlink(command);await fs.unlink(path.join(root,'launch-munji.mjs'));await fs.rmdir(root)}
