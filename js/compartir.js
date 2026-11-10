// Compartir modpacks con un enlace y añadir modpacks (pegar enlace, elegir archivo o buscar en Modrinth)
// Va con main/pack.js (IPC share:make, pack:preview, pack:install). Del enlace solo se leen ids y huellas.
let PKB=null;   // barra de progreso de la instalación (si hay un diálogo abierto)
if(A&&A.on)A.on("progress",p=>{if(PKB&&p&&p.total){const b=$("pkb");if(b)b.style.width=Math.round(p.task/p.total*100)+"%";const t=$("pkt2");if(t)t.textContent=p.task+" / "+p.total}});
const PKT={m:"Mods",r:"Texturas",s:"Shaders"};
async function copyText(t){try{if(A&&A.clip)await A.clip(t);else await navigator.clipboard.writeText(t);return true}catch{return false}}

// --- Compartir ---
async function openShare(id){const ins=I.find(x=>x.id===id);if(!ins)return;
modal(hdr(ins,"Compartir modpack","«"+esc(ins.name)+"»")+`<div id="shb"><p class="sub">${trad("Preparando el enlace…")}</p></div>`);
if(!A){$("shb").innerHTML=`<p class="sub">${trad("En la vista previa no se puede generar el enlace")}</p>`;return}
let r;try{r=await A.shareMake(id)}catch(e){if($("shb"))$("shb").innerHTML=`<p class="warn" style="margin:0">${esc(trad("No se pudo crear el enlace")+": "+em(e))}</p><div class="acts"><button class="btn" data-x>Cerrar</button></div>`;return}
if(!$("shb"))return;let fm="web";
const left=r.left.length?`<div class="fr" style="display:block"><p class="warn" style="margin:0 0 6px">${esc(trad("Se quedan fuera del enlace porque no están en Modrinth")+" ("+r.left.length+")")}</p><div style="max-height:110px;overflow:auto;font-size:12px;color:var(--m)">${r.left.map(x=>`<div>${esc(trad(PKT[x.t]||"Mods"))} · ${esc(x.file)}</div>`).join("")}</div></div>`:"";
$("shb").innerHTML=`<p class="sub" style="margin-bottom:10px">${esc(r.shared+" "+trad("archivos incluidos en el enlace"))}</p>${left}<div class="fr"><label>Formato</label><div class="chips" id="shf"></div></div><p class="sub" id="shd" style="margin:2px 0 8px"></p><div class="fr"><input id="shl" type="text" readonly style="width:100%"></div><div class="acts"><button class="btn" data-x>Cerrar</button><button class="btn pr" id="shc" type="button">Copiar enlace</button></div>`;
const T={web:"Página web: funciona aunque quien lo reciba aún no tenga el launcher; ahí podrá descargarlo.",app:"Abrir en Nova: se abre directamente el launcher (hay que tenerlo instalado)."};
const dr=()=>{chips($("shf"),[["web","Página web"],["app","Abrir en Nova"]],fm,k=>{fm=k;dr()});$("shd").textContent=trad(T[fm]);$("shl").value=r[fm]};dr();
$("shl").onfocus=e=>e.target.select();
$("shc").onclick=async()=>{flash(await copyText(r[fm])?"Enlace copiado":"No se pudo copiar")}}

