// Base: lo que comparten todas las pestañas (avisos, ventanas, ajustes guardados, apariencia, datos de ejemplo). Se carga siempre, antes que las pestañas.
// --- Iconos, colores y tipografías ---
const IC=n=>`<svg class="ic"><use href="#i-${n}"/></svg>`;
const BHM={dorado:[44,100],azul:[205,100],violeta:[268,95],rosa:[328,95],verde:[140,90],rojo:[4,100],blanco:[0,0]},BHC={dorado:"#ffb347",azul:"#4fa8ff",violeta:"#9d6bff",rosa:"#ff6bb5",verde:"#3ee08a",rojo:"#ff5252",blanco:"#f4f6fa"},BHN={dorado:"Dorado",azul:"Azul",violeta:"Violeta",rosa:"Rosa",verde:"Verde",rojo:"Rojo",blanco:"Blanco"};
const FF=[["Segoe UI","sans-serif"],["Segoe UI Variable Text","sans-serif","Segoe UI Variable"],["Bahnschrift","sans-serif"],["Calibri","sans-serif"],["Arial","sans-serif"],["Tahoma","sans-serif"],["Verdana","sans-serif"],["Trebuchet MS","sans-serif"],["Century Gothic","sans-serif"],["Candara","sans-serif"],["Corbel","sans-serif"],["Franklin Gothic Medium","sans-serif"],["Ebrima","sans-serif"],["Nirmala UI","sans-serif"],["Gill Sans MT","sans-serif"],["Cambria","serif"],["Constantia","serif"],["Georgia","serif"],["Palatino Linotype","serif"],["Sitka Text","serif"],["Times New Roman","serif"],["Comic Sans MS","cursive"],["Impact","sans-serif"],["Consolas","monospace"],["Cascadia Code","monospace"],["Lucida Console","monospace"],["Courier New","monospace"]];
const FONTS=Object.fromEntries(FF.map(([n,g,l])=>[l||n,`"${n}",${n==="Segoe UI"?"system-ui,":""}${g}`]));
// --- Estado compartido (versión, sistema, fondo) ---
let VER="0.2.15-beta.9",SYS={total:16},secNow="gen",BG="#080a0f",BHs=BHM.dorado,dirty=60,RUN=false;
// --- Ajustes guardados ---
const ECO={quality:"baja",fps:30,glassBlur:0,intro:false,stars:40,bhBloom:false,bhLens:false,bhOther:false,pauseBlur:true,pauseGame:true};
const rec=()=>Math.max(1,Math.floor(SYS.total/2));
async function sv(c){cfg={...cfg,...c};if(A)await A.set(c);if(A&&c.dlLimit!==undefined)A.dqLimit(c.dlLimit);if(c.lang!==undefined)setTimeout(()=>langSync(c.lang),120);dirty=60}
async function ramInit(){if(!cfg.ramSet)await sv({ram:rec(),ramSet:true});else if(cfg.ram>SYS.total)await sv({ram:SYS.total})}
// --- Apariencia ---
let lastZ=0,lastSt=-1,lastN=0;
function applyAp(){const r=document.documentElement,b=document.body,sy=r.style;
sy.setProperty("--ac",cfg.accent||"#2ee06f");r.dataset.th=cfg.theme||"oscuro";
const fam=(cfg.fontCustom||"").replace(/[^\w \-.]/g,"").trim();b.style.fontFamily=(fam?`"${fam}",`:"")+(FONTS[cfg.font]||FONTS["Segoe UI"]);
b.style.letterSpacing=(+cfg.lsp||0)+"px";b.style.lineHeight=String((+cfg.lh||145)/100);
b.classList.toggle("bold",!!cfg.bold);b.classList.toggle("hc",!!cfg.contrast);b.classList.toggle("fo",!!cfg.focusRing);r.classList.toggle("rm",!!cfg.rmotion);r.dataset.cb=String(cfg.cb||"Ninguno").split(" ")[0].replace("Escala","Grises");r.classList.toggle("dys",!!cfg.dys);r.classList.toggle("nl",!!cfg.navLabels);r.classList.toggle("bt",!!cfg.bigTargets);r.classList.toggle("sol",!!cfg.solid);sy.setProperty("--wsp",(+cfg.wsp||0)+"px");
const pa=cfg.panelAlpha==null?60:+cfg.panelAlpha,bl=cfg.glassBlur==null?12:+cfg.glassBlur;
sy.setProperty("--rs",String((cfg.radius==null?100:+cfg.radius)/100));sy.setProperty("--pa",pa+"%");sy.setProperty("--pa2",Math.min(100,pa+14)+"%");sy.setProperty("--bl",bl+"px");r.classList.toggle("ng",bl===0);
sy.setProperty("--d",String({compacta:.78,normal:1,comoda:1.25}[cfg.density]||1));sy.setProperty("--nw",(cfg.navLabels?Math.max(104,cfg.navW||76):(cfg.navW||76))+"px");
const ni=cfg.intro===false||!!cfg.rmotion;r.classList.toggle("ni",ni);if(ni){sy.setProperty("--base","0s");const i=$("intro");i&&i.remove()}
const z=(cfg.tsize||100)/100;if(z!==lastZ){lastZ=z;if(A)A.zoom(z);else b.style.zoom=z}
$("g2").classList.toggle("nonews",cfg.showNews===false);$("cardI").style.display=cfg.showInst===false?"none":"";$("cardS").style.display=cfg.showStatus===false?"none":"";$("wel").style.display="";
$("av").style.display=cfg.showAvatar===false?"none":"";
if(typeof NEWS!=="undefined"&&NEWS.length&&lastN!==(cfg.newsN||4))renderNews();
BG=getComputedStyle(r).getPropertyValue("--bg").trim()||"#080a0f";BHs=BHM[cfg.bh]||BHM.dorado;
if(cfg.stars!==lastSt){lastSt=cfg.stars;if(typeof rs==="function")rs()}
dirty=60}
function fillCfg(){buildSet();applyAp()}
function acc(){head();buildSet()}
// Marcadores: el contenido real lo definen las pestañas de Instancias y Ajustes cuando se cargan la primera vez
function buildSet(){}
function ri(){}
// --- Utilidades y ventanas ---
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const em=e=>String(e&&e.message||e).replace(/^Error invoking remote method '[^']+': (Error: )?/,"");
// Errores de descarga: separa el mensaje de la ruta del informe y enseña el motivo real
function errSplit(e){const m=em(e),x=/\s*‹informe: ([^›]+)›\s*$/.exec(m);return{msg:x?m.slice(0,x.index):m,file:x?x[1]:""}}
// Abre una incidencia nueva en GitHub con el informe ya pegado (la dirección admite unos 7 000 caracteres)
function reportIssue(title,text){
  const mk=n=>"https://github.com/JustMarcoDev/nova-launcher/issues/new?title="+encodeURIComponent(String(title).slice(0,120))+"&body="+encodeURIComponent("**Nova Launcher "+VER+"**\n\n```\n"+String(text).slice(0,n)+"\n```\n\n_Cuenta aquí qué estabas haciendo cuando falló. Si puedes, adjunta el archivo del informe._");
  let n=3000,u=mk(n);while(u.length>7200&&n>300){n-=300;u=mk(n)}
  if(A&&A.open)A.open(u);else window.open(u,"_blank");
}
async function showDlErr(title,what,e,extra){
  let {msg,file}=errSplit(e);extra=extra||{};
  if(!file&&A&&A.errLog){try{file=await A.errLog({kind:"descarga",what:String(what||""),message:msg,stack:e&&e.stack,url:extra.url,step:extra.step})}catch{}}
  const d=modal(hdr(null,title,esc(what||""))+`<div class="dgs b2" style="margin:12px 0;white-space:pre-wrap;word-break:break-word">${esc(msg)}</div>`+(file?`<small class="hint">Se ha guardado un informe con los detalles:<br><code style="word-break:break-all">${esc(file)}</code></small>`:"")+`<div class="acts">${file&&A?`<button class="btn" id="eio">Abrir informe</button><button class="btn" id="eif">Carpeta de informes</button>`:""}<button class="btn" id="eir">Reportar un error</button><button class="btn" id="eic">Copiar</button><button class="btn pr" data-x>Cerrar</button></div>`);
  const q=i=>d.querySelector("#"+i);
  q("eir").onclick=async()=>{let t=`${title}\n${what||""}\n${msg}`;if(file&&A&&A.errText){try{t+="\n\n"+await A.errText(file)}catch{}}reportIssue(title,t)};
  if(q("eio"))q("eio").onclick=()=>A.logOpen(file);
  if(q("eif"))q("eif").onclick=()=>A.errFolder();
  q("eic").onclick=async()=>{const t=`${title}\n${what||""}\n${msg}${file?"\nInforme: "+file:""}`;try{if(A&&A.clip)await A.clip(t);else await navigator.clipboard.writeText(t);flash("Copiado")}catch{flash(msg)}};
}
const cap=s=>s?s[0].toUpperCase()+s.slice(1):s;
const ICS=["box","puzzle","rocket","game","heart","bolt","orbit","cup","globe","chip","server","code"],ICOL=["#2ee06f","#4fa8ff","#a78bfa","#f472b6","#fb923c","#facc15","#f87171","#94a3b8"];
const fSz=n=>n>=1048576?(n/1048576).toFixed(1)+" MB":Math.max(1,Math.round(n/1024))+" KB";
const fmtD=t=>new Date(t).toLocaleString(LCUR,{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
let flT=0,pickRes=null,busyBtn=null;
function flash(t){const f=$("ft");f.textContent=t;f.classList.add("on");clearTimeout(flT);flT=setTimeout(()=>f.classList.remove("on"),4600)}
function modal(h,w){MLOCK=false;const m=$("mdl"),d=m.querySelector(".md");d.className="md"+(w?" "+w:"");d.innerHTML=h;m.classList.add("on");d.scrollTop=0;d.querySelectorAll("[data-x]").forEach(x=>x.onclick=closeModal);return d}
let MLOCK=false;   // true = ventana obligatoria (crear perfil): no se puede cerrar con Esc, clic fuera ni botón
function closeModal(force){if(MLOCK&&force!==true)return;$("mdl").classList.remove("on");if(pickRes){const r=pickRes;pickRes=null;r(null)}}
$("mdl").onclick=e=>{if(e.target.id==="mdl")closeModal()};
const hdr=(i,t,s)=>`<div class="hd"><div class="iic" style="${i&&i.color?"--ic:"+esc(i.color):""}">${IC(i&&i.icon&&ICS.includes(i.icon)?i.icon:"box")}</div><div style="min-width:0"><h3>${t}</h3><span class="sub">${s}</span></div><button class="btn sm x" data-x>Cerrar</button></div>`;
// --- Discord ---
let DS={s:"off"};
function dlabel(){switch(DS.s){case"on":return"Conectado"+(DS.user?" como "+DS.user:"")+" ✓";case"connecting":return"Conectando…";case"noid":return"Falta el ID de aplicación";case"error":return(DS.msg||"No se pudo conectar")+" · reintentando";default:return A?"Desactivado":"Solo funciona en la app instalada"}}
function setD(o){DS=o||{s:"off"};const m=$("dscm");if(m)m.textContent=dlabel()}
// --- Servidores (estado compartido con «Mis servidores») ---
let SST={};
const fmtP=n=>n>=1e3?(n/1e3).toFixed(n>=1e4?0:1).replace(".0","")+" k":String(n||0);
// --- Consola (se guarda la salida aunque la pestaña aún no se haya abierto) ---
const CON=[];let cT=0,conN=0;
const conLevel=t=>{if(/^── /.test(t))return"s";if(/^\s+at\s|^Caused by|^\s*\.\.\. \d+ more/.test(t))return"e";if(/\b(ERROR|FATAL|SEVERE)\b|Exception|\bCrash/i.test(t))return"e";if(/\bWARN(ING)?\b/i.test(t))return"w";if(/\b(DEBUG|TRACE)\b/.test(t))return"d";return"i"};
function conAdd(t){for(const ln of String(t).split(/\r?\n/)){if(!ln.trim())continue;const l=conLevel(ln);CON.push({t:ln,l,n:++conN});}if(CON.length>5000)CON.splice(0,CON.length-4500);if($("con").classList.contains("on")&&!cT&&typeof conDraw==="function")cT=setTimeout(()=>{cT=0;typeof conTick==="function"?conTick():conDraw()},250)}
// --- Peticiones a Modrinth y CurseForge ---
const H=(u,h)=>A.http({url:u,headers:h}),enc=x=>encodeURIComponent(JSON.stringify(x));
// --- Jugar: antes de abrir Minecraft se revisan los mods de la instancia (si el ajuste está activado) ---
let SHIFT=false;addEventListener("click",e=>{SHIFT=!!e.shiftKey},true);
async function launch(o){
  if(SHIFT){o={...o,safe:true};SHIFT=false}
  if(A&&A.modsPrecheck&&cfg.modCheck!==false){
    for(let k=0;k<3;k++){
      let r=null;try{r=await A.modsPrecheck({id:o.id})}catch{}
      if(!r||(!r.problems.length&&!r.missing.length))break;
      let a="play";try{a=await lazyLoad("revision").then(()=>revModal(o.id,r))}catch{}
      if(a==="cancel"){$("st").textContent="Lanzamiento cancelado";return{ok:false,cancelled:true}}
      if(a!=="again")break;
    }
  }
  return A.play(o)
}
// --- Arranque: novedades y asistente (las ventanas se cargan solo cuando hacen falta) ---
// ¿Hay ya un perfil creado? Sin cuentas guardadas, sin Microsoft y con el nombre de fábrica «Jugador», no.
function needProfile(){return!(cfg.accounts||[]).length&&!cfg.ms&&(!cfg.username||cfg.username==="Jugador")}
function startup212(){if(!A)return;const go=()=>{if(cfg._first){sv({setupDone:true,seenVersion:VER});openWizard()}else if(cfg.seenVersion!==VER){sv({seenVersion:VER});openNews()}};
if(needProfile())openAddAcc(true,go);else go()}
lazyFn("asistente",["openNews","openWizard"],["ajustes"]);
lazyFn("instancias",["showCrash","openOpts","openBackups","pickPackVersion"]);
