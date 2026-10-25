// Mods, modpacks, shaders y texturas
// Mods
let mt,src="modrinth",kind="mod",cat="",sort="relevance",off=0,total=0,MH=[];const cmp={mod:true,modpack:false,shader:true,resourcepack:true};
const CL={Fabric:4,Forge:1,NeoForge:6};
const KINDS=[["mod","Mods"],["modpack","Modpacks"],["shader","Shaders"],["resourcepack","Texturas"]],SORTS=[["relevance","Relevancia"],["downloads","Más descargados"],["follows","Más seguidos"],["newest","Más nuevos"],["updated","Actualizados"]];
const CATS={mod:[["optimization","Optimización"],["technology","Tecnología"],["magic","Magia"],["adventure","Aventura"],["utility","Utilidad"],["decoration","Decoración"],["storage","Almacenamiento"],["mobs","Mobs"],["equipment","Equipo"],["worldgen","Mundo"],["library","Librerías"],["food","Comida"],["game-mechanics","Mecánicas"],["transportation","Transporte"],["social","Social"],["management","Gestión"],["economy","Economía"],["minigame","Minijuegos"],["cursed","Locuras"]],
modpack:[["adventure","Aventura"],["technology","Tecnología"],["magic","Magia"],["optimization","Optimización"],["lightweight","Ligeros"],["quests","Misiones"],["multiplayer","Multijugador"],["challenging","Difíciles"],["kitchen-sink","De todo"],["combat","Combate"],["exploration","Exploración"]],
shader:[["realistic","Realistas"],["fantasy","Fantasía"],["cartoon","Cartoon"],["vanilla-like","Estilo vanilla"],["semi-realistic","Semi-realistas"],["potato","Poco consumo"],["high","Alto rendimiento"]],
resourcepack:[["16x","16x"],["32x","32x"],["64x","64x"],["128x","128x o más"],["realistic","Realistas"],["fantasy","Fantasía"],["cartoon","Cartoon"],["vanilla-like","Estilo vanilla"],["themed","Temáticos"],["utility","Utilidad"]]};
const CTX=Object.fromEntries(Object.values(CATS).flat());
const mcv=v=>{if(!v||!v.length)return"";const r=v.filter(x=>/^\d+\.\d+(\.\d+)?$/.test(x)),L=r.length?r:v;return L[L.length-1]},ldr=c=>(c||[]).filter(x=>["fabric","forge","neoforge","quilt"].includes(x)).map(x=>({fabric:"Fabric",forge:"Forge",neoforge:"NeoForge",quilt:"Quilt"}[x])).join(" · ");
const fmtN=n=>n>=1e6?(n/1e6).toFixed(1).replace(".0","")+" M":n>=1e3?(n/1e3).toFixed(n>=1e4?0:1).replace(".0","")+" k":String(n||0);
$("q").oninput=()=>{clearTimeout(mt);mt=setTimeout(()=>mods(),350)};$("mo").onchange=e=>{sort=e.target.value;mods()};$("mmore").onclick=()=>mods(true);
function mchips(){chips($("mk"),KINDS,kind,k=>{kind=k;cat="";if(kind!=="mod"&&src==="cf"&&kind==="modpack"){}mchips();mods()});
chips($("mc"),[["modrinth","Modrinth"],["cf","CurseForge"]],src,k=>{src=k;mchips();mods()});
$("mo").innerHTML=SORTS.map(([k,n])=>`<option value="${k}"${k===sort?" selected":""}>${n}</option>`).join("");
const cm=$("mcp");chips(cm,[["c",cmp[kind]?"Solo compatibles con "+sel.mc:"Todas las versiones"]],cmp[kind]?"c":"",()=>{cmp[kind]=!cmp[kind];mchips();mods()});
chips($("mcat"),[["","Todas"],...CATS[kind]],cat,k=>{cat=k;mchips();mods()})}
const CFC={mod:6,modpack:4471,shader:6552,resourcepack:12},DIR={mod:"mods",shader:"shaderpacks",resourcepack:"resourcepacks"};
async function mods(more){
if(!more){off=0;MH=[];$("mg").innerHTML=""}
const q=$("q").value.trim(),t=sel;
if(!A){pvMods(kind,q,cat);return}
$("mi").textContent="Buscando…";const my=++mySeq;
try{let hits,tot;
if(src==="modrinth"){const f=[["project_type:"+kind]];if(cmp[kind])f.push(["versions:"+t.mc]);if(kind==="mod"&&cmp[kind]&&t.ld!=="Vanilla")f.push(["categories:"+t.ld.toLowerCase()]);if(cat)f.push(["categories:"+cat]);
const idx=sort==="relevance"&&!q?"downloads":sort;
const r=await H(`https://api.modrinth.com/v2/search?limit=30&offset=${off}&index=${idx}&query=${encodeURIComponent(q)}&facets=${enc(f)}`);
hits=r.hits.map(h=>({id:h.project_id,slug:h.slug,t:h.title,d:h.description,i:h.icon_url,a:h.author,dl:h.downloads,fl:h.follows,v:h.versions,c:h.display_categories||h.categories||[]}));tot=r.total_hits}
else{if(!cfg.cfKey){$("mi").textContent="Pon tu clave de CurseForge en Ajustes → Cuenta, o usa Modrinth (no necesita clave).";return}
const sf={relevance:2,downloads:6,follows:2,newest:11,updated:3}[sort]||2;
const r=await H(`https://api.curseforge.com/v1/mods/search?gameId=432&classId=${CFC[kind]}&pageSize=30&index=${off}&sortField=${sf}&sortOrder=desc&searchFilter=${encodeURIComponent(q)}${cmp[kind]?"&gameVersion="+t.mc:""}${kind==="mod"&&cmp[kind]&&CL[t.ld]?"&modLoaderType="+CL[t.ld]:""}`,{"x-api-key":cfg.cfKey});
hits=r.data.map(h=>({id:h.id,cf:1,t:h.name,d:h.summary,i:h.logo&&h.logo.thumbnailUrl,a:(h.authors&&h.authors[0]&&h.authors[0].name)||"",dl:h.downloadCount,fl:h.thumbsUpCount,c:[],link:h.links&&h.links.websiteUrl}));tot=r.pagination&&r.pagination.totalCount||hits.length}
if(my!==mySeq)return;MH=MH.concat(hits);off=MH.length;total=tot;drawMods(hits.length)}catch(e){$("mi").textContent="Error de conexión: "+e.message}}
let mySeq=0;
// ¿Ya está este mod en la instancia? Por proyecto de Modrinth (huella del archivo) o, si no, por el nombre del archivo
async function instHas(id,dir){if(!A||!id||!A.modsProjects)return null;try{return await A.modsProjects({id,dir})}catch{return null}}
function hasMod(p,h){if(!p||!h)return false;if(!h.cf&&p.ids.includes(h.id))return true;const s=String(h.slug||"").toLowerCase().replace(/[^a-z0-9]/g,"");return s.length>=5&&p.files.some(f=>f.replace(/[^a-z0-9]/g,"").includes(s))}

