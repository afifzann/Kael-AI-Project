import { bundle } from '@remotion/bundler';
import { makeCancelSignal, renderMedia, renderStill, selectComposition, getVideoMetadata } from '@remotion/renderer';
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function renderRecap(folder, version, props, signal) {
  const output=path.join(folder,`v${version}`);await mkdir(output,{recursive:true});
  const entryPoint=fileURLToPath(new URL('./Root.jsx',import.meta.url));
  await copyFile(entryPoint,path.join(output,'composition.jsx'));
  await copyFile(fileURLToPath(new URL('./captions.mjs',import.meta.url)),path.join(output,'captions.mjs'));
  const serveUrl=await bundle({entryPoint,publicDir:path.join(folder,'panels'),outDir:path.join(output,'bundle')});
  if(signal.aborted)throw new Error('Produksi dihentikan.');
  const composition=await selectComposition({serveUrl,id:'KaelaCH',inputProps:props});
  const {cancelSignal,cancel}=makeCancelSignal();signal.addEventListener('abort',cancel,{once:true});
  try { await renderMedia({serveUrl,composition,inputProps:props,codec:'h264',audioCodec:'aac',outputLocation:path.join(output,'recap.mp4'),concurrency:2,cancelSignal,logLevel:'error'}); }
  finally {signal.removeEventListener('abort',cancel);}
  if(signal.aborted)throw new Error('Produksi dihentikan.');
  await renderStill({serveUrl,composition,inputProps:props,output:path.join(output,'cover.png'),frame:Math.min(10,composition.durationInFrames-1),logLevel:'error'});
  await writeFile(path.join(output,'render-props.json'),JSON.stringify(props,null,2));
  const meta=await getVideoMetadata(path.join(output,'recap.mp4'));
  if(meta.width!==1080||meta.height!==1920)throw new Error('Resolusi hasil render tidak sesuai.');
  return {...meta,duration:composition.durationInFrames/30,fps:30,codec:'h264',audio:props.voice?'aac':'none'};
}
