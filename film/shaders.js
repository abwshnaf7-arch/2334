// GLSL programs. Everything is a pure function of uniforms so any frame can be rendered independently.
const SH = {};
SH.VERT = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;

SH.COMMON = `#version 300 es
precision highp float;
uniform vec2 R; uniform float T;
out vec4 fragColor;
float h21(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float h31(vec3 p3){p3=fract(p3*.1031);p3+=dot(p3,p3.zyx+31.32);return fract((p3.x+p3.y)*p3.z);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm2(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n2(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
float fbm3(vec3 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n3(p);p=p*2.02+vec3(1.7,9.2,3.1);a*=.5;}return s;}
float fbm3l(vec3 p){float a=.5,s=0.;for(int i=0;i<3;i++){s+=a*n3(p);p=p*2.02+vec3(1.7,9.2,3.1);a*=.5;}return s;}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
`;

// ---------------------------------------------------------------- ground-view sky + water
SH.SKY = SH.COMMON + `
uniform float pitch, yaw, fovZ;
uniform vec3 cZen,cHor,cSun,cGlow,cCloudL,cCloudD;
uniform vec3 sunDir;
uniform float sunSize,sunI,cover,wind,starAmt,glowAmt,ash,dark,water,waveAmp,camH,exposure;
uniform vec3 fbDir,fbTrail; uniform float fbSize,fbI,trailLen,trailW;
uniform float flash;
vec3 camRay(vec2 uv){
  vec3 r=normalize(vec3(uv.x,uv.y,fovZ));
  float cp=cos(pitch),sp=sin(pitch); r=vec3(r.x,r.y*cp+r.z*sp,r.z*cp-r.y*sp);
  float cy=cos(yaw),sy=sin(yaw); r=vec3(r.x*cy+r.z*sy,r.y,r.z*cy-r.x*sy); return r;
}
float cloudField(vec2 p){return fbm2(p*1.1)*.9+fbm2(p*3.3+7.)*.35;}
vec3 sky(vec3 d, bool refl){
  float e=d.y;
  float t=pow(clamp(e,0.,1.),.45);
  vec3 c=mix(cHor,cZen,t);
  float sdot=dot(d,sunDir); float sd=max(sdot,0.);
  c+=cSun*(pow(sd,5.)*.05+pow(sd,40.)*.28+pow(sd,400.)*.8)*sunI;
  float ang=acos(clamp(sdot,-1.,1.));
  c+=cSun*smoothstep(sunSize,sunSize*.9,ang)*5.*sunI;
  // stars + milky way
  if(starAmt>0.001&&e>-.05){
    vec2 sp=vec2(atan(d.x,d.z)*60.,asin(clamp(d.y,-1.,1.))*60.);
    vec2 id=floor(sp),fp=fract(sp)-.5;
    float r=h21(id); float s=step(.965,r)*smoothstep(.42,0.,length(fp+ (vec2(h21(id+3.),h21(id+7.))-.5)*.5));
    s*=.6+.4*sin(T*(1.+r*3.)+r*40.);
    float band=exp(-pow((d.x*.6+d.y*.8-.15+.25*fbm2(d.xz*2.))*3.,2.));
    float mw=band*fbm2(sp*.08)*.35;
    c+=(vec3(.9,.95,1.)*s*(1.2+2.*h21(id+9.))+vec3(.35,.4,.6)*mw)*starAmt*smoothstep(-.05,.25,e);
  }
  if(e>0.){
    vec2 p=d.xz/(e+.12)*.9+vec2(wind,wind*.3);
    float dn=cloudField(p);
    float dens=smoothstep(1.-cover,1.-cover+.30,dn);
    if(dens>.002){
      vec2 lo=normalize(sunDir.xz+1e-4)*.05;
      float dn2=cloudField(p+lo);
      float lit=clamp((dn-dn2)*7.+.5,0.,1.);
      vec3 cc=mix(cCloudD,cCloudL,lit);
      cc+=cSun*pow(sd,8.)*.7*sunI*(1.-dens*.4);
      cc+=cGlow*glowAmt*(.5+.5*(1.-lit))*.8;
      float fade=smoothstep(0.,.16,e);
      c=mix(c,cc,dens*fade*.94);
    }
  }
  c+=cGlow*glowAmt*(.30+.70*exp(-abs(e)*2.6));
  // fireball + trail (angular local frame)
  if(fbI>0.001){
    float k=dot(d,fbDir);
    if(k>.2){
      vec3 q=d/k-fbDir;
      vec3 up=normalize(fbTrail-fbDir*dot(fbTrail,fbDir));
      vec3 rt=cross(fbDir,up);
      float a=dot(q,up), b=dot(q,rt); // a>0 behind the head
      float rr=length(vec2(a,b));
      float core=exp(-rr*rr/(fbSize*fbSize));
      float halo=exp(-rr/(fbSize*2.4));
      vec3 fcol=vec3(1.,.55,.18);
      vec3 add=vec3(1.,.93,.75)*core*14.+fcol*halo*.9+fcol*exp(-rr/(fbSize*9.))*.22;
      if(a>0.){
        float w=fbSize*trailW*(1.+a/trailLen*2.2);
        float tl=exp(-a/trailLen);
        float tur=.55+.9*fbm2(vec2(a/trailLen*7.,b/w*1.6)+vec2(-T*3.,0.));
        float tr=exp(-b*b/(w*w))*tl*tur;
        float smoke=exp(-b*b/(w*w*9.))*exp(-a/(trailLen*2.4))*(.5+fbm2(vec2(a/trailLen*3.,b/w)+T*.3));
        add+=mix(fcol*1.6,vec3(1.,.9,.7)*2.5,exp(-a/(trailLen*.2)))*tr*2.2;
        c=mix(c,c*.35+cGlow*.1,clamp(smoke*.6,0.,.7));
      }
      c+=add*fbI;
    }
  }
  c=mix(c,vec3(.10,.085,.075)*(.5+.6*fbm2(d.xz/(abs(d.y)+.2)*1.2+T*.02)),clamp(ash,0.,1.)*.92);
  return c;
}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;
  vec3 d=camRay(uv);
  vec3 col;
  if(water>.5 && d.y<0.){
    float tt=camH/max(-d.y,.0009);
    vec2 wp=d.xz*tt;
    float fadeW=exp(-tt*.018);
    float e=.03; float sc=.55;
    float h0=fbm2(wp*sc+vec2(T*.05,T*.03));
    float hx=fbm2((wp+vec2(e,0.))*sc+vec2(T*.05,T*.03));
    float hz=fbm2((wp+vec2(0.,e))*sc+vec2(T*.05,T*.03));
    vec2 g=vec2(hx-h0,hz-h0)/e*waveAmp*fadeW;
    vec3 nrm=normalize(vec3(-g.x,1.,-g.y));
    vec3 r=reflect(d,nrm); r.y=abs(r.y);
    float F=.03+.97*pow(1.-clamp(dot(-d,nrm),0.,1.),4.);
    vec3 deep=mix(cZen*.22,cHor*.16,.5)+vec3(0.,.012,.02);
    col=mix(deep,sky(r,true)*.85,clamp(F*1.05,0.,1.));
    col=mix(col,sky(vec3(d.x,abs(d.y)*.02+.001,d.z),true),1.-exp(-tt*.03));
  } else if(d.y<0.){
    col=mix(sky(vec3(d.x,.0005,d.z),true)*.7,vec3(.02),clamp(-d.y*3.,0.,1.));
  } else col=sky(d,false);
  col*=dark*exposure;
  col+=vec3(1.,.93,.85)*flash;
  col=aces(col*.9);
  col=pow(col,vec3(.4545));
  fragColor=vec4(col,1.);
}`;

