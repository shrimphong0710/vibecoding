import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const run = promisify(execFile);

async function listenerPid(port) {
  const {stdout} = await run(path.join(process.env.SystemRoot, 'System32', 'netstat.exe'), ['-ano', '-p', 'tcp'], {windowsHide:true});
  const pids = new Set();
  for (const line of stdout.split(/\r?\n/)) {
    const match = line.match(/^\s*TCP\s+(\S+)\s+\S+\s+LISTENING\s+(\d+)\s*$/);
    if (match && ['127.0.0.1:'+port, '0.0.0.0:'+port, '[::]:'+port, '[::1]:'+port].includes(match[1])) pids.add(Number(match[2]));
  }
  if (pids.size !== 1) throw Error('포트를 사용하는 서버를 하나로 확인하지 못했습니다.');
  return [...pids][0];
}

async function nodeProcess(pid) {
  if (!Number.isSafeInteger(pid) || pid < 1 || pid === process.pid) return false;
  const powershell = path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const {stdout} = await run(powershell, ['-NoProfile', '-NonInteractive', '-Command', `(Get-Process -Id ${pid} -ErrorAction Stop).Path`], {windowsHide:true});
  return path.win32.basename(stdout.trim()).toLowerCase() === 'node.exe';
}

// Old releases have no shutdown API. Prove that the listener serves this exact
// dist folder before identifying and stopping its Node process.
export async function stopLegacyServer({root, port, url, fetchImpl=globalThis.fetch, getListener=listenerPid, isNode=nodeProcess, stop=pid=>process.kill(pid)}) {
  if (process.platform !== 'win32' && getListener === listenerPid) throw Error('이전 서버 자동 교체는 Windows에서 지원됩니다.');
  const dist = await fs.realpath(path.join(root, 'dist'));
  const name = '.munji-instance-'+randomUUID()+'.txt';
  const filename = path.join(dist, name), nonce = randomUUID();
  await fs.writeFile(filename, nonce, {flag:'wx'});
  try {
    const ownsFolder = async () => {
      try {
        const response = await fetchImpl(url+'/'+name, {signal:AbortSignal.timeout(2000), cache:'no-store'});
        return response.ok && (await response.text()) === nonce;
      } catch { return false; }
    };
    if (!await ownsFolder()) throw Error('다른 프로그램이 '+port+'번 포트를 사용하고 있습니다. 문지 폴더의 서버가 아니므로 종료하지 않았습니다.');
    const pid = await getListener(port);
    if (!await isNode(pid)) throw Error('기존 문지 서버의 실행 파일을 확인하지 못해 자동 종료하지 않았습니다.');
    if (!await ownsFolder() || await getListener(port) !== pid) throw Error('포트의 실행 프로그램이 바뀌었습니다. 다시 실행해 주세요.');
    await stop(pid);
    return {pid};
  } finally {
    await fs.unlink(filename);
  }
}
