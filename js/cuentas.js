// Cuentas y capturas
// ===== Cuentas, capturas, consola y más (0.2.12) =====
function ago(t){if(!t)return"nunca";const m=Math.round((Date.now()-t)/6e4);if(m<1)return"ahora mismo";if(m<60)return"hace "+m+" min";const h=Math.round(m/60);if(h<24)return"hace "+h+" h";const d=Math.round(h/24);return d<30?"hace "+d+(d===1?" día":" días"):new Date(t).toLocaleDateString(LCUR)}
function fPl(ms){ms=+ms||0;const m=Math.floor(ms/6e4);if(m<1)return ms>0?"menos de 1 min":"0 min";if(m<60)return m+" min";const h=Math.floor(m/60);return h+" h"+(m%60?" "+(m%60)+" min":"")}
function plLine(i){return"Jugado "+fPl(i.playMs)+" · "+(i.lastPlayed?"última vez "+ago(i.lastPlayed):"aún sin jugar")}
function verCmp(a,b){const p=s=>{const q=String(s).replace(/^v/,"").split("-");return[q[0].split(".").map(Number),q[1]||""]};const[x,xp]=p(a),[y,yp]=p(b);for(let i=0;i<3;i++){const d=(x[i]||0)-(y[i]||0);if(d)return d}if(xp===yp)return 0;if(!xp)return 1;if(!yp)return -1;const u=xp.split("."),w=yp.split(".");for(let i=0;i<Math.max(u.length,w.length);i++){if(u[i]===undefined)return -1;if(w[i]===undefined)return 1;const n=/^\d+$/.test(u[i])&&/^\d+$/.test(w[i]);const d=n?u[i]-w[i]:(u[i]<w[i]?-1:u[i]>w[i]?1:0);if(d)return d}return 0}
// --- Cuentas ---
function curAcc(){const L=cfg.accounts||[];return L.find(a=>a.id===cfg.activeAccount)||L[0]||{type:cfg.ms?"microsoft":"offline",name:cfg.ms?cfg.ms.name:cfg.username}}
function applyAccs(r){if(!r||r.error)return r;cfg.accounts=r.accounts;cfg.activeAccount=r.active;const a=curAcc();cfg.username=a.name;cfg.ms=a.type==="microsoft"?{name:a.name}:null;head();return r}
function accHtml(){const L=cfg.accounts||[];return`<div class="acl">${L.map(a=>`<div class="acr ${a.id===cfg.activeAccount?"on":""}" data-id="${esc(a.id)}"><img src="https://minotar.net/avatar/${encodeURIComponent(a.name)}/32" alt="" onerror="this.style.visibility='hidden'"><div class="acn"><b>${esc(a.name)}</b><small>${a.type==="microsoft"?"Microsoft":"Offline"}${a.id===cfg.activeAccount?" · en uso":""}</small></div>${L.length>1?'<button class="btn sm dg" data-a="rm" title="Quitar esta cuenta">✕</button>':""}</div>`).join("")}</div><div class="aca"><input id="aon" type="text" maxlength="16" placeholder="Nombre offline nuevo"><button class="btn sm" data-a="off">Añadir offline</button></div><button class="btn sm pr" data-a="ms" style="width:100%;margin-top:8px">Añadir cuenta de Microsoft</button><div class="aer" id="aer"></div>`}
async function accClick(e,redraw){if(e.target.closest("input"))return;const b=e.target.closest("button[data-a]"),row=e.target.closest(".acr"),api=A||DA,er=$("aer");
try{if(b){const a=b.dataset.a;
if(a==="rm"){const ac=cfg.accounts.find(x=>x.id===row.dataset.id);if(!confirm("¿Quitar la cuenta «"+ac.name+"» del launcher?"))return;applyAccs(await api.accRemove(row.dataset.id))}
else if(a==="off")applyAccs(await api.accAddOffline($("aon").value.trim()));
else if(a==="ms"){b.disabled=true;b.textContent="Esperando a Microsoft…";const r=await api.login();if(r&&r.error){er.textContent=r.error;b.disabled=false;b.textContent="Añadir cuenta de Microsoft";return}applyAccs(r)}}
else if(row&&row.dataset.id!==cfg.activeAccount){applyAccs(await api.accSwitch(row.dataset.id));accAnim()}else return;
redraw()}catch(x){const z=$("aer");if(z)z.textContent=em(x)}}
// Cambio de cuenta: pantalla de «cargando» corta (avatar, barra y pasos) y al acabar se ve el Inicio con la cuenta nueva.
let SWB=false;
function accAnim(){if(SWB)return;SWB=true;const a=curAcc(),o=document.createElement("div");o.className="swo";
o.innerHTML=`<div class="swc"><img src="https://minotar.net/avatar/${encodeURIComponent(a.name)}/96" alt="" onerror="this.style.visibility='hidden'"><span class="sws">Cambiando de usuario</span><b>${esc(a.name)}</b><div class="swb"><i></i></div><small class="swt">Cargando perfil…</small></div>`;
document.body.appendChild(o);try{accMenu(false);closeModal(true)}catch{}
const T=["Cargando perfil…","Preparando la skin…","Cargando instancias…","Casi listo…"],t=o.querySelector(".swt");let k=0;const iv=setInterval(()=>{k=Math.min(k+1,T.length-1);t.textContent=T[k]},430);
setTimeout(()=>{clearInterval(iv);try{show("home")}catch{}o.classList.add("out");setTimeout(()=>{o.remove();SWB=false},420)},1800)}
function accMenu(on){const m=$("acm");if(on===undefined)on=!m.classList.contains("on");if(on){m.innerHTML="<h6>Cuentas</h6>"+accHtml();const r=$("plb").getBoundingClientRect();m.style.top=(r.bottom+8)+"px";m.style.left=Math.max(8,Math.min(innerWidth-300,r.right-292))+"px"}m.classList.toggle("on",on)}
$("plb").onclick=e=>{e.stopPropagation();accMenu()};$("acm").onclick=e=>{e.stopPropagation();accClick(e,()=>{accMenu(true);buildSet()})};document.addEventListener("click",()=>accMenu(false));
function openAccounts(){modal(`<div class="hd"><div class="iic">${IC("user")}</div><div style="min-width:0"><h3>Cuentas de Minecraft</h3><span class="sub">Cambia de cuenta aquí o desde tu nombre en la barra superior</span></div><button class="btn sm x" data-x>Cerrar</button></div><div id="acx">${accHtml()}</div>`);$("acx").onclick=e=>accClick(e,()=>{$("acx").innerHTML=accHtml();buildSet()})}
// Botón «+» de la barra lateral: pequeño formulario para añadir una cuenta (offline o Microsoft)
function openAddAcc(force,done){const api=A||DA;let k="off";
modal(`<div class="hd"><div class="iic">${IC("user")}</div><div style="min-width:0"><h3>${force?"Crea tu perfil":"Añadir cuenta"}</h3><span class="sub">${force?"Para jugar necesitas un perfil: elige cómo quieres entrar":"Añade una cuenta de Minecraft al launcher"}</span></div>${force?"":'<button class="btn sm x" data-x>Cerrar</button>'}</div><div class="acf"><label for="aan" id="aal">Tipo de cuenta</label><div class="acts" id="aak"><button class="btn sm pr" data-k="off">Offline</button><button class="btn sm" data-k="ms">Microsoft</button></div><p class="sub" id="aah"></p><div id="aaf"><label for="aan">Nombre de usuario</label><input id="aan" type="text" maxlength="16" autocomplete="off" placeholder="Steve"></div><div class="aer" id="aae"></div><div class="acts"><button class="btn sm pr" id="aag">${force?"Continuar":"Añadir"}</button></div></div>`);if(force){MLOCK=true;$("mdl").querySelector(".mx").hidden=true}   // ventana obligatoria: se bloquea DESPUÉS de abrirla (modal() siempre desbloquea)
const hint=()=>{$("aah").textContent=k==="off"?"Sin conexión: juegas con cualquier nombre (sin servidores premium)":"Inicia sesión con tu cuenta oficial; el nombre sale de tu perfil de Minecraft";$("aaf").style.display=k==="off"?"":"none";$("aak").querySelectorAll("[data-k]").forEach(b=>b.classList.toggle("pr",b.dataset.k===k));if(k==="off")setTimeout(()=>{const i=$("aan");i&&i.focus()},30)};
hint();$("aak").onclick=e=>{const b=e.target.closest("[data-k]");if(!b)return;k=b.dataset.k;$("aae").textContent="";hint()};
const go=async()=>{const g=$("aag"),er=$("aae");er.textContent="";g.disabled=true;try{let r;if(k==="off")r=await api.accAddOffline($("aan").value.trim());else{g.textContent="Esperando a Microsoft…";r=await api.login()}
if(r&&r.error){er.textContent=r.error;g.disabled=false;g.textContent=force?"Continuar":"Añadir";return}applyAccs(r);MLOCK=false;closeModal(true);try{buildSet()}catch{}flash(force?"Perfil creado ✓":"Cuenta añadida ✓");if(done)done()}catch(x){er.textContent=em(x);g.disabled=false;g.textContent=force?"Continuar":"Añadir"}};
$("aag").onclick=go;$("aan").onkeydown=e=>{if(e.key==="Enter")go()}}
// --- Capturas ---
let SHOTRL=null;
async function openShots(id){const api=A||DA;let L=[],cur=id||"all",lb=-1;
modal(`<div class="hd"><div class="iic">${IC("camera")}</div><div style="min-width:0"><h3>Capturas</h3><span class="sub" id="shs">Cargando…</span></div><button class="btn sm x" data-x>Cerrar</button></div><div class="chips" id="shf" style="margin-bottom:12px"></div><div id="shb"></div>`,"wide2");
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
const rl=async()=>{try{L=await api.shotsList("all")}catch(x){flash(em(x))}if(cur!=="all"&&!L.some(s=>s.inst===cur)&&!L.length)cur="all";if($("shb"))draw()};
SHOTRL=()=>{if(!$("shf")||!$("mdl").classList.contains("on")){SHOTRL=null;return}rl()};
await rl()}
