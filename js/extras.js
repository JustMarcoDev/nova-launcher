// Continuar el último mundo y arrastrar y soltar
let LASTW=null;
// La X quita el botón «Continuar» hasta que juegues otro mundo (o ese mismo otra vez)
const contKey=w=>w?w.inst+"|"+w.name+"|"+(w.date||w.last||""):"";
let CGONE="";
const contGone=()=>{try{return localStorage.getItem("nova.contGone")||CGONE}catch{return CGONE}};
async function contRefresh(){
  let w=null;try{w=A?await A.worldLast():demoWorld()}catch{}
  LASTW=w;const b=$("cont");if(!b)return;b.hidden=!w||contKey(w)===contGone();if(w)$("cons").textContent=w.name+" · "+w.instName;
}
{const _l=loadI;loadI=async function(){const r=await _l.apply(this,arguments);try{contRefresh()}catch{}return r}}
const contX=e=>{e.stopPropagation();e.preventDefault();CGONE=contKey(LASTW);try{localStorage.setItem("nova.contGone",CGONE)}catch{}$("cont").hidden=true};
$("contx").onclick=contX;$("contx").onkeydown=e=>{if(e.key==="Enter"||e.key===" ")contX(e)};
$("cont").onclick=async()=>{
  if(!LASTW)return;if(!A){pvPlay();return}
  const b=$("cont");b.disabled=true;try{await launch({id:LASTW.inst,world:LASTW.name})}catch(e){flash(em(e))}finally{b.disabled=false}
};

// ----- Arrastrar y soltar -----
const DK={mod:"Mod",shader:"Shader",resource:"Texturas",world:"Mundo",modpack:"Modpack / instancia",unknown:"No sé qué es"};
const DRP=document.createElement("div");DRP.id="drp";DRP.innerHTML=`<div class="drb">${IC("dl")}<b>Suelta aquí para instalar</b><span>Mods (.jar), modpacks (.mrpack), mundos y packs (.zip)</span></div>`;document.body.appendChild(DRP);
let drN=0;const hasF=e=>e.dataTransfer&&[...(e.dataTransfer.types||[])].includes("Files");
addEventListener("dragenter",e=>{if(!hasF(e))return;e.preventDefault();drN++;DRP.classList.add("on")});
addEventListener("dragover",e=>{if(!hasF(e))return;e.preventDefault();e.dataTransfer.dropEffect="copy"});
addEventListener("dragleave",e=>{if(!hasF(e))return;if(--drN<=0){drN=0;DRP.classList.remove("on")}});
addEventListener("drop",async e=>{
  if(!hasF(e))return;e.preventDefault();drN=0;DRP.classList.remove("on");
  const fs=[...e.dataTransfer.files].slice(0,20);if(!fs.length)return;
  if($("mdl").classList.contains("on")&&!$("mdl").querySelector("#dpl"))return;
  let items;
  try{
    if(A)items=await A.dropInspect(fs.map(f=>A.filePath(f)).filter(Boolean));
    else items=fs.map(f=>({path:f.name,name:f.name,size:f.size,kind:guessKind(f.name)}));
  }catch(x){flash(em(x));return}
  if(!items||!items.length){flash("Suelta archivos, no carpetas");return}
  openDrop(items);
});
function guessKind(n){n=n.toLowerCase();return n.endsWith(".jar")?"mod":n.endsWith(".mrpack")?"modpack":n.endsWith(".zip")?(/shader/.test(n)?"shader":/texture|resource|pack/.test(n)?"resource":"unknown"):"unknown"}
function fSize(b){b=+b||0;return b>=1048576?(b/1048576).toFixed(1)+" MB":Math.max(1,Math.round(b/1024))+" KB"}
function openDrop(items){
  const L=I.length?I:[{id:"d1",name:"Fabric 1.21.1",mc:"1.21.1",ld:"Fabric"}];
  const def=(sel.inst&&L.some(x=>x.id===sel.inst))?sel.inst:L[0].id;
  const opts=k=>Object.entries(DK).filter(([v])=>v!=="unknown"||k==="unknown").map(([v,t])=>`<option value="${v}" ${v===k?"selected":""}>${t}</option>`).join("")+`<option value="skip">No instalar</option>`;
  modal(hdr(null,"Instalar archivos","Elige qué es cada uno y dónde ponerlo")+`<div id="dpl">${items.map((it,k)=>`<div class="dpr" data-k="${k}"><div class="dpn"><b title="${esc(it.path)}">${esc(it.name)}</b><span>${fSize(it.size)}</span></div><select class="dpk">${opts(it.kind)}</select><select class="dpi">${L.map(i=>`<option value="${esc(i.id)}" ${i.id===def?"selected":""}>${esc(i.name)}</option>`).join("")}</select><span class="dps"></span></div>`).join("")}</div><div class="acts"><button class="btn" data-x>Cancelar</button><button class="btn pr" id="dpg">Instalar</button></div>`,"wide");
  const fix=r=>{const k=r.querySelector(".dpk").value;r.querySelector(".dpi").style.visibility=(k==="modpack"||k==="skip")?"hidden":"visible"};
  $("dpl").querySelectorAll(".dpr").forEach(r=>{fix(r);r.querySelector(".dpk").onchange=()=>fix(r)});
  $("dpg").onclick=async()=>{
    const b=$("dpg");b.disabled=true;let ok=0,bad=0;const api=A||DA;
    for(const r of $("dpl").querySelectorAll(".dpr")){
      const it=items[+r.dataset.k],kind=r.querySelector(".dpk").value,st=r.querySelector(".dps");if(kind==="skip"){st.textContent="—";continue}
      st.textContent="…";try{await api.dropInstall({path:it.path,kind,inst:r.querySelector(".dpi").value});st.textContent="✓";st.className="dps ok";ok++}catch(x){st.textContent="✕";st.className="dps bad";st.title=em(x);bad++;flash(em(x))}
    }
    await loadI();b.disabled=false;b.textContent="Cerrar";b.onclick=closeModal;
    if(ok&&!bad){closeModal();flash(ok+(ok>1?" archivos instalados":" archivo instalado"))}else if(ok)flash(ok+" instalados, "+bad+" con error");
  };
}
