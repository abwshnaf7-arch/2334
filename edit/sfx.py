import numpy as np, wave
from scipy.signal import butter, sosfilt, lfilter
SR=48000; DUR=29.37
out=np.zeros((int(SR*DUR)+SR,2))
rng=np.random.default_rng(7)
def env(n,a=.005,d=None,curve=3):
    t=np.arange(n)/SR; d=d or n/SR
    e=np.minimum(1,t/max(a,1e-4))*np.exp(-curve*t/d)
    return e
def place(x,t,gain=1.0,pan=0.0):
    i=int(t*SR); x=np.asarray(x)
    if x.ndim==1: x=np.stack([x*(1-max(0,pan)),x*(1+min(0,pan))],1)
    n=min(len(x),len(out)-i)
    if n>0: out[i:i+n]+=x[:n]*gain
def bp(x,lo,hi):
    sos=butter(2,[lo,hi],btype='band',fs=SR,output='sos'); return sosfilt(sos,x)
def whoosh(dur=.6,f0=300,f1=5000,up=True):
    n=int(SR*dur); x=rng.standard_normal(n)
    # sweeping bandpass via chunks
    y=np.zeros(n); ch=512
    for s in range(0,n,ch):
        p=s/n; f=f0*(f1/f0)**(p if up else 1-p)
        sos=butter(2,[max(60,f*.6),min(SR/2-100,f*1.5)],btype='band',fs=SR,output='sos')
        y[s:s+ch]=sosfilt(sos,x[s:s+ch])
    t=np.linspace(0,1,n); e=np.sin(np.pi*t)**1.6
    return y*e/ (np.abs(y*e).max()+1e-9)
def boom(dur=1.2,f=55):
    n=int(SR*dur); t=np.arange(n)/SR
    fr=f*(1+2.5*np.exp(-t*14)); ph=2*np.pi*np.cumsum(fr)/SR
    x=np.sin(ph)*np.exp(-t*3.2)
    nz=bp(rng.standard_normal(n),80,900)*np.exp(-t*9)*.6
    return (x+nz)*np.minimum(1,t/.003)
def hit(dur=.35,f=180):
    n=int(SR*dur); t=np.arange(n)/SR
    return (np.sin(2*np.pi*f*(1+1.5*np.exp(-t*30))*t)*np.exp(-t*14)+bp(rng.standard_normal(n),1500,7000)*np.exp(-t*40)*.5)
def click(f=2500,dur=.05,g=1):
    n=int(SR*dur); t=np.arange(n)/SR
    return (bp(rng.standard_normal(n),f*.6,min(f*2,SR/2-200))*np.exp(-t*120)+np.sin(2*np.pi*f*t)*np.exp(-t*160)*.4)*g
def snip(): # scissors
    a=click(4200,.06); b=click(3200,.05)
    x=np.zeros(int(SR*.16)); x[:len(a)]+=a; x[int(SR*.07):int(SR*.07)+len(b)]+=b*.8
    return x
def pop(f=700):
    n=int(SR*.14); t=np.arange(n)/SR
    return np.sin(2*np.pi*(f*(1+1.2*np.exp(-t*40)))*t)*np.exp(-t*28)
def chime(f=1319,dur=1.2,g=1):
    n=int(SR*dur); t=np.arange(n)/SR; x=0
    for k,m in enumerate([1,2.01,3.02,4.2]):
        x=x+np.sin(2*np.pi*f*m*t)*np.exp(-t*(3+2*k))/(k+1)
    return x*np.minimum(1,t/.004)*g
def riser(dur=1.0,f0=200,f1=2000):
    n=int(SR*dur); t=np.arange(n)/SR; fr=np.geomspace(f0,f1,n)
    x=np.sin(2*np.pi*np.cumsum(fr)/SR)*.5+bp(rng.standard_normal(n),f0,f1*2)*.5
    return x*(t/dur)**1.5*np.minimum(1,(dur-t)/.02+0)
def tick(f=1800,g=1):
    return click(f,.035)*g
def key():
    a=click(rng.uniform(1800,3200),.05,.9);b=hit(.05,rng.uniform(120,220))*.25;n=min(len(a),len(b));return a[:n]+b[:n]
def laser(dur=1.8):
    n=int(SR*dur); t=np.arange(n)/SR
    fr=900+300*np.sin(2*np.pi*3*t)+500*t/dur
    x=np.sign(np.sin(2*np.pi*np.cumsum(fr)/SR))*.25+np.sin(2*np.pi*np.cumsum(fr*2.01)/SR)*.2
    return bp(x,500,6000)*np.minimum(1,t/.05)*np.minimum(1,(dur-t)/.15)
def blip(f): n=int(SR*.07);t=np.arange(n)/SR;return np.sin(2*np.pi*f*t)*np.exp(-t*45)
def sparkle(dur=1.1):
    x=np.zeros(int(SR*dur))
    for i in range(14):
        t0=rng.uniform(0,dur*.7); f=rng.choice([2093,2637,3136,3520,4186]); c=chime(f,.35,.4)
        j=int(t0*SR); x[j:j+len(c)]+=c[:len(x)-j]
    return x
