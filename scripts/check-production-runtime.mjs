// Isolated synthetic fixture: never writes to the owner's app-data/state.json.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { initialState, applyCommand } from '../src/domain.ts';
import { createProduction } from '../server/production.mjs';

const directory=path.resolve('evidence/production-runtime-smoke');await mkdir(directory,{recursive:true});
let state=applyCommand(initialState(),{type:'division',name:'Youtube KaelaCH',manager:'Kaela',workers:[{name:'Nara',role:'Cerita & naskah'},{name:'Echo',role:'Audio'},{name:'Zetsu',role:'Editor'}]});
const production=await createProduction({directory,getState:()=>state,mutate:async command=>(state=applyCommand(state,command))});
const form=new FormData();form.set('divisionId',state.divisions[0].id);form.set('complete','yes');form.set('title','Uji sintetis — pintu dan kunci');form.set('notes','Ini chapter uji sintetis lengkap dua panel. Raka tertahan pintu terkunci, lalu menemukan kunci di meja. Berhenti pada temuan kunci, jangan tambahkan adegan membuka pintu. Bahan sangat singkat; durasi 6–12 detik cukup untuk uji, bukan 60 detik. Tidak ada VO.');
for(let i=1;i<=2;i++)form.append('chapter',new File([await readFile(`evidence/production-render-smoke/panels/panel-00${i}.jpg`)],`00${i}.jpg`,{type:'image/jpeg'}));
const job=await production.upload(form);let previous='';const deadline=Date.now()+12*60*1000;
try{
  while(true){const current=production.snapshot().episodes.find(j=>j.id===job.id),status=current.status+' / '+current.stage;if(previous!==status){console.log(status);previous=status;}
    if(['review','blocked'].includes(current.status)){await writeFile(path.join(directory,'check.json'),JSON.stringify({synthetic:true,job:current,task:state.tasks.find(t=>t.id===job.taskId)},null,2));if(current.status!=='review')throw new Error(current.error);break;}
    if(Date.now()>deadline)throw new Error('Smoke timeout');await new Promise(r=>setTimeout(r,1500));
  }
}finally{production.close();}
