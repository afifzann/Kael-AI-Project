import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { initialState, applyCommand } from '../src/domain.ts';
import { createProduction, validateScenes } from '../server/production.mjs';
import { agentActivity } from '../src/visuals.ts';
import { captionPages } from '../server/recap/captions.mjs';

const panels=[{id:'panel-001.jpg'},{id:'panel-002.jpg'}];
const story={readPanels:panels.map(p=>p.id),script:'Pintu tertutup, ia harus mencari jalan keluar.',titles:['Pintu tertutup'],description:'Fixture',scenes:panels.map(p=>({panel:p.id,text:'Pintu tertutup, ia mencari jalan keluar.',seconds:2,keyword:'Pintu'}))};
const wait=async(predicate)=>{for(let n=0;n<200;n++){if(predicate())return;await new Promise(r=>setTimeout(r,25));}throw new Error('Production fixture timed out');};
async function setup(t, overrides={}) {
  const directory=await mkdtemp(path.join(os.tmpdir(),'kael-production-'));
  let state=applyCommand(initialState(),{type:'division',name:'Youtube KaelaCH',manager:'Kaela',workers:[{name:'Nara',role:'Cerita'},{name:'Echo',role:'Audio'},{name:'Zetsu',role:'Editor'}]});
  const turn=async({prompt})=>({summary:'Hasil tahap fixture, bukan respons AI produksi.',blocked:false,data:prompt.includes('Konfirmasi urutannya')?structuredClone(story):prompt.includes('rencanakan cue')?{note:'Tanpa VO',cues:[]}:prompt.includes('payload:{note:string,adjustments')?{note:'Crop diperiksa',adjustments:[]}:{accepted:true,note:'Pemeriksaan sampel fixture; tonton hasil lengkap.'}});
  const options={directory,getState:()=>state,mutate:async c=>(state=applyCommand(state,c)),status:()=>({available:true,label:'TEST FIXTURE',reason:''}),turn,prepare:async folder=>{await mkdir(path.join(folder,'panels'),{recursive:true});return {panels,audioDuration:0};},render:async(folder,v)=>{for(const [name,content] of [['recap.mp4','0123456789'],['cover.png','fixture'],['render-props.json','{}']])await writeFile(path.join(folder,`v${v}`,name),content);},...overrides};
  const production=await createProduction(options);
  t.after(async()=>{production.close();await new Promise(r=>setTimeout(r,60));await rm(directory,{recursive:true,force:true});});
  const upload=()=>{const form=new FormData();form.set('divisionId',state.divisions[0].id);form.set('complete','yes');form.set('title','Chapter fixture');form.append('chapter',new File(['fixture'], '001.png',{type:'image/png'}));return production.upload(form);};
  const action=(action,extra={})=>{const job=production.snapshot().episodes[0];return production.action(job.id,{revision:job.revision,version:job.version,action,...extra});};
  return {production,options,upload,action,state:()=>state,directory};
}

test('scene validation requires every source in reading order and rejects invented sources or invalid timing',()=>{
  assert.equal(validateScenes(story,panels).length,2);
  assert.throws(()=>validateScenes({...story,readPanels:['panel-002.jpg','panel-001.jpg']},panels),/urutan/);
  assert.throws(()=>validateScenes({...story,scenes:[{...story.scenes[0],panel:'invented.jpg'}]},panels),/di luar/);
  assert.throws(()=>validateScenes({...story,scenes:[{...story.scenes[0],seconds:0}]},panels),/Timing/);
});

test('caption pages keep two short lines and preserve the word order',()=>{
  const text='Pintu terkunci. Raka harus mencari jalan keluar sebelum lampu di ruangan itu padam dan dia tertinggal sendirian.';
  const pages=captionPages(text);assert.ok(pages.length>1);assert.ok(pages.every(p=>p.length<=2&&p.every(l=>l.length<=30)));
  assert.equal(pages.flat().join(' '),text);assert.ok(captionPages('x'.repeat(80)).flat().every(l=>l.length<=30));
});

test('upload runs role handoffs, preserves revisions, enforces preview approval and archives on delete',async t=>{
  const x=await setup(t);await x.upload();await wait(()=>x.production.snapshot().episodes[0]?.status==='review');
  let job=x.production.snapshot().episodes[0];assert.equal(job.versions.length,1);assert.equal(job.versions[0].mode,'silent-preview');
  assert.equal(x.state().tasks[0].status,'approval');
  assert.deepEqual(job.messages.filter(m=>m.kind==='agent').map(m=>m.author),['Nara','Kaela','Echo','Zetsu','Kaela']);
  await assert.rejects(x.action('approve'),/Tonton/);
  const stale={revision:job.revision,version:job.version,action:'approve',watched:true};
  await x.action('approve',{watched:true});assert.equal(x.state().tasks[0].status,'done');
  const old=structuredClone(job.versions[0]);await x.action('edit',{text:'Perbaiki crop wajah.'});
  await wait(()=>x.production.snapshot().episodes[0]?.status==='review');job=x.production.snapshot().episodes[0];
  assert.equal(job.versions.length,2);assert.deepEqual(job.versions[0],old);assert.equal(x.state().tasks[0].results.length,2);
  await assert.rejects(x.production.action(job.id,stale),/berubah/);
  await x.action('reject',{text:'Crop belum cocok.'});assert.equal(x.state().tasks[0].status,'cancelled');
  await x.action('chat',{text:'Kenapa crop dipilih?' });await wait(()=>!x.production.snapshot().episodes[0].activeAgentId);
  await x.action('delete');assert.equal(x.production.snapshot().episodes.length,0);
  const disk=JSON.parse(await readFile(path.join(x.directory,'productions/state.json')));assert.equal(disk.episodes[0].status,'deleted');assert.equal(disk.episodes[0].versions.length,2);
  assert.equal(await readFile(path.join(x.directory,'productions',job.id,'v1/recap.mp4'),'utf8'),'0123456789');
});

