// Consola
// --- Consola ---
let cLv="all",cQ="",cAuto=true,cLast="i";
const conVis=()=>{const q=cQ.toLowerCase();return CON.filter(x=>(cLv==="all"||x.l===cLv||(cLv==="w"&&x.l==="e"&&false))&&(!q||x.t.toLowerCase().includes(q)))};
const conRow=(x,q)=>{let h=esc(x.t);if(q)h=h.replace(new RegExp(esc(q).replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi"),m=>"<mark>"+m+"</mark>");return`<div class="${x.l}">${h}</div>`};
let cSeq=0,cChipT=0;
function conChips(){chips($("clv"),[["all","Todo"],["e","Errores ("+CON.filter(x=>x.l==="e").length+")"],["w","Avisos ("+CON.filter(x=>x.l==="w").length+")"],["i","Info"]],cLv,k=>{cLv=k;conDraw()})}
function conDraw(){const o=$("cov"),v=conVis().slice(-800),q=cQ.trim();
o.innerHTML=v.length?v.map(x=>conRow(x,q)).join(""):`<div class="ce">${CON.length?"Ninguna línea coincide con el filtro.":"Aún no hay salida. Lanza el juego y aparecerá aquí."}</div>`;
cSeq=CON.length?CON[CON.length-1].n||0:0;conChips();
if(cAuto)o.scrollTop=1e9}
// Con el juego arrancando llegan miles de líneas: sin filtros solo se añaden las nuevas (no se repinta todo cada vez)
function conTick(){if(cQ.trim()||cLv!=="all"||!cSeq||$("cov").querySelector(".ce")){conDraw();return}
const o=$("cov"),nw=[];for(let i=CON.length-1;i>=0&&(CON[i].n||0)>cSeq;i--)nw.push(CON[i]);if(!nw.length)return;
nw.reverse();o.insertAdjacentHTML("beforeend",nw.map(x=>conRow(x,"")).join(""));cSeq=nw[nw.length-1].n;
for(let k=o.childElementCount-800;k>0;k--)o.removeChild(o.firstChild);
if(!cChipT)cChipT=setTimeout(()=>{cChipT=0;conChips()},1000);
if(cAuto)o.scrollTop=1e9}
function rcon(){if(!A&&!CON.length)demoCon();conDraw()}
$("cq").oninput=e=>{cQ=e.target.value;conDraw()};$("cau").onchange=e=>{cAuto=e.target.checked;if(cAuto)$("cov").scrollTop=1e9};
$("cov").addEventListener("scroll",()=>{const o=$("cov"),b=o.scrollHeight-o.scrollTop-o.clientHeight<40;if(b!==cAuto){cAuto=b;$("cau").checked=b}});
const conTxt=()=>conVis().map(x=>x.t).join("\n");
$("cpy").onclick=async()=>{const t=conTxt();if(!t){flash("No hay nada que copiar");return}try{if(A)await A.clip(t);else await navigator.clipboard.writeText(t);flash("Consola copiada ✓")}catch{flash("No se pudo copiar")}};
$("csv").onclick=async()=>{const t=conTxt();if(!t){flash("No hay nada que guardar");return}if(!A){pv("txt");return}try{const r=await A.saveText({name:"consola-nova.txt",text:t});if(!r.canceled)flash("Consola guardada ✓")}catch(x){flash(em(x))}};
$("ccl").onclick=()=>{CON.length=0;conDraw()};
