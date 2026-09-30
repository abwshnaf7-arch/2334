import numpy as np, wave, os
HERE=os.path.dirname(os.path.abspath(__file__))
from scipy import signal
SR=48000; TOTAL=125.9; N=int(SR*TOTAL)
rs=np.random.RandomState(7)
def t_(n=N): return np.arange(n)/SR
def env_ad(n,a,d,p=3):
    x=np.arange(n)/SR; return np.minimum(x/a,1)*np.exp(-x/d*p/3) if a>0 else np.exp(-x/d*p/3)
def place(buf,sig,t0,gain=1.0):
    i=int(t0*SR); j=min(len(buf),i+len(sig))
    if i<0 or i>=len(buf): return
    buf[i:j]+=sig[:j-i]*gain
def ramp(pts):
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]; return np.interp(t_(),xs,ys)
def lp(x,fc,order=2):
    b,a=signal.butter(order,fc/(SR/2),'low'); return signal.lfilter(b,a,x)
def bp(x,f0,f1,order=2):
    b,a=signal.butter(order,[f0/(SR/2),f1/(SR/2)],'band'); return signal.lfilter(b,a,x)
def hp(x,fc,order=2):
    b,a=signal.butter(order,fc/(SR/2),'high'); return signal.lfilter(b,a,x)
# ---------------- voice
w=wave.open(os.path.join(HERE,'..','assets','vo.wav')); vo=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768
vo=signal.resample_poly(vo,2,1); voice=np.zeros(N); voice[:len(vo)]=vo[:N]
voice=voice/np.max(np.abs(voice))*0.9
# speech envelope for ducking
h=int(SR*0.05); e=np.sqrt(np.convolve(voice**2,np.ones(h)/h,'same')); e=lp(e,4,1); duck=1-0.35*np.clip(e/0.08,0,1)
# ---------------- pad / drone
def pad(freqs,gain_env,detune=0.003,bright=1200):
    t=t_(); out=np.zeros(N)
    for f in freqs:
        for d in (-1,0,1):
            ff=f*(1+detune*d); ph=rs.rand()*6.28
            # soft saw via few harmonics
            s=sum(np.sin(2*np.pi*ff*k*t+ph*k)/k for k in range(1,6))
            out+=s
    out=lp(out,bright)*gain_env; return out/ (len(freqs)*3)
A=lambda n:440*2**((n-69)/12)
midi=lambda m:A(m)
calm=pad([midi(33),midi(40),midi(45),midi(52),midi(57)],ramp([(0,0),(3,.5),(30,.6),(36,.25),(46,.05),(90,.0),(120,0)]),bright=900)
tens=pad([midi(33),midi(34),midi(40),midi(46)],ramp([(34,0),(50,.5),(58,.8),(59.8,.0),(60,.35),(93,.9),(93.9,.15),(97.6,.12),(97.7,0)]),detune=.006,bright=700)
sad=pad([midi(33),midi(36),midi(40),midi(43)],ramp([(99,0),(103,.35),(112,.4),(116,.15),(118.6,0)]),bright=500)
hope=pad([midi(36),midi(43),midi(48),midi(52),midi(55),midi(62)],ramp([(118.4,0),(122,.55),(123.2,.9),(125,.7),(125.9,0)]),bright=1800)
# ---------------- risers / noise
def noise(n): return rs.randn(n)
def riser(t0,t1,f0,f1,g,pre=0.0):
    n=int((t1-t0)*SR); x=noise(n); tt=np.arange(n)/SR; out=np.zeros(n)
    # swept band-pass via chunks
    ch=2400
    for i in range(0,n,ch):
        f=f0*(f1/f0)**(i/n); seg=x[i:i+ch]
        b,a=signal.butter(2,[max(60,f*.7)/(SR/2),min(f*1.4,20000)/(SR/2)],'band'); out[i:i+ch]=signal.lfilter(b,a,seg)
    out*= (np.arange(n)/n)**2.2*g; buf=np.zeros(N); place(buf,out,t0); return buf
