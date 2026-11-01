// Estadísticas de juego: horas por semana, los 5 que más juegas y el total de capturas.
// Todo sale de stats.json (local), así que funciona sin conexión. Usa el color de acento (--ac).
const STA={d:null,per:"all"};
const stHrs=ms=>{const h=ms/36e5;return h>=10?Math.round(h)+" h":h>=1?h.toFixed(1).replace(".",",")+" h":Math.round(ms/6e4)+" min"};
function stWeek(t){const d=new Date(t);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d.getTime()}
function stTop(rows,key,n){const m=new Map();for(const r of rows){const k=key(r);if(!k)continue;m.set(k,(m.get(k)||0)+r.ms)}return[...m].sort((a,b)=>b[1]-a[1]).slice(0,n)}
function stList(t,L,u){const mx=L.length?L[0][1]:1;return`<div class="card"><h4>${t}</h4>${L.length?L.map(([k,v],i)=>`<div class="stl"><span class="stn">${i+1}</span><div class="stb"><b>${esc(k)}</b><i style="width:${Math.max(4,Math.round(v/mx*100))}%"></i></div><small>${stHrs(v)}</small></div>`).join(""):`<p class="sub" style="margin:6px 0 0">${u}</p>`}</div>`}
function stBuckets(per){const B=[],one=(t,len,lab)=>B.push({t,len,ms:0,lab});
 if(per==="all"){const now=stWeek(Date.now());for(let i=7;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-7*i);one(d.getTime(),6048e5,d.getDate()+"/"+(d.getMonth()+1))}}
 else if(per.length===4){for(let m=0;m<12;m++){const d=new Date(+per,m,1),e=new Date(+per,m+1,1);one(d.getTime(),e-d,String(m+1))}}
 else{const[y,m]=per.split("-").map(Number),n=new Date(y,m,0).getDate();for(let i=1;i<=n;i++){const d=new Date(y,m-1,i);one(d.getTime(),864e5,i%5===1||i===n?String(i):"")}}
 return B}
function stChart(sess,per){const W=stBuckets(per||"all");
 for(const s of sess){const w=W.find(x=>s.start>=x.t&&s.start<x.t+x.len);if(w)w.ms+=s.ms}
 const mx=Math.max(36e5,...W.map(w=>w.ms)),H=120,bw=W.length>12?Math.max(6,Math.floor(300/W.length)):34,g=W.length>12?3:14,wd=W.length*(bw+g)-g+20;
 const nice=h=>h<2?Math.ceil(h*2)/2:Math.ceil(h);const top=nice(mx/36e5);
 let o=`<svg viewBox="0 0 ${wd+30} ${H+34}" class="stc" role="img" aria-label="Horas jugadas">`;
 for(const f of[0,.5,1]){const y=H-f*H+4;o+=`<line x1="30" x2="${wd+30}" y1="${y}" y2="${y}" class="stg"/><text x="26" y="${y+3}" text-anchor="end" class="stt">${(top*f).toString().replace(".",",")}</text>`}
 W.forEach((w,i)=>{const h=Math.round(w.ms/36e5/top*H),x=30+10+i*(bw+g),d=new Date(w.t);
  o+=`<rect style="--i:${i}" x="${x}" y="${H-h+4}" width="${bw}" height="${Math.max(h,w.ms>0?3:0)}" rx="${bw>10?5:2}" class="stbar"><title>${d.getDate()}/${d.getMonth()+1}: ${stHrs(w.ms)}</title></rect>`;
  if(w.lab)o+=`<text x="${x+bw/2}" y="${H+20}" text-anchor="middle" class="stt">${w.lab}</text>`});
 return o+"</svg>"}
