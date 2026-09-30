import json,wave,subprocess,sys,numpy as np
import imageio_ffmpeg
from scipy.signal import butter,sosfilt,resample_poly
FF=imageio_ffmpeg.get_ffmpeg_exe()
SRC=sys.argv[1]  # path to the voice-over wav
SPEED=float(sys.argv[2]) if len(sys.argv)>2 else 1.04  # raise to shorten the video
d=json.load(open('build/align.json'));P=d['phrases']
w=wave.open(SRC);sr=w.getframerate();x=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768
# global silence shrinking with piecewise time map
hop=int(sr*0.01);n=len(x)//hop
db=20*np.log10(np.sqrt((x[:n*hop].reshape(n,hop)**2).mean(1))+1e-9)
sil=db<-38;runs=[];i=0
while i<n:
    if sil[i]:
        j=i
        while j<n and sil[j]:j+=1
        runs.append((i*0.01,j*0.01));i=j
    else:i+=1
ends=[p['t1'] for p in P if p['text'][-1] in '.؟']
segs=[];cur=0.0;newt=0.35;mp=[(0.0,0.35)];out=[np.zeros(int(0.35*sr),np.float32)]
def keep(a,b):
    global newt
    if b<=a:return
    seg=x[int(a*sr):int(b*sr)].copy();f_=min(fade,len(seg)//2)
    seg[:f_]*=np.linspace(0,1,f_);seg[len(seg)-f_:]*=np.linspace(1,0,f_)
    mp.append((a,newt));out.append(seg);newt+=len(seg)/sr;mp.append((b,newt))
fade=int(0.006*sr)
for (a,b) in runs:
    if a<0.05:cur=max(cur,b-0.05);continue
    if b>n*0.01-0.05:break
    L=b-a
    sent=any(abs(e-a)<0.35 or abs(e-b)<0.35 for e in ends)
    g=0.27 if sent else 0.11
    if L<=g+0.04:continue
    keep(cur,a+g/2);out.append(np.zeros(int(g*sr)-2*int(0.0*sr),np.float32));newt+=g
    mp.append((a+g/2,newt-g+0));mp.append((b-g/2,newt))
    cur=b-g/2
keep(cur,n*0.01)
out.append(np.zeros(int(0.5*sr),np.float32))
v=np.concatenate(out)
v=v/(np.abs(v).max()+1e-9)*0.85
ot=np.array([m_[0] for m_ in mp]);nt=np.array([m_[1] for m_ in mp])
def mapt(t):return float(np.interp(t,ot,nt))
tl=[{'text':p['text'],'t0':mapt(p['t0']),'t1':mapt(p['t1'])} for p in P]
def wr(path,a,rate):
    with wave.open(path,'wb') as f:
        f.setnchannels(a.shape[1] if a.ndim>1 else 1);f.setsampwidth(2);f.setframerate(rate)
        f.writeframes((np.clip(a,-1,1)*32767).astype('<i2').tobytes())
wr('build/vo_raw.wav',v,sr)
subprocess.run([FF,'-y','-loglevel','error','-i','build/vo_raw.wav','-filter:a',f'atempo={SPEED}','-ar','44100','build/vo.wav'],check=True)
for q in tl:q['t0']/=SPEED;q['t1']/=SPEED
vd=(len(v)/sr)/SPEED
json.dump({'phrases':tl,'dur':vd},open('build/timeline.json','w'),ensure_ascii=False,indent=1)
print('vo dur',round(vd,2))
# ---- music ----
R=44100;total=vd+1.6;N=int(total*R);bpm=104;beat=60/bpm
m=np.zeros(N,np.float32)
def env(n,a=0.005,r=0.2):
    e=np.ones(n);na=int(a*R);e[:na]=np.linspace(0,1,na);e*=np.exp(-np.linspace(0,1,n)*(1/r)*(n/R)) ;return e
def add(buf,s,idx):
    i=int(idx*R);j=min(N,i+len(s));
    if i<N:buf[i:j]+=s[:j-i]
# kick
tk=np.arange(int(0.25*R))/R
kick=np.sin(2*np.pi*(45+90*np.exp(-tk*28))*tk)*np.exp(-tk*14)*0.9
# hat
rng=np.random.default_rng(3);hat=rng.standard_normal(int(0.06*R))*np.exp(-np.arange(int(0.06*R))/R*70)
hat=sosfilt(butter(4,7000,'hp',fs=R,output='sos'),hat)*0.12
snap=rng.standard_normal(int(0.12*R))*np.exp(-np.arange(int(0.12*R))/R*35);snap=sosfilt(butter(4,[1200,5000],'bp',fs=R,output='sos'),snap)*0.22
chords=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]] # Am F C G
bassn=[45,41,36,43]
def f(n):return 440*2**((n-69)/12)
def tone(fr,dur,kind='pad'):
    tt=np.arange(int(dur*R))/R
    s=np.sin(2*np.pi*fr*tt)+0.4*np.sin(2*np.pi*2*fr*tt+0.3)+0.2*np.sin(2*np.pi*3*fr*tt)
    if kind=='pad':
        e=np.minimum(1,tt/0.25)*np.minimum(1,(dur-tt)/0.4)
    else:
        e=np.exp(-tt*9)*np.minimum(1,tt/0.004)
    return s*e
bars=int(total/(beat*4))+1
for b in range(bars):
    t0=b*beat*4;ch=chords[b%4]
    for n_ in ch:add(m,tone(f(n_),beat*4,'pad')*0.045,t0)
    bn=bassn[b%4]
    for k in range(4):
        add(m,tone(f(bn),beat*0.9,'pluck')*0.16,t0+k*beat)
        add(m,kick,t0+k*beat)
        add(m,hat,t0+k*beat+beat/2)
        if k in (1,3):add(m,snap,t0+k*beat)
    arp=[ch[0]+12,ch[1]+12,ch[2]+12,ch[1]+12,ch[0]+24,ch[2]+12,ch[1]+12,ch[0]+12]
    for k,n_ in enumerate(arp):add(m,tone(f(n_),beat*0.5,'pluck')*0.05,t0+k*beat/2)
m=sosfilt(butter(2,9000,'lp',fs=R,output='sos'),m)
m/=np.abs(m).max()
# ducking by VO envelope
vw=wave.open('build/vo.wav');vx=np.frombuffer(vw.readframes(vw.getnframes()),dtype=np.int16).astype(np.float32)/32768
vx=np.concatenate([vx,np.zeros(max(0,N-len(vx)),np.float32)])[:N]
hop=int(0.02*R);nn=N//hop
e=np.sqrt((vx[:nn*hop].reshape(nn,hop)**2).mean(1));act=(e>0.01).astype(float)
k=np.ones(25)/25;act=np.convolve(act,k,'same');act=np.clip(act*1.5,0,1)
g=np.repeat(0.34-0.20*act,hop);g=np.concatenate([g,np.full(N-len(g),0.34)])
# intro swell & outro
t=np.arange(N)/R;g=g*np.minimum(1,0.5+t/1.2)*np.minimum(1,(total-t)/1.2)
mus=m*g
wr('build/music.wav',mus,R)
mix=np.stack([vx*1.0+mus*0.55]*2,1)
mix=mix/np.abs(mix).max()*0.92
wr('build/mix.wav',mix,R)
print('music+mix done',round(total,2))