function drawMods(){const lst=MH;$("mi").textContent=(A?`${total.toLocaleString(LCUR)} resultados`+(cmp[kind]?` para ${kind==="mod"&&sel.ld!=="Vanilla"?sel.ld+" ":""}${sel.mc}`:""):$("mi").textContent);if(A&&!lst.length)$("mi").textContent="Sin resultados. Prueba otra categoría o quita el filtro de versión.";
$("mg").innerHTML=lst.map((h,k)=>`<div class="m2"><div class="h">${h.i?`<img src="${imgSrc(h.i)}" loading="lazy" onerror="this.outerHTML='<div class=ph></div>'">`:'<div class="ph"></div>'}<div><b>${h.t}</b><small>${h.a?"por "+h.a:""}</small></div></div><p>${h.d||""}</p><div class="mm"><span>${IC("dl")}${fmtN(h.dl)}</span><span>${IC("heart")}${fmtN(h.fl)}</span>${mcv(h.v)?`<span>MC ${mcv(h.v)}</span>`:""}${ldr(h.c)?`<span class="ld">${ldr(h.c)}</span>`:""}</div><div class="mtg">${(h.c||[]).filter(c=>CTX[c]).slice(0,3).map(c=>`<span>${CTX[c]}</span>`).join("")}</div><button class="btn" data-k="${k}">${kind==="modpack"?(h.cf?"Ver en CurseForge":"Crear instancia"):"Instalar"}</button></div>`).join("");
$("mg").querySelectorAll("button").forEach(b=>b.onclick=()=>inst(b,MH[+b.dataset.k]));
$("mmore").style.display=A&&MH.length<total?"inline-block":"none"}
async function inst(b,h){if(kind!=="modpack"&&A)return instMod(b,h);const t=sel,L=b.textContent;b.disabled=true;b.textContent="Instalando…";
const fail=m=>{b.textContent=m;b.disabled=false;setTimeout(()=>b.textContent=L,3500)};
try{
if(!A){await pvInstall(b,L,h,kind);return}
if(kind==="modpack"){if(h.cf){A.open&&h.link&&A.open(h.link);b.disabled=false;b.textContent=L;return}const vid=await pickPackVersion(h);if(!vid){b.disabled=false;b.textContent=L;return}b.textContent="Instalando…";busyBtn=b;let r;try{r=await A.pack({id:h.id,vid})}finally{busyBtn=null}await loadI();b.textContent=r&&r.failed&&r.failed.length?"Creada (faltan "+r.failed.length+")":"Instancia creada ✓";b.classList.add("ok");if(r&&r.failed&&r.failed.length)flash("Faltan "+r.failed.length+" archivos del modpack: la causa está en Ajustes → Juego → Informes de errores");return}
if(kind==="mod"&&t.ld==="Vanilla")return fail("Elige Fabric, Forge o NeoForge");
let i=await ensure();const dir=DIR[kind];if(kind==="shader"){const g=await shaderGate(i);if(!g){b.disabled=false;b.textContent=L;return}i=g}
if(h.cf){const r=(await H(`https://api.curseforge.com/v1/mods/${h.id}/files?gameVersion=${t.mc}${kind==="mod"&&CL[t.ld]?"&modLoaderType="+CL[t.ld]:""}`,{"x-api-key":cfg.cfKey})).data[0];if(!r||!r.downloadUrl)return fail("Descarga no permitida");await A.mod({url:r.downloadUrl,name:r.fileName,inst:i&&i.id,dir})}
else{const done=new Set();
const mr=async(pid,lvl)=>{if(done.has(pid))return;done.add(pid);const qs=[`game_versions=${enc([t.mc])}`];if(kind==="mod")qs.push(`loaders=${enc([t.ld.toLowerCase()])}`);
const v=await H(`https://api.modrinth.com/v2/project/${pid}/version?`+qs.join("&"));if(!v.length)throw new Error("nover");
const f=v[0].files.find(x=>x.primary)||v[0].files[0];await A.mod({url:f.url,name:f.filename,inst:i&&i.id,dir});
if(kind==="mod"&&lvl<1)for(const d of v[0].dependencies||[])if(d.dependency_type==="required"&&d.project_id)await mr(d.project_id,lvl+1).catch(()=>{})};
await mr(h.id,0)}
b.textContent="Instalado ✓";b.classList.add("ok");b.disabled=false}catch(e){if(e&&e.message==="nover"){fail("Sin versión para "+t.mc);return}fail("Error");showDlErr(kind==="modpack"?"No se pudo instalar el modpack":"No se pudo instalar",h.t,e)}}