function stPeriods(S){const y=new Set(),m=new Set();for(const s of S){if(!s.start)continue;const d=new Date(s.start);y.add(d.getFullYear());m.add(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"))}
 return{y:[...y].sort().reverse(),m:[...m].sort().reverse()}}
function stPerLabel(p){if(p==="all")return trad("Todo el tiempo");if(p.length===4)return p;const[y,m]=p.split("-");return m+"/"+y}
function stIn(s,p){if(p==="all")return true;if(!s.start)return false;const d=new Date(s.start),k=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");return p.length===4?String(d.getFullYear())===p:k===p}
/* «Compartir»: imagen de 1080×1350 con las horas, la instancia más jugada, el servidor más visitado y el logo; se copia al portapapeles */
async function stShare(){const d=STA.d;if(!d)return;const per=STA.per||"all",S=(d.sessions||[]).filter(s=>stIn(s,per)),all=per==="all"?[...S,...(d.before||[])]:S;
 const tot=all.reduce((t,r)=>t+r.ms,0),ti=stTop(all,r=>r.name,1)[0],ts=stTop(S,r=>r.server,1)[0];
 const c=document.createElement("canvas");c.width=1080;c.height=1350;const g=c.getContext("2d"),ac=(getComputedStyle(document.documentElement).getPropertyValue("--ac")||"").trim()||"#8b6cff";
 const bg=g.createLinearGradient(0,0,1080,1350);bg.addColorStop(0,"#0b0d1c");bg.addColorStop(1,"#1d1442");g.fillStyle=bg;g.fillRect(0,0,1080,1350);
 g.fillStyle=ac;g.globalAlpha=.18;g.beginPath();g.arc(900,250,330,0,7);g.fill();g.globalAlpha=1;
 const img=await new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src="assets/tray.png"});
 if(img)g.drawImage(img,80,80,96,96);g.fillStyle="#fff";g.font="700 44px system-ui,Segoe UI,sans-serif";g.fillText("Nova Launcher",img?196:80,142);
 g.fillStyle="#9a9ac0";g.font="500 38px system-ui,Segoe UI,sans-serif";g.fillText(stPerLabel(per),80,300);
 g.fillStyle="#fff";g.font="800 190px system-ui,Segoe UI,sans-serif";g.fillText(stHrs(tot),76,500);
 g.fillStyle=ac;g.font="600 40px system-ui,Segoe UI,sans-serif";g.fillText(trad("de Minecraft jugadas"),80,570);
 const row=(y,l,v)=>{g.fillStyle="rgba(255,255,255,.07)";g.beginPath();g.roundRect(80,y,920,220,28);g.fill();g.fillStyle="#9a9ac0";g.font="500 34px system-ui,Segoe UI,sans-serif";g.fillText(l,120,y+70);g.fillStyle="#fff";g.font="700 56px system-ui,Segoe UI,sans-serif";let t=v;while(g.measureText(t).width>840&&t.length>3)t=t.slice(0,-2);if(t!==v)t+="…";g.fillText(t,120,y+150)};
 row(660,trad("Instancia más jugada"),ti?ti[0]+" · "+stHrs(ti[1]):"—");row(920,trad("Servidor más visitado"),ts?ts[0]+" · "+stHrs(ts[1]):"—");
 g.fillStyle="#6c6c92";g.font="500 30px system-ui,Segoe UI,sans-serif";g.fillText(trad("Hecho con Nova Launcher"),80,1270);
 const blob=await new Promise(r=>c.toBlob(r,"image/png"));
 try{await navigator.clipboard.write([new ClipboardItem({"image/png":blob})]);flash(trad("Imagen copiada al portapapeles ✓"))}
 catch{const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="nova-estadisticas.png";a.click();flash(trad("No se pudo copiar: se ha descargado la imagen"))}}
async function statsOpen(){const el=$("stp");if(!el)return;const api=A||DA;let d;
 try{d=await api.statsGet()}catch(e){flash(em(e));return}
 STA.d=d;el.classList.remove("go");const per=STA.per||"all",S0=d.sessions||[],S=S0.filter(x=>stIn(x,per)),B=per==="all"?(d.before||[]):[],all=[...S,...B],P=stPeriods(S0);
 const tot=all.reduce((t,r)=>t+r.ms,0),pre=B.reduce((t,r)=>t+r.ms,0);
 const nm=r=>r.name||"Instancia",ver=r=>r.mc?"Minecraft "+r.mc+" · "+(r.ld||"Vanilla"):"";
 el.innerHTML=`<div class="acts" style="margin-bottom:10px"><select id="stper" class="inp" aria-label="Periodo"><option value="all">Todo el tiempo</option>${P.y.map(y=>`<option value="${y}">${y}</option>`).join("")}${P.m.map(m=>`<option value="${m}">${stPerLabel(m)}</option>`).join("")}</select><button class="btn sm" id="stsh">Compartir</button></div><div class="stk"><div class="card"><h4>Tiempo jugado</h4><b class="stbig">${stHrs(tot)}</b></div><div class="card"><h4>Partidas</h4><b class="stbig">${S.length}</b></div><div class="card"><h4>Capturas</h4><b class="stbig">${d.shots||0}</b></div></div>
 <div class="card stcc"><h4>Horas jugadas <small>${per==="all"?"últimas 8 semanas":per.length===4?"por mes":"por día"}</small></h4>${S.length?stChart(S,per):'<p class="sub" style="margin:6px 0 0">Aún no hay partidas con fecha. Juega y aparecerán aquí.</p>'}</div>
 <div class="stg3">${stList("Instancias",stTop(all,nm,5),"Sin datos todavía")}${stList("Versiones",stTop(all,ver,5),"Sin datos todavía")}${stList("Servidores",stTop(S,r=>r.server,5),"Aún no has entrado a ningún servidor desde el launcher")}</div>
 ${pre>0?`<p class="sub">Incluye ${stHrs(pre)} jugadas antes de que existieran las estadísticas (sin fecha: no salen en el gráfico).</p>`:""}`;const sel=$("stper");sel.value=per;sel.onchange=()=>{STA.per=sel.value;statsOpen()};$("stsh").onclick=stShare;void el.offsetWidth;el.classList.add("go")}
