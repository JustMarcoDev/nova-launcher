// Estadísticas de juego: horas por semana, los 5 que más juegas y el total de capturas.
// Todo sale de stats.json (local), así que funciona sin conexión. Usa el color de acento (--ac).
const STA={d:null};
const stHrs=ms=>{const h=ms/36e5;return h>=10?Math.round(h)+" h":h>=1?h.toFixed(1).replace(".",",")+" h":Math.round(ms/6e4)+" min"};
function stWeek(t){const d=new Date(t);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d.getTime()}
function stTop(rows,key,n){const m=new Map();for(const r of rows){const k=key(r);if(!k)continue;m.set(k,(m.get(k)||0)+r.ms)}return[...m].sort((a,b)=>b[1]-a[1]).slice(0,n)}
function stList(t,L,u){const mx=L.length?L[0][1]:1;return`<div class="card"><h4>${t}</h4>${L.length?L.map(([k,v],i)=>`<div class="stl"><span class="stn">${i+1}</span><div class="stb"><b>${esc(k)}</b><i style="width:${Math.max(4,Math.round(v/mx*100))}%"></i></div><small>${stHrs(v)}</small></div>`).join(""):`<p class="sub" style="margin:6px 0 0">${u}</p>`}</div>`}
function stChart(sess){const now=stWeek(Date.now()),W=[];for(let i=7;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-7*i);W.push({t:d.getTime(),ms:0})}
 for(const s of sess){const w=W.find(x=>s.start>=x.t&&s.start<x.t+6048e5);if(w)w.ms+=s.ms}
 const mx=Math.max(36e5,...W.map(w=>w.ms)),H=120,bw=34,g=14,wd=W.length*(bw+g)-g+20;
 const nice=h=>h<2?Math.ceil(h*2)/2:Math.ceil(h);const top=nice(mx/36e5);
 let o=`<svg viewBox="0 0 ${wd+30} ${H+34}" class="stc" role="img" aria-label="Horas por semana">`;
 for(const f of[0,.5,1]){const y=H-f*H+4;o+=`<line x1="30" x2="${wd+30}" y1="${y}" y2="${y}" class="stg"/><text x="26" y="${y+3}" text-anchor="end" class="stt">${(top*f).toString().replace(".",",")}</text>`}
 W.forEach((w,i)=>{const h=Math.round(w.ms/36e5/top*H),x=30+10+i*(bw+g),d=new Date(w.t);
  o+=`<rect x="${x}" y="${H-h+4}" width="${bw}" height="${Math.max(h,w.ms>0?3:0)}" rx="5" class="stbar"><title>${d.getDate()}/${d.getMonth()+1}: ${stHrs(w.ms)}</title></rect>`;
  o+=`<text x="${x+bw/2}" y="${H+20}" text-anchor="middle" class="stt">${d.getDate()}/${d.getMonth()+1}</text>`});
 return o+"</svg>"}
async function statsOpen(){const el=$("stp");if(!el)return;const api=A||DA;let d;
 try{d=await api.statsGet()}catch(e){flash(em(e));return}
 STA.d=d;const S=d.sessions||[],B=d.before||[],all=[...S,...B];
 const tot=all.reduce((t,r)=>t+r.ms,0),pre=B.reduce((t,r)=>t+r.ms,0);
 const nm=r=>r.name||"Instancia",ver=r=>r.mc?"Minecraft "+r.mc+" · "+(r.ld||"Vanilla"):"";
 el.innerHTML=`<div class="stk"><div class="card"><h4>Tiempo jugado</h4><b class="stbig">${stHrs(tot)}</b></div><div class="card"><h4>Partidas</h4><b class="stbig">${S.length}</b></div><div class="card"><h4>Capturas</h4><b class="stbig">${d.shots||0}</b></div></div>
 <div class="card stcc"><h4>Horas por semana <small>últimas 8 semanas</small></h4>${S.length?stChart(S):'<p class="sub" style="margin:6px 0 0">Aún no hay partidas con fecha. Juega y aparecerán aquí.</p>'}</div>
 <div class="stg3">${stList("Instancias",stTop(all,nm,5),"Sin datos todavía")}${stList("Versiones",stTop(all,ver,5),"Sin datos todavía")}${stList("Servidores",stTop(S,r=>r.server,5),"Aún no has entrado a ningún servidor desde el launcher")}</div>
 ${pre>0?`<p class="sub">Incluye ${stHrs(pre)} jugadas antes de que existieran las estadísticas (sin fecha: no salen en el gráfico).</p>`:""}`}
