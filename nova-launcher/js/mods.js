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
function drawMods(){const lst=MH;$("mi").textContent=(A?`${total.toLocaleString(LCUR)} resultados`+(cmp[kind]?` para ${kind==="mod"&&sel.ld!=="Vanilla"?sel.ld+" ":""}${sel.mc}`:""):$("mi").textContent);if(A&&!lst.length)$("mi").textContent="Sin resultados. Prueba otra categoría o quita el filtro de versión.";
$("mg").innerHTML=lst.map((h,k)=>`<div class="m2"><div class="h">${h.i?`<img src="${imgSrc(h.i)}" loading="lazy" onerror="this.outerHTML='<div class=ph></div>'">`:'<div class="ph"></div>'}<div><b>${h.t}</b><small>${h.a?"por "+h.a:""}</small></div></div><p>${h.d||""}</p><div class="mm"><span>${IC("dl")}${fmtN(h.dl)}</span><span>${IC("heart")}${fmtN(h.fl)}</span>${mcv(h.v)?`<span>MC ${mcv(h.v)}</span>`:""}${ldr(h.c)?`<span class="ld">${ldr(h.c)}</span>`:""}</div><div class="mtg">${(h.c||[]).filter(c=>CTX[c]).slice(0,3).map(c=>`<span>${CTX[c]}</span>`).join("")}</div><button class="btn" data-k="${k}">${kind==="modpack"?(h.cf?"Ver en CurseForge":"Crear instancia"):"Instalar"}</button></div>`).join("");
$("mg").querySelectorAll("button").forEach(b=>b.onclick=()=>inst(b,MH[+b.dataset.k]));
$("mmore").style.display=A&&MH.length<total?"inline-block":"none"}
async function inst(b,h){const t=sel,L=b.textContent;b.disabled=true;b.textContent="Instalando…";
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