// ---- Asistente «Instalar mod»: 1) versión del mod + cargador  2) instancia compatible (o crear una) ----
const LDK={fabric:"Fabric",forge:"Forge",neoforge:"NeoForge"};
const mwKey=v=>String(v).split(/[.-]/).map(n=>parseInt(n)||0),mwCmp=(a,b)=>{const x=mwKey(a),y=mwKey(b);for(let i=0;i<Math.max(x.length,y.length);i++){const d=(y[i]||0)-(x[i]||0);if(d)return d}return 0},mwRel=v=>/^\d+\.\d+(\.\d+)?$/.test(v);
async function mwVersions(h,k){
  const needLd=k==="mod";
  if(h.cf){
    const r=(await H(`https://api.curseforge.com/v1/mods/${h.id}/files?pageSize=50`,{"x-api-key":cfg.cfKey})).data||[];
    return r.filter(f=>f.downloadUrl).map(f=>{const g=f.gameVersions||[];return{id:String(f.id),name:f.displayName||f.fileName,num:f.fileName,mc:g.filter(x=>/^\d+\.\d+/.test(x)),ld:g.map(x=>x.toLowerCase()).filter(x=>LDK[x]),type:["","release","beta","alpha"][f.releaseType]||"release",date:f.fileDate,url:f.downloadUrl,file:f.fileName,deps:[]}}).filter(v=>v.mc.length&&(!needLd||v.ld.length))
  }
  const r=await H(`https://api.modrinth.com/v2/project/${h.id}/version`);
  return r.map(v=>{const f=(v.files||[]).find(x=>x.primary)||(v.files||[])[0]||{};return{id:v.id,name:v.name,num:v.version_number,mc:v.game_versions||[],ld:(v.loaders||[]).filter(x=>LDK[x]),type:v.version_type,date:v.date_published,url:f.url,file:f.filename,sha1:f.hashes&&f.hashes.sha1,sha512:f.hashes&&f.hashes.sha512,deps:needLd?(v.dependencies||[]).filter(d=>d.dependency_type==="required"&&d.project_id).map(d=>d.project_id):[]}}).filter(v=>v.url&&v.mc.length&&(!needLd||v.ld.length))
}
// k = "mod" | "shader" | "resourcepack". Los mods eligen cargador; shaders y texturas solo versión de Minecraft.
function modWizard(h,k){return new Promise(async res=>{
  const isMod=k==="mod";
  pickRes=res;
  modal(`<div class="hd"><div class="iic">${IC("puzzle")}</div><div style="min-width:0"><h3>Instalar «${esc(h.t)}»</h3><span class="sub" id="wsub"></span></div><button class="btn sm x" data-x>Cancelar</button></div><div id="wbd" class="wz"><div class="wnote">Cargando versiones…</div></div>`,"wide");
  const S1=isMod?"Paso 1 de 2 · Elige la versión del mod y el cargador":"Paso 1 de 2 · Elige la versión y la versión de Minecraft";
  $("wsub").textContent=S1;
  let vs;try{vs=await mwVersions(h,k)}catch(e){if(pickRes===res){pickRes=null;closeModal();res(null);showDlErr("No se pudieron cargar las versiones",h.t,e)}return}
  if(pickRes!==res)return;   // se cerró mientras cargaba
  const wb=$("wbd"),none=()=>{wb.innerHTML='<div class="wnote">'+(isMod?"Este mod no tiene versiones para Fabric, Forge ni NeoForge.":"Esta descarga no tiene versiones disponibles.")+"</div>"};
  const okMc=(v,l)=>v.mc.some(m=>!LD[LDK[l]]||LD[LDK[l]](m));   // el cargador existe para alguna de sus versiones de Minecraft
  if(isMod)vs=vs.filter(v=>v.ld.some(l=>okMc(v,l)));
  if(!vs.length)return none();
  const LO=isMod?["fabric","forge","neoforge"].filter(l=>vs.some(v=>v.ld.includes(l)&&okMc(v,l))):[];
  let ld=LO.includes(String(sel.ld).toLowerCase())?String(sel.ld).toLowerCase():LO[0],cur=null,mode="inst",pick="",mcSel="",nm="",nmT=false,mcF="";
  const base=()=>vs.filter(v=>!isMod||(v.ld.includes(ld)&&okMc(v,ld)));
  const mcAll=()=>[...new Set(base().flatMap(v=>v.mc))].filter(mwRel).sort(mwCmp);
  mcF=mcAll().includes(sel.mc)?sel.mc:"";   // por defecto, la versión de Minecraft elegida en el launcher (si el mod la tiene)
  const forLd=()=>base().filter(v=>!mcF||v.mc.includes(mcF)).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,80);
  const mcL=v=>[...v.mc].sort(mwCmp);
  const best=()=>{const L=forLd();return L.find(v=>v.mc.includes(sel.mc)&&v.type==="release")||L.find(v=>v.mc.includes(sel.mc))||L.find(v=>v.type==="release")||L[0]};
  const tp=v=>v.type==="beta"?"Beta":v.type==="alpha"?"Alpha":"";
  const done=r=>{pickRes=null;closeModal();res(r)};
  const rows=()=>{const L=forLd(),rec=best();
    if(!L.length)return'<div class="wnote">Ninguna versión coincide con ese filtro.</div>';
    return L.map((v,n)=>`<div class="mr wr ${v===cur?"on":""}" data-k="${n}"><div class="nm"><b>${esc(v.name||v.num)}</b><small>${esc(v.num)} · <i>Minecraft</i> ${esc(mcL(v).slice(0,4).join(", "))}${v.mc.length>4?"…":""} · ${esc(new Date(v.date).toLocaleDateString(LCUR,{day:"numeric",month:"short",year:"numeric"}))}</small></div>${v===rec?'<span class="bdg">Recomendada</span>':""}${tp(v)?`<span class="bdg w">${tp(v)}</span>`:""}</div>`).join("")};
  const drawList=()=>{
    const L=forLd();if(!cur||!L.includes(cur))cur=best()||null;
    $("wvl").innerHTML=rows();
    $("wvl").onclick=e=>{const r=e.target.closest(".wr");if(!r)return;cur=L[+r.dataset.k];$("wvl").querySelectorAll(".wr").forEach(x=>x.classList.toggle("on",x===r))};
    const on=$("wvl").querySelector(".wr.on");if(on)on.scrollIntoView({block:"nearest"});
  };
  const step1=()=>{
    $("wsub").textContent=S1;
    if(mcF&&!mcAll().includes(mcF))mcF="";
    wb.innerHTML=`${isMod?'<label class="wl">Cargador</label><div class="chips" id="wld"></div>':""}<label class="wl">Versión de Minecraft</label><select id="wmf" class="wmf"><option value="">Todas</option>${mcAll().map(m=>`<option value="${esc(m)}"${m===mcF?" selected":""}>${esc(m)}</option>`).join("")}</select><label class="wl">${isMod?"Versión del mod":"Versión"}</label><div class="wvl" id="wvl"></div><div class="wfoot"><button class="btn pr" id="wnx">Siguiente</button></div>`;
    if(isMod)chips($("wld"),LO.map(l=>[l,LDK[l]]),ld,l=>{ld=l;cur=null;step1()});
    $("wmf").onchange=()=>{mcF=$("wmf").value;cur=null;drawList()};
    drawList();
    $("wnx").onclick=()=>{if(cur)step2()};
  };
  const step2=()=>{
    const LN=isMod?LDK[ld]:(k==="shader"?"Fabric":"Vanilla");   // cargador de una instancia nueva: shaders → Fabric (para Iris), texturas → Nova
    const comp=I.filter(i=>(isMod?(i.ld||"Vanilla")===LN:true)&&cur.mc.includes(i.mc));
    let mcs=mcL(cur).filter(mwRel);if(!mcs.length)mcs=mcL(cur);mcs=mcs.filter(m=>!LD[LN]||LD[LN](m));
    if(!mcSel||!mcs.includes(mcSel))mcSel=mcs.includes(sel.mc)?sel.mc:(mcs[0]||"");
    if(!pick||!comp.some(i=>i.id===pick))pick=(comp.find(i=>i.id===sel.inst)||comp[0]||{}).id||"";
    if(!comp.length)mode="new";
    const dn=()=>(k==="shader"?"Shaders ":h.t+" ")+mcSel;
    $("wsub").textContent="Paso 2 de 2 · Elige dónde instalarlo";
    wb.innerHTML=`<div class="wsum"><b>${esc(cur.name||cur.num)}</b><small>${isMod?LN+" · ":""}<i>Minecraft</i> ${esc(mcL(cur).slice(0,4).join(", "))}${cur.mc.length>4?"…":""}</small></div>${comp.length?`<label class="wl">Instancias compatibles</label><div class="wvl" id="wil">${comp.map(i=>`<div class="mr wr ${mode==="inst"&&pick===i.id?"on":""}" data-i="${esc(i.id)}"><div class="nm"><b>${esc(i.name)}</b><small>${esc(LDN(i.ld||"Vanilla"))} · ${esc(i.mc)}</small></div></div>`).join("")}<div class="mr wr ${mode==="new"?"on":""}" data-new="1"><div class="nm"><b>Crear una instancia nueva</b></div></div></div>`:'<div class="wnote">Todavía no tienes ninguna instancia compatible con esta versión. Crea una:</div>'}<div class="wnew" id="wnew"${mode==="new"?"":" hidden"}><div class="fr"><label>Nombre</label><input id="wnm" type="text" maxlength="40" value="${esc(nmT?nm:dn())}"></div><div class="fr"><label>Versión de Minecraft</label><select id="wmc">${mcs.map(m=>`<option value="${esc(m)}"${m===mcSel?" selected":""}>${esc(m)}</option>`).join("")}</select></div></div><div class="wfoot"><button class="btn" id="wbk">Atrás</button><button class="btn pr" id="wgo">Instalar</button></div>`;
    const il=$("wil");if(il)il.onclick=e=>{const r=e.target.closest(".wr");if(!r)return;mode=r.dataset.new?"new":"inst";if(r.dataset.i)pick=r.dataset.i;il.querySelectorAll(".wr").forEach(x=>x.classList.toggle("on",x===r));$("wnew").hidden=mode!=="new"};
    $("wnm").oninput=()=>{nmT=true;nm=$("wnm").value};
    $("wmc").onchange=()=>{mcSel=$("wmc").value;if(!nmT)$("wnm").value=dn()};
    $("wbk").onclick=step1;
    $("wgo").onclick=()=>{
      if(mode==="inst"){const i=I.find(x=>x.id===pick);if(i)done({v:cur,ld,ins:i});return}
      if(!mcSel){flash("Este mod no tiene una versión de Minecraft compatible con "+LN);return}
      done({v:cur,ld,create:{name:($("wnm").value.trim()||dn()).slice(0,40),mc:mcSel,ld:LN}});
    };
  };
  step1();
})}
async function mwInstallFile(h,v,ld,ins){
  await A.mod({url:v.url,name:v.file,inst:ins.id,dir:"mods",sha1:v.sha1,sha512:v.sha512});
  const seen=new Set([h.id]);
  const dep=async pid=>{if(seen.has(pid))return;seen.add(pid);
    const r=await H(`https://api.modrinth.com/v2/project/${pid}/version?game_versions=${enc([ins.mc])}&loaders=${enc([ld])}`);if(!r.length)return;
    const f=r[0].files.find(x=>x.primary)||r[0].files[0];await A.mod({url:f.url,name:f.filename,inst:ins.id,dir:"mods",sha1:f.hashes&&f.hashes.sha1,sha512:f.hashes&&f.hashes.sha512})};
  for(const pid of v.deps||[])await dep(pid).catch(()=>{});
}
async function instMod(b,h){
  const k=kind,L=b.textContent;b.disabled=true;
  try{
    const w=await modWizard(h,k);if(!w){b.disabled=false;b.textContent=L;return}
    b.textContent="Instalando…";
    let ins=w.ins;
    if(!ins){ins=await A.saveInst({name:w.create.name,mc:w.create.mc,ld:w.create.ld,type:"release"});await loadI();ins=I.find(x=>x.id===ins.id)||ins}
    if(k==="shader"){const g=await shaderGate(ins);if(!g){b.disabled=false;b.textContent=L;return}ins=g;b.textContent="Instalando…"}
    if(k==="mod")await mwInstallFile(h,w.v,w.ld,ins);
    else await A.mod({url:w.v.url,name:w.v.file,inst:ins.id,dir:DIR[k],sha1:w.v.sha1,sha512:w.v.sha512});
    b.textContent="Instalado ✓";b.classList.add("ok");b.disabled=false;flash("Instalado en «"+ins.name+"»");
  }catch(e){b.disabled=false;b.textContent="Error";setTimeout(()=>b.textContent=L,3500);showDlErr("No se pudo instalar",h.t,e)}
}