def boom(t0,dur=6,g=1.0):
    n=int(dur*SR); tt=np.arange(n)/SR
    f=28+120*np.exp(-tt*3.2); ph=2*np.pi*np.cumsum(f)/SR
    s=np.sin(ph)*np.exp(-tt/2.4)*1.0+0.5*np.sin(2*ph*0.5+1)*np.exp(-tt/3)
    nz=lp(noise(n),900)*np.exp(-tt/1.2)*0.7+lp(noise(n),4000)*np.exp(-tt/0.25)*0.9
    x=(s+nz)*g; buf=np.zeros(N); place(buf,x,t0); return buf
def whoosh(t0,dur,g,f0=300,f1=6000,peak=.5):
    n=int(dur*SR); x=noise(n); tt=np.linspace(0,1,n); out=np.zeros(n); ch=2400
    for i in range(0,n,ch):
        f=f0*(f1/f0)**(np.sin(np.pi*min(1,(i/n)))**1); b,a=signal.butter(2,[f*.6/(SR/2),min(f*1.6,20000)/(SR/2)],'band'); out[i:i+ch]=signal.lfilter(b,a,x[i:i+ch])
    env=np.sin(np.pi*tt)**2 if peak==.5 else np.where(tt<peak,(tt/peak)**2,((1-tt)/(1-peak))**1.5)
    buf=np.zeros(N); place(buf,out*env*g,t0); return buf
def rumble(t0,t1,g,fc=160):
    n=int((t1-t0)*SR); x=lp(noise(n),fc,3); tt=np.linspace(0,1,n); env=np.minimum(tt*6,1)*np.minimum((1-tt)*4,1)
    x*=env*g*(0.7+0.3*np.sin(2*np.pi*np.cumsum(4+3*rs.rand(n)*0)/SR)); buf=np.zeros(N); place(buf,x,t0); return buf
def thump(t0,g=1.0,f=52):
    n=int(.45*SR); tt=np.arange(n)/SR; x=np.sin(2*np.pi*(f+30*np.exp(-tt*25))*tt)*np.exp(-tt*9)*g; buf=np.zeros(N); place(buf,x,t0); return buf
def pluck(f,dur=2.2,g=.3,bright=6):
    n=int(dur*SR); tt=np.arange(n)/SR; x=sum(np.sin(2*np.pi*f*k*tt)/k**1.5*np.exp(-tt*(1.5+k*1.2)) for k in range(1,bright)); return x*g
def bell(f,dur=3,g=.3):
    n=int(dur*SR); tt=np.arange(n)/SR; x=np.sin(2*np.pi*f*tt)*np.exp(-tt*1.4)+.4*np.sin(2*np.pi*f*2.76*tt)*np.exp(-tt*2.6)+.2*np.sin(2*np.pi*f*5.4*tt)*np.exp(-tt*4); return x*g
music=calm*.55+tens*.6+sad*.6+hope*.7
# heartbeat: accelerating 43->58, frantic 60->93, slowing to silence 93.9 -> 97.4
tb=43.0; iv=1.15
while tb<58.0:
    music+=thump(tb,.55*min(1,(tb-43)/6+.3)); music+=thump(tb+.28,.35); iv=max(.55,iv-.03); tb+=iv
tb=60.0
while tb<93.8:
    iv=.62-.12*(tb-60)/34; music+=thump(tb,.5); music+=thump(tb+.22,.32); tb+=iv
