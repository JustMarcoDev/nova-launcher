// Consola
// --- Consola ---
let cLv="all",cQ="",cAuto=true,cLast="i";
const conVis=()=>{const q=cQ.toLowerCase();return CON.filter(x=>(cLv==="all"||x.l===cLv||(cLv==="w"&&x.l==="e"&&false))&&(!q||x.t.toLowerCase().includes(q)))};
function conDraw(){const o=$("cov"),v=conVis().slice(-1500),q=cQ.trim(),re=q?new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi"):null;
o.innerHTML=v.length?v.map(x=>{let h=esc(x.t);if(re)h=h.replace(new RegExp(esc(q).replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi"),m=>"<mark>"+m+"</mark>");return`<div class="${x.l}">${h}</div>`}).join(""):`<div class="ce">${CON.length?"Ninguna línea coincide con el filtro.":"Aún no hay salida. Lanza el juego y aparecerá aquí."}</div>`;
chips($("clv"),[["all","Todo"],["e","Errores ("+CON.filter(x=>x.l==="e").length+")"],["w","Avisos ("+CON.filter(x=>x.l==="w").length+")"],["i","Info"]],cLv,k=>{cLv=k;conDraw()});
if(cAuto)o.scrollTop=1e9}
function rcon(){if(!A&&!CON.length)["── Fabric 1.21.1 · Minecraft 1.21.1 · Jugador ──","[20:14:02] [main/INFO]: Loading Minecraft 1.21.1 with Fabric Loader 0.16.9","[20:14:03] [main/INFO]: Loading 12 mods","[20:14:05] [main/WARN]: Mod 'examplemod' uses a deprecated API","[20:14:07] [Render thread/INFO]: Setting user: Jugador","[20:14:09] [Render thread/ERROR]: Failed to load texture minecraft:textures/missing.png","\tat net.minecraft.client.texture.TextureManager.load(TextureManager.java:88)","[20:14:11] [Render thread/INFO]: Sound engine started"].forEach(conAdd);conDraw()}
$("cq").oninput=e=>{cQ=e.target.value;conDraw()};$("cau").onchange=e=>{cAuto=e.target.checked;if(cAuto)$("cov").scrollTop=1e9};
$("cov").addEventListener("scroll",()=>{const o=$("cov"),b=o.scrollHeight-o.scrollTop-o.clientHeight<40;if(b!==cAuto){cAuto=b;$("cau").checked=b}});
const conTxt=()=>conVis().map(x=>x.t).join("\n");
$("cpy").onclick=async()=>{const t=conTxt();if(!t){flash("No hay nada que copiar");return}try{if(A)await A.clip(t);else await navigator.clipboard.writeText(t);flash("Consola copiada ✓")}catch{flash("No se pudo copiar")}};
$("csv").onclick=async()=>{const t=conTxt();if(!t){flash("No hay nada que guardar");return}if(!A){flash("Vista previa: en la app se guarda un archivo .txt");return}try{const r=await A.saveText({name:"consola-nova.txt",text:t});if(!r.canceled)flash("Consola guardada ✓")}catch(x){flash(em(x))}};
$("ccl").onclick=()=>{CON.length=0;conDraw()};
