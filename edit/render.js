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
  const dur=29.37,n=Math.round(dur*FPS);
  const z="1+if(between(t,6,11),0.05+0.13*lt(mod(t-6,0.5),0.22),0)+if(gte(t,22),0.03+0.02*sin(t*2),0)";
  const ff=spawn(FF,['-y','-loglevel','error','-i',inp,'-f','image2pipe','-framerate',String(FPS),'-c:v','png','-i','-',
    '-filter_complex',`[0:v]scale=w='trunc(1080*(${z})/2)*2':h=-2:eval=frame,crop=1080:1920[v];[v][1:v]overlay=0:0:format=auto,format=yuv420p[o]`,
    '-map','[o]','-map','0:a','-c:v','libx264','-crf','17','-preset','medium','-c:a','copy','-shortest',out],{stdio:['pipe','inherit','inherit']});
  for(let i=0;i<n;i++){
    await pg.evaluate(t=>window.renderFrame(t),i/FPS);
    const buf=await pg.locator('canvas').screenshot({omitBackground:true});
    if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));
    if(i%60==0)console.log('frame',i,'/',n);
  }
  ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();console.log('done',out);
})();