for tb,g in [(94.0,.5),(95.3,.42),(96.8,.32)]: music+=thump(tb,g,45); music+=thump(tb+.32,g*.6,45)
# risers
music+=riser(34.8,42,300,3000,.35)+riser(48,58.1,400,7000,.6)+riser(60,93.6,200,5000,.28)+riser(88,93.9,900,9000,.35)
# impacts on 58.15 and 59.85 and the hit
music+=boom(58.15,3,.55)+whoosh(58.1,2.2,.7,500,9000,.3)+boom(59.85,5,.9)
music+=boom(97.7,9,1.9)
music+=rumble(99.8,104.5,.9,220)+whoosh(99.8,3.6,.9,300,3500,.25)          # fire
music+=whoosh(103.4,4.6,1.0,120,1800,.6)+rumble(103.4,108.2,.8,120)        # sea
music+=boom(107.0,4,.6)
# ambience: birds + wind in the calm section
tt=t_()
wind=lp(noise(N),500,2)*ramp([(0,0),(4,.03),(34,.03),(38,0),(100,0),(108,.05),(113,.05),(118.5,.02),(119.5,.04),(123,0)])
def chirp(t0,f0,f1,dur,g):
    n=int(dur*SR); x=np.arange(n)/SR; f=f0+(f1-f0)*x/dur+120*np.sin(x*80); s=np.sin(2*np.pi*np.cumsum(f)/SR)*np.sin(np.pi*x/dur)**2*g; buf=np.zeros(N); place(buf,s,t0); return buf
birds=np.zeros(N)
for t0 in np.sort(rs.uniform(11,33.5,26)):
    f=rs.uniform(2200,4200)
    for k in range(rs.randint(2,5)): birds+=chirp(t0+k*.13,f,f*rs.uniform(.8,1.3),.09,.06)
for t0 in np.sort(rs.uniform(120.4,123,10)): birds+=chirp(t0,3000,3800,.1,.05)
# plucks: sparse falling notes during lights (113-118.5), rising hopeful after 118.8
pl=np.zeros(N)
for i,(t0,m) in enumerate([(113.4,76),(114.3,72),(115.1,69),(115.9,67),(116.8,64),(117.6,60),(118.3,57)]): place(pl,bell(midi(m),3.2,.28*(1-i*.06)),t0)
for i,(t0,m) in enumerate([(119.0,64),(119.5,67),(120.0,71),(120.6,72),(121.3,76),(122.0,79),(123.25,84),(123.8,79),(124.3,76)]): place(pl,bell(midi(m),3,.22),t0)
# reverb on music bus
ir_n=int(3.2*SR); ir=noise(ir_n)*np.exp(-np.arange(ir_n)/SR*1.6); ir=lp(ir,6000); ir/=np.sqrt(np.sum(ir**2))
def reverb(x,wet=.35): return x*(1-wet)+signal.fftconvolve(x,ir)[:N]*wet*1.3
bus=music+pl*1.0
bus=reverb(bus,.32)
bus+=wind*.8+birds*.9
bus*=np.where((tt>=57.9)&(tt<60.5),1,duck*0+1)  # keep impacts undimmed
# duck under voice except big moments
big=np.clip(1-(np.exp(-((tt-97.7)/2.5)**2)),0,1)
bus=bus*(0.75+0.25*duck)
bus=bus/np.max(np.abs(bus))*0.85
mix=voice*1.0+bus*0.55
# fades
mix*=np.clip(tt/.4,0,1)*np.clip((TOTAL-tt)/1.2,0,1)
mix=np.tanh(mix*1.05)/np.tanh(1.05)
mix=mix/np.max(np.abs(mix))*0.95
# stereo: slight width on music
L=voice*1.0+bus*0.55; 
d=int(.012*SR); wide=np.roll(bus,d)
left=mix; right=(voice*1.0+ (bus*.7+wide*.3)*0.55)
right=np.tanh(right*1.05)/np.tanh(1.05); right=right*np.clip(tt/.4,0,1)*np.clip((TOTAL-tt)/1.2,0,1); right=right/np.max(np.abs(right))*0.95
st=np.stack([left,right],1)
out=(st*32767).astype(np.int16)
wf=wave.open(os.path.join(HERE,'..','assets','mix.wav'),'wb'); wf.setnchannels(2); wf.setsampwidth(2); wf.setframerate(SR); wf.writeframes(out.tobytes()); wf.close()
print('ok',len(out)/SR)
