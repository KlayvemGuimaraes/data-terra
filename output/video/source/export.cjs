const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const out=path.resolve(__dirname,'..');
const input=path.join(out,'captures','raw-takes.webm');
const inspect=file=>JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{maxBuffer:8*1024*1024}));
const source=inspect(input),stream=source.streams.find(s=>s.codec_type==='video');
const ratio=stream.r_frame_rate.split('/').map(Number),fps=ratio[0]/ratio[1];
const pixels=execFileSync('ffmpeg',['-v','error','-i',input,'-vf','crop=8:8:0:0,scale=1:1:flags=area,format=rgb24','-f','rawvideo','pipe:1'],{maxBuffer:8*1024*1024});
const production=JSON.parse(fs.readFileSync(path.join(out,'captures','recording.json'),'utf8'));
const deliveries=[];
for(const [index,clip] of production.clips.entries()){
 const matches=[];
 for(let i=0;i<pixels.length/3;i++){
  const [r,g,b]=pixels.subarray(i*3,i*3+3);
  if(index===0?r>155&&g<90&&b>90:r<90&&g>155&&b>155)matches.push(i);
 }
 if(!matches.length)throw new Error('Missing cue for '+clip.name);
 const start=matches[0],end=matches.at(-1)+1;
 if((end-start)/fps<clip.duration-.16)throw new Error('Recording too short: '+clip.name);
 const output=path.join(out,clip.name+'.mp4');
 execFileSync('ffmpeg',['-y','-v','error','-i',input,'-an','-vf',`trim=start_frame=${start}:end_frame=${end},setpts=PTS-STARTPTS,drawbox=x=0:y=0:w=9:h=9:color=0x101b17:t=fill,tpad=stop_mode=clone:stop_duration=1,fps=30`,'-t',String(clip.duration),'-c:v','libx264','-preset','slow','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart','-metadata','title='+clip.name,'-metadata','comment=DataTerra | Interface real, edição de demonstração e animação da marca',output],{stdio:['ignore','ignore','pipe'],maxBuffer:8*1024*1024});
 const verification=inspect(output);const v=verification.streams.find(s=>s.codec_type==='video');
 if(v.width!==1920||v.height!==1080||Number(verification.format.duration)!==clip.duration)throw new Error('Export validation failed');
 const posterTime=index===0?8.5:14.7;
 execFileSync('ffmpeg',['-y','-v','error','-ss',String(posterTime),'-i',output,'-frames:v','1',path.join(out,clip.name+'.jpg')]);
 const times=index===0?[.2,1.2,2.7,4.5,6.4,8.5]:[.4,3.2,5.8,7.3,9.7,11,12.3,14.6];
 for(let j=0;j<times.length;j++)execFileSync('ffmpeg',['-y','-v','error','-ss',String(times[j]),'-i',output,'-frames:v','1','-vf','scale=640:360',path.join(out,'captures',`clip-${index+1}-${String(j).padStart(2,'0')}.jpg`)]);
 deliveries.push({file:path.basename(output),duration:Number(verification.format.duration),width:v.width,height:v.height,fps:v.r_frame_rate,codec:v.codec_name,size:Number(verification.format.size),sourceFrames:{start,end,fps},reviewTimes:times});
 console.log(JSON.stringify(deliveries.at(-1)));
}
fs.writeFileSync(path.join(out,'captures','export-verification.json'),JSON.stringify(deliveries,null,2));
