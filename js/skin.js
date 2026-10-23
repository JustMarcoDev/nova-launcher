// Pestaña Skin (0.2.15-beta.13): vista 3D, biblioteca de skins, cambio de skin y capa (Microsoft) y skin local (offline)
let SKV=null,SKS={skins:[],sel:"",acc:{type:"offline",name:""}},SKC=null,SKD=null,SKCAPE=undefined,SKB=false;
const SKA=()=>A||(typeof DA!=="undefined"?DA:null);
function skBundle(){return window.skinview3d?Promise.resolve():new Promise((ok,no)=>{const s=document.createElement("script");s.src="js/vendor/skinview3d.bundle.js";s.onload=ok;s.onerror=()=>no(new Error("No se pudo cargar la vista 3D"));document.head.appendChild(s)})}
function skMs(){return SKS.acc&&SKS.acc.type==="microsoft"}
function skModelOf(m){return m==="slim"?"slim":"default"}
// Carga una skin en el visor (si no hay skin, el visor se queda vacío y se ve el texto de ayuda)
async function skShow(){
  $("skh").style.display=SKD&&SKD.data?"none":"";
  if(!SKV)return;
  try{
    if(SKD&&SKD.data)await SKV.loadSkin(SKD.data,{model:skModelOf(SKD.model)});else SKV.resetSkin&&SKV.resetSkin();
    if(SKCAPE&&SKCAPE.data)await SKV.loadCape(SKCAPE.data);else SKV.resetCape&&SKV.resetCape();
  }catch(e){flash("No se pudo mostrar la skin: "+em(e))}
}
function skThumb(d){return `style="--d:url('${d}')"`}
function skDraw(){
  const ms=skMs(),sel=SKS.sel;
  $("sks").textContent=ms?"Cuenta de Microsoft: la skin y la capa que elijas cambian en tu cuenta de Minecraft (la ven todos los jugadores) y tú la ves al instante en el juego.":"Cuenta sin conexión: la skin que elijas solo la verás tú (los demás jugadores no la ven). Para que todos la vean hace falta una cuenta de Microsoft.";
  $("skmd").querySelectorAll("button").forEach(b=>b.classList.toggle("on",b.dataset.m===(SKD?SKD.model:"classic")));
  const cur=SKD&&SKD.id,useTxt=ms?"Aplicar a mi cuenta":"Usar esta skin";
  $("sku").textContent=useTxt;$("sku").disabled=!(SKD&&SKD.data)||SKB;  $("skx").style.display=sel?"":"none";
  const sv=SKD&&SKD.id?SKS.skins.find(z=>z.id===SKD.id):null;$("skt").style.display=sv?"":"none";if(sv&&$("skni").hidden)$("sknm").textContent=sv.name;
  ["skrn","skrp","skdel"].forEach(i=>$(i).disabled=SKB);
  $("skl").innerHTML=SKS.skins.length?SKS.skins.map(s=>`<div class="skc${s.id===cur?" on":""}${s.id===sel?" use":""}" data-id="${esc(s.id)}" tabindex="0"><span class="skhd" ${skThumb(s.data)}></span><b>${esc(s.name)}</b><small>${s.model==="slim"?"Fina":"Clásica"}</small>${s.id===sel?`<small class="sku2">En uso</small>`:""}<button class="skdl" data-del="${esc(s.id)}" title="Eliminar skin" aria-label="Eliminar skin">${IC("x")}</button></div>`).join(""):`<p class="sub">Aún no has guardado ninguna skin. Sube un .png de 64×64 y se guardará aquí.</p>`;
  $("skcp").style.display=ms?"":"none";
  if(ms){const cs=(SKC&&SKC.capes)||[];$("skcl").innerHTML=cs.length?[`<button class="chip${!SKCAPE?" on":""}" data-c="">Sin capa</button>`,...cs.map(c=>`<button class="chip${SKCAPE&&SKCAPE.id===c.id?" on":""}" data-c="${esc(c.id)}">${esc(c.alias)}${c.active?" ✓":""}</button>`)].join(""):`<span class="sub">Tu cuenta no tiene capas.</span>`;
    const act=cs.find(c=>c.active);$("skca").disabled=SKB||((SKCAPE?SKCAPE.id:"")===(act?act.id:""));}
}
async function skLoad(){
  const api=SKA();if(!api)return;
  try{SKS=await api.skinList()}catch(e){flash(em(e))}
  if(skMs()){try{SKC=await api.skinCurrent()}catch(e){SKC=null;flash(em(e))}}else SKC=null;
  const act=SKC&&SKC.capes&&SKC.capes.find(c=>c.active);SKCAPE=act||undefined;
  const sel=SKS.skins.find(s=>s.id===SKS.sel);
  if(!SKD){SKD=sel?{...sel}:SKC&&SKC.skin&&SKC.skin.data?{data:SKC.skin.data,model:SKC.skin.variant,name:"Mi skin"}:null}
  skDraw();skShow();
}
async function skOpen(){
  if(!SKV){
    try{await skBundle()}catch(e){flash(em(e));return}
    const c=$("skc3");
    try{
      SKV=new skinview3d.SkinViewer({canvas:c,width:300,height:420});
      SKV.controls.enableZoom=false;SKV.fov=40;SKV.zoom=.9;SKV.autoRotate=true;SKV.autoRotateSpeed=.6;
      SKV.animation=new skinview3d.WalkingAnimation();SKV.animation.speed=.7;
    }catch(e){SKV=null;$("skh").textContent="Tu equipo no admite la vista 3D (WebGL). Puedes usar la pestaña igualmente.";$("skh").style.display=""}
  }
  skLoad();
}
function skRead(f){
  return new Promise((ok,no)=>{
    if(!f)return no(new Error("Elige un archivo"));
    if(!/\.png$/i.test(f.name)&&f.type!=="image/png")return no(new Error("Elige un archivo .png"));
    if(f.size>200000)return no(new Error("El archivo es demasiado grande para ser una skin"));
    const r=new FileReader();r.onerror=()=>no(new Error("No se pudo leer el archivo"));
    r.onload=()=>{const im=new Image();im.onload=()=>{if(im.width!==64||(im.height!==64&&im.height!==32))return no(new Error("Una skin de Minecraft mide 64×64 píxeles (o 64×32 las antiguas)"));ok(r.result)};im.onerror=()=>no(new Error("Ese archivo no es una imagen válida"));im.src=r.result};
    r.readAsDataURL(f)});
}
async function skSave(){
  const api=SKA();if(!api||!SKD||!SKD.data)return null;
  SKS=await api.skinSave({name:SKD.name||"Skin",model:SKD.model,data:SKD.data});
  const n=SKS.skins[SKS.skins.length-1];SKD={...n};return n;
}
function skBusy(b){SKB=b;skDraw()}
function skInit(){
  $("skf").onchange=async()=>{const f=$("skf").files[0];$("skf").value="";try{const d=await skRead(f);SKD={data:d,model:SKD?SKD.model:"classic",name:f.name.replace(/\.png$/i,"").slice(0,30)||"Skin"};skDraw();skShow();await skSave();skDraw();flash("Skin guardada en la carpeta del launcher ✓")}catch(e){flash(em(e))}};
  $("sks2").onclick=()=>$("skf").click();
  $("skmd").onclick=async e=>{const b=e.target.closest("button[data-m]");if(!b||!SKD)return;SKD.model=b.dataset.m;if(SKD.id){try{SKS=await SKA().skinModel({id:SKD.id,model:SKD.model})}catch(x){flash(em(x))}}skDraw();skShow()};
  $("sku").onclick=async()=>{
    const api=SKA();if(!api||!SKD||!SKD.data)return;
    try{skBusy(true);if(!SKD.id)await skSave();const r=await api.skinUse(SKD.id);SKS=r;flash(r.mode==="microsoft"?"Skin cambiada en tu cuenta ✓ (puede tardar un momento en verse en el juego)":"Skin aplicada ✓ Solo tú la verás al jugar")}
    catch(e){flash(em(e))}finally{skBusy(false);skDraw()}};
  $("skx").onclick=async()=>{try{SKS=await SKA().skinUnset();flash("Vuelves a la skin de tu nombre");skDraw()}catch(e){flash(em(e))}};
  const del=async id=>{if(!confirm(trad("¿Eliminar esta skin? Se borra de la carpeta del launcher.")))return;try{SKS=await SKA().skinDel(id);if(SKD&&SKD.id===id){SKD={...SKD,id:undefined}}skDraw();flash("Skin eliminada")}catch(x){flash(em(x))}};
  const ren=async()=>{const i=$("skni"),sv=SKS.skins.find(z=>z.id===(SKD&&SKD.id));if(!sv)return;
    if(i.hidden){i.value=sv.name;i.hidden=false;$("sknm").hidden=true;$("skrn").textContent=trad("Guardar nombre");i.focus();i.select();return}
    const n=i.value.trim();i.hidden=true;$("sknm").hidden=false;$("skrn").textContent=trad("Editar nombre");
    if(!n||n===sv.name)return;try{SKS=await SKA().skinRename({id:sv.id,name:n});SKD={...SKD,name:(SKS.skins.find(z=>z.id===sv.id)||{}).name||n};skDraw();flash("Nombre cambiado ✓")}catch(x){flash(em(x))}};
  $("skrn").onclick=ren;
  $("skni").onkeydown=e=>{if(e.key==="Enter")ren();if(e.key==="Escape"){$("skni").hidden=true;$("sknm").hidden=false;$("skrn").textContent=trad("Editar nombre")}};
  $("skdel").onclick=()=>SKD&&SKD.id&&del(SKD.id);
  $("skrp").onclick=()=>$("skf2").click();
  $("skf2").onchange=async()=>{const f=$("skf2").files[0];$("skf2").value="";if(!SKD||!SKD.id)return;
    try{const d=await skRead(f);skBusy(true);const id=SKD.id;SKS=await SKA().skinReplace({id,data:d});SKD={...SKS.skins.find(z=>z.id===id)};skShow();
      flash(skMs()&&SKS.sel===id?"PNG cambiado ✓ Pulsa «Aplicar a mi cuenta» para subirlo a Mojang":"PNG cambiado ✓")}
    catch(e){flash(em(e))}finally{skBusy(false);skDraw()}};
  $("skfo").onclick=()=>SKA().skinFolder().catch(e=>flash(em(e)));
  $("skl").onclick=async e=>{
    const d=e.target.closest("[data-del]");
    if(d){del(d.dataset.del);return}
    const c=e.target.closest(".skc");if(!c)return;const s=SKS.skins.find(z=>z.id===c.dataset.id);if(!s)return;SKD={...s};skDraw();skShow()};
  $("skcl").onclick=e=>{const b=e.target.closest("button[data-c]");if(!b)return;SKCAPE=b.dataset.c?(SKC.capes||[]).find(c=>c.id===b.dataset.c):undefined;skDraw();skShow()};
  $("skca").onclick=async()=>{try{skBusy(true);await SKA().capeSet(SKCAPE?SKCAPE.id:null);SKC=await SKA().skinCurrent();flash(SKCAPE?"Capa cambiada ✓":"Capa quitada ✓")}catch(e){flash(em(e))}finally{skBusy(false);skDraw()}};
  $("ska").onclick=()=>{if(!SKV)return;const on=!SKV.autoRotate;SKV.autoRotate=on;SKV.animation&&(SKV.animation.paused=!on)};
}
skInit();
