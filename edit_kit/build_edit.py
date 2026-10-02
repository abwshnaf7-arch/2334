import subprocess
from PIL import Image, ImageDraw, ImageFont
F="477ae652-FatimahArabicITF-Black.otf"
V="/root/.claude/uploads/e76d0780-b8bd-5a73-8197-6a3a09c1eb55/43d92575-_______.mp4"
W,H=1080,1920
# ---- B-roll slide (market & competition), navy/white/blue like reference ----
im=Image.new("RGB",(W,H),"#FDFCFD"); d=ImageDraw.Draw(im)
NAVY,BLUE,LB="#0F2139","#4A8FD0","#B4C8D6"
d.rectangle((0,0,300,420),fill=NAVY); d.rectangle((W-260,H-520,W,H),fill=NAVY)
def card(x,y,w,h):
    d.rounded_rectangle((x,y,x+w,y+h),16,fill="#FFFFFF",outline=LB,width=3)
card(60,120,440,340)
for i,h in enumerate([90,150,120,210,260]): d.rectangle((90+i*70,420-h,140+i*70,420),fill=BLUE if i%2==0 else NAVY)
card(560,120,460,340)
pts=[(590,400),(690,300),(790,360),(890,230),(990,170)]
d.line(pts,fill=BLUE,width=8)
for p in pts: d.ellipse((p[0]-12,p[1]-12,p[0]+12,p[1]+12),fill="#FFFFFF",outline=BLUE,width=5)
card(640,1560,380,230)
d.pieslice((690,1590,830,1730),-90,90,fill=BLUE); d.pieslice((690,1590,830,1730),90,270,fill=NAVY)
card(60,1500,380,260)
for i in range(4): d.rectangle((90,1540+i*52,150+ (4-i)*55,1580+i*52),fill=BLUE)
ft=ImageFont.truetype(F,170)
for i,t in enumerate(["ندرس","السوق","والمنافسة"]):
    d.text((W/2,560+i*190),t,font=ft,fill=NAVY,anchor="ma",direction="rtl",language="ar")
im.save("slide_market.png")
# ---- text widths for strike line ----
def tw(t,s): return ImageFont.truetype(F,s).getlength(t)
w2=tw("لكن مش نفس الربح",100)
# ---- ASS: captions + cards + lower third ----
base=open("captions.ass",encoding="utf-8").read()
styles=("Style: Card,Fatimah Arabic ITF,100,&H00EEF6FD,&H00EEF6FD,&H00507CC0,&H00507CC0,0,0,0,0,100,100,0,0,3,28,0,5,0,0,0,1\n"
"Style: Big,Fatimah Arabic ITF,118,&H00FAE927,&H00FAE927,&H005B2A0B,&H80000000,0,0,0,0,100,100,0,0,1,8,2,5,0,0,0,1\n"
"Style: Big2,Fatimah Arabic ITF,100,&H00FFFFFF,&H00FFFFFF,&H005B2A0B,&H80000000,0,0,0,0,100,100,0,0,1,8,2,5,0,0,0,1\n"
"Style: Name,Fatimah Arabic ITF,84,&H00FAE927,&H00FAE927,&H00132A5E,&H80000000,0,0,0,0,100,100,0,0,1,4,0,5,0,0,0,1\n"
"Style: Sub,Fatimah Arabic ITF,40,&H00EEF6FD,&H00EEF6FD,&H00132A5E,&H80000000,0,0,0,0,100,100,0,0,1,3,0,5,0,0,0,1\n"
"Style: Bar,Fatimah Arabic ITF,40,&H00132A5E,&H00132A5E,&H00132A5E,&H00132A5E,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1\n")
base=base.replace("\n[Events]",  "\n"+styles+"\n[Events]")
def ts(s): return f"{int(s//3600)}:{int(s%3600//60):02d}:{s%60:05.2f}"
ev=[]
pop="{\\fad(80,80)\\fscx60\\fscy60\\t(0,150,\\fscx108\\fscy108)\\t(150,260,\\fscx100\\fscy100)}"
def cardpair(a,b,l1,l2):
    ev.append(f"Dialogue: 2,{ts(a)},{ts(b)},Card,,0,0,0,,{{\\pos(540,700)}}{pop}{l1}")
    ev.append(f"Dialogue: 2,{ts(a+0.25)},{ts(b)},Card,,0,0,0,,{{\\pos(540,880)}}{pop}{l2}")
