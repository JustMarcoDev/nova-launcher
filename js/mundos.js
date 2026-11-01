// Pestaña Mundos: los mundos de todas tus instancias en una sola lista, con búsqueda, orden y filtro por instancia.
// Cada fila: Jugar (entra directo al mundo), Copiar a otra instancia, Copia de seguridad, Abrir carpeta y Borrar (a la papelera).
const MUN={all:[],q:"",sort:"last",inst:"",busy:false};
const MODOS={survival:"Supervivencia",creative:"Creativo",adventure:"Aventura",spectator:"Espectador",hardcore:"Extremo"};
function munView(){
 const q=MUN.q.trim().toLowerCase();
 let L=MUN.all.filter(w=>(!MUN.inst||w.inst===MUN.inst)&&(!q||(w.name+" "+w.folder+" "+w.instName).toLowerCase().includes(q)));
 L=L.slice().sort(MUN.sort==="name"?(a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:"base"}):(a,b)=>b.last-a.last);
 return L}
function munRender(){
 const L=munView(),box=$("mul");
 const ins=[...new Map(MUN.all.map(w=>[w.inst,w.instName])).entries()];
 $("mui").innerHTML=`<option value="">${trad("Todas las instancias")}</option>`+ins.map(([id,n])=>`<option value="${esc(id)}" ${id===MUN.inst?"selected":""}>${esc(n)}</option>`).join("");
 $("mus").innerHTML=[["last","Última partida"],["name","Nombre"]].map(([k,n])=>`<button class="chip ${k===MUN.sort?"on":""}" data-k="${k}">${trad(n)}</button>`).join("");
 $("muc").textContent=!MUN.all.length?"":L.length===MUN.all.length?(L.length===1?trad("1 mundo"):trad("{1} mundos").replace("{1}",L.length)):trad("{1} / {2} mundos").replace("{1}",L.length).replace("{2}",MUN.all.length);
 box.innerHTML=L.length?L.map(w=>`<div class="mr" data-i="${esc(w.inst)}" data-f="${esc(w.folder)}"><div class="ico">${w.icon?`<img src="${esc(w.icon)}" alt="">`:IC("globe")}</div><div class="nm"><b>${esc(w.name)}</b><small><span>${esc(w.instName)}</span> · <span>${esc(w.ver||w.mc)}</span> · <span>${trad(MODOS[w.mode]||"Supervivencia")}</span> · <span>${fmtD(w.last)}</span></small></div><span class="cp2"><button class="btn sm pr" data-a="play" ${w.qp?"":'disabled title="'+trad("Esta versión no puede entrar directo a un mundo")+'"'}>${trad("Jugar")}</button><button class="btn sm" data-a="cp">${trad("Copiar a…")}</button><button class="btn sm" data-a="bk">${trad("Copia de seguridad")}</button><button class="btn sm" data-a="fo">${trad("Abrir carpeta")}</button><button class="btn sm" data-a="del">${trad("Borrar")}</button></span></div>`).join(""):`<div class="emp">${trad(MUN.all.length?"Ningún mundo coincide con la búsqueda":"Aún no tienes mundos. Crea uno en Minecraft o importa un mapa desde Instancias")}</div>`}
async function munLoad(){
 const api=A||DA;$("mul").innerHTML=`<div class="emp">${trad("Buscando mundos…")}</div>`;
 try{MUN.all=(await api.worldsAll())||[]}catch(e){MUN.all=[];flash(em(e))}
 munRender()}
function munOpen(){if(!MUN.bound){MUN.bound=true;munBind()}munLoad()}
function munBind(){
 $("muq").oninput=e=>{MUN.q=e.target.value;munRender()};
 $("mui").onchange=e=>{MUN.inst=e.target.value;munRender()};
 $("mus").onclick=e=>{const b=e.target.closest("button[data-k]");if(!b)return;MUN.sort=b.dataset.k;munRender()};
 $("mur").onclick=munLoad;
 $("mul").onclick=async e=>{
  const b=e.target.closest("button[data-a]");if(!b||b.disabled)return;
  const row=b.closest(".mr"),inst=row.dataset.i,folder=row.dataset.f,w=MUN.all.find(x=>x.inst===inst&&x.folder===folder),api=A||DA,a=b.dataset.a;
  if(a==="play"){show("home");$("go").disabled=true;try{await launch({id:inst,world:folder})}finally{$("go").disabled=false}return}
  if(a==="fo"){try{await api.worldOpen({inst,folder})}catch(x){flash(em(x))}return}
  if(a==="bk"){b.disabled=true;try{await api.worldBackup({inst,folder});flash(trad("Copia de seguridad hecha ✓"))}catch(x){flash(em(x))}b.disabled=false;return}
  if(a==="cp"){
   const others=I.filter(x=>x.id!==inst);if(!others.length){flash(trad("Necesitas otra instancia para copiar el mundo"));return}
   const c=row.querySelector(".cp2");c.innerHTML=`<select>${others.map(o=>`<option value="${esc(o.id)}">${esc(o.name)}</option>`).join("")}</select><button class="btn sm pr" data-a="cpgo">${trad("Copiar")}</button><button class="btn sm" data-a="no">✕</button>`;return}
  if(a==="no"){munRender();return}
  if(a==="cpgo"){const to=row.querySelector("select").value;b.disabled=true;try{const n=await api.worldsCopy({from:inst,world:folder,to});flash(trad("Copiado como")+" «"+n+"»");await munLoad()}catch(x){flash(em(x));b.disabled=false}return}
  if(a==="del"){
   if(!confirm(trad("¿Mover este mundo a la papelera?")+"\n\n"+(w?w.name:folder)))return;
   b.disabled=true;try{await api.worldTrash({inst,folder});flash(trad("Mundo movido a la papelera"));await munLoad()}catch(x){flash(em(x));b.disabled=false}}
 }}
