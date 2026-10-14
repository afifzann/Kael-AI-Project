import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
globalThis[Symbol.for('kael.production.fixture')]={
  status:()=>({available:true,label:'TEST FIXTURE — no AI call',reason:''}),
  prepare:async folder=>{await mkdir(path.join(folder,'panels'),{recursive:true});return {panels:[{id:'panel-001.jpg'}],audioDuration:0};},
  turn:async({prompt})=>({summary:'Fixture stage output',blocked:false,data:prompt.includes('Konfirmasi urutannya')?{readPanels:['panel-001.jpg'],script:'Pintu tertutup.',titles:['Fixture'],description:'Fixture',scenes:[{panel:'panel-001.jpg',text:'Pintu tertutup.',seconds:2}]}:prompt.includes('rencanakan cue')?{note:'Tanpa VO'}:prompt.includes('adjustments:[')?{adjustments:[]}:{accepted:true,note:'Fixture review'}}),
  render:async(folder,v)=>{await writeFile(path.join(folder,`v${v}/recap.mp4`),'fixture-mp4');await writeFile(path.join(folder,`v${v}/cover.png`),'fixture-cover');return {width:1080,height:1920,duration:2};}
};
