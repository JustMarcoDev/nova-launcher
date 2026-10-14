// Buscador global (Ctrl+K)
// --- Buscador global (Ctrl+K) ---
let pSel=0,PI=[],PM=[],pmT=0,pmSeq=0;
const PEX=[["gen","Cuentas de Minecraft"],["game","Memoria RAM"],["game","Diagnóstico"],["game","Velocidad máxima de descarga"],["game","Copias de seguridad"],["game","Importar desde otro launcher"],["about","Volver a una versión anterior"],["about","Guardar mis ajustes en un archivo"],["about","Asistente de bienvenida"],["perf","Canal de actualizaciones"]];
function palItems(q){q=q.trim().toLowerCase();const o=[],m=s=>!q||String(s).toLowerCase().includes(q);
Object.entries(PT).forEach(([p,n])=>{if(m(n))o.push({g:"Páginas",t:n,d:"Ir a esta pestaña",f:()=>show(p)})});
if(q){V.filter(v=>v.id.toLowerCase().includes(q)).slice(0,6).forEach(v=>o.push({g:"Versiones",t:"Minecraft "+v.id,d:(TN[v.type]||v.type)+" · con "+sel.ld,f:()=>{pick(v.id,v.type);show("home")}}))}
I.filter(i=>q?(m(i.name)||m(i.mc)||m(i.ld)):false).slice(0,5).forEach(i=>o.push({g:"Instancias",t:i.name,d:(i.ld||"Vanilla")+" "+i.mc,f:()=>{pick(i.mc,i.type||"release",i.ld);sel.inst=i.id;show("home");qi()}}));
if(q){const seen=new Set();[...SC.flatMap(s=>s.rows.filter(r=>r.t).map(r=>[s.id,r.t,r.d||""])),...PEX.map(x=>[x[0],x[1],""])].forEach(([s,t,d])=>{if((m(t)||m(d))&&!seen.has(s+t)){seen.add(s+t);o.push({g:"Ajustes",t,d:(SC.find(z=>z.id===s)||{}).n||"",f:()=>jumpSet(s,t)})}});}
PM.forEach(t=>o.push({g:"Mods",t,d:"Buscar en Modrinth",f:()=>{kind="mod";cat="";$("q").value=t;show("mods")}}));
return o.slice(0,16)}
function jumpSet(s,t){secNow=s;show("set");buildSet();setTimeout(()=>{const el=[...document.querySelectorAll("#sc section.on .o")].find(x=>{const b=x.querySelector(".ot b");return b&&b.textContent===t});if(el){el.scrollIntoView({block:"center"});el.classList.add("hl");setTimeout(()=>el.classList.remove("hl"),1900)}},60)}
function palDraw(){PI=palItems($("pq").value);if(pSel>=PI.length)pSel=Math.max(0,PI.length-1);let g="";$("pr").innerHTML=PI.length?PI.map((x,k)=>{const h=x.g!==g?`<div class="pg2">${x.g}</div>`:"";g=x.g;return h+`<div class="pit ${k===pSel?"on":""}" data-k="${k}"><b>${esc(x.t)}</b><small>${esc(x.d)}</small></div>`}).join(""):'<div class="emp">Sin resultados</div>';const on=$("pr").querySelector(".pit.on");if(on)on.scrollIntoView({block:"nearest"})}
function palMods(q){clearTimeout(pmT);PM=[];if(q.length<2)return;pmT=setTimeout(async()=>{const my=++pmSeq;let h=[];try{if(A){const r=await H(`https://api.modrinth.com/v2/search?limit=5&query=${encodeURIComponent(q)}&facets=${enc([["project_type:mod"]])}`);h=r.hits.map(x=>x.title)}else h=DM.mod.map(x=>x[0]).filter(t=>t.toLowerCase().includes(q.toLowerCase())).slice(0,5)}catch{}if(my!==pmSeq)return;PM=h;palDraw()},350)}
function palOpen(on){$("pal").classList.toggle("on",on);if(on){$("pq").value="";pSel=0;PM=[];palDraw();$("pq").focus()}}
function palRun(k){const x=PI[k];if(!x)return;palOpen(false);x.f()}
$("pq").oninput=()=>{pSel=0;palMods($("pq").value.trim());palDraw()};
$("pr").onclick=e=>{const p=e.target.closest(".pit");if(p)palRun(+p.dataset.k)};$("pal").onclick=e=>{if(e.target.id==="pal")palOpen(false)};
$("pr").onmousemove=e=>{const p=e.target.closest(".pit");if(p&&+p.dataset.k!==pSel){pSel=+p.dataset.k;$("pr").querySelectorAll(".pit").forEach((x,k)=>x.classList.toggle("on",+x.dataset.k===pSel))}};
addEventListener("keydown",e=>{const on=$("pal").classList.contains("on");
if(e.ctrlKey&&!e.altKey&&e.key.toLowerCase()==="k"&&cfg.shortcuts!==false){e.preventDefault();palOpen(!on);return}
if(!on)return;if(e.key==="Escape"){palOpen(false);return}
if(e.key==="ArrowDown"){e.preventDefault();pSel=Math.min(PI.length-1,pSel+1);palDraw()}else if(e.key==="ArrowUp"){e.preventDefault();pSel=Math.max(0,pSel-1);palDraw()}else if(e.key==="Enter"){e.preventDefault();palRun(pSel)}});