// ---------------------------------------------------------------- space: stars, Earth, asteroid
SH.SPACE = SH.COMMON + `
uniform vec3 eArc;      // earth centre uv (x,y) and radius
uniform float eRot,eTilt,cities,eSpin;
uniform vec3 L;          // light direction (view space, toward sun)
uniform vec4 ast;       // asteroid centre uv (x,y), radius, seed
uniform float astRot,heat; uniform vec2 mdir;
uniform float starAmt,exposure,drift,bowGlow;
uniform vec2 shakeUV;
mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0,-s,0,1,0,s,0,c);}
mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1,0,0,0,c,s,0,-s,c);}
mat3 rotZ(float a){float c=cos(a),s=sin(a);return mat3(c,s,0,-s,c,0,0,0,1);}
vec3 stars(vec2 uv){
  vec3 c=vec3(0.);
  for(int l=0;l<3;l++){
    float sc=70.+float(l)*55.;
    vec2 p=(uv+vec2(drift*(.02+.012*float(l)),0.))*sc;
    vec2 id=floor(p),fp=fract(p)-.5;
    float r=h21(id+float(l)*17.);
    vec2 off=(vec2(h21(id+3.),h21(id+7.))-.5)*.6;
    float s=step(.93-float(l)*.01,r)*smoothstep(.33,0.,length(fp-off));
    vec3 tint=mix(vec3(.7,.8,1.),vec3(1.,.85,.7),h21(id+11.));
    c+=tint*s*(.5+2.*h21(id+9.))*(.7+.3*sin(T*2.+r*50.));
  }
  // milky-way haze
  vec2 q=uv*vec2(1.,1.)+vec2(drift*.01,0.);
  float band=exp(-pow((q.y-q.x*.45+.05)*2.4,2.));
  float g=fbm2(q*3.+2.)*fbm2(q*7.);
  c+=vec3(.25,.3,.5)*band*g*.9+vec3(.5,.35,.3)*band*band*g*.25;
  return c*starAmt;
}
float astSdf(vec3 p,float seed){
  float d=length(p)-1.;
  float disp=.46*(fbm3l(p*1.1+seed)-.5)+.10*(n3(p*3.5+seed)-.5)+.04*(n3(p*9.+seed)-.5);
  d+=disp;
  // craters
  for(int i=0;i<7;i++){
    vec3 cp=normalize(vec3(h31(vec3(float(i),seed,1.))-.5,h31(vec3(float(i),seed,2.))-.5,h31(vec3(float(i),seed,3.))-.5)+1e-3);
    float cr=.18+.16*h31(vec3(float(i),seed,4.));
    float dd=length(p/ max(length(p),.01)-cp);
    d+=.09*smoothstep(cr,cr*.35,dd)*-1.+.05*smoothstep(cr*1.15,cr,dd)*smoothstep(cr*.7,cr,dd);
  }
  return d*.8;
}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*R)/R.y+shakeUV;
  vec3 col=stars(uv);
  vec3 Ln=normalize(L);
  // ---------------- earth
  vec2 ep=(uv-eArc.xy)/eArc.z; float r2=dot(ep,ep); float rr=sqrt(r2);
  float atmoW=.055;
  if(rr<1.){
    float z=sqrt(1.-r2); vec3 n=vec3(ep,z);
    vec3 q=rotY(eRot)*rotX(eTilt)*n;
    float cont=fbm3(q*3.1+vec3(3.,1.,2.))+.28*fbm3(q*9.);
    float land=smoothstep(.535,.56,cont);
    float lat=abs(q.y);
    vec3 ocean=mix(vec3(.008,.045,.16),vec3(.02,.17,.32),smoothstep(.50,.545,cont));
    float dry=fbm3(q*4.+9.);
    vec3 ground=mix(vec3(.10,.25,.07),vec3(.42,.34,.19),smoothstep(.35,.7,dry));
    ground=mix(ground,vec3(.85),smoothstep(.78,.9,lat));
    vec3 surf=mix(ocean,ground,land);
    surf=mix(surf,vec3(.9,.95,1.),smoothstep(.86,.95,lat)*(1.-land*.0));
    vec3 cq=rotY(eRot*1.12+T*.01*eSpin)*rotX(eTilt)*n;
    float cl=fbm3(cq*3.4+vec3(T*.01*eSpin,0.,0.));
    float clouds=smoothstep(.5,.72,cl);
    float diff=dot(n,Ln);
    float lit=smoothstep(-.12,.35,diff);
    vec3 dayc=mix(surf,vec3(.95,.97,1.),clouds*.85);
    vec3 spec=vec3(1.,.9,.7)*pow(max(dot(reflect(-Ln,n),vec3(0,0,1)),0.),60.)*(1.-land)*(1.-clouds)*.8;
    vec3 c=dayc*(.06+1.15*max(diff,0.))*lit+spec;
    // night side
    vec3 nightc=surf*.012;
    float cityN=fbm3(q*70.)*fbm3(q*16.+4.)*1.6;
    vec3 cityL=vec3(1.,.72,.35)*smoothstep(.62,.9,cityN)*land*(1.-clouds*.75)*(1.-smoothstep(.8,.9,lat))*cities*1.1;
    cityL+=vec3(1.,.8,.5)*pow(smoothstep(.85,1.1,cityN),2.)*land*cities*2.2;
    c+= (nightc+cityL)*(1.-lit);
    // fresnel atmosphere
    float fr=pow(1.-z,2.6);
    vec3 atm=vec3(.25,.5,1.)*fr*(.25+1.6*smoothstep(-.3,.6,diff))*1.6;
    c+=atm;
    // sunset band at terminator
    c+=vec3(1.,.45,.2)*exp(-pow(diff*5.,2.))*fr*.7;
    col=c;
  } else if(rr<1.+atmoW*3.){
    float k=(rr-1.)/atmoW;
    vec3 nrm=normalize(vec3(ep,0.));
    float dl=dot(nrm,Ln.xyy*vec3(1.,1.,0.)/max(length(Ln.xy),.001));
    float side=smoothstep(-.4,.7,dl);
    vec3 glow=vec3(.22,.48,1.)*exp(-k*2.2)*1.7*(.05+side);
    glow+=vec3(1.,.5,.2)*exp(-pow((dl)*3.,2.))*exp(-k*3.)*.6;
    col+=glow;
  }
  // ---------------- asteroid
  float ar=ast.z;
  vec2 ap=(uv-ast.xy)/max(ar,1e-5);
  float ad=length(ap);
  vec3 hotglow=vec3(0.);
  vec2 md=normalize(mdir);
  if(ad<1.9){
    // ray marching orthographic
    vec3 ro=vec3(ap,3.),rd=vec3(0.,0.,-1.);
    float t=0.; bool hit=false; vec3 pos;
    mat3 rm=rotY(astRot)*rotX(astRot*.6)*rotZ(astRot*.3);
    if(ad<1.25){
      for(int i=0;i<44;i++){
        pos=ro+rd*t; float dd=astSdf(rm*pos,ast.w);
        if(dd<.004){hit=true;break;} t+=dd; if(t>6.)break;
      }
    }
    if(hit){
      vec3 lp=rm*pos; float e=.02;
      vec3 nn=normalize(vec3(astSdf(rm*(pos+vec3(e,0,0)),ast.w)-astSdf(rm*(pos-vec3(e,0,0)),ast.w),
                             astSdf(rm*(pos+vec3(0,e,0)),ast.w)-astSdf(rm*(pos-vec3(0,e,0)),ast.w),
                             astSdf(rm*(pos+vec3(0,0,e)),ast.w)-astSdf(rm*(pos-vec3(0,0,e)),ast.w)));
      vec3 n=transpose(rm)*nn;
      float alb=.55+.9*fbm3(lp*3.+ast.w);
      vec3 base=mix(vec3(.20,.16,.13),vec3(.62,.50,.40),fbm3(lp*2.+5.))*alb;
      float dif=max(dot(n,Ln),0.);
      float rim=pow(1.-max(n.z,0.),3.);
      vec3 c=base*(.07+1.5*dif)+vec3(.25,.35,.6)*rim*.10*(.4+.6*(1.-dif));
      // heated leading face
      float front=smoothstep(-.1,.8,dot(n.xy,md));
      vec3 hc=mix(vec3(1.,.25,.05),vec3(1.,.85,.5),front*front);
      c=mix(c,hc*(2.+3.*fbm3(lp*6.+T*1.3)),clamp(heat*(.25+.9*front),0.,1.));
      c+=vec3(1.,.4,.1)*heat*(.6+rim*2.);
      col=c; hotglow=vec3(0.);
    } else {
      // plasma sheath / bow shock glow
      float rimd=max(ad-1.,0.);
      float fr=smoothstep(-.6,.9,dot(normalize(ap+1e-4),md));
      float g=exp(-rimd*3.5)*heat*(.3+2.*fr)*(.6+.8*fbm2(ap*3.+T*2.));
      col+=mix(vec3(1.,.3,.06),vec3(1.,.8,.5),fr*fr)*g*1.8;
    }
  }
  // bloom-ish outer glow for tiny far asteroid
  if(ar<.02){ float dd=length(uv-ast.xy); col+=vec3(1.,.85,.7)*ar*.004/(dd*dd+ar*ar*4.)*bowGlow; }
  col*=exposure;
  col=aces(col*.9);
  col=pow(col,vec3(.4545));
  fragColor=vec4(col,1.);
}`;