test('preview media supports range requests and prevents file traversal or access after archive',async t=>{
  const x=await setup(t);await x.upload();await wait(()=>x.production.snapshot().episodes[0]?.status==='review');
  const server=http.createServer(async(req,res)=>{const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};if(!await x.production.handle(req,res,new URL(req.url,'http://localhost'),send))send(res,404,{});});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
  const job=x.production.snapshot().episodes[0],base=`http://127.0.0.1:${server.address().port}/api/production/${job.id}`;
  const range=await fetch(base+'/v1/recap.mp4',{headers:{range:'bytes=2-4'}});assert.equal(range.status,206);assert.equal(await range.text(),'234');
  assert.equal((await fetch(base+'/v1/recap.mp4',{headers:{range:'bytes=999-'}})).status,416);
  assert.equal((await fetch(base+'/v1/sources.json')).status,400);
  assert.equal((await fetch(base+'/v9/recap.mp4')).status,400);
  await x.action('delete');assert.equal((await fetch(base+'/v1/recap.mp4')).status,400);
});

test('deleting running work aborts it without resurrecting the archived episode or approving anything',async t=>{
  let started=false;
  const x=await setup(t,{turn:async({signal})=>{started=true;return new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true});});}});
  await x.upload();await wait(()=>started);await x.action('delete');await new Promise(r=>setTimeout(r,60));
  assert.equal(x.production.snapshot().episodes.length,0);assert.equal(x.state().tasks[0].status,'cancelled');assert.equal(x.state().tasks[0].results.length,0);
  const disk=JSON.parse(await readFile(path.join(x.directory,'productions/state.json')));assert.equal(disk.episodes[0].status,'deleted');
});

test('runtime failure keeps materials and never invents preview, results or approval',async t=>{
  const x=await setup(t,{turn:async()=>{throw new Error('fixture provider offline');}});await x.upload();await wait(()=>x.production.snapshot().episodes[0]?.status==='blocked');
  const job=x.production.snapshot().episodes[0];assert.match(job.error,/offline/);assert.equal(job.versions.length,0);assert.equal(x.state().tasks[0].results.length,0);assert.equal(x.state().tasks[0].status,'blocked');
  assert.ok(await readFile(path.join(x.directory,'productions',job.id,'raw/source-001.png')));
  const reopened=await createProduction(x.options);assert.equal(reopened.snapshot().episodes[0].status,'blocked');reopened.close();
});

test('failed QC gets at most two automatic revisions and stays unapproved until Founder directs it',async t=>{
  const x=await setup(t,{turn:async({prompt})=>({summary:'Fixture QC',blocked:false,data:prompt.includes('Konfirmasi urutannya')?structuredClone(story):prompt.includes('rencanakan cue')?{note:'Tanpa VO'}:prompt.includes('adjustments:[')?{adjustments:[]}:prompt.includes('Ini pemeriksaan sampel gambar')?{accepted:false,note:'Crop perlu diperbaiki'}:{accepted:true,note:'Naskah benar'}})});
  await x.upload();await wait(()=>x.production.snapshot().episodes[0]?.status==='review');
  const job=x.production.snapshot().episodes[0];assert.equal(job.version,3);assert.equal(job.versions.length,3);assert.equal(job.autoRevisions,2);assert.ok(job.versions.every(v=>!v.ready));
  assert.ok(job.messages.some(m=>m.text.includes('maksimal dua revisi')));await assert.rejects(x.action('approve',{watched:true}),/review manager/);
  await x.action('reject',{text:'Hentikan produksi.'});assert.equal(x.state().tasks[0].status,'cancelled');
});

test('production activity follows the active role instead of making every agent type',async t=>{
  const x=await setup(t);const s=x.state(),nara=s.agents.find(a=>a.name==='Nara'),zetsu=s.agents.find(a=>a.name==='Zetsu');
  s.productions=[{id:'episode',divisionId:s.divisions[0].id,status:'running',taskId:'task',activeAgentId:nara.id,stage:'Baca chapter'}];
  assert.equal(agentActivity(s,nara).typing,true);assert.equal(agentActivity(s,zetsu).typing,false);
});
