// Instancias, gestor de mods, copias y avisos de error
// ===== Instancias, mods y copias (0.2.11) =====
// --- Tarjetas de instancias ---
let iQ="",iTag="";
const INS_SORT={last:"Último uso",name:"Nombre",time:"Tiempo jugado"};
function insOrder(L,sort){
  const cmp={name:(a,b)=>String(a.name).localeCompare(String(b.name)),last:(a,b)=>(b.lastPlayed||0)-(a.lastPlayed||0)||String(a.name).localeCompare(String(b.name)),time:(a,b)=>(b.playMs||0)-(a.playMs||0)||String(a.name).localeCompare(String(b.name))}[sort]||(()=>0);
  return [...L].sort((a,b)=>(!!b.fav-!!a.fav)||cmp(a,b));
}
function insRow(i){
  const ic=i.icon&&ICS.includes(i.icon)?i.icon:"box";
  return `<div class="ir ${i.fav?"fav":""}" data-i="${esc(i.id)}" style="${i.color?"--ic:"+esc(i.color):""}"><button class="star ${i.fav?"on":""}" data-a="fav" type="button" title="${i.fav?"Quitar de favoritas":"Fijar arriba como favorita"}" aria-label="Favorita">${i.fav?"★":"☆"}</button><div class="iic">${IC(ic)}</div><div class="im"><div class="t"><span class="tn">${esc(i.name)}</span>${(i.tags||[]).map(t=>`<span class="etq" data-t="${esc(t)}">${esc(t)}</span>`).join("")}</div><div class="s">${esc(LDN(i.ld||"Vanilla"))} · ${esc(i.mc)}${i.ram?" · "+i.ram+" GB":""}</div>${i.note?`<div class="nt">${esc(i.note)}</div>`:""}</div><div class="ip s">${esc(plLine(i))}</div><div class="a"><button class="btn pr sm" data-a="play">Jugar</button><button class="btn sm" data-a="mods">Detalles y mods</button><button class="btn sm" data-a="shots">Capturas</button><button class="btn sm" data-a="opt">Opciones</button><button class="btn sm dg" data-a="del" title="Borrar instancia">Borrar</button></div></div>`;
}
function ri(){
  const sort=cfg.instSort||"last",tags=[...new Set(I.flatMap(i=>i.tags||[]))].sort((a,b)=>a.localeCompare(b));
  if(iTag&&!tags.includes(iTag))iTag="";
  chips($("iso"),Object.entries(INS_SORT).map(([k,n])=>[k,esc(n)]),sort,k=>{sv({instSort:k});ri()});
  $("itg").style.display=tags.length?"flex":"none";
  chips($("itg"),[["",esc("Todas")],...tags.map(t=>[esc(t),esc(t)])],esc(iTag),k=>{iTag=k?tags.find(t=>esc(t)===k)||"":"";ri()});
  const L=insOrder(I.filter(i=>(!iTag||(i.tags||[]).includes(iTag))&&(!iQ||[i.name,i.note,(i.tags||[]).join(" "),i.mc,i.ld].join(" ").toLowerCase().includes(iQ))),sort);
  let h="";
  if(!I.length)h='<div style="color:var(--m)">Todavía no tienes instancias. Elige una versión y pulsa Lanzar juego, o importa un modpack.</div>';
  else if(!L.length)h='<div style="color:var(--m)">Ninguna instancia coincide.</div>';
  else{const nf=L.filter(i=>i.fav).length;L.forEach((i,k)=>{if(nf&&k===0)h+='<div class="isep">Favoritas</div>';if(nf&&k===nf&&nf<L.length)h+='<div class="isep">Otras instancias</div>';h+=insRow(i)})}
  $("il").innerHTML=h;
}
let iqT=0;$("iq").oninput=()=>{clearTimeout(iqT);iqT=setTimeout(()=>{iQ=$("iq").value.trim().toLowerCase();ri()},120)};
$("il").onclick=async e=>{
  const tg=e.target.closest(".etq");if(tg){iTag=tg.dataset.t;ri();return}
  const b=e.target.closest("button[data-a]");if(!b){const row=e.target.closest(".ir");if(row)openMods(row.dataset.i);return}const id=b.closest(".ir").dataset.i,i=I.find(x=>x.id===id),a=b.dataset.a;if(!i)return;
  if(a==="fav"){try{await(A||DA).instUpdate(id,{fav:!i.fav});await loadI()}catch(x){flash(em(x))}return}
  if(a==="del"){if(!confirm("¿Borrar «"+i.name+"» con sus mundos, mods y copias de seguridad? No se puede deshacer."))return;try{await api.delInst(id);await loadI();flash("Instancia borrada")}catch(x){flash(em(x))}return}
  if(a==="play"){pick(i.mc,i.type||"release",i.ld);sel.inst=i.id;show("home");play(i.id)}else if(a==="mods")openMods(id);else if(a==="shots")openShots(id);else openOpts(id)};