// --- Añadir modpack ---
function openAddPack(prefill){const api=A;
const head=hdr(null,"Añadir modpack","Desde un enlace, un archivo o Modrinth");
const home=()=>{modal(head+`<div class="fr" style="display:block"><label style="display:block;margin-bottom:6px">${trad("Pegar enlace o código")}</label><textarea id="pkl" rows="3" maxlength="200000" placeholder="nova://pack?d=…  ·  https://…/pack#…" style="width:100%"></textarea><div class="acts2" style="margin-top:8px"><button class="btn sm pr" id="pkg" type="button">Continuar</button></div></div><div class="acts2"><button class="btn sm" id="pkf" type="button">Elegir archivo…</button><button class="btn sm" id="pkm" type="button">Buscar en Modrinth</button></div><p class="sub" style="margin-top:8px">${trad("Archivos admitidos: .mrpack o .zip exportado por Nova")}</p><div class="acts"><button class="btn" data-x>Cancelar</button></div>`);
 $("pkg").onclick=()=>{const t=$("pkl").value.trim();if(!t){flash("Pega un enlace o un código");return}showPv({text:t})};
 $("pkf").onclick=async()=>{if(!api){flash("En la vista previa no se pueden añadir modpacks");return}try{const r=await api.packPick();if(r&&r.file)showPv({file:r.file})}catch(e){flash(em(e))}};
 $("pkm").onclick=()=>{closeModal();lazyLoad("mods").then(()=>{kind="modpack";cat="";if(typeof mchips==="function")mchips();show("mods")})};
};
async function showPv(src){
 if(!api){flash("En la vista previa no se pueden añadir modpacks");return}
 modal(head+`<p class="sub">${trad("Leyendo el modpack…")}</p>`);
 let p;try{p=await api.packPreview(src)}catch(e){modal(head+`<p class="warn" style="margin:0 0 12px">${esc(em(e))}</p><div class="acts"><button class="btn" id="pkb0">Volver</button><button class="btn" data-x>Cerrar</button></div>`);$("pkb0").onclick=home;return}
 const ld=p.ld&&p.ld!=="Vanilla"?esc(LDN(p.ld))+(p.lv?" "+esc(p.lv):"")+" · ":"",parts=[];
 parts.push(p.mods+" "+trad(p.mods===1?"mod":"mods"));if(p.resourcepacks)parts.push(p.resourcepacks+" "+trad("texturas"));if(p.shaders)parts.push(p.shaders+" "+trad("shaders"));
 let mode="copy";
 modal(head+`<div class="fr" style="display:block"><h4 style="margin:0 0 4px">${esc(p.name)}</h4><p class="sub" style="margin:0">${ld}Minecraft ${esc(p.mc)}</p><p class="sub" style="margin:4px 0 0">${esc(parts.join(" · "))}${p.size?" · "+trad("Tamaño estimado")+" "+fSz(p.size):""}${p.ram?" · "+p.ram+" GB RAM":""}</p></div>${p.missing?`<p class="warn" style="margin:0 0 10px">${esc(trad("Faltan archivos que ya no están en Modrinth")+": "+p.missing)}</p>`:""}${p.unsupported?`<p class="warn" style="margin:0 0 10px">${esc(trad(p.unsupported))}</p>`:""}${p.exists?`<div class="fr"><label>${trad("Ya existe una instancia con ese nombre")}</label><div class="chips" id="pkx"></div></div><p class="sub" id="pkd" style="margin:2px 0 10px"></p>`:""}<div id="pkp" style="display:none"><div style="height:8px;border-radius:6px;background:var(--p2);overflow:hidden"><i id="pkb" style="display:block;height:100%;width:0;background:var(--ac);transition:width .2s"></i></div><p class="sub" style="margin:6px 0 0"><span id="pkt2"></span> ${trad("Instalando…")}</p></div><div class="acts"><button class="btn" id="pkc" type="button">Cancelar</button><button class="btn pr" id="pki" type="button"${p.unsupported?" disabled":""}>Instalar</button></div>`);
 if(p.exists){const D={copy:"Se crea otra instancia con el nombre y un número; la existente no se toca.",replace:"Se instala la nueva y después se borra la existente. Antes se guarda una copia de sus mundos."};
  const dr=()=>{chips($("pkx"),[["copy","Crear copia"],["replace","Reemplazar"]],mode,k=>{mode=k;dr()});$("pkd").textContent=trad(D[mode])};dr()}
 $("pkc").onclick=()=>closeModal();
 $("pki").onclick=async()=>{const b=$("pki");b.disabled=true;$("pkc").disabled=true;$("pkp").style.display="block";MLOCK=true;PKB=1;
  try{const r=await api.packInstall({...src,mode:p.exists?mode:undefined});MLOCK=false;PKB=null;closeModal(true);await loadI();flash(trad("Modpack instalado")+": "+r.ins.name+(r.failed&&r.failed.length?" ("+trad("faltan")+" "+r.failed.length+")":""));if($("inst")&&$("inst").classList.contains("on"))ri()}
  catch(e){MLOCK=false;PKB=null;if(e&&/cancel/i.test(String(e.message||e))){closeModal(true);return}$("pkp").style.display="none";b.disabled=false;$("pkc").disabled=false;flash("No se pudo instalar: "+em(e))}}}
if(prefill)showPv({text:prefill});else home()}
