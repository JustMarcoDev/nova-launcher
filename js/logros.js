// Logros del launcher: pestaña con todos los logros y el platino, y el aviso que sale al conseguir uno.
// Los datos salen de main/logros.js (nombres y descripciones en español; trad() los traduce al pintarlos).
const LG={d:null,cat:"all",f:"all",tk:0};
const LGT={b:"Bronce",s:"Plata",g:"Oro",p:"Platino"};
const lgDate=t=>new Date(t).toLocaleDateString(undefined,{day:"2-digit",month:"2-digit",year:"numeric"});
function lgCard(x){
 const pr=x.got||x.bonus?"":x.secret?"":`<div class="lgb"><i style="width:${x.pct}%"></i></div><small>${fN(x.have)} / ${fN(x.goal)}</small>`;
 return`<div class="lgc ${x.tier} ${x.got?"got":"no"}${x.secret&&!x.got?" sec":""}" data-id="${x.id}"><div class="lgi"><svg class="ic"><use href="#i-${x.secret&&!x.got?"key":"trophy"}"/></svg></div><div class="lgt"><b>${esc(x.name)}</b><span>${esc(x.desc)}</span>${pr}${x.got?`<small class="lgd"><span>${LGT[x.tier]}</span> · ${lgDate(x.t)}</small>`:`<small class="lgd"><span>${LGT[x.tier]}</span> · ${x.pts} <span>pts</span></small>`}</div></div>`}
function fN(n){return(+n||0).toLocaleString(undefined,{maximumFractionDigits:1})}
function lgPaint(){
 const d=LG.d,el=$("lgp");if(!d||!el)return;
 const plat=d.list.find(x=>x.tier==="p"),rest=d.list.filter(x=>x.tier!=="p"&&!x.bonus),mcl=d.list.filter(x=>x.bonus),gotN=rest.filter(x=>x.got).length;
 const cats=[["all","Todos"],...d.cats];
 let L=(LG.cat==="mc"?mcl:rest).filter(x=>(LG.cat==="all"||LG.cat==="mc"||x.cat===LG.cat)&&(LG.f==="all"||(LG.f==="got")===x.got));
 L.sort((a,b)=>LG.f==="got"?b.t-a.t:(a.got-b.got)||(b.pct-a.pct));
 const pct=Math.round(gotN/rest.length*100);
 el.innerHTML=`<div class="lgh card"><div class="lgr" style="--p:${pct}"><b>${pct}%</b></div><div class="lgs"><h3>${gotN} de ${rest.length} logros</h3><p class="sub">${fN(d.pts)} de ${fN(d.ptsTotal)} puntos</p><p class="sub">${d.mcGot} de ${d.mcTotal} avances de Minecraft</p><div class="chips" id="lgf"></div></div>
  <div class="lgc p ${plat.got?"got":"no"} lgplat"><div class="lgi"><svg class="ic"><use href="#i-trophy"/></svg></div><div class="lgt"><b>${esc(plat.name)}</b><span>${esc(plat.desc)}</span>${plat.got?`<small class="lgd">${lgDate(plat.t)}</small>`:`<div class="lgb"><i style="width:${plat.pct}%"></i></div><small>${gotN} / ${rest.length}</small>`}</div></div></div>
  <div class="chips" id="lgc"></div>${LG.cat==="mc"?`<p class="sub">Solo cuentan los avances que consigas desde la beta 0.2.19-beta.4, en mundos de un jugador de instancias con el menú de Nova (Vanilla o Fabric, 1.20 o superior). Minecraft los guarda en el disco al autoguardar o al salir del mundo, así que el aviso puede tardar un poco. No cuentan para el platino.</p>`:""}<div class="lgg">${L.length?L.map(lgCard).join(""):`<p class="sub">No hay logros con este filtro.</p>`}</div>`;
 chips($("lgf"),[["all","Todos"],["got","Conseguidos"],["no","Pendientes"]],LG.f,k=>{LG.f=k;lgPaint()});
 chips($("lgc"),cats,LG.cat,k=>{LG.cat=k;lgPaint()});
}
async function lgOpen(){
 const el=$("lgp");if(!el)return;const tk=++LG.tk;
 try{const d=await(A?A.logrosGet():DA.logrosGet());if(tk!==LG.tk)return;LG.d=d;lgPaint();if(A){if(d.list.some(x=>x.got&&!x.seen))A.logrosSeen().catch(()=>{})}}
 catch(e){el.innerHTML=`<p class="sub">${esc(em(e))}</p>`}
}
/* Tarjeta de «Logro conseguido» en el launcher (parecida a la de Minecraft). Se apilan si llegan varias a la vez. */
const LGQ=[];let lgBusy=false;
function lgToast(x){LGQ.push(x);if(!lgBusy)lgNext()}
function lgNext(){
 const x=LGQ.shift();if(!x){lgBusy=false;return}lgBusy=true;
 const t=document.createElement("div");t.className="lgtoast "+x.tier;
 t.innerHTML=`<div class="lgi"><svg class="ic"><use href="#i-trophy"/></svg></div><div class="lgt"><small>${x.tier==="p"?"¡Platino conseguido!":"Logro conseguido"}</small><b>${esc(x.name)}</b><span>${esc(x.desc)}</span></div>`;
 document.body.appendChild(t);requestAnimationFrame(()=>t.classList.add("on"));
 setTimeout(()=>{t.classList.remove("on");setTimeout(()=>{t.remove();lgNext()},450)},x.tier==="p"?7000:5000);
 if(LG.d&&$("lgr")&&$("lgr").classList.contains("on"))lgOpen();
}
