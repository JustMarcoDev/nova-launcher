// Actualizaciones del launcher
// ===== Actualizaciones (0.2.5) =====
let U={s:"idle"};
const fmtB=b=>b>1048576?(b/1048576).toFixed(1)+" MB/s":Math.round(b/1024)+" KB/s";
function ulabel(){const v=U.v?" "+U.v:"";switch(U.s){case"checking":return"Buscando actualizaciones…";case"available":return"Nueva versión"+v+" disponible";case"downloading":return"Descargando"+v+"… "+Math.round(U.p||0)+"%";case"ready":return"Versión"+v+" lista para instalar";case"none":return"Estás al día ✓ (versión "+VER+")";case"error":return"No se pudo comprobar"+(U.msg?": "+U.msg:"");case"dev":return"Solo funciona en la app instalada";default:return"Versión "+VER}}
let CH=false,umSeen="";
function renderU(){const s=U.s,act=s==="available"||s==="downloading"||s==="ready",ub=$("ub"),up=$("up"),um=$("um"),v=U.v?" "+U.v:"",pc=Math.round(U.p||0);
ub.classList.toggle("on",act);ub.classList.toggle("dl",s==="downloading");ub.classList.toggle("rdy",s==="ready");up.classList.toggle("on",act);up.classList.toggle("rdy",s==="ready");um.classList.toggle("dl",s==="downloading");
document.querySelectorAll("nav [data-p=home],nav [data-p=set]").forEach(b=>b.classList.toggle("bd",act));
if(act){const T=s==="ready"?"Actualización lista para instalar":"1 actualización pendiente",S=s==="ready"?"La versión"+v+" ya está descargada. Reinicia para instalarla; tus mundos, mods y ajustes se conservan.":s==="downloading"?"Descargando la versión"+v+"… "+pc+"%"+(U.bps?" · "+fmtB(U.bps):""):"Nova Launcher"+v+" está disponible. Tus mundos, mods y ajustes se conservan.",B=s==="ready"?"Reiniciar e instalar":s==="downloading"?"Descargando… "+pc+"%":"Actualizar ahora";
$("ubt").innerHTML=(s==="ready"?"":"<em>1</em>")+T.replace("1 actualización pendiente","actualización pendiente");$("ubs").textContent=S;$("ubp").style.width=(s==="ready"?100:pc)+"%";
const b=$("ubb");b.textContent=B;b.disabled=s==="downloading";
$("umt").textContent=T;$("ums").textContent=S;$("ump").style.width=(s==="ready"?100:pc)+"%";const mb=$("umb");mb.textContent=B;mb.disabled=s==="downloading";
$("upt").textContent=s==="ready"?"Reiniciar e instalar":s==="downloading"?pc+"%":"1 actualización";
const key=U.v||"x";if(umSeen!==key){umSeen=key;setTimeout(()=>{if(cfg.updPopup!==false&&(U.s==="available"||U.s==="downloading"||(U.s==="ready"&&!acT&&cfg.autoInstall===false)))um.classList.add("on")},Math.max(300,5300-performance.now()))}}
else um.classList.remove("on");
const mm=$("upm");if(mm)mm.textContent=ulabel();const c=$("chk");if(c){c.disabled=s==="checking"||s==="downloading";c.textContent=s==="available"?"Actualizar ahora":s==="ready"?"Reiniciar e instalar":s==="checking"?"Buscando…":"Buscar actualizaciones"}}
let acT=null,acDone="";
function hideAC(){clearInterval(acT);acT=null;$("ac").classList.remove("on")}
function autoInst(){if(cfg.autoInstall===false||U.s!=="ready"||acDone===(U.v||"x")||RUN||acT)return;acDone=U.v||"x";let n=10;const say=()=>{$("acs").textContent="Nova Launcher"+(U.v?" "+U.v:"")+" se instalará y se reiniciará en "+n+" s"};say();$("ac").classList.add("on");$("um").classList.remove("on");
const go=()=>{hideAC();if(A)A.updInstall();else setU({s:"none"})};$("aci").onclick=go;$("acx").onclick=hideAC;
acT=setInterval(()=>{n--;if(n<=0)go();else say()},1000)}
function setU(o){U=o||{s:"idle"};renderU();autoInst();if(CH&&U.s==="ready"){CH=false;setTimeout(()=>A&&A.updInstall(),600)}}
async function updAction(){const s=U.s;if(s==="available"||s==="downloading")CH=true;
if(!A){demoUpd(s);return}
try{if(s==="available")setU(await A.updDownload());else if(s==="ready")A.updInstall();else if(s!=="downloading"){setU({s:"checking"});setU(await A.updCheck())}}catch(e){setU({s:"error"})}}