// --- Crear una instancia a mano (sin lanzar el juego) ---
function openCreate(pre){
  pre=pre||{};let ld=pre.ld||"Vanilla",type=pre.type||"release",mc=pre.mc||sel.mc,nmT=false;
  const dn=()=>LDN(ld)+" "+mc;
  modal(`<div class="hd"><div class="iic">${IC("box")}</div><div style="min-width:0"><h3>Crear instancia</h3><span class="sub">Con sus propios mundos, mods y ajustes. No abre el juego.</span></div><button class="btn sm x" data-x>Cerrar</button></div>
<div class="fr"><label>Nombre</label><input id="cnm" type="text" maxlength="40" autocomplete="off"></div>
<label class="wl">Cargador</label><div class="chips" id="cld"></div>
<label class="wl">Tipo de versión</label><div class="chips" id="ctf"></div>
<div class="fr"><label>Versión de Minecraft</label><select id="cmc"></select></div>
<label class="chk" style="display:flex;gap:8px;align-items:flex-start;margin:10px 0 2px;cursor:pointer"><input type="checkbox" id="ccc" checked style="margin-top:3px"><span><b>Usar mis controles</b><br><small style="color:var(--m)">Copia las teclas, sensibilidad, FOV, sonido, idioma y escala de la última instancia que jugaste. No toca los ajustes de vídeo ni los de otros mods.</small></span></label>
<div class="acts"><button class="btn" data-x>Cancelar</button><button class="btn pr" id="cgo">Crear instancia</button></div>`);
  const nm=$("cnm");nm.value=dn();nm.oninput=()=>{nmT=true};
  const draw=()=>{
    if(!LD[ld](mc)){ld="Vanilla"}
    chips($("cld"),Object.keys(LD).map(k=>[k,LDN(k),!LD[k](mc)]),ld,k=>{ld=k;draw()});
    chips($("ctf"),Object.entries(TN).filter(([k])=>k!=="all"),type,k=>{type=k;draw()});
    let list=V.filter(v=>v.type===type&&LD[ld](v.id));if(!list.find(v=>v.id===mc))list.unshift({id:mc,type});
    $("cmc").innerHTML=list.slice(0,300).map(v=>`<option ${v.id===mc?"selected":""}>${esc(v.id)}</option>`).join("");
    if(!nmT)nm.value=dn()};
  $("cmc").onchange=e=>{mc=e.target.value;const v=V.find(z=>z.id===mc);if(v)type=v.type;draw()};
  draw();nm.focus();nm.select();
  $("cgo").onclick=async()=>{const b=$("cgo"),name=nm.value.trim().slice(0,40);if(!name){flash("Escribe un nombre");return}
    if(!A){flash("En la vista previa no se pueden crear instancias");return}
    b.disabled=true;try{const i=await A.saveInst({name,mc,ld,type,manual:true,copyControls:!!($("ccc")&&$("ccc").checked)});await loadI();closeModal();flash("Instancia «"+name+"» creada ✓");if(i&&i.id&&$("inst").classList.contains("on"))ri()}catch(e){flash(em(e));b.disabled=false}};
}
$("icr").onclick=()=>openCreate({mc:sel.mc,ld:sel.ld,type:sel.type});
$("ish").onclick=()=>openShots("all");$("imo2").onclick=()=>openImport();
$("imp").onclick=async()=>{if(!A){pv("imp");return}
const b=$("imp");b.disabled=true;try{const r=await A.instImport();if(r&&!r.canceled){await loadI();flash("Instancia importada: "+r.ins.name+(r.failed&&r.failed.length?" (faltan "+r.failed.length+" archivos)":""))}}catch(e){flash("No se pudo importar: "+em(e))}finally{b.disabled=false}};
$("ifo").onclick=()=>{if(A)A.folder();else pv("ifo")};
// --- Gestor de mods ---
async function openMods(id){const ins=I.find(x=>x.id===id);if(!ins)return;const api=A||DA;
modal(hdr(ins,esc(ins.name),esc(LDN(ins.ld||"Vanilla"))+" · Minecraft "+esc(ins.mc)+(ins.playMs?" · "+esc(plLine(ins)):""))+`<div class="idt"><div class="fr"><label>Nombre</label><input id="dn" type="text" maxlength="40" value="${esc(ins.name)}"></div><div class="fr"><label>Descripción</label><textarea id="dd" rows="2" maxlength="600" placeholder="Para qué usas esta instancia, mods que faltan…">${esc(ins.note||"")}</textarea></div><div class="acts2"><button class="btn sm pr" id="dsv" type="button" disabled>Guardar cambios</button><button class="btn sm pr" id="dpl" type="button">Jugar</button><button class="btn sm" id="dop" type="button">Opciones</button><button class="btn sm" id="dfo" type="button">Abrir carpeta</button></div></div><h4 class="idh">Mods <span id="mst">Cargando…</span></h4><div class="mbar"><input id="mq" type="text" placeholder="Filtrar mods…"><button class="btn sm pr" id="mup" style="display:none"></button><button class="btn sm pr" id="msr" type="button">Añadir mods, shaders y texturas</button><button class="btn sm" id="mad">Añadir .jar</button><button class="btn sm" id="mfo">Abrir carpeta de mods</button></div><div id="mls"></div>`,"wide");
{const dv=()=>{$("dsv").disabled=$("dn").value.trim()===ins.name&&$("dd").value.trim()===(ins.note||"")};$("dn").oninput=dv;$("dd").oninput=dv;
$("dsv").onclick=async()=>{const b=$("dsv");b.disabled=true;try{await api.instUpdate(id,{name:$("dn").value.trim()||ins.name,note:$("dd").value.trim()});await loadI();const n=I.find(x=>x.id===id);if(n){ins.name=n.name;ins.note=n.note;const h=document.querySelector("#mdl .hd h3");if(h)h.textContent=n.name}dv();flash("Instancia guardada ✓")}catch(x){b.disabled=false;flash(em(x))}};
$("dpl").onclick=()=>{closeModal();pick(ins.mc,ins.type||"release",ins.ld);sel.inst=ins.id;show("home");play(ins.id)};
$("dop").onclick=()=>openOpts(id);$("dfo").onclick=()=>{if(A)A.instOpen(id,"")};
$("msr").onclick=()=>openAdd(id)}
let L=[],M={};
const sum=()=>{const n=L.filter(m=>M[m.sha1]&&M[m.sha1].update).length,b=$("mup");if(!b)return;b.style.display=n?"":"none";b.textContent=`Actualizar todo (${n})`;return n};
const draw=()=>{const q=($("mq").value||"").toLowerCase();const rows=L.filter(m=>!q||m.file.toLowerCase().includes(q)||((M[m.sha1]||{}).title||"").toLowerCase().includes(q));
$("mls").innerHTML=rows.length?rows.map(m=>{const i=M[m.sha1]||{},u=i.update;return `<div class="mr ${m.enabled?"":"off"}" data-f="${esc(m.file)}" data-h="${m.sha1}"><div class="ico">${i.icon?`<img src="${esc(i.icon)}" loading="lazy" decoding="async" onerror="this.remove()">`:IC("puzzle")}</div><div class="nm"><b>${esc(i.title||m.file.replace(/\.jar(\.disabled)?$/i,""))}</b><small>${esc(m.file.replace(/\.disabled$/,""))} · ${fSz(m.size)}${i.ver?" · v"+esc(i.ver):""}${i.title?"":" · archivo local"}</small></div>${u?`<button class="btn sm pr" data-a="up">Actualizar a ${esc(u.ver)}</button>`:""}<label class="tg" title="${m.enabled?"Desactivar":"Activar"}"><input type="checkbox" data-a="tg" ${m.enabled?"checked":""}><i></i></label><button class="btn sm dg" data-a="rm">Borrar</button></div>`}).join(""):`<div class="emp">${L.length?"Ningún mod coincide con el filtro.":"Esta instancia aún no tiene mods. Instálalos desde la pestaña Mods o añade un .jar."}</div>`};
const relist=async()=>{try{L=await api.modsList(id)}catch(e){L=[];flash(em(e))}draw();sum()};
const load=async()=>{M={};await relist();$("mst").textContent=L.length+" mods";if(!L.length)return;$("mst").textContent=L.length+" mods · comprobando actualizaciones…";
try{M=await api.modsCheck({id,hashes:L.map(m=>m.sha1)})}catch{$("mst").textContent=L.length+" mods · sin conexión con Modrinth";return}
const n=sum();$("mst").textContent=L.length+" mods · "+(n?n+" con actualización":"todo al día");draw()};
$("mq").oninput=draw;$("mfo").onclick=()=>{if(A)A.instOpen(id,"mods")};
$("mad").onclick=async()=>{if(!A){pv("mad");return}try{if(await A.modsAdd(id))load()}catch(e){flash(em(e))}};
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
const d=modal(hdr(ins,"Opciones de la instancia",esc(LDN(ins.ld||"Vanilla"))+" · "+esc(ins.mc))+`<div class="fr"><label>Nombre</label><input id="on" type="text" maxlength="40" value="${esc(ins.name)}"></div>
<div class="fr"><label>Icono</label><div class="icp" id="oic">${ICS.map(n=>`<button class="ib ${n===ic?"on":""}" data-i="${n}" type="button">${IC(n)}</button>`).join("")}</div></div>
<div class="fr"><label>Color</label><div class="cs2" id="ocl"><div class="sw2 ${col?"":"on"}" data-c="" style="background:var(--ac)" title="Color del launcher"></div>${ICOL.map(c=>`<div class="sw2 ${col===c?"on":""}" data-c="${c}" style="background:${c}"></div>`).join("")}</div></div>
<div class="fr"><label>Memoria RAM</label><div class="rr"><input type="range" id="orm" min="0" max="${Math.max(2,Math.min(32,tot))}" step="1" value="${ins.ram||0}"><b id="orv"></b></div></div>
<div class="fr"><label>Java</label><input id="oj" type="text" placeholder="Vacío = el de Ajustes (o Java automático)" value="${esc(ins.javaPath||"")}"></div>
<div class="fr"><label>Etiquetas</label><input id="otg" type="text" maxlength="120" placeholder="Survival, Pruebas… (separadas por comas)" value="${esc((ins.tags||[]).join(", "))}"></div>
<div class="fr"><label>Nota</label><textarea id="ont" rows="2" maxlength="600" placeholder="Para qué usas esta instancia, mods que faltan…">${esc(ins.note||"")}</textarea></div>
<div class="fr"><label>Ajustes de Java</label><select id="ojp"><option value="">Normales</option><option value="rendimiento" ${ins.jvmPreset==="rendimiento"?"selected":""}>Rendimiento</option><option value="tirones" ${ins.jvmPreset==="tirones"?"selected":""}>Pocos tirones</option></select></div>
<div class="fr"><label>Menú de Nova</label><select id="onv"><option value="">Activado</option><option value="1" ${ins.noNova?"selected":""}>Jugar sin el menú de Nova</option></select></div><small class="hint" style="margin:-6px 0 12px 142px">Salida rápida si el menú da problemas con un mod o servidor. También puedes mantener Mayús al pulsar Jugar.</small>
<div class="fr"><label>Tarjeta gráfica</label><select id="ogp"><option value="">Automática</option><option value="high" ${ins.gpu==="high"?"selected":""}>Usar la más potente</option></select></div><small class="hint" style="margin:-6px 0 12px 142px">En portátiles con dos tarjetas gráficas obliga a Java a usar la dedicada (Windows 10/11).</small>
${hasL?`<div class="fr"><label>Versión de ${esc(ins.ld)}</label><select id="olv"><option value="">Cargando…</option></select></div><small class="hint" id="olh" style="display:block;margin:-6px 0 12px 142px"></small>`:""}
<div class="acts2"><button class="btn sm" data-a="fo">Abrir carpeta</button><button class="btn sm" data-a="dup">Duplicar</button><button class="btn sm" data-a="ex">Exportar…</button><button class="btn sm" data-a="wo">Mundos</button><button class="btn sm" data-a="sh">Capturas</button><button class="btn sm" data-a="bk">Copias de seguridad</button><button class="btn sm dg" data-a="del">Borrar instancia</button></div>
<div class="acts"><button class="btn" data-x>Cancelar</button><button class="btn pr" id="osv">Guardar</button></div>`);
const rv=()=>{const v=+$("orm").value;$("orv").textContent=v?v+" GB":"Global ("+cfg.ram+" GB)"};rv();$("orm").oninput=rv;
$("oic").onclick=e=>{const b=e.target.closest("button");if(!b)return;ic=b.dataset.i;$("oic").querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===b))};
$("ocl").onclick=e=>{const b=e.target.closest(".sw2");if(!b)return;col=b.dataset.c;$("ocl").querySelectorAll(".sw2").forEach(x=>x.classList.toggle("on",x===b))};
if(hasL){const lv=async()=>{const s=$("olv");if(!s)return;let L=[],err="";s.innerHTML=`<option value="">Cargando…</option>`;const hh=$("olh");if(hh)hh.innerHTML="";
try{L=await api.loaderVersions({ld:ins.ld,mc:ins.mc})}catch(x){err=em(x)}if(!$("olv"))return;
const off=!err&&L.length&&L.every(x=>x.off);if(off)err="Sin conexión con Fabric: se muestra la lista incluida en el launcher (puede faltar alguna versión muy nueva). Si falla al jugar con la versión elegida, prueba con otra red o con «Automática».";const cur=ins.loaderVersion||"";if(cur&&!L.some(x=>x.v===cur))L.unshift({v:cur,stable:true});
s.innerHTML=`<option value="">Automática (recomendada)</option>`+L.map(x=>`<option value="${esc(x.v)}" ${x.v===cur?"selected":""}>${esc(x.v)}${x.stable?"":" (beta)"}</option>`).join("");
const h=$("olh");if(h)h.innerHTML=err?`<span style="color:#ff9aa4">${esc(err)}</span> <button class="btn sm" id="olr" type="button">Reintentar</button>`:"";
if(err&&$("olr"))$("olr").onclick=lv}
lv()}
$("osv").onclick=async()=>{const b=$("osv");b.disabled=true;const p={name:$("on").value.trim()||ins.name,icon:ic,color:col,ram:+$("orm").value,javaPath:$("oj").value.trim(),jvmPreset:$("ojp").value,gpu:$("ogp").value,noNova:$("onv").value==="1",tags:$("otg").value,note:$("ont").value.trim()};if(hasL&&$("olv"))p.loaderVersion=$("olv").value;
try{await api.instUpdate(id,p);await loadI();closeModal();flash("Cambios guardados")}catch(e){b.disabled=false;flash(em(e))}};
d.querySelector(".acts2").onclick=async e=>{const b=e.target.closest("button[data-a]");if(!b)return;const a=b.dataset.a;
try{if(a==="fo"){if(A)A.instOpen(id,"");else pv("ifol")}
else if(a==="dup"){b.disabled=true;b.textContent="Duplicando…";await api.instDup(id);await loadI();closeModal();flash("Instancia duplicada")}
else if(a==="ex")openExport(id);else if(a==="bk")openBackups(id);else if(a==="wo")openWorlds(id);else if(a==="sh")openShots(id);
else if(a==="del"){if(!confirm("¿Borrar «"+ins.name+"» con sus mundos, mods y copias de seguridad? No se puede deshacer."))return;await api.delInst(id);await loadI();closeModal();flash("Instancia borrada")}}
catch(x){flash(em(x));b.disabled=false}}}
// --- Exportar ---
function openExport(id){const ins=I.find(x=>x.id===id);if(!ins)return;let kind="mrpack";
modal(hdr(ins,"Exportar «"+esc(ins.name)+"»","Para pasarla a otro PC o a otra persona")+`<div class="fr"><label>Formato</label><div class="chips" id="ek"></div></div><p class="sub" id="ekd" style="margin:2px 0 14px"></p><div class="fr"><label>Incluir los mundos</label><label class="tg"><input type="checkbox" id="ew"><i></i></label></div><div class="acts"><button class="btn" id="eb">Volver</button><button class="btn pr" id="eg">Exportar</button></div>`);
const T={mrpack:"Modpack de Modrinth (.mrpack): pesa poco; los mods se vuelven a descargar al importar. Los que no estén en Modrinth se incluyen dentro del archivo. Sirve también en otros launchers.",zip:"ZIP de Nova Launcher (.zip): lleva todo dentro, mods incluidos, y pesa más. Solo se puede importar en Nova Launcher."};
const dr=()=>{chips($("ek"),[["mrpack","Modrinth (.mrpack)"],["zip","ZIP (.zip)"]],kind,k=>{kind=k;dr()});$("ekd").textContent=T[kind]};dr();
$("eb").onclick=()=>openOpts(id);
$("eg").onclick=async()=>{const b=$("eg");if(!A){closeModal();pv("exp",kind);return}b.disabled=true;b.textContent="Exportando…";
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
const rel=x=>/^\d+\.\d+(\.\d+)?$/.test(x),key=v=>String(v).split(".").map(n=>parseInt(n)||0),mcs=[...new Set(vs.flatMap(v=>v.mc))].filter(rel).sort((a,b)=>{const x=key(a),y=key(b);for(let n=0;n<3;n++){const d=(y[n]||0)-(x[n]||0);if(d)return d}return 0});
let f=mcs.includes(sel.mc)?sel.mc:"";   // filtro de versión de Minecraft (por defecto, la elegida en el launcher)
const build=()=>{if(f){const L=vs.filter(v=>v.mc.includes(f)),rec=L.find(v=>v.type==="release")||L[0];return{list:L.slice(0,60),rec,comp:L}}
const comp=vs.filter(ok),rest=vs.filter(v=>!ok(v)),rec=comp.find(v=>v.type==="release")||comp[0];return{list:(rec?[rec,...comp.filter(v=>v!==rec),...rest]:rest).slice(0,60),rec,comp}};
const rows=(list,rec)=>list.length?list.map((v,k)=>`<div class="mr pv" data-k="${k}"><div class="nm"><b>${esc(v.name||v.num)}</b><small>${esc(v.num)} · MC ${esc(v.mc.slice(-3).reverse().join(", "))}${v.mc.length>3?"…":""} · ${esc(v.ld.join(", "))} · ${fmtD(v.date)}</small></div>${v===rec?'<span class="bdg">Recomendada</span>':!f&&ok(v)?'<span class="bdg">Compatible</span>':""}${v.type&&v.type!=="release"?`<span class="bdg w">${esc(v.type)}</span>`:""}<button class="btn sm ${v===rec?"pr":""}">Instalar</button></div>`).join(""):'<div class="wnote">Ninguna versión coincide con ese filtro.</div>';
return new Promise(res=>{pickRes=res;let cur=build();const d=modal(`<div class="hd"><div class="iic">${IC("puzzle")}</div><div style="min-width:0"><h3>Versión de «${esc(h.t)}»</h3><span class="sub">Filtra por versión de Minecraft y elige la versión del modpack</span></div><button class="btn sm x" data-x>Cancelar</button></div><div class="wz"><label class="wl">Versión de Minecraft</label><select id="pmf" class="wmf"><option value="">Todas</option>${mcs.map(m=>`<option value="${esc(m)}"${m===f?" selected":""}>${esc(m)}</option>`).join("")}</select></div><div id="pvl" style="margin-top:12px">${rows(cur.list,cur.rec)}</div>`,"wide");
d.querySelector("#pmf").onchange=e=>{f=e.target.value;cur=build();d.querySelector("#pvl").innerHTML=rows(cur.list,cur.rec)};
d.querySelector("#pvl").onclick=e=>{const r=e.target.closest(".pv");if(!r)return;const v=cur.list[+r.dataset.k];pickRes=null;closeModal();res(v.id)}})}