def rumble(dur=5,g=1):
    n=int(SR*dur); x=bp(rng.standard_normal(n),30,120)
    t=np.linspace(0,1,n); return x*np.minimum(1,t*10)*np.minimum(1,(1-t)*10)*g

WS=[4,6,11,14,17,22.3]
# ---- scene 1: HOOK
place(boom(1.3,46),0.0,.9); place(hit(.4,90),0.0,.6); place(whoosh(.45,300,7000),0.0,.5)
for k in range(6): place(click(rng.uniform(2500,6000),.03),0.02+k*.045,.35)   # glitch ticks
for k,tt in enumerate(np.linspace(.4,2.9,60)):
    f=1300+(tt/3.7)*1800; place(tick(f),tt,.14+.16*(tt/3.0)); 
place(riser(2.6,120,3200),.35,.34)
place(whoosh(.35,2500,400,up=False),2.7,.3)
place(boom(1.6,44),2.95,1.0); place(hit(.4,110),2.95,.6); place(chime(1046,1.6),2.97,.3); place(whoosh(.3,600,6000),2.9,.4)
# ---- cuts
for i,c in enumerate(WS): 
    place(whoosh(.6,400,5000),c-.4,.32); place(hit(.4,150),c,.28)
# ---- scene 2
for k,tt in enumerate(np.linspace(4.15,5.1,14)): place(blip(500+k*70),tt,.14)
place(click(2200),4.15,.35)
place(riser(.45,300,2600),4.8,.3)
place(boom(1.4,52),5.28,.75); place(chime(1568,1.4),5.3,.28); place(whoosh(.4,900,7000),5.2,.35)
# ---- scene 3: Cut & Clean (6-8) then caption (8-11)
place(whoosh(.5,400,3500),5.6,.2)
place(click(2400),6.72,.55); place(pop(520),6.74,.3); place(boom(.5,80),6.76,.25)          # click Cut & Clean
for k in range(4): place(snip(),6.9+k*.1,.42)                                              # scissors on each silence
place(riser(.7,300,1800),7.15,.16); place(whoosh(.7,2500,500,up=False),7.2,.3)           # ripple close
place(chime(1568,.9),7.85,.22)
place(whoosh(.5,500,4000),7.95,.28)
place(click(2400),8.95,.55); place(pop(520),8.97,.3); place(chime(1319,.8),9.0,.18)        # Generate Caption
place(whoosh(.45,500,4000),9.1,.24)
place(whoosh(.5,400,3800),9.42,.26)
for k in range(6):
    tt=9.5+.12+k*.17+.14
    place(hit(.18,140+k*10),tt,.34); place(click(2200+k*150),tt,.3)                          # clips snap on timeline
place(riser(1.2,250,2200),9.6,.13)
place(chime(1568,1.5),10.75,.3); place(sparkle(1.0),10.75,.28)
# ---- scene 4
for k,tt in enumerate(np.linspace(11.45,12.0,5)): place(key(),tt+rng.uniform(0,.03),.55)
place(click(2600),11.2,.45); place(pop(600),11.15,.2)
for k in range(9): place(pop(500+k*40),12.0+k*.06,.22)
for si,tt in enumerate([12.4,12.9,13.4]):
    place(click(2000),tt-.05,.4); place(whoosh(.45,600,3500),tt,.3); place(hit(.25,90),tt+.5,.4)
for c in [12.75,13.25,13.75]: place(whoosh(.36,700,6500),c-.18,.45)
# ---- scene 5
place(whoosh(.5,300,3500),14.0,.3)
place(laser(1.85),14.5,.34)
for k in range(18): place(blip(800+k*60),14.5+k*.1,.2)
place(riser(.55,500,3500),15.85,.3)
place(chime(2093,1.6),16.3,.4); place(sparkle(1.2),16.3,.5); place(hit(.4,120),16.3,.4)
# ---- scene 6
for k in range(17):
    tt=17.1+k*.075
    place(pop(450+ (k%6)*90),tt,.2,pan=(-1)**k*.5)
place(boom(1.2,50),17.32,.7); place(chime(1319,1.6),17.35,.35); place(sparkle(1.0),17.4,.45)
place(rumble(4.6,1),17.3,.15)
place(riser(.6,300,2500),21.4,.3)
# ---- scene 7
place(whoosh(.5,500,5500),22.1,.5); place(boom(1.3,58),22.36,.75); place(hit(.4,140),22.38,.5); place(chime(1568,1.5),22.45,.3)
for k in range(int(DUR-22.9)):
    tt=22.9+k+ (0.0)
    place(tick(1900 if k<int(DUR-22.9)-3 else 2600),tt+0.37,.22)
place(chime(2093,1.2),DUR-.9,.2)
# ---- master: soft compress + normalize
m=np.tanh(out*1.3)/1.3
m=m/np.abs(m).max()*0.9
pcm=(m[:int(SR*DUR)]*32767).astype(np.int16)
with wave.open('work/sfx.wav','wb') as w:
    w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm.tobytes())
print('ok')
