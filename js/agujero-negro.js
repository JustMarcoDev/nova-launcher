// Agujero negro (fondo animado)
// Agujero negro (animación en bucle)
const cv=$("cv"),x=cv.getContext("2d",{alpha:false}),rnd=Math.random,K=6.35,SQ=.18,DLw=1400,DLh=480;
let W,HT,ST=[],cx=0,cy=0,R=50,al=1,T=0,ang=0,last=0,HR=null,hc=0,b1,b2,c1,c2,SPR=null,spK="",C8=[],FOC=document.hasFocus();
addEventListener("focus",()=>{FOC=true;dirty=30});addEventListener("blur",()=>{FOC=false});
const Q={alta:{n:900,f:60,b:1},media:{n:380,f:60,b:0},baja:{n:0,f:30,b:0},off:{n:500,f:0,b:0}};
const DL=document.createElement("canvas");DL.width=DLw;DL.height=DLh;const lc=DL.getContext("2d");
const D=Array.from({length:900},()=>{const r=1.4+Math.pow(rnd(),1.6)*4.9,t=(r-1.4)/4.9;return{r,t,b:Math.min(7,(t*8)|0),a:rnd()*6.283,z:rnd()-.5,s:rnd()*.6+.7}});
const rs=()=>{W=cv.width=innerWidth;HT=cv.height=innerHeight;const n=Math.round(320*((cfg.stars==null?100:cfg.stars)/100));ST=Array.from({length:n},()=>({x:rnd()*W,y:rnd()*HT,r:rnd()*1.1+.2,p:rnd()*6.3}));b1=document.createElement("canvas");b1.width=(W>>2)||1;b1.height=(HT>>2)||1;b2=document.createElement("canvas");b2.width=(W>>3)||1;b2.height=(HT>>3)||1;c1=b1.getContext("2d");c2=b2.getContext("2d");HR=null;dirty=60};
addEventListener("resize",rs);rs();
function mkSpr(h,s){const S=512,m=S/2,mk=()=>{const c=document.createElement("canvas");c.width=c.height=S;return c},P=[];
const base=mk(),g=base.getContext("2d"),rg=g.createRadialGradient(m,m,0,m,m,m);
rg.addColorStop(.19,`hsla(${h+8},${s}%,96%,0)`);rg.addColorStop(.212,`hsla(${h+8},${s}%,96%,.95)`);rg.addColorStop(.3,`hsla(${h},${s}%,72%,.72)`);rg.addColorStop(.5,`hsla(${h-14},${s}%,52%,.38)`);rg.addColorStop(.8,`hsla(${h-26},${s}%,36%,.13)`);rg.addColorStop(1,`hsla(${h-30},${s}%,30%,0)`);
g.fillStyle=rg;g.fillRect(0,0,S,S);P.push(base);
[[.212,.4,170],[.4,.65,260],[.65,1,320]].forEach(([a,b,n])=>{const c=mk(),q=c.getContext("2d");q.globalCompositeOperation="lighter";
for(let i=0;i<n;i++){const f=a+rnd()*(b-a),r=m*f*.995,t=(f-.212)/.788;q.strokeStyle=`hsla(${h-t*28},${s}%,${92-t*44}%,${(.1+rnd()*.28)*(1-t*.75)})`;q.lineWidth=.7+rnd()*(1+t*1.8);const st=rnd()*6.283;q.beginPath();q.arc(m,m,r,st,st+.08+rnd()*.7);q.stroke()}P.push(c)});
return P}
function half(front,tl,Rb,h0,s0){const l=lc;l.setTransform(1,0,0,1,0,0);l.globalCompositeOperation="source-over";l.clearRect(0,0,DLw,DLh);
l.translate(DLw/2,DLh/2);l.rotate(tl);l.save();l.beginPath();l.rect(-DLw,front?0:-DLh,2*DLw,DLh);l.clip();
const rr=Rb*(front?1.5:1.95),ag=l.createRadialGradient(0,0,Rb*.98,0,0,rr),u=front?.35:1;
ag.addColorStop(0,`hsla(${h0+8},${s0}%,97%,${.95*u})`);ag.addColorStop(.1,`hsla(${h0+6},${s0}%,86%,${.7*u})`);ag.addColorStop(.35,`hsla(${h0-6},${s0}%,62%,${.36*u})`);ag.addColorStop(1,`hsla(${h0-20},${s0}%,45%,0)`);
l.fillStyle=ag;l.beginPath();l.arc(0,0,rr,0,6.283);l.fill();
const S=K*Rb,sp=[0,1.2,.55,.25];l.save();l.scale(1,SQ);SPR.forEach((im,i)=>{l.save();l.rotate(ang*sp[i]);l.drawImage(im,-S,-S,2*S,2*S);l.restore()});l.restore();l.restore();
l.setTransform(1,0,0,1,0,0);l.globalCompositeOperation="destination-in";const gr=l.createLinearGradient(0,0,DLw,0);gr.addColorStop(0,"rgba(0,0,0,.4)");gr.addColorStop(.5,"rgba(0,0,0,.85)");gr.addColorStop(1,"rgba(0,0,0,1)");l.fillStyle=gr;l.fillRect(0,0,DLw,DLh);
x.globalCompositeOperation="lighter";x.globalAlpha=al;x.drawImage(DL,cx-DLw/2,cy-DLh/2)}
// Modo juego: con Minecraft abierto el bucle de dibujo se detiene por completo (no baja a pocos FPS: se para)
let GM=false,RAF=0;
function gameMode(on){const g=!!on&&cfg.gameMode!==false;if(g===GM)return;GM=g;document.documentElement.classList.toggle("gm",g);if(!g&&!RAF){dirty=60;RAF=requestAnimationFrame(frame)}}
function frame(now){if(GM){RAF=0;return}RAF=requestAnimationFrame(frame);
const q=Q[cfg.quality]||Q.alta,pg=RUN&&cfg.pauseGame!==false,cap=+cfg.fps||60;let f=q.f?Math.min(q.f,cap):0;if(pg&&f)f=Math.min(f,30);
if(document.hidden)return;if(f&&A&&cfg.pauseBlur!==false&&!document.hasFocus())f=Math.min(f,RUN?5:15);
if(!f){if(dirty<=0)return}else{if(al<.02)f=Math.min(f,24);if(now-last<1000/f-3)return}
last=now;dirty--;const k=f?60/f:0,sp=(cfg.rmotion?.15:1)*k*((cfg.bhSpeed==null?100:cfg.bhSpeed)/100);T+=.016*k;ang+=.0065*sp;
if(hc--<=0||!HR){hc=15;HR=document.querySelector(".hero").getBoundingClientRect()}
const sz=(cfg.bhSize||100)/100,hm=$("home").classList.contains("on");let tx,ty,tr,ta;
if(hm&&HR.height){tx=HR.left+HR.width/2;ty=HR.top+HR.height*.34;tr=Math.min(HR.height*.2,112)*sz;ta=1}else{tx=W*.72;ty=HT*.52;tr=Math.min(HT*.1,50)*sz;ta=cfg.bhOther===false?0:.38}
if(!cx){cx=tx;cy=ty;R=tr}cx+=(tx-cx)*.07;cy+=(ty-cy)*.07;R+=(tr-R)*.07;al+=(ta-al)*.06;
const vis=al>.02,Rb=Math.min(75*sz,R*(1+.012*Math.sin(T*.8))),h0=BHs[0],s0=BHs[1],tl=(cfg.bhTilt==null?-6:cfg.bhTilt)*Math.PI/180+.025*Math.sin(T*.25),ct=Math.cos(tl),st=Math.sin(tl),key=h0+","+s0;
if(spK!==key){SPR=mkSpr(h0,s0);spK=key;C8=Array.from({length:8},(_,j)=>`hsl(${h0-j*3.5},${s0}%,${92-j*6}%)`)}
x.globalCompositeOperation="source-over";x.globalAlpha=1;x.fillStyle=BG;x.fillRect(0,0,W,HT);
x.fillStyle="#fff";const te=Rb*1.7,lens=vis&&cfg.bhLens!==false;
for(const s of ST){let px=s.x,py=s.y,m=1;if(lens){const dx=px-cx,dy=py-cy,d=Math.hypot(dx,dy)||1;if(d<Rb*14){const dd=(d+Math.sqrt(d*d+4*te*te))/2;px=cx+dx/d*dd;py=cy+dy/d*dd;m=Math.min(2.2,dd/d)}}x.globalAlpha=(.2+.22*Math.sin(T*1.1+s.p))*(.5+.5*al)*(1+(m-1)*.3);x.fillRect(px,py,s.r*m,s.r*m)}
if(vis){x.globalCompositeOperation="lighter";
const g=x.createRadialGradient(cx,cy,Rb*.9,cx,cy,Rb*7.5);g.addColorStop(0,`hsla(${h0},${s0}%,55%,${.26*al})`);g.addColorStop(.4,`hsla(${h0-12},${s0}%,40%,${.07*al})`);g.addColorStop(1,`hsla(${h0},${s0}%,40%,0)`);x.globalAlpha=1;x.fillStyle=g;x.fillRect(0,0,W,HT);
half(false,tl,Rb,h0,s0);
x.globalCompositeOperation="source-over";x.globalAlpha=1;x.fillStyle="#000";x.beginPath();x.arc(cx,cy,Rb,0,6.283);x.fill();
x.globalCompositeOperation="lighter";x.beginPath();x.arc(cx,cy,Rb*1.015,0,6.283);
x.strokeStyle=`hsla(${h0+6},${s0}%,80%,${.2*al})`;x.lineWidth=6;x.stroke();x.strokeStyle=`hsla(${h0+6},${s0}%,92%,${.95*al})`;x.lineWidth=1.6;x.stroke();
half(true,tl,Rb,h0,s0);
const n=q.n;for(let i=0;i<n;i++){const p=D[i];p.a+=p.s*.02/Math.pow(p.r,1.4)*sp;const c=Math.cos(p.a),s=Math.sin(p.a),rr=p.r*Rb,ux=c*rr,uy=s*rr*SQ+p.z*rr*.035,px=cx+ux*ct-uy*st,py=cy+ux*st+uy*ct;if(s<0&&Math.hypot(px-cx,py-cy)<Rb)continue;x.fillStyle=C8[p.b];x.globalAlpha=(1-p.t)*(.3+.7*(.5+.5*c))*.8*al;const z=1+(1-p.t)*1.4;x.fillRect(px,py,z,z)}
if(q.b&&cfg.bhBloom!==false&&!pg){c1.drawImage(cv,0,0,b1.width,b1.height);c2.drawImage(b1,0,0,b2.width,b2.height);x.globalCompositeOperation="lighter";x.globalAlpha=.6;x.drawImage(b2,0,0,W,HT);x.globalAlpha=.4;x.drawImage(b1,0,0,W,HT)}}}
RAF=requestAnimationFrame(frame);
