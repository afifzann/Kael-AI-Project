import React from 'react';
import {AbsoluteFill,Html5Audio as Audio,Composition,Img,Sequence,interpolate,registerRoot,staticFile,useCurrentFrame} from 'remotion';
import {captionPages} from './captions.mjs';
function Shot({scene}) {
  const frame=useCurrentFrame(), pages=captionPages(scene.text);
  const page=pages[Math.min(pages.length-1,Math.floor(frame/scene.frames*pages.length))]||[];
  const scale=interpolate(frame,[0,scene.frames],[1,scene.zoom],{extrapolateRight:'clamp'});
  const position=`${scene.focusX*100}% ${scene.focusY*100}%`;
  const shake=scene.impact && frame<7 ? Math.sin(frame*2)*5 : 0;
  const caption=page.join('\n'), words=caption.split(/(\s+)/);
  return <AbsoluteFill style={{background:'#151515',opacity:interpolate(frame,[0,3],[0,1],{extrapolateRight:'clamp'})}}>
    <Img src={staticFile(scene.panel)} style={{width:'100%',height:'100%',objectFit:'cover',filter:'blur(24px) brightness(.5)',position:'absolute'}}/>
    <Img src={staticFile(scene.panel)} style={{width:'100%',height:'100%',objectFit:scene.fit,objectPosition:position,transform:`translateX(${shake}px) scale(${scale})`,transformOrigin:position,filter:`contrast(${scene.contrast}) saturate(${scene.saturation})`}}/>
    <div style={{position:'absolute',left:64,right:64,...(Number.isFinite(scene.captionY)?{top:scene.captionY*1920}:scene.captionPosition==='top'?{top:200}:{bottom:280}),fontFamily:'Arial, sans-serif',fontSize:56,fontWeight:900,lineHeight:1.28,textAlign:'center',whiteSpace:'pre-line',color:'white',WebkitTextStroke:'2px black',paintOrder:'stroke fill',textShadow:'0 3px 6px #000'}}>{words.map((word,i)=><span key={i} style={{color:word.toLowerCase().replace(/[^\p{L}\p{N}]/gu,'')===scene.keyword.toLowerCase()?'#ffe15a':'white'}}>{word}</span>)}</div>
  </AbsoluteFill>;
}
function Recap({scenes,voice}) {
  let from=0;
  return <AbsoluteFill>{scenes.map((scene,i)=>{const start=from;from+=scene.frames;return <Sequence key={i} from={start} durationInFrames={scene.frames}><Shot scene={scene}/></Sequence>;})}{voice?<Audio src={staticFile('voiceover.wav')}/>:null}</AbsoluteFill>;
}
registerRoot(()=> <Composition id="KaelaCH" component={Recap} width={1080} height={1920} fps={30} durationInFrames={30} defaultProps={{scenes:[],voice:false}} calculateMetadata={({props})=>({durationInFrames:Math.max(1,props.scenes.reduce((n,s)=>n+s.frames,0))})}/>);
