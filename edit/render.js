// usage: node render.js <input.mp4> <out.mp4> [captions.json] | node render.js --still <t> out.png
const {chromium}=require(process.env.PW||'/opt/node22/lib/node_modules/playwright');
const {spawn}=require('child_process');const fs=require('fs'),path=require('path');
const FF=process.env.FFMPEG||'/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2';
const FPS=30;
(async()=>{
  const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1080,height:1920}});
  await pg.goto('file://'+path.resolve('overlay.html'));await pg.evaluate(()=>window.ready);
  const capf=process.argv[2]==='--still'?'captions.json':(process.argv[4]||'captions.json');
  if(fs.existsSync(capf))await pg.evaluate(c=>window.setCaptions(c),JSON.parse(fs.readFileSync(capf,'utf8')));
  if(process.argv[2]==='--still'){
    await pg.evaluate(t=>window.renderFrame(t),+process.argv[3]);
    await pg.locator('canvas').screenshot({path:process.argv[4],omitBackground:true});await b.close();return;}
  const [inp,out]=[process.argv[2],process.argv[3]];
  const START=+(process.env.START||0),COUNT=+(process.env.COUNT||0);const dur=29.37,n=COUNT||Math.round(dur*FPS);const LL=process.env.LL||'error';
  // pass 1: clock layer behind the speaker (alpha)
  if(!fs.existsSync('work/back.mov')){
    const fb=spawn(FF,['-y','-loglevel','error','-f','image2pipe','-framerate',String(FPS),'-c:v','png','-i','-','-c:v','png','-pix_fmt','rgba','work/back.mov'],{stdio:['pipe','inherit','inherit']});
    for(let i=0;i<126;i++){await pg.evaluate(t=>window.renderFrame(t,'back'),i/FPS);
      const buf=await pg.locator('canvas').screenshot({omitBackground:true});if(!fb.stdin.write(buf))await new Promise(r=>fb.stdin.once('drain',r));}
    fb.stdin.end();await new Promise(r=>fb.on('close',r));}
  if(!fs.existsSync('work/person.mov'))spawn.sync;
  const Z="if(lt(t,4),1+0.1*exp(-14*t)+0.015*t,1)";
  // pass 2: front layer as an image sequence (rock-solid constant frame rate, no pipe timing issues)
  fs.mkdirSync('work/front',{recursive:true});
  const RG=(process.env.RANGES||'').split(',').filter(Boolean).map(x=>x.split('-').map(Number));
  for(let i=0;i<n;i++){
    if(RG.length&&!RG.some(([a,b])=>i>=a&&i<=b))continue;
    await pg.evaluate(t=>window.renderFrame(t,'front'),(START+i)/FPS);
    await pg.locator('canvas').screenshot({omitBackground:true,path:`work/front/f${String(i+1).padStart(4,'0')}.png`});
    if(i%60==0)console.log('frame',i,'/',n);
  }
  await b.close();
  if(process.env.NOFF){console.log('frames done');return}
  const ss=START?['-ss',String(START/FPS)]:[];
  const ff=spawn(FF,['-y','-loglevel',LL,...ss,'-i',inp,...ss,'-i','work/back.mov',...ss,'-i','work/person.mov','-framerate',String(FPS),'-i','work/front/f%04d.png',
    '-filter_complex',`[0:v]scale=w='trunc(1080*(${Z})/2)*2':h=-2:eval=frame,crop=1080:1920[v0];[2:v]scale=w='trunc(1080*(${Z})/2)*2':h=-2:eval=frame,crop=1080:1920[p0];[v0][1:v]overlay=0:0:eof_action=pass[a];[a][p0]overlay=0:0:eof_action=pass:format=auto[b];[b][3:v]overlay=0:0:format=auto,format=yuv420p[o]`,
    '-map','[o]','-map','0:a','-c:v','libx264','-crf','17','-preset','medium','-c:a','copy','-shortest',out],{stdio:['ignore','inherit','inherit']});
  await new Promise(r=>ff.on('close',r));console.log('done',out);
})();