cardpair(14,20,"ببيع 500ج","تكلفته 350ج")      # competitor
cardpair(20,25,"ببيع 500ج","تكلفتك 460ج")      # you
ev.append(f"Dialogue: 2,{ts(25)},{ts(29)},Big,,0,0,0,,{{\\pos(540,640)}}{pop}الاتنين نفس السعر")
ev.append(f"Dialogue: 2,{ts(25.6)},{ts(29)},Big2,,0,0,0,,{{\\pos(540,790)}}{pop}لكن مش نفس الربح")
x2=540+w2/2+20; x1=540-w2/2-20
ev.append(f"Dialogue: 3,{ts(26.4)},{ts(29)},Bar,,0,0,0,,{{\\an7\\pos(0,0)\\clip({int(x2)},700,{int(x2)},860)\\t(0,350,\\clip({int(x1)},700,{int(x2)},860))\\c&H2925E5&\\p1}}m {int(x1)} 812 l {int(x2)} 796 l {int(x2)} 822 l {int(x1)} 838{{\\p0}}")
# lower third (name), at the self-introduction
ev.append(f"Dialogue: 2,{ts(52)},{ts(59.4)},Bar,,0,0,0,,{{\\an7\\pos(0,0)\\fad(150,0)\\c&H2D5CC0&\\p1}}m 70 780 l 1010 780 l 1020 960 l 60 960{{\\p0}}")
ev.append(f"Dialogue: 3,{ts(52)},{ts(59.4)},Name,,0,0,0,,{{\\pos(540,840)\\fad(250,0)}}علي حمزه")
ev.append(f"Dialogue: 3,{ts(52.2)},{ts(59.4)},Sub,,0,0,0,,{{\\pos(540,925)\\fad(300,0)}}محاضر دولي | خبرة 25 سنة في التكاليف والربحية والرقابة")
open("edit.ass","w",encoding="utf-8").write(base+"\n".join(ev)+"\n")
# ---- zoom cuts ----
close=[(4,7),(10,14),(20,25),(29,34),(43,47),(52,59.5)]
cuts=sorted({c for a,b in close for c in (a,b)})
z="1+0.24*("+"+".join(f"between(t,{a},{b})" for a,b in close)+")"
pulse="+".join(f"0.05*gt(t,{c})*lt(t,{c+0.3})*(1-(t-{c})/0.3)" for c in cuts)
zexpr=f"({z}+{pulse})"
S,E=38.2,43.0
fc=(f"[0:v]scale={W}:{H},setsar=1,scale=w='trunc({W}*{zexpr}/2)*2':h='trunc({H}*{zexpr}/2)*2':eval=frame,"
    f"crop={W}:{H}:'(iw-{W})/2':'(ih-{H})*0.12'[a];"
    f"[1:v]scale=1188:2112,zoompan=z='1.0+0.0006*on':d=1:s={W}x{H}:fps=30000/1001,format=yuva420p,"
    f"fade=t=in:st=0:d=0.25:alpha=1,fade=t=out:st={E-S-0.25}:d=0.25:alpha=1,setpts=PTS+{S}/TB[s];"
    f"[a][s]overlay=enable='between(t,{S},{E})':eof_action=pass,ass=edit.ass:fontsdir=.[v]")
subprocess.run(["ffmpeg","-v","error","-y","-i",V,"-loop","1","-framerate","30000/1001","-t","6","-i","slide_market.png",
 "-filter_complex",fc,"-map","[v]","-map","0:a","-c:v","libx264","-crf","20","-preset","fast","-pix_fmt","yuv420p","-c:a","aac","-b:a","192k","final_edit.mp4"],check=True)
