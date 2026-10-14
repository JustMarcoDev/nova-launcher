// Instancias, gestor de mods, copias y avisos de error
// ===== Instancias, mods y copias (0.2.11) =====
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const em=e=>String(e&&e.message||e).replace(/^Error invoking remote method '[^']+': (Error: )?/,"");
const cap=s=>s?s[0].toUpperCase()+s.slice(1):s;
const ICS=["box","puzzle","rocket","game","heart","bolt","orbit","cup","globe","chip","server","code"],ICOL=["#2ee06f","#4fa8ff","#a78bfa","#f472b6","#fb923c","#facc15","#f87171","#94a3b8"];
const fSz=n=>n>=1048576?(n/1048576).toFixed(1)+" MB":Math.max(1,Math.round(n/1024))+" KB";
const fmtD=t=>new Date(t).toLocaleString(LCUR,{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
let flT=0,pickRes=null,busyBtn=null;
function flash(t){const f=$("ft");f.textContent=t;f.classList.add("on");clearTimeout(flT);flT=setTimeout(()=>f.classList.remove("on"),4600)}
function modal(h,w){const m=$("mdl"),d=m.querySelector(".md");d.className="md"+(w?" "+w:"");d.innerHTML=h;m.classList.add("on");d.scrollTop=0;d.querySelectorAll("[data-x]").forEach(x=>x.onclick=closeModal);return d}
function closeModal(){$("mdl").classList.remove("on");if(pickRes){const r=pickRes;pickRes=null;r(null)}}
$("mdl").onclick=e=>{if(e.target.id==="mdl")closeModal()};
const hdr=(i,t,s)=>`<div class="hd"><div class="iic" style="${i&&i.color?"--ic:"+esc(i.color):""}">${IC(i&&i.icon&&ICS.includes(i.icon)?i.icon:"box")}</div><div style="min-width:0"><h3>${t}</h3><span class="sub">${s}</span></div><button class="btn sm x" data-x>Cerrar</button></div>`;
// --- Datos de ejemplo para la vista previa (sin la app) ---
const DMOD=[{file:"sodium-fabric-0.5.11.jar",enabled:true,size:1.2e6,sha1:"a1",t:"Sodium",v:"0.5.11",u:"0.6.0"},{file:"lithium-fabric-0.13.0.jar",enabled:true,size:640e3,sha1:"a2",t:"Lithium",v:"0.13.0"},{file:"iris-1.7.3.jar",enabled:false,size:2.3e6,sha1:"a3",t:"Iris Shaders",v:"1.7.3",u:"1.8.0"},{file:"fabric-api-0.102.0.jar",enabled:true,size:2.1e6,sha1:"a4",t:"Fabric API",v:"0.102.0"},{file:"mi-mod-casero.jar",enabled:true,size:88e3,sha1:"a5"}];
let DBK=[{file:"1",date:Date.now()-36e5,size:48e6,reason:"antes de actualizar mods"},{file:"2",date:Date.now()-864e5,size:47e6,reason:"manual"}];
const DA={modsList:async()=>DMOD.map(m=>({file:m.file,enabled:m.enabled,size:m.size,sha1:m.sha1})),
modsCheck:async()=>Object.fromEntries(DMOD.filter(m=>m.t).map(m=>[m.sha1,{title:m.t,icon:"",ver:m.v,update:m.u?{ver:m.u,url:"https://x",filename:m.file,sha1:"",sha512:""}:null}])),
modsToggle:async({file})=>{const m=DMOD.find(x=>x.file===file);if(m)m.enabled=!m.enabled;return file},modsRemove:async({file})=>{const k=DMOD.findIndex(x=>x.file===file);if(k>=0)DMOD.splice(k,1);return true},
modsUpdate:async({file})=>{const m=DMOD.find(x=>x.file===file);if(m){m.v=m.u;m.u=""}return file},modsAdd:async()=>0,
bkList:async()=>DBK,bkCreate:async()=>{DBK.unshift({file:"n"+Date.now(),date:Date.now(),size:48e6,reason:"manual"});return"x"},bkRestore:async()=>true,bkDel:async({file})=>{DBK=DBK.filter(b=>b.file!==file);return true},bkOpen:async()=>{},
instUpdate:async(id,p)=>{const i=I.find(x=>x.id===id);Object.assign(i,p);return i},instDup:async id=>{const i=I.find(x=>x.id===id);I.push({...i,id:"d"+Date.now(),name:i.name+" (copia)",custom:true});return 1},instOpen:async()=>{},
instExport:async()=>({ok:true,file:"demo.mrpack"}),instImport:async()=>({canceled:true}),loaderVersions:async({ld})=>ld==="Fabric"?[{v:"0.16.9",stable:true},{v:"0.16.8",stable:true},{v:"0.16.5",stable:true}]:[{v:"52.0.3",stable:true},{v:"52.0.1",stable:true}],
packVersions:async()=>[{id:"p3",name:"Fabulously Optimized 10.0",num:"10.0.0",mc:["1.21","1.21.1"],ld:["fabric"],date:"2026-09-30T10:00:00Z",type:"release"},{id:"p2",name:"Fabulously Optimized 9.5",num:"9.5.0",mc:["1.20.4","1.20.6"],ld:["fabric"],date:"2026-06-12T10:00:00Z",type:"release"},{id:"p1",name:"Beta 11.0",num:"11.0.0-beta.2",mc:["1.21.4"],ld:["fabric"],date:"2026-10-05T10:00:00Z",type:"beta"}],
pack:async()=>({failed:[]}),delInst:async id=>{I=I.filter(x=>x.id!==id)},sys:async()=>({total:16})};
// --- Tarjetas de instancias ---
function ri(){
$("il").innerHTML=I.length?I.map(i=>`<div class="ins" data-i="${i.id}" style="${i.color?"--ic:"+esc(i.color):""}"><div class="ih"><div class="iic">${IC(i.icon&&ICS.includes(i.icon)?i.icon:"box")}</div><div style="min-width:0"><div class="t">${esc(i.name)}</div><div class="s">${esc(i.ld||"Vanilla")} · ${esc(i.mc)}${i.ram?" · "+i.ram+" GB":""}</div><div class="s pt">${esc(plLine(i))}</div></div></div><div class="a"><button class="btn pr" data-a="play">Jugar</button><button class="btn" data-a="mods">Mods</button><button class="btn" data-a="shots">Capturas</button><button class="btn" data-a="opt">Opciones</button></div></div>`).join(""):'<div style="color:var(--m)">Todavía no tienes instancias. Elige una versión y pulsa Lanzar juego, o importa un modpack.</div>';
$("il").onclick=e=>{const b=e.target.closest("button[data-a]");if(!b)return;const id=b.closest(".ins").dataset.i,i=I.find(x=>x.id===id),a=b.dataset.a;if(!i)return;if(a==="play"){pick(i.mc,i.type||"release",i.ld);sel.inst=i.id;show("home");play(i.id)}else if(a==="mods")openMods(id);else if(a==="shots")openShots(id);else openOpts(id)}}
$("ish").onclick=()=>openShots("all");$("imo2").onclick=()=>openImport();
$("imp").onclick=async()=>{if(!A){flash("Vista previa: en la app puedes importar un .mrpack o un .zip de Nova Launcher");return}
const b=$("imp");b.disabled=true;try{const r=await A.instImport();if(r&&!r.canceled){await loadI();flash("Instancia importada: "+r.ins.name+(r.failed&&r.failed.length?" (faltan "+r.failed.length+" archivos)":""))}}catch(e){flash("No se pudo importar: "+em(e))}finally{b.disabled=false}};
$("ifo").onclick=()=>{if(A)A.folder();else flash("Vista previa: abre la carpeta del juego desde la app")};
// --- Gestor de mods ---
async function openMods(id){const ins=I.find(x=>x.id===id);if(!ins)return;const api=A||DA;
modal(hdr(ins,"Mods de "+esc(ins.name),'<span id="mst">Cargando…</span>')+`<div class="mbar"><input id="mq" type="text" placeholder="Filtrar mods…"><button class="btn sm pr" id="mup" style="display:none"></button><button class="btn sm" id="mad">Añadir .jar</button><button class="btn sm" id="mfo">Abrir carpeta</button></div><div id="mls"></div>`,"wide");
let L=[],M={};
const sum=()=>{const n=L.filter(m=>M[m.sha1]&&M[m.sha1].update).length,b=$("mup");if(!b)return;b.style.display=n?"":"none";b.textContent=`Actualizar todo (${n})`;return n};
const draw=()=>{const q=($("mq").value||"").toLowerCase();const rows=L.filter(m=>!q||m.file.toLowerCase().includes(q)||((M[m.sha1]||{}).title||"").toLowerCase().includes(q));
$("mls").innerHTML=rows.length?rows.map(m=>{const i=M[m.sha1]||{},u=i.update;return `<div class="mr ${m.enabled?"":"off"}" data-f="${esc(m.file)}" data-h="${m.sha1}"><div class="ico">${i.icon?`<img src="${esc(i.icon)}" loading="lazy" onerror="this.remove()">`:IC("puzzle")}</div><div class="nm"><b>${esc(i.title||m.file.replace(/\.jar(\.disabled)?$/i,""))}</b><small>${esc(m.file.replace(/\.disabled$/,""))} · ${fSz(m.size)}${i.ver?" · v"+esc(i.ver):""}${i.title?"":" · archivo local"}</small></div>${u?`<button class="btn sm pr" data-a="up">Actualizar a ${esc(u.ver)}</button>`:""}<label class="tg" title="${m.enabled?"Desactivar":"Activar"}"><input type="checkbox" data-a="tg" ${m.enabled?"checked":""}><i></i></label><button class="btn sm dg" data-a="rm">Borrar</button></div>`}).join(""):`<div class="emp">${L.length?"Ningún mod coincide con el filtro.":"Esta instancia aún no tiene mods. Instálalos desde la pestaña Mods o añade un .jar."}</div>`};
const relist=async()=>{try{L=await api.modsList(id)}catch(e){L=[];flash(em(e))}draw();sum()};
const load=async()=>{M={};await relist();$("mst").textContent=L.length+" mods";if(!L.length)return;$("mst").textContent=L.length+" mods · comprobando actualizaciones…";
try{M=await api.modsCheck({id,hashes:L.map(m=>m.sha1)})}catch{$("mst").textContent=L.length+" mods · sin conexión con Modrinth";return}
const n=sum();$("mst").textContent=L.length+" mods · "+(n?n+" con actualización":"todo al día");draw()};
$("mq").oninput=draw;$("mfo").onclick=()=>{if(A)A.instOpen(id,"mods")};
$("mad").onclick=async()=>{if(!A){flash("Vista previa: en la app puedes añadir tus propios .jar");return}try{if(await A.modsAdd(id))load()}catch(e){flash(em(e))}};
const upd=async m=>{const u=(M[m.sha1]||{}).update;if(!u)return;await api.modsUpdate({id,file:m.file,url:u.url,filename:u.filename,sha1:u.sha1,sha512:u.sha512})};
$("mup").onclick=async()=>{const b=$("mup"),todo=L.filter(m=>M[m.sha1]&&M[m.sha1].update);b.disabled=true;let n=0,bad=0;for(const m of todo){b.textContent=`Actualizando ${++n} de ${todo.length}…`;try{await upd(m)}catch{bad++}}b.disabled=false;await load();flash(bad?`${todo.length-bad} mods actualizados, ${bad} con error`:`${todo.length} mods actualizados`)};
$("mls").onclick=async e=>{const b=e.target.closest("button[data-a]");if(!b)return;const r=b.closest(".mr"),m=L.find(x=>x.file===r.dataset.f);if(!m)return;
if(b.dataset.a==="rm"){if(!confirm("¿Borrar este mod de la instancia?"))return;try{await api.modsRemove({id,file:m.file});await relist()}catch(x){flash(em(x))}}
else if(b.dataset.a==="up"){b.disabled=true;b.textContent="Actualizando…";try{await upd(m);await load();flash("Mod actualizado")}catch(x){b.disabled=false;b.textContent="Reintentar";flash(em(x))}}};
$("mls").onchange=async e=>{const c=e.target.closest("input[data-a=tg]");if(!c)return;const m=L.find(x=>x.file===c.closest(".mr").dataset.f);if(!m)return;try{await api.modsToggle({id,file:m.file})}catch(x){flash(em(x))}await relist()};
load()}
// --- Opciones de la instancia ---
async function openOpts(id){const ins=I.find(x=>x.id===id);if(!ins)return;const api=A||DA;let tot=16;try{tot=(await api.sys()).total||16}catch{}
let ic=ins.icon&&ICS.includes(ins.icon)?ins.icon:"box",col=ins.color||"";const hasL=ins.ld&&ins.ld!=="Vanilla";
const d=modal(hdr(ins,"Opciones de la instancia",esc(ins.ld||"Vanilla")+" · "+esc(ins.mc))+`<div class="fr"><label>Nombre</label><input id="on" type="text" maxlength="40" value="${esc(ins.name)}"></div>
<div class="fr"><label>Icono</label><div class="icp" id="oic">${ICS.map(n=>`<button class="ib ${n===ic?"on":""}" data-i="${n}" type="button">${IC(n)}</button>`).join("")}</div></div>
<div class="fr"><label>Color</label><div class="cs2" id="ocl"><div class="sw2 ${col?"":"on"}" data-c="" style="background:var(--ac)" title="Color del launcher"></div>${ICOL.map(c=>`<div class="sw2 ${col===c?"on":""}" data-c="${c}" style="background:${c}"></div>`).join("")}</div></div>
<div class="fr"><label>Memoria RAM</label><div class="rr"><input type="range" id="orm" min="0" max="${Math.max(2,Math.min(32,tot))}" step="1" value="${ins.ram||0}"><b id="orv"></b></div></div>
<div class="fr"><label>Java</label><input id="oj" type="text" placeholder="Vacío = el de Ajustes (o Java automático)" value="${esc(ins.javaPath||"")}"></div>
<div class="fr"><label>Ajustes de Java</label><select id="ojp"><option value="">Normales</option><option value="rendimiento" ${ins.jvmPreset==="rendimiento"?"selected":""}>Rendimiento</option><option value="tirones" ${ins.jvmPreset==="tirones"?"selected":""}>Pocos tirones</option></select></div>
<div class="fr"><label>Tarjeta gráfica</label><select id="ogp"><option value="">Automática</option><option value="high" ${ins.gpu==="high"?"selected":""}>Usar la más potente</option></select></div><small class="hint" style="margin:-6px 0 12px 142px">En portátiles con dos tarjetas gráficas obliga a Java a usar la dedicada (Windows 10/11).</small>
${hasL?`<div class="fr"><label>Versión de ${esc(ins.ld)}</label><select id="olv"><option value="">Cargando…</option></select></div>`:""}
<div class="acts2"><button class="btn sm" data-a="fo">Abrir carpeta</button><button class="btn sm" data-a="dup">Duplicar</button><button class="btn sm" data-a="ex">Exportar…</button><button class="btn sm" data-a="wo">Mundos</button><button class="btn sm" data-a="sh">Capturas</button><button class="btn sm" data-a="bk">Copias de seguridad</button><button class="btn sm dg" data-a="del">Borrar instancia</button></div>
<div class="acts"><button class="btn" data-x>Cancelar</button><button class="btn pr" id="osv">Guardar</button></div>`);
const rv=()=>{const v=+$("orm").value;$("orv").textContent=v?v+" GB":"Global ("+cfg.ram+" GB)"};rv();$("orm").oninput=rv;
$("oic").onclick=e=>{const b=e.target.closest("button");if(!b)return;ic=b.dataset.i;$("oic").querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===b))};
$("ocl").onclick=e=>{const b=e.target.closest(".sw2");if(!b)return;col=b.dataset.c;$("ocl").querySelectorAll(".sw2").forEach(x=>x.classList.toggle("on",x===b))};
if(hasL)(async()=>{const s=$("olv");let L=[];try{L=await api.loaderVersions({ld:ins.ld,mc:ins.mc})}catch{}if(!$("olv"))return;
const cur=ins.loaderVersion||"";if(cur&&!L.some(x=>x.v===cur))L.unshift({v:cur,stable:true});
s.innerHTML=`<option value="">Automática (recomendada)</option>`+L.map((x,k)=>`<option value="${esc(x.v)}" ${x.v===cur?"selected":""}>${esc(x.v)}${x.stable?"":" (beta)"}${k===0&&!cur?"":""}</option>`).join("");if(!L.length)s.title="No se pudo cargar la lista (¿sin conexión?)"})();
$("osv").onclick=async()=>{const b=$("osv");b.disabled=true;const p={name:$("on").value.trim()||ins.name,icon:ic,color:col,ram:+$("orm").value,javaPath:$("oj").value.trim(),jvmPreset:$("ojp").value,gpu:$("ogp").value};if(hasL&&$("olv"))p.loaderVersion=$("olv").value;
try{await api.instUpdate(id,p);await loadI();closeModal();flash("Cambios guardados")}catch(e){b.disabled=false;flash(em(e))}};
d.querySelector(".acts2").onclick=async e=>{const b=e.target.closest("button[data-a]");if(!b)return;const a=b.dataset.a;
try{if(a==="fo"){if(A)A.instOpen(id,"");else flash("Vista previa: se abriría la carpeta de la instancia")}
else if(a==="dup"){b.disabled=true;b.textContent="Duplicando…";await api.instDup(id);await loadI();closeModal();flash("Instancia duplicada")}
else if(a==="ex")openExport(id);else if(a==="bk")openBackups(id);else if(a==="wo")openWorlds(id);else if(a==="sh")openShots(id);
else if(a==="del"){if(!confirm("¿Borrar «"+ins.name+"» con sus mundos, mods y copias de seguridad? No se puede deshacer."))return;await api.delInst(id);await loadI();closeModal();flash("Instancia borrada")}}
catch(x){flash(em(x));b.disabled=false}}}
// --- Exportar ---
function openExport(id){const ins=I.find(x=>x.id===id);if(!ins)return;const api=A||DA;let kind="mrpack";
modal(hdr(ins,"Exportar «"+esc(ins.name)+"»","Para pasarla a otro PC o a otra persona")+`<div class="fr"><label>Formato</label><div class="chips" id="ek"></div></div><p class="sub" id="ekd" style="margin:2px 0 14px"></p><div class="fr"><label>Incluir los mundos</label><label class="tg"><input type="checkbox" id="ew"><i></i></label></div><div class="acts"><button class="btn" id="eb">Volver</button><button class="btn pr" id="eg">Exportar</button></div>`);
const T={mrpack:"Modpack de Modrinth (.mrpack): pesa poco; los mods se vuelven a descargar al importar. Los que no estén en Modrinth se incluyen dentro del archivo. Sirve también en otros launchers.",zip:"ZIP de Nova Launcher (.zip): lleva todo dentro, mods incluidos, y pesa más. Solo se puede importar en Nova Launcher."};
const dr=()=>{chips($("ek"),[["mrpack","Modrinth (.mrpack)"],["zip","ZIP (.zip)"]],kind,k=>{kind=k;dr()});$("ekd").textContent=T[kind]};dr();
$("eb").onclick=()=>openOpts(id);
$("eg").onclick=async()=>{const b=$("eg");if(!A){closeModal();flash("Vista previa: en la app se guardaría un archivo ."+kind);return}b.disabled=true;b.textContent="Exportando…";
try{const r=await A.instExport({id,kind,worlds:$("ew").checked});if(r.canceled){b.disabled=false;b.textContent="Exportar";return}closeModal();flash("Exportada ✓"+(r.linked!=null?` · ${r.linked} mods enlazados, ${r.own} incluidos dentro`:""))}catch(e){b.disabled=false;b.textContent="Exportar";flash("No se pudo exportar: "+em(e))}}}
// --- Copias de seguridad ---
async function openBackups(id){const ins=I.find(x=>x.id===id);if(!ins)return;const api=A||DA;
modal(hdr(ins,"Copias de seguridad","Mundos de «"+esc(ins.name)+"»")+`<p class="sub" style="margin-bottom:12px">${cfg.autoBackup===false?"Las copias automáticas están desactivadas (Ajustes → Juego).":"Se hacen solas antes de actualizar mods o el Nova Pack. Se conservan las últimas "+(cfg.backupKeep||8)+"."} Al restaurar, antes se guarda otra copia de los mundos actuales.</p><div class="mbar"><button class="btn sm pr" id="bnew">Crear copia ahora</button><button class="btn sm" id="bfo">Abrir carpeta</button><button class="btn sm" id="bba">Volver</button></div><div id="bls"></div>`,"wide");
const load=async()=>{let L=[];try{L=await api.bkList(id)}catch(e){flash(em(e))}$("bls").innerHTML=L.length?L.map(b=>`<div class="mr" data-f="${esc(b.file)}"><div class="ico">${IC("folder")}</div><div class="nm"><b>${esc(cap(b.reason))}</b><small>${fmtD(b.date)} · ${fSz(b.size)}</small></div><button class="btn sm" data-a="rs">Restaurar</button><button class="btn sm dg" data-a="dl">Borrar</button></div>`).join(""):'<div class="emp">Todavía no hay copias. Pulsa «Crear copia ahora» o actualiza un mod y se hará sola.</div>'};
$("bba").onclick=()=>openOpts(id);$("bfo").onclick=()=>{if(A)A.bkOpen(id)};
$("bnew").onclick=async()=>{const b=$("bnew");b.disabled=true;b.textContent="Copiando…";try{const r=await api.bkCreate(id);flash(r?"Copia creada ✓":"Esta instancia aún no tiene mundos")}catch(e){flash(em(e))}b.disabled=false;b.textContent="Crear copia ahora";load()};
$("bls").onclick=async e=>{const b=e.target.closest("button[data-a]");if(!b)return;const f=b.closest(".mr").dataset.f;
if(b.dataset.a==="dl"){if(!confirm("¿Borrar esta copia?"))return;try{await api.bkDel({id,file:f})}catch(x){flash(em(x))}load()}
else{if(!confirm("Se sustituirán los mundos actuales por los de esta copia (antes se guarda otra copia de los actuales). ¿Continuar?"))return;b.disabled=true;b.textContent="Restaurando…";try{await api.bkRestore({id,file:f});flash("Mundos restaurados ✓")}catch(x){flash(em(x))}load()}};
load()}
// --- Aviso cuando Minecraft se cierra por un error ---
function showCrash(c){const ins=I.find(x=>x.id===c.id)||{};const k=c.cause.id,act=k==="ram"||k==="java"?["Opciones de la instancia","o"]:k==="mods"?["Gestor de mods","m"]:k==="auth"?["Ir a Ajustes","s"]:null;
const d=modal(`<div class="hd"><div class="iic bad">${IC("info")}</div><div style="min-width:0"><h3>Minecraft se cerró con un error</h3><span class="sub">${esc(c.name)} · ${esc(c.ld)} ${esc(c.mc)} · código ${esc(c.code)}</span></div><button class="btn sm x" data-x>Cerrar</button></div>
<div class="why"><b>Causa probable: ${esc(c.cause.t)}</b><p>${esc(c.cause.d)}</p>${c.cause.hint?`<code>${esc(c.cause.hint)}</code>`:""}</div>
<div class="sub" style="margin:12px 0 6px">Últimas líneas del registro</div><pre class="clog" id="clg">${esc((c.tail||[]).join("\n"))}</pre>
<div class="acts"><button class="btn sm" id="ccp">Copiar</button><button class="btn sm" id="clo">Abrir registro</button>${c.report?'<button class="btn sm" id="ccr">Ver crash-report</button>':""}${act?`<button class="btn sm pr" id="cac">${act[0]}</button>`:""}<button class="btn" data-x>Cerrar</button></div>`,"wide");
const p=$("clg");p.scrollTop=1e9;$("ccp").onclick=()=>{try{navigator.clipboard.writeText((c.tail||[]).join("\n"));flash("Registro copiado")}catch{flash("No se pudo copiar")}};
$("clo").onclick=()=>{if(A)A.logOpen(c.file)};if(c.report)$("ccr").onclick=()=>{if(A)A.logOpen(c.report)};
if(act)$("cac").onclick=()=>{if(act[1]==="o"&&ins.id)openOpts(ins.id);else if(act[1]==="m"&&ins.id)openMods(ins.id);else{closeModal();show("set")}};
d.querySelectorAll("[data-x]").forEach(b=>b.onclick=closeModal)}
// --- Elegir la versión de un modpack ---
async function pickPackVersion(h){const api=A||DA;const vs=await api.packVersions(h.id);if(!vs.length)throw new Error("Este modpack no tiene versiones");
const ld=(sel.ld||"Vanilla").toLowerCase(),ok=v=>v.mc.includes(sel.mc)&&(ld==="vanilla"||!v.ld.length||v.ld.includes(ld));
const comp=vs.filter(ok),rest=vs.filter(v=>!ok(v)),rec=comp.find(v=>v.type==="release")||comp[0],list=(rec?[rec,...comp.filter(v=>v!==rec),...rest]:rest).slice(0,60);
return new Promise(res=>{pickRes=res;const d=modal(`<div class="hd"><div class="iic">${IC("puzzle")}</div><div style="min-width:0"><h3>Versión de «${esc(h.t)}»</h3><span class="sub">${comp.length?"Las compatibles con Minecraft "+esc(sel.mc)+" van primero":"Ninguna coincide con Minecraft "+esc(sel.mc)+": la instancia usará la versión de Minecraft del modpack"}</span></div><button class="btn sm x" data-x>Cancelar</button></div><div id="pvl">${list.map((v,k)=>`<div class="mr pv" data-k="${k}"><div class="nm"><b>${esc(v.name||v.num)}</b><small>${esc(v.num)} · MC ${esc(v.mc.slice(-3).reverse().join(", "))}${v.mc.length>3?"…":""} · ${esc(v.ld.join(", "))} · ${fmtD(v.date)}</small></div>${v===rec?'<span class="bdg">Recomendada</span>':ok(v)?'<span class="bdg">Compatible</span>':""}${v.type&&v.type!=="release"?`<span class="bdg w">${esc(v.type)}</span>`:""}<button class="btn sm ${v===rec?"pr":""}">Instalar</button></div>`).join("")}</div>`,"wide");
d.querySelector("#pvl").onclick=e=>{const r=e.target.closest(".pv");if(!r)return;const v=list[+r.dataset.k];pickRes=null;closeModal();res(v.id)}})}
