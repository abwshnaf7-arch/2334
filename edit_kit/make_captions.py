import re
segs=[(0,4,"مين قال لك إنك لازم تبيع بنفس سعر المنافس بتاعك؟"),
(4,7,"هو تكلفته زي تكلفتك؟"),(7,10,"نفس الخامات؟ نفس العمالة؟ نفس الإنتاجية؟"),
(10,14,"نفس الهالك؟ نفس المصاريف؟ طبعاً لا."),
(14,20,"ممكن المنافس بتاعك يكون بيبيع بـ 500 جنيه وتكلفته 350،"),
(20,25,"وانت بتبيع بـ 500 جنيه وتكلفتك 460."),
(25,29,"الاتنين نفس السعر لكن مش نفس الربح."),
(29,34,"وعلشان كده، التسعير مش المنافس بتاعك بيبيع بكام،"),
(34,38,"التسعير لازم يبدأ بسؤال: أنا بتكلف كام؟"),
(38,43,"وبعدها ندرس السوق والمنافسة وهامش المساهمة،"),
(43,47,"وباقي العوامل المناسبة للنشاط بتاعك،"),
(47,52,"لإن ممكن تكون بتبيع بسعر السوق لكن السعر ده مش مناسب لتكلفتك انت."),
(52,58,"أنا علي حمزة، محاضر دولي وخبرة فعلية أكتر من 25 سنة")]
HL={"المنافس","سعر","تكلفته","تكلفتك","500","350","460","السعر","الربح","التسعير","تكلفتك","بتكلف","السوق","المنافسة","هامش","المساهمة","25","نفس","جنيه"}
HL_STRONG={"الربح","السعر","التسعير","500","350","460","بتكلف","25","هامش","المساهمة"}
def chunks(t,n=3):
    w=[x.replace('\x01',' ') for x in t.replace('بـ ','بـ\x01').split()]; out=[];i=0
    while i<len(w):
        k=n if len(w)-i!=n+1 else 2  # avoid 1-word orphan
        out.append(w[i:i+k]); i+=k
    return out
def ts(s):
    h=int(s//3600);m=int(s%3600//60);x=s%60
    return f"{h}:{m:02d}:{x:05.2f}"
def srt(s):
    ms=int(round(s*1000));return f"{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d},{ms%1000:03d}"
ass=["[Script Info]","ScriptType: v4.00+","PlayResX: 1080","PlayResY: 1920","WrapStyle: 2","",
"[V4+ Styles]","Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding",
# ASS colours are BGR: white, outline #0B2A5B -> 5B2A0B
"Style: Cap,Fatimah Arabic ITF,96,&H00FFFFFF,&H00FFFFFF,&H005B2A0B,&H80000000,0,0,0,0,100,100,0,0,1,7,2,2,60,60,520,1","",
"[Events]","Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text"]
sr=[];n=1
for a,b,t in segs:
    cs=chunks(t); tot=sum(len(c) for c in cs); cur=a
    for c in cs:
        d=(b-a)*len(c)/tot; e=cur+d
        runs=[]  # [strong?, [words]] grouped; libass lays runs out LTR, so reverse run order
        for w in c:
            k=re.sub(r"[^\w]","",w.replace("ـ",""))
            st=k in HL_STRONG
            if runs and runs[-1][0]==st: runs[-1][1].append(w)
            else: runs.append([st,[w]])
        parts=[("{\\c&HFAE927&}"+" ".join(ws)+"{\\c&HFFFFFF&}") if st else " ".join(ws) for st,ws in runs]
        txt=" ".join(parts[::-1]) if len(runs)>1 else parts[0]
        # pop-in: scale 70->108->100 + fade, mimics a punchy text animation
        ass.append(f"Dialogue: 0,{ts(cur)},{ts(e)},Cap,,0,0,0,,{{\\fad(60,40)\\fscx70\\fscy70\\t(0,120,\\fscx108\\fscy108)\\t(120,200,\\fscx100\\fscy100)}}{txt}")
        sr.append(f"{n}\n{srt(cur)} --> {srt(e)}\n{' '.join(c)}\n");n+=1;cur=e
open("captions.ass","w",encoding="utf-8").write("\n".join(ass)+"\n")
open("captions.srt","w",encoding="utf-8").write("\n".join(sr))
print(n-1,"captions")
