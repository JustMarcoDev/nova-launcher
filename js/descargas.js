// Descargas (pausar, cancelar, limitar velocidad) y Diagnóstico
const DQW=document.createElement("div");DQW.id="dqw";DQW.setAttribute("role","status");
DQW.innerHTML=`<div class="dqi"><svg class="ic"><use href="#i-dl"/></svg></div><div class="dqt"><b id="dqb">Descargando…</b><span id="dqs"></span></div><select id="dql" title="Velocidad máxima" aria-label="Velocidad máxima"></select><button class="btn sm" id="dqp" type="button">Pausar</button><button class="btn sm dg" id="dqc" type="button">Cancelar</button>`;
document.body.appendChild(DQW);
const DQL=[[0,"Sin límite"],[1,"1 MB/s"],[3,"3 MB/s"],[10,"10 MB/s"],[30,"30 MB/s"]];
let DQS={active:0,paused:false,limit:0,speed:0};
function fSpeed(b){b=+b||0;return b>=1048576?(b/1048576).toFixed(1)+" MB/s":(b/1024).toFixed(0)+" KB/s"}
function fEta(s){s=Math.max(1,Math.round(+s||0));if(s<60)return s+" s";const m=Math.floor(s/60);if(m<60)return m+" min"+(s%60&&m<10?" "+(s%60)+" s":"");const h=Math.floor(m/60);return h+" h"+(m%60?" "+(m%60)+" min":"")}
function dqDraw(s){
  DQS={...DQS,...s};DQW.classList.toggle("on",DQS.active>0);
  $("dqb").textContent=DQS.paused?"Descarga en pausa":"Descargando…";
  $("dqs").textContent=DQS.paused?DQS.active+" en cola":DQS.active+" en curso · "+fSpeed(DQS.speed)+(DQS.eta>0?" · faltan "+fEta(DQS.eta):"");
  $("dqp").textContent=DQS.paused?"Reanudar":"Pausar";
  const sl=$("dql");if(!sl.options.length)sl.innerHTML=DQL.map(([v,t])=>`<option value="${v}">${t}</option>`).join("");
  const lim=DQL.some(x=>x[0]===+DQS.limit)?+DQS.limit:0;if(+sl.value!==lim&&document.activeElement!==sl)sl.value=lim;
}
$("dqp").onclick=async()=>{if(A){await A.dqPause(!DQS.paused)}else dqDraw({paused:!DQS.paused})};
$("dqc").onclick=async()=>{if(!confirm("¿Cancelar las descargas en curso? Lo ya descargado se conserva."))return;if(A)await A.dqCancel();else dqDraw({active:0})};
$("dql").onchange=async()=>{const v=+$("dql").value;if(A){await A.dqLimit(v);cfg.dlLimit=v}else dqDraw({limit:v});if(typeof buildSet==="function"&&$("set").classList.contains("on"))buildSet()};
if(A){A.on("dq",dqDraw);try{A.dqState().then(dqDraw).catch(()=>{})}catch{}}

// ----- Diagnóstico -----
const DGI={ok:"✓",warn:"!",bad:"✕"};
async function openDiag(id){
  const iid=id||(sel.inst&&I.some(x=>x.id===sel.inst)?sel.inst:(I[0]&&I[0].id));
  modal(hdr(null,"Diagnóstico","Revisión de tu equipo")+`<div class="dgl" id="dgl"><div class="dgw"><i class="spn"></i>Comprobando conexión, memoria, Java y espacio en disco…</div></div><div class="acts"><button class="btn" id="dgc" disabled>Copiar informe</button><button class="btn" id="dgi" disabled>Reportar un error</button><button class="btn" id="dgr" disabled>Repetir</button><button class="btn pr" data-x>Cerrar</button></div>`,"wide");
  let r;try{r=A?await A.diag(iid):await demoDiag()}catch(e){if($("dgl"))$("dgl").innerHTML=`<div class="dgw">${esc(em(e))}</div>`;return}
  if(!$("dgl"))return;
  const bad=r.checks.filter(c=>c.level==="bad").length,warn=r.checks.filter(c=>c.level==="warn").length;
  $("dgl").innerHTML=`<div class="dgs ${bad?"b2":warn?"w2":"ok"}">${bad?bad+" problema"+(bad>1?"s":"")+" por resolver":warn?warn+" aviso"+(warn>1?"s":""):"Todo en orden"}${r.name?" · "+esc(r.name):""}</div>`+r.checks.map(c=>`<div class="dgr2 ${c.level==="warn"?"w2":c.level==="bad"?"b2":"ok"}"><i>${DGI[c.level]||"·"}</i><div><b>${esc(c.t)}</b><span>${esc(c.d)}</span></div></div>`).join("");
  $("dgc").disabled=$("dgr").disabled=$("dgi").disabled=false;
  $("dgi").onclick=()=>reportIssue("Problema detectado en el diagnóstico","Nova Launcher "+VER+"\n"+r.text);
  $("dgc").onclick=async()=>{try{await navigator.clipboard.writeText("Nova Launcher "+VER+"\n"+r.text);flash("Informe copiado")}catch{flash("No se pudo copiar")}};
  $("dgr").onclick=()=>openDiag(iid);
}
