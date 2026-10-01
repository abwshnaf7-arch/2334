"""Align Whisper word TIMES (voice/words.json) to the script tokens in phrases.py.
Whisper text has errors, so we match by fuzzy similarity (Needleman-Wunsch) and only use its times.
Script tokens with no match (e.g. 'ألفين وستة وعشرين' vs '2026') are interpolated between neighbours."""
import json,re,difflib
from phrases import PH
def norm(s):
    s=re.sub('[ً-ْـ]','',s.lower());s=re.sub('[،.؟?!,]','',s)
    return s.translate(str.maketrans('أإآىة','ااايه'))
def sim(a,b):
    a,b=norm(a),norm(b)
    return difflib.SequenceMatcher(None,a,b).ratio()
def align(path):
    W=json.load(open(path))
    toks=[[re.sub('[،.]+$','',t) for t in p.split()] for p in PH]
    flat=[t for ts in toks for t in ts]
    n,m=len(flat),len(W);G=-0.45
    S=[[sim(flat[i],W[j]['word'])*2-0.7 for j in range(m)] for i in range(n)]
    D=[[0]*(m+1) for _ in range(n+1)];B=[[0]*(m+1) for _ in range(n+1)]
    for i in range(1,n+1):D[i][0]=i*G;B[i][0]=1
    for j in range(1,m+1):D[0][j]=j*G;B[0][j]=2
    for i in range(1,n+1):
        for j in range(1,m+1):
            c=[(D[i-1][j-1]+S[i-1][j-1],0),(D[i-1][j]+G,1),(D[i][j-1]+G,2)]
            D[i][j],B[i][j]=max(c)
    i,j=n,m;match={}
    while i>0 or j>0:
        b=B[i][j]
        if i>0 and j>0 and b==0:
            if S[i-1][j-1]>0.1:match[i-1]=j-1
            i-=1;j-=1
        elif i>0 and (j==0 or b==1):i-=1
        else:j-=1
    t=[None]*n
    for i,j in match.items():t[i]=(W[j]['start'],W[j]['end'])
    # interpolate unmatched
    i=0
    while i<n:
        if t[i] is None:
            k=i
            while k<n and t[k] is None:k+=1
            a=t[i-1][1] if i>0 else 0.0
            b=t[k][0] if k<n else W[-1]['end']
            for q in range(i,k):
                t[q]=(a+(b-a)*(q-i)/(k-i),a+(b-a)*(q-i+1)/(k-i))
            i=k
        else:i+=1
    # monotonic, no overlap
    for i in range(1,n):
        s,e=t[i]
        if s<t[i-1][0]:s=t[i-1][0]
        e=max(e,s+0.08);t[i]=(s,e)
    for i in range(n-1):
        if t[i][1]>t[i+1][0]:t[i]=(t[i][0],max(t[i][0]+0.05,t[i+1][0]))
    # spread words that share (almost) the same start
    i=0
    while i<n:
        k=i
        while k+1<n and t[k+1][0]-t[i][0]<0.05:k+=1
        if k>i:
            nxt=t[k+1][0] if k+1<n else t[k][1]+0.3
            nxt=max(nxt,t[i][0]+0.12*(k-i+1))
            for q in range(i,k+1):
                a=t[i][0]+(nxt-t[i][0])*(q-i)/(k-i+1);b=t[i][0]+(nxt-t[i][0])*(q-i+1)/(k-i+1)
                t[q]=(a,b)
        i=k+1
    out=[];k=0
    for ts in toks:
        out.append([{'w':w,'t0':t[k+x][0],'t1':t[k+x][1]} for x,w in enumerate(ts)]);k+=len(ts)
    return out,len(match),n
if __name__=='__main__':
    import sys
    o,mt,n=align(sys.argv[1]);print('matched',mt,'of',n)
    for p in o:print(' '.join(f"{x['w']}@{x['t0']:.2f}" for x in p))
