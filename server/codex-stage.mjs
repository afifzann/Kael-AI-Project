import { spawn, spawnSync } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

function executable() {
  if(process.env.KAEL_CODEX_PATH)return process.env.KAEL_CODEX_PATH;
  if(process.env.CODEX_CLI_PATH && existsSync(process.env.CODEX_CLI_PATH))return process.env.CODEX_CLI_PATH;
  const folder=path.join(process.env.LOCALAPPDATA||'', 'OpenAI/Codex/bin');
  if(existsSync(folder))for(const entry of readdirSync(folder).reverse()){const file=path.join(folder,entry,'codex.exe');if(existsSync(file))return file;}
  return process.platform==='win32'?'codex.exe':'codex';
}
export function codexStatus() {
  const result=spawnSync(executable(),['login','status'],{windowsHide:true,encoding:'utf8',timeout:10000});
  const available=result.status===0 && /logged in/i.test(result.stdout+result.stderr);
  return {available,label:'Codex lokal · sesi ChatGPT',reason:available?'':'Codex belum tersedia/login. Login Codex CLI di komputer server, lalu coba lagi.'};
}
export function codexStage({folder,prompt,schema,signal,model=''}) {
  signal.throwIfAborted();
  return new Promise((resolve,reject)=>{
    const env={...process.env};for(const key of Object.keys(env))if(/(?:_KEY|_TOKEN|_SECRET|_PASSWORD)$|^N8N_|^CODEX_APP_TOOLS_PIPE_PATH$/.test(key))delete env[key];
    const child=spawn(executable(),['--no-daemon','-a','never','exec','--sandbox','read-only','--skip-git-repo-check','--ephemeral','--json','--color','never',...(/^[\w.:-]{1,120}$/.test(model)?['-m',model]:[]),'-C',folder,'--output-schema',schema,'-'],{env,windowsHide:true,stdio:['pipe','pipe','pipe']});
    let buffer='',final='',bytes=0,failed=false;
    const stop=()=>child.kill();signal.addEventListener('abort',stop,{once:true});
    const timer=setTimeout(()=>{failed=true;stop();},10*60*1000);
    child.stdout.on('data',chunk=>{
      bytes+=chunk.length;if(bytes>4_000_000){failed=true;stop();return;}
      buffer+=chunk.toString();const lines=buffer.split('\n');buffer=lines.pop()||'';
      for(const line of lines)try{const event=JSON.parse(line);if(event.type==='turn.failed')failed=true;if(event.type==='item.completed'&&event.item?.type==='agent_message')final=event.item.text;}catch{}
    });
    child.stderr.resume();
    child.on('error',()=>{clearTimeout(timer);signal.removeEventListener('abort',stop);reject(new Error('Codex tidak dapat dijalankan. Periksa lokasi executable dan login di komputer server.'));});
    child.on('close',code=>{
      clearTimeout(timer);signal.removeEventListener('abort',stop);
      if(signal.aborted)return reject(new Error('Produksi dihentikan.'));
      if(code!==0||failed)return reject(new Error('Runtime Codex gagal atau batas waktu/kuota tercapai. Bahan dan versi lama tetap tersimpan; periksa login/kuota lalu coba ulang.'));
      try{const value=JSON.parse(final);if(typeof value.summary!=='string'||typeof value.blocked!=='boolean'||typeof value.payload!=='string')throw new Error();resolve({...value,data:value.payload?JSON.parse(value.payload):{}});}catch{reject(new Error('Respons AI tidak mengikuti format hasil. Perlu dicoba ulang; tidak ada hasil palsu disimpan.'));}
    });
    child.stdin.on('error',()=>{});child.stdin.end(prompt);
  });
}
