// Portada: novedades y animación de entrada
// Novedades
async function news(){let it=[];try{if(A){const r=await A.http({url:"https://launchercontent.mojang.com/v2/javaPatchNotes.json"}),B="https://launchercontent.mojang.com";
it=(r.entries||[]).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,12).map(e=>({t:(e.type==="release"?"Minecraft ":"Snapshot ")+e.version,d:e.shortText||"",i:e.image&&e.image.url?(/^http/.test(e.image.url)?e.image.url:B+(e.image.url[0]==="/"?"":"/")+e.image.url):""}));if(it.length)$("nsrc").textContent="Mojang"}}catch{}
if(!it.length)it=[{t:"Nova Launcher 0.2.14",d:"Seis idiomas, preparación en segundo plano, limpieza de espacio e instancias en lista."},{t:"Java automático",d:"Cada versión usa el Java correcto sin que hagas nada."},{t:"Mods y modpacks",d:"Modrinth y CurseForge en un solo sitio."},{t:"Actualizaciones",d:"El launcher se actualiza solo desde GitHub."}];
NEWS=[{t:"Próximamente · Nova Launcher 0.3.0",d:"Algo grande está en camino. Mantén el launcher abierto para recibirlo solo.",i:"",z:1},...it];renderNews()}
let NEWS=[];
function renderNews(){lastN=cfg.newsN||4;$("nw").innerHTML=NEWS.slice(0,lastN).map((n,i)=>`<div class="nc g${i%4}${n.z?" tz":""}" style="${n.i?`background-image:linear-gradient(transparent 25%,#000d),url('${n.i}')`:""}"><div><b>${n.t}</b><p>${n.d}</p></div></div>`).join("")}
const ob=new MutationObserver(m=>m.forEach(r=>[...r.target.children].forEach((c,i)=>c.style.setProperty("--i",Math.min(i,14)))));
["nw","qi","il","mg","vl"].forEach(id=>{$(id).classList.add("rise");ob.observe($(id),{childList:true})});
document.documentElement.style.setProperty("--base","3.3s");setTimeout(()=>{document.documentElement.style.setProperty("--base","0s");const i=$("intro");i&&i.remove()},4600);
(()=>{const bar=document.querySelector("#intro .ld i"),pc=$("ipc");if(!bar||!pc)return;const t0=performance.now()+300,DUR=2700;
(function f(n){const p=Math.max(0,Math.min(1,(n-t0)/DUR)),e=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;bar.style.width=(e*100).toFixed(1)+"%";pc.textContent=Math.round(e*100)+"%";if(p<1&&pc.isConnected)requestAnimationFrame(f)})(performance.now())})();