// ---------------------------------------------------------------- rushing clouds (dive / ascent)
SH.CLOUDS = SH.COMMON + `
uniform float prog, dirn; uniform vec3 tint,tintD;
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;
  float z=prog;
  vec3 col=vec3(0.); float a=0.;
  for(int l=0;l<6;l++){
    float fl=float(l);
    float zz=fract(z*dirn*.5+fl/6.);
    float sc=mix(.4,7.,pow(zz,1.6));
    vec2 p=uv*sc+vec2(fl*7.3,fl*3.1)+vec2(0.,T*.02);
    float d=fbm2(p*1.3);
    float dens=smoothstep(.42,.78,d);
    float fade=smoothstep(0.,.25,zz)*smoothstep(1.,.6,zz);
    float lit=clamp((d-fbm2(p*1.3+vec2(.05,.09)))*8.+.55,0.,1.);
    vec3 cc=mix(tintD,tint,lit);
    float w=dens*fade*.8;
    col=mix(col,cc,w); a=max(a,w);
  }
  a=clamp(a*1.2,0.,1.);
  fragColor=vec4(col*a,a); // premultiplied
}`;

// ---------------------------------------------------------------- fire / smoke wall (pyroclastic front)
SH.FIRE = SH.COMMON + `
uniform float prog,heatMul,base,hgt,fscale,alphaMul;
uniform float mode; // 0 fire, 1 dark smoke
void main(){
  vec2 uv=gl_FragCoord.xy/R; uv.x*=R.x/R.y;
  float y=uv.y;
  float yb=base;
  float H=max(hgt,.01);
  float ny=(y-yb)/H;
  vec2 p=vec2(uv.x*fscale,ny*1.2);
  vec2 w=vec2(fbm2(p*1.3+vec2(0.,-T*.6)),fbm2(p*1.3+vec2(5.,-T*.5)));
  float d=fbm2(p*1.6+w*1.9+vec2(0.,-T*.9));
  float topN=fbm2(vec2(uv.x*fscale*.9,T*.3))*.5;
  float mask=smoothstep(1.05+topN,.3+topN,ny)*smoothstep(-.05,.12,ny);
  float dens=clamp((d*1.35-.28)*mask*1.7,0.,1.);
  float temp=dens*(1.15-clamp(ny,0.,1.)*.75)*heatMul*(.6+.8*d);
  vec3 c;
  if(mode<.5){
    c=vec3(0.03,.012,.006);
    c=mix(c,vec3(.6,.06,.01),smoothstep(.15,.45,temp));
    c=mix(c,vec3(1.,.36,.03),smoothstep(.4,.75,temp));
    c=mix(c,vec3(1.,.82,.4),smoothstep(.7,1.1,temp));
    c=mix(c,vec3(1.,.97,.85),smoothstep(1.05,1.6,temp));
    c*=1.6;
  } else {
    c=vec3(.03,.028,.027)+vec3(.3,.09,.03)*smoothstep(.5,1.,temp)*heatMul;
  }
  float a=clamp(dens*1.15,0.,1.)*alphaMul;
  fragColor=vec4(c*a,a);
}`;
