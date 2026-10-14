// Cuentas y capturas
// ===== Cuentas, capturas, consola y más (0.2.12) =====
function ago(t){if(!t)return"nunca";const m=Math.round((Date.now()-t)/6e4);if(m<1)return"ahora mismo";if(m<60)return"hace "+m+" min";const h=Math.round(m/60);if(h<24)return"hace "+h+" h";const d=Math.round(h/24);return d<30?"hace "+d+(d===1?" día":" días"):new Date(t).toLocaleDateString(LCUR)}
function fPl(ms){ms=+ms||0;const m=Math.floor(ms/6e4);if(m<1)return ms>0?"menos de 1 min":"0 min";if(m<60)return m+" min";const h=Math.floor(m/60);return h+" h"+(m%60?" "+(m%60)+" min":"")}
function plLine(i){return"Jugado "+fPl(i.playMs)+" · "+(i.lastPlayed?"última vez "+ago(i.lastPlayed):"aún sin jugar")}
function verCmp(a,b){const p=s=>{const q=String(s).replace(/^v/,"").split("-");return[q[0].split(".").map(Number),q[1]||""]};const[x,xp]=p(a),[y,yp]=p(b);for(let i=0;i<3;i++){const d=(x[i]||0)-(y[i]||0);if(d)return d}return xp===yp?0:!xp?1:!yp?-1:(xp<yp?-1:1)}
// --- Cuentas ---
function curAcc(){const L=cfg.accounts||[];return L.find(a=>a.id===cfg.activeAccount)||L[0]||{type:cfg.ms?"microsoft":"offline",name:cfg.ms?cfg.ms.name:cfg.username}}
function applyAccs(r){if(!r||r.error)return r;cfg.accounts=r.accounts;cfg.activeAccount=r.active;const a=curAcc();cfg.username=a.name;cfg.ms=a.type==="microsoft"?{name:a.name}:null;head();return r}
if(!A){cfg.accounts=[{id:"o1",type:"offline",name:"Jugador"},{id:"m1",type:"microsoft",name:"Marco"}];cfg.activeAccount="o1"}
Object.assign(DA,{accAddOffline:async n=>{if(!/^[A-Za-z0-9_]{3,16}$/.test(n))throw new Error("El nombre debe tener de 3 a 16 letras, números o _");if(cfg.accounts.some(a=>a.type==="offline"&&a.name.toLowerCase()===n.toLowerCase()))throw new Error("Ya tienes una cuenta offline con ese nombre");const id="o"+Date.now();cfg.accounts=[...cfg.accounts,{id,type:"offline",name:n}];return{accounts:cfg.accounts,active:id}},
accSwitch:async id=>({accounts:cfg.accounts,active:id}),accRemove:async id=>{if(cfg.accounts.length<2)throw new Error("Debe quedar al menos una cuenta");cfg.accounts=cfg.accounts.filter(a=>a.id!==id);return{accounts:cfg.accounts,active:cfg.activeAccount===id?cfg.accounts[0].id:cfg.activeAccount}},
login:async()=>({error:"Vista previa: el inicio de sesión de Microsoft solo funciona en la app instalada"})});
function accHtml(){const L=cfg.accounts||[];return`<div class="acl">${L.map(a=>`<div class="acr ${a.id===cfg.activeAccount?"on":""}" data-id="${esc(a.id)}"><img src="https://minotar.net/avatar/${encodeURIComponent(a.name)}/32" alt="" onerror="this.style.visibility='hidden'"><div class="acn"><b>${esc(a.name)}</b><small>${a.type==="microsoft"?"Microsoft":"Offline"}${a.id===cfg.activeAccount?" · en uso":""}</small></div>${L.length>1?'<button class="btn sm dg" data-a="rm" title="Quitar esta cuenta">✕</button>':""}</div>`).join("")}</div><div class="aca"><input id="aon" type="text" maxlength="16" placeholder="Nombre offline nuevo"><button class="btn sm" data-a="off">Añadir offline</button></div><button class="btn sm pr" data-a="ms" style="width:100%;margin-top:8px">Añadir cuenta de Microsoft</button><div class="aer" id="aer"></div>`}
async function accClick(e,redraw){if(e.target.closest("input"))return;const b=e.target.closest("button[data-a]"),row=e.target.closest(".acr"),api=A||DA,er=$("aer");
try{if(b){const a=b.dataset.a;
if(a==="rm"){const ac=cfg.accounts.find(x=>x.id===row.dataset.id);if(!confirm("¿Quitar la cuenta «"+ac.name+"» del launcher?"))return;applyAccs(await api.accRemove(row.dataset.id))}
else if(a==="off")applyAccs(await api.accAddOffline($("aon").value.trim()));
else if(a==="ms"){b.disabled=true;b.textContent="Esperando a Microsoft…";const r=await api.login();if(r&&r.error){er.textContent=r.error;b.disabled=false;b.textContent="Añadir cuenta de Microsoft";return}applyAccs(r)}}
else if(row&&row.dataset.id!==cfg.activeAccount)applyAccs(await api.accSwitch(row.dataset.id));else return;
redraw()}catch(x){const z=$("aer");if(z)z.textContent=em(x)}}
function accMenu(on){const m=$("acm");if(on===undefined)on=!m.classList.contains("on");if(on){m.innerHTML="<h6>Cuentas</h6>"+accHtml();const r=$("plb").getBoundingClientRect();m.style.top=(r.bottom+8)+"px";m.style.left=Math.max(8,Math.min(innerWidth-300,r.right-292))+"px"}m.classList.toggle("on",on)}
$("plb").onclick=e=>{e.stopPropagation();accMenu()};$("acm").onclick=e=>{e.stopPropagation();accClick(e,()=>{accMenu(true);buildSet()})};document.addEventListener("click",()=>accMenu(false));
function openAccounts(){modal(`<div class="hd"><div class="iic">${IC("user")}</div><div style="min-width:0"><h3>Cuentas de Minecraft</h3><span class="sub">Cambia de cuenta aquí o desde tu nombre en la barra superior</span></div><button class="btn sm x" data-x>Cerrar</button></div><div id="acx">${accHtml()}</div>`);$("acx").onclick=e=>accClick(e,()=>{$("acx").innerHTML=accHtml();buildSet()})}
// --- Capturas ---
const shSvg=(a,b)=>"data:image/svg+xml;utf8,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="160" height="90" fill="url(#g)"/><path d="M0 70 L30 52 L55 66 L90 40 L125 62 L160 48 V90 H0Z" fill="#0006"/><circle cx="125" cy="22" r="9" fill="#fff8"/></svg>`);
let DSH=null;
Object.assign(DA,{shotsList:async()=>{if(!DSH){const c=[["#4fa8ff","#1b2a5a"],["#2ee06f","#0d3b2a"],["#ff9f2e","#5a2a1b"],["#a78bfa","#2a1b5a"],["#f472b6","#5a1b3d"],["#22d3ee","#0d3b4a"]];DSH=Array.from({length:9},(_,k)=>({inst:(I[k%Math.max(1,I.length)]||{id:"d1"}).id,file:`2026-10-${10-k}_20.${10+k}.${k}.png`,date:Date.now()-k*864e5*.7,size:1.4e6+k*1e5,url:shSvg(...c[k%6])}))}return DSH},
shotsOpen:async()=>{flash("Vista previa: se abriría la imagen")},shotsCopy:async()=>{flash("Vista previa: se copiaría la imagen")},shotsDelete:async({file})=>{DSH=DSH.filter(s=>s.file!==file);return true},shotsFolder:async()=>{flash("Vista previa: se abriría la carpeta")}});
async function openShots(id){const api=A||DA;let L=[],cur=id||"all",lb=-1;
const d=modal(`<div class="hd"><div class="iic">${IC("camera")}</div><div style="min-width:0"><h3>Capturas</h3><span class="sub" id="shs">Cargando…</span></div><button class="btn sm x" data-x>Cerrar</button></div><div class="chips" id="shf" style="margin-bottom:12px"></div><div id="shb"></div>`,"wide2");
const nm=i=>(I.find(x=>x.id===i)||{name:"Instancia"}).name,vis=()=>L.filter(s=>cur==="all"||s.inst===cur);
const draw=()=>{const v=vis();$("shs").textContent=v.length?v.length+(v.length===1?" captura":" capturas")+(cur==="all"?" en todas las instancias":" en «"+nm(cur)+"»"):"Sin capturas";
const ids=[...new Set(L.map(s=>s.inst))];$("shf").style.display=lb>=0||ids.length<2?"none":"";chips($("shf"),[["all","Todas ("+L.length+")"],...ids.map(i=>[i,nm(i)+" ("+L.filter(s=>s.inst===i).length+")"])],cur,k=>{cur=k;draw()});
if(lb>=0&&v[lb]){const s=v[lb];$("shb").innerHTML=`<div class="shv"><img src="${esc(s.url)}" alt=""><p class="sub" style="text-align:center;margin:8px 0 0">${esc(nm(s.inst))} · ${fmtD(s.date)} · ${fSz(s.size)}</p><div class="acts"><button class="btn sm" data-s="prev">‹ Anterior</button><button class="btn sm" data-s="open">Abrir</button><button class="btn sm" data-s="copy">Copiar</button><button class="btn sm dg" data-s="del">Borrar</button><button class="btn sm" data-s="next">Siguiente ›</button><button class="btn sm pr" data-s="back">Volver</button></div></div>`}
else{lb=-1;$("shb").innerHTML=v.length?`<div class="shg">${v.map((s,k)=>`<button class="shi" data-k="${k}" title="${esc(s.file)}"><img src="${esc(s.url)}" loading="lazy" alt=""><small>${fmtD(s.date)}</small></button>`).join("")}</div>`:'<div class="emp">Aún no hay capturas. Pulsa F2 dentro de Minecraft para hacer una.</div>'+""}
$("shb").insertAdjacentHTML("beforeend",`<div class="acts"><button class="btn sm" id="shfo">Abrir carpeta${cur==="all"?" (una instancia)":""}</button></div>`);
$("shfo").onclick=()=>{const t=cur==="all"?(vis()[0]||{}).inst||(I[0]||{}).id:cur;if(t)api.shotsFolder(t)}};
$("shb").onclick=async e=>{const t=e.target.closest(".shi"),b=e.target.closest("[data-s]"),v=vis();
if(t){lb=+t.dataset.k;draw();return}if(!b)return;const s=v[lb];if(!s&&b.dataset.s!=="back")return;const a=b.dataset.s;
try{if(a==="back"){lb=-1;draw()}else if(a==="prev"){lb=(lb-1+v.length)%v.length;draw()}else if(a==="next"){lb=(lb+1)%v.length;draw()}
else if(a==="open")await api.shotsOpen({id:s.inst,file:s.file});
else if(a==="copy"){await api.shotsCopy({id:s.inst,file:s.file});if(A)flash("Captura copiada ✓")}
else if(a==="del"){if(!confirm("¿Borrar esta captura? Irá a la papelera."))return;await api.shotsDelete({id:s.inst,file:s.file});L=L.filter(z=>!(z.inst===s.inst&&z.file===s.file));lb=-1;draw();flash("Captura borrada")}}catch(x){flash(em(x))}};
try{L=await api.shotsList("all")}catch(x){flash(em(x))}if(cur!=="all"&&!L.some(s=>s.inst===cur)&&!L.length)cur="all";draw()}
