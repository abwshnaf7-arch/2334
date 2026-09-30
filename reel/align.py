import wave,numpy as np,json
from phrases import PH
F="/root/.claude/uploads/960b1a2e-111e-5610-98f9-f45e0776afe5/669966e0-Generated_Audio_September_30_2026_-_4_01AM.wav"
w=wave.open(F);sr=w.getframerate();x=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(float)/32768
hop=int(sr*0.01);n=len(x)//hop
db=20*np.log10(np.sqrt((x[:n*hop].reshape(n,hop)**2).mean(1))+1e-9)
sil=db<-38
runs=[];i=0
while i<n:
    if sil[i]:
        j=i
        while j<n and sil[j]:j+=1
        if (j-i)*0.01>=0.08: runs.append((i*0.01,j*0.01))
        i=j
    else:i+=1
# speech span
s0=runs[0][1] if runs and runs[0][0]==0 else 0
e0=runs[-1][0] if runs and runs[-1][1]>=n*0.01-0.02 else n*0.01
runs=[r for r in runs if r[0]>0.05 and r[1]<n*0.01-0.05]
chars=np.array([len(p.replace(' ','')) for p in PH],float)
cum=np.concatenate([[0],np.cumsum(chars)])/chars.sum()
K=len(PH)-1
mids=[(a+b)/2 for a,b in runs];M=len(mids)
tf=[(m-s0)/(e0-s0) for m in mids]
INF=1e18
dp=np.full((K+1,M),INF);bk=np.zeros((K+1,M),int)
for m in range(M): dp[1][m]=(tf[m]-cum[1])**2
for k in range(2,K+1):
    for m in range(k-1,M):
        best=INF;bi=0
        for p in range(k-2,m):
            v=dp[k-1][p]
            if v<best:best=v;bi=p
        dp[k][m]=best+(tf[m]-cum[k])**2;bk[k][m]=bi
m=int(np.argmin(dp[K]));sel=[m]
for k in range(K,1,-1):
    m=bk[k][m];sel.append(m)
sel=sel[::-1]
segs=[];prev=s0
for idx,pi in enumerate(sel):
    a,b=runs[pi];segs.append((prev,a));prev=b
segs.append((prev,e0))
out=[{'text':PH[i],'t0':round(a,2),'t1':round(b,2)} for i,(a,b) in enumerate(segs)]
json.dump({'phrases':out,'dur':n*0.01,'sr':sr},open('build/align.json','w'),ensure_ascii=False,indent=1)
for o in out: print(o['t0'],o['t1'],o['text'])
