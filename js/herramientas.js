// Mundos, servidores propios, shaders, importar, versiones anteriores, ajustes en archivo
// --- Mundos ---
async function openWorlds(id){const ins=I.find(x=>x.id===id);if(!ins)return;const api=A||DA;
modal(hdr(ins,"Mundos","«"+esc(ins.name)+"»")+`<div class="mbar"><button class="btn sm pr" id="wim">Importar mapa (.zip)</button><button class="btn sm" id="wfo">Abrir carpeta de mundos</button><button class="btn sm" id="wbk">Copias de seguridad</button></div><div id="wls"><div class="emp">Cargando…</div></div><div class="acts"><button class="btn" id="wba">Volver</button></div>`);
const others=I.filter(x=>x.id!==id);
const load=async()=>{let L=[];try{L=await api.worldsList(id)}catch(e){flash(em(e))}
$("wls").innerHTML=L.length?L.map((w,k)=>`<div class="mr" data-w="${esc(w.name)}"><div class="ico">${w.icon?`<img src="${esc(w.icon)}" alt="">`:IC("globe")}</div><div class="nm"><b>${esc(w.name)}</b><small>${fmtD(w.date)} · ${fSz(w.size)}</small></div><span class="cp2"><button class="btn sm" data-a="cp">Copiar a…</button></span></div>`).join(""):'<div class="emp">Esta instancia aún no tiene mundos. Entra a jugar o importa un mapa .zip.</div>'};
$("wba").onclick=()=>openOpts(id);$("wbk").onclick=()=>openBackups(id);$("wfo").onclick=()=>{if(A)A.instOpen(id,"saves");else pv("wfo")};
$("wim").onclick=async()=>{const b=$("wim");b.disabled=true;try{const r=await api.worldsImport(id);if(r&&!r.canceled){flash("Importado: "+r.names.join(", "));await load()}else if(!A)pv("wim")}catch(e){flash(em(e))}b.disabled=false};
$("wls").onclick=async e=>{const b=e.target.closest("button[data-a]");if(!b)return;const row=b.closest(".mr"),w=row.dataset.w;
if(b.dataset.a==="cp"){if(!others.length){flash("Necesitas otra instancia para copiar el mundo");return}const c=row.querySelector(".cp2");c.innerHTML=`<select>${others.map(o=>`<option value="${esc(o.id)}">${esc(o.name)}</option>`).join("")}</select><button class="btn sm pr" data-a="go">Copiar</button><button class="btn sm" data-a="no">✕</button>`}
else if(b.dataset.a==="no"){row.querySelector(".cp2").innerHTML='<button class="btn sm" data-a="cp">Copiar a…</button>'}
else if(b.dataset.a==="go"){const to=row.querySelector("select").value;b.disabled=true;b.textContent="Copiando…";try{const n=await api.worldsCopy({from:id,world:w,to});flash("Mundo copiado a «"+nm2(to)+"» como "+n)}catch(x){flash(em(x))}row.querySelector(".cp2").innerHTML='<button class="btn sm" data-a="cp">Copiar a…</button>'}};
const nm2=i=>(I.find(x=>x.id===i)||{name:"?"}).name;load()}
// --- Servidores propios ---
const mkey=s=>s.port&&+s.port!==25565?s.host+":"+s.port:s.host;
function renderMine(){const L=cfg.myServers||[];$("ml").innerHTML=L.length?L.map((s,k)=>{const st=SST[mkey(s)],on=st&&st.online;return`<div class="sv" style="--i:${k}"><div class="svi">${st&&st.icon?`<img src="${esc(st.icon)}" alt="">`:`<span>${esc((s.name||"?")[0].toUpperCase())}</span>`}</div><div class="svb"><b>${esc(s.name)}</b><small>${esc(mkey(s))}</small>${on&&st.motd?`<p>${esc(st.motd)}</p>`:""}<div class="svm"><span class="dot ${st?(on?"on":"off"):""}"></span>${st?(on?fmtP(st.players)+(st.max?" / "+fmtP(st.max):"")+" jugando"+(st.ping!=null&&st.ping>=0?" · "+st.ping+" ms":""):"Sin respuesta"):"Comprobando…"}${on&&st.version?`<em>${esc(String(st.version).slice(0,24))}</em>`:""}</div></div><div class="svx"><button class="btn jn" data-j="${k}">Unirse</button><button class="btn sm dg" data-r="${k}">Quitar</button></div></div>`}).join(""):'<div class="emp" style="grid-column:1/-1">Aún no has añadido ninguno. Escribe su dirección arriba.</div>'}
function pingMine(L){if(!A)return;A.srvStatus(L.map(mkey)).then(r=>{Object.assign(SST,r);renderMine()}).catch(()=>{})}
$("msf").onsubmit=async e=>{e.preventDefault();const h=$("msh").value.trim(),m=/^([A-Za-z0-9._-]{1,255})(?::(\d{1,5}))?$/.exec(h),g=$("msg");
if(!m){g.textContent="Escribe una dirección válida, como play.miservidor.net o 1.2.3.4:25565";return}const port=m[2]?+m[2]:25565;if(port<1||port>65535){g.textContent="El puerto debe estar entre 1 y 65535";return}
const s={name:$("msn").value.trim()||m[1],host:m[1],port},L=cfg.myServers||[];if(L.some(x=>mkey(x)===mkey(s))){g.textContent="Ese servidor ya está en tu lista";return}
g.textContent="";await sv({myServers:[...L,s]});$("msn").value=$("msh").value="";if(!A)pvSrv(s);renderMine();pingMine([s])};
$("ml").onclick=async e=>{const r=e.target.closest("[data-r]"),j=e.target.closest("[data-j]");
if(r){const L=[...(cfg.myServers||[])];L.splice(+r.dataset.r,1);await sv({myServers:L});renderMine()}
else if(j){const s=(cfg.myServers||[])[+j.dataset.j];if(!s)return;if(!A){pvJoin(j);return}
j.disabled=true;j.textContent="Preparando…";try{const i=await ensure();show("home");$("go").disabled=true;try{await launch({id:i.id,server:{name:s.name,host:s.host,port:s.port||25565}})}finally{$("go").disabled=false}}finally{j.disabled=false;j.textContent="Unirse"}}};
// --- Shaders: que funcionen siempre ---
function shaderGate(i){return new Promise(async res=>{
const mc=(i&&i.mc)||sel.mc;
let has={};const ld=(i&&i.ld)||"Vanilla",ok=ld==="Fabric"||ld==="NeoForge"||ld==="Forge";
try{if(ok&&i)has=await A.modsHas({id:i.id,names:["iris","oculus","optifine"]})}catch{}
if(has.iris||has.oculus||has.optifine)return res(i);
const slugs=ld==="Forge"?["oculus","embeddium"]:["iris","sodium"],nmS=ld==="Forge"?"Oculus y Embeddium":"Iris y Sodium";
pickRes=res;const d=modal(hdr(i,"Los shaders necesitan Iris","Esta instancia ("+esc(ld)+" "+esc(mc)+") no lo tiene instalado")+`<p class="sub" style="margin-bottom:14px">Sin Iris (o Oculus en Forge) Minecraft ignora los shaders. Elige cómo prepararlo:</p><div class="shc">${ok?`<button class="btn pr" data-o="in">Instalar ${nmS} en «${esc(i.name)}»</button>`:""}<button class="btn pr" data-o="nw">Crear una instancia Fabric ${esc(mc)} preparada para shaders</button><button class="btn" data-o="sk">Instalar solo el shader (no se verá sin Iris)</button></div><div class="aer" id="shm"></div><div class="acts"><button class="btn" data-x>Cancelar</button></div>`);
d.querySelector(".shc").onclick=async e=>{const b=e.target.closest("button[data-o]");if(!b)return;const o=b.dataset.o,all=d.querySelectorAll(".shc button"),L0=b.textContent;
if(o==="sk"){pickRes=null;closeModal();return res(i)}
all.forEach(x=>x.disabled=true);b.textContent="Instalando…";
try{let t=i,sl=slugs;if(o==="nw"){t=await A.saveInst({name:"Shaders "+mc,mc:mc,ld:"Fabric",type:"release",custom:true});sl=["iris","sodium"]}
const r=await A.modsBundle({id:t.id,slugs:sl});if(r.failed&&r.failed.includes(sl[0]))throw new Error("No hay una versión de "+sl[0]+" para Minecraft "+mc+" con ese cargador");
await loadI();pickRes=null;closeModal();flash((r.failed&&r.failed.length?"Instalado con avisos (falló "+r.failed.join(", ")+")":"Listo ✓ Iris y Sodium instalados")+(o==="nw"?" en la instancia nueva":""));res(I.find(x=>x.id===t.id)||t)}
catch(x){$("shm").textContent=em(x);all.forEach(z=>z.disabled=false);b.textContent=L0}}})}
// --- Importar desde otros launchers ---
async function openImport(){const api=A||DA;
modal(hdr(null,"Importar desde otro launcher","Minecraft oficial, CurseForge, Prism y MultiMC")+`<p class="sub" style="margin-bottom:12px">Se copian mundos, mods, configuración, texturas, shaders y capturas a una instancia nueva. Lo original no se toca.</p><div id="iml" style="display:flex;flex-direction:column;gap:7px"><div class="emp">Buscando instancias…</div></div><div class="acts"><button class="btn" data-x>Cerrar</button></div>`);
let L=[];try{L=await api.importScan()}catch(e){flash(em(e))}if(!$("iml"))return;
$("iml").innerHTML=L.length?L.map((x,k)=>`<div class="mr"><div class="ico">${IC("folder")}</div><div class="nm"><b>${esc(x.name)}</b><small>${esc(x.label)} · ${esc(x.ld)} ${esc(x.mc||"?")} · ${x.worlds} mundos · ${x.mods} mods${x.unsupported?" · "+esc(x.unsupported):""}</small></div><button class="btn sm pr" data-k="${k}" ${x.unsupported?"disabled":""}>Importar</button></div>`).join(""):'<div class="emp">No se encontró nada en las carpetas habituales de otros launchers.</div>';
$("iml").onclick=async e=>{const b=e.target.closest("button[data-k]");if(!b)return;const x=L[+b.dataset.k];b.disabled=true;b.textContent="Importando…";try{await api.importRun(x.dir);if(A)await loadI();b.textContent="Importada ✓";flash("Instancia importada: "+x.name)}catch(er){b.disabled=false;b.textContent="Reintentar";flash(em(er))}}}
// --- Desinstalar, restablecer y aviso legal ---
function openUninstall(){
const prem=(cfg.accounts||[]).some(a=>a.type==="microsoft");
const OP=[["cuentas","user","Desinstalar y conservar mis cuentas premium",prem?"Borra instancias, mundos, mods y ajustes. Se quedan tus cuentas de Microsoft con su configuración (skin y cuenta activa)":"Ahora no tienes ninguna cuenta premium, así que se borrará todo"],
["todo","trash","Desinstalar todo","Quita el programa y borra todos los datos: instancias, mundos, mods, cuentas y ajustes"],
["programa","box","Solo el programa","Quita Nova Launcher y deja tus datos para cuando lo reinstales"]];
modal(hdr(null,trad("Desinstalar Nova Launcher"),trad("Elige qué quieres hacer con tus datos"))+`<div class="unm">${OP.map(([k,i,t,d])=>`<button class="unc${k==="todo"?" dg":""}" data-um="${k}"><span class="oi">${IC(i)}</span><span class="ot"><b>${trad(t)}</b><span>${trad(d)}</span></span></button>`).join("")}</div>`);
$("mdl").querySelector(".unm").onclick=e=>{const b=e.target.closest("[data-um]");if(!b)return;const k=b.dataset.um,o=OP.find(x=>x[0]===k);
modal(hdr(null,trad("¿Seguro?"),trad(o[2]))+`<div class="wn">${trad(o[3])}${k==="programa"?"":"<br><b>"+trad("Esto no se puede deshacer.")+"</b>"}</div><div class="acts"><button class="btn" id="unx">${trad("Atrás")}</button><button class="btn dg" id="unq">${trad("Desinstalar")}</button></div>`);
$("unx").onclick=openUninstall;
$("unq").onclick=async ev=>{ev.target.disabled=true;if(!A||!A.uninstall){flash(trad("Solo en la app instalada"));ev.target.disabled=false;return}
const r=await A.uninstall({mode:k}).catch(()=>null);if(!r||!r.ok){ev.target.disabled=false;flash(trad(r&&r.why==="nouninst"?"No se encontró el desinstalador. Usa Configuración de Windows → Aplicaciones":"No se pudo iniciar la desinstalación. Usa Configuración de Windows → Aplicaciones"))}}}}
function openFactory(){
modal(hdr(null,trad("Restablecer el launcher"),trad("Volverá a estar como la primera vez"))+`<div class="wn">${trad("Se borrarán tus cuentas, instancias, mundos, mods y ajustes, y el launcher se reiniciará con el asistente de bienvenida.")}<br><b>${trad("Esto no se puede deshacer.")}</b></div><div class="acts"><button class="btn" data-x>${trad("Cancelar")}</button><button class="btn dg" id="fcq">${trad("Restablecer todo")}</button></div>`);
$("fcq").onclick=async e=>{if(!A||!A.reset){flash(trad("Solo en la app instalada"));return}e.target.disabled=true;const r=await A.reset().catch(()=>null);
if(!r||!r.ok){e.target.disabled=false;flash(trad(r&&r.why==="running"?"Cierra Minecraft antes de restablecer":"No se pudo restablecer"))}}}
async function openLegal(){
modal(`<h3>${trad("Aviso legal")}</h3><div class="legal">Nova Launcher es un proyecto dirigido por <b>Astrion Studio</b>. © 2026 Astrion Studio. Todos los derechos reservados.<br>No tiene ninguna relación con Mojang Studios ni con Microsoft: no está afiliado, aprobado ni patrocinado por ellos. Minecraft es una marca registrada de Mojang Studios.</div><details class="lgd"><summary>${trad("Licencias de terceros")}</summary><pre class="lgx" id="lgt"></pre></details><div class="acts"><button class="btn" id="lga" data-x>${trad("Aceptar")}</button></div>`,"sm");
const x=$("mdl").querySelector(".mx");if(x)x.remove();
$("lga").focus();
$("mdl").querySelector("details").addEventListener("toggle",async function(){const t=$("lgt");if(!this.open||!t||t.textContent)return;let v="";try{v=A&&A.notices?await A.notices():""}catch{}t.textContent=v||trad("Solo en la app instalada")},{once:true})}
// --- Ajustes en un archivo ---
const SXK=()=>SC.filter(s=>["apar","ui","acc"].includes(s.id)).flatMap(s=>s.rows).filter(r=>r.k);
function pickJson(){return new Promise(res=>{const i=document.createElement("input");i.type="file";i.accept=".json";i.onchange=async()=>{const f=i.files[0];if(!f)return res({canceled:true});try{const j=JSON.parse(await f.text());if(!j||j.app!=="nova-launcher"||!j.settings)throw 0;res({settings:j.settings})}catch{res({error:1})}};i.click()})}
async function sxExport(){const o={};SXK().forEach(r=>{if(cfg[r.k]!==undefined)o[r.k]=cfg[r.k]});
try{if(A){const r=await A.settingsExport(o);if(!r.canceled)flash("Ajustes guardados ✓")}else{const b=new Blob([JSON.stringify({app:"nova-launcher",version:VER,settings:o},null,1)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="nova-ajustes.json";a.click();flash("Ajustes guardados ✓")}}catch(e){flash(em(e))}}
function sxClean(src){const out={};for(const r of SXK()){const v=src[r.k];if(v===undefined||out[r.k]!==undefined)continue;
if(r.type==="bool"){if(typeof v==="boolean")out[r.k]=v}
else if(r.type==="range"){if(typeof v==="number"&&isFinite(v))out[r.k]=Math.min(r.max,Math.max(r.min,v))}
else if(r.type==="chips"||r.type==="select"||r.type==="sw"){if((typeof v==="string"||typeof v==="number")&&Object.keys(r.o).includes(String(v)))out[r.k]=/^-?\d+$/.test(String(v))&&r.type==="chips"?+v:String(v)}
else if(r.type==="color"){if(typeof v==="string"&&/^#[0-9a-f]{6}$/i.test(v))out[r.k]=v.toLowerCase()}
else if(r.type==="text"){if(typeof v==="string")out[r.k]=v.replace(/[^\w \-.]/g,"").slice(0,60)}}return out}
async function sxImport(){let r;try{r=A?await A.settingsImport():await pickJson()}catch(e){flash(em(e));return}if(r.canceled)return;if(r.error||!r.settings){flash("El archivo no es válido");return}
const o=sxClean(r.settings),n=Object.keys(o).length;if(!n){flash("El archivo no trae ajustes que se puedan cargar");return}await sv(o);applyAp();buildSet();head();flash(n+" ajustes cargados ✓")}