// ---- Panel «Añadir a esta instancia»: catálogo de mods, shaders y texturas con lo que ya tiene marcado como instalado ----
const ADK=[["mod","Mods","mods"],["shader","Shaders","shaderpacks"],["resourcepack","Texturas","resourcepacks"]];
async function openAdd(id,k0){
  const ins=I.find(x=>x.id===id);if(!ins)return;if(!A){pv("msr");return}
  let k=k0||"mod",q="",off=0,tot=0,RS=[],P=null,seq=0,tm;
  const ldl=String(ins.ld||"Vanilla").toLowerCase(),isL=ldl!=="vanilla"&&ldl!=="nova";
  const d=modal(hdr(ins,"Añadir a «"+esc(ins.name)+"»",esc(LDN(ins.ld||"Vanilla"))+" · Minecraft "+esc(ins.mc))+`<div class="adb"><button class="btn sm" id="adbk" type="button">‹ Volver a la instancia</button><div class="chips" id="adk"></div></div><div class="mbar"><input id="adq" type="text" placeholder="Buscar…"></div><div class="emp" id="adi"></div><div id="adl"></div><div class="adm"><button class="btn sm" id="adm" style="display:none">Cargar más</button></div>`,"wide");
  const dir=()=>ADK.find(x=>x[0]===k)[2];
  const have=h=>{if(!P)return false;if(!h.cf&&P.ids.includes(h.id))return true;const s=String(h.slug||"").toLowerCase().replace(/[^a-z0-9]/g,"");return s.length>=5&&P.files.some(f=>f.replace(/[^a-z0-9]/g,"").includes(s))};
  const draw=()=>{$("adl").innerHTML=RS.map((h,n)=>{const y=have(h);return `<div class="mr ad" data-n="${n}"><div class="ico">${h.i?`<img src="${imgSrc(h.i)}" loading="lazy" onerror="this.remove()">`:IC("puzzle")}</div><div class="nm"><b>${esc(h.t)}</b><small>${esc(h.d||"")}</small></div><button class="btn sm ${y?"ok":"pr"}" data-n="${n}" ${y?"disabled":""}>${y?"Instalado ✓":"Instalar"}</button></div>`}).join("");
    $("adm").style.display=RS.length<tot?"":"none";$("adi").textContent=RS.length?tot.toLocaleString(LCUR)+" resultados para "+ins.mc:(seq?"Sin resultados.":"")};
  const find=async(more)=>{const my=++seq;if(!more){off=0;RS=[];$("adl").innerHTML=""}$("adi").textContent="Buscando…";
    try{P=await instHas(id,dir());
      const f=[["project_type:"+k],["versions:"+ins.mc]];if(k==="mod"&&isL)f.push(["categories:"+ldl]);
      const r=await H(`https://api.modrinth.com/v2/search?limit=30&offset=${off}&index=${q?"relevance":"downloads"}&query=${encodeURIComponent(q)}&facets=${enc(f)}`);
      if(my!==seq)return;RS=RS.concat(r.hits.map(h=>({id:h.project_id,slug:h.slug,t:h.title,d:h.description,i:h.icon_url})));off=RS.length;tot=r.total_hits;draw()}
    catch(e){if(my===seq)$("adi").textContent="Error de conexión: "+e.message}};
  const kinds=()=>chips($("adk"),ADK.map(x=>[x[0],x[1]]),k,x=>{k=x;kinds();find()});
  kinds();
  $("adbk").onclick=()=>openMods(id);
  $("adq").oninput=()=>{clearTimeout(tm);tm=setTimeout(()=>{q=$("adq").value.trim();find()},350)};
  $("adm").onclick=()=>find(true);
  $("adl").onclick=async e=>{const b=e.target.closest("button[data-n]");if(!b||b.disabled)return;const h=RS[+b.dataset.n],L=b.textContent;b.disabled=true;b.textContent="Instalando…";
    try{
      const qs=[`game_versions=${enc([ins.mc])}`];if(k==="mod"&&isL)qs.push(`loaders=${enc([ldl])}`);
      const vs=await H(`https://api.modrinth.com/v2/project/${h.id}/version?${qs.join("&")}`);if(!vs.length)throw new Error("Sin versión para Minecraft "+ins.mc);
      const v=vs[0],f=v.files.find(x=>x.primary)||v.files[0];let tgt=ins;
      if(k==="shader"){const g=await shaderGate(ins);if(!g){b.disabled=false;b.textContent=L;return}tgt=g}
      await A.mod({url:f.url,name:f.filename,inst:tgt.id,dir:dir(),sha1:f.hashes&&f.hashes.sha1,sha512:f.hashes&&f.hashes.sha512});
      if(k==="mod"){const seen=new Set([h.id]);for(const dp of (v.dependencies||[]).filter(x=>x.dependency_type==="required"&&x.project_id)){if(seen.has(dp.project_id))continue;seen.add(dp.project_id);
        try{const r=await H(`https://api.modrinth.com/v2/project/${dp.project_id}/version?${qs.join("&")}`);if(!r.length)continue;const g=r[0].files.find(x=>x.primary)||r[0].files[0];await A.mod({url:g.url,name:g.filename,inst:ins.id,dir:"mods",sha1:g.hashes&&g.hashes.sha1,sha512:g.hashes&&g.hashes.sha512})}catch{}}}
      P=await instHas(id,dir());draw();flash("Instalado en «"+ins.name+"»")
    }catch(x){b.disabled=false;b.textContent=L;showDlErr("No se pudo instalar",h.t,x)}};
  find();
}
