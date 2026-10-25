// Servidores populares
// ===== Servidores (0.2.10) =====
// Lista editable: n = nombre, h = dirección, d = descripción, mc = versión recomendada, t = etiquetas.
const SERVERS=[{n:"Hypixel",h:"mc.hypixel.net",d:"El servidor más grande: BedWars, SkyBlock, SkyWars y más",mc:"1.21.1",t:["Minijuegos","SkyBlock"]},{n:"CubeCraft",h:"play.cubecraft.net",d:"EggWars, SkyWars, Parkour y otros minijuegos",mc:"1.21.1",t:["Minijuegos"]},{n:"Wynncraft",h:"play.wynncraft.com",d:"MMORPG con misiones, mazmorras y clases",mc:"1.21.1",t:["RPG"]},{n:"Minemen Club",h:"minemen.club",d:"PvP competitivo y práctica de combate",mc:"1.8.9",t:["PvP"]},{n:"PikaNetwork",h:"play.pika-network.net",d:"Survival, Skyblock, Practice y más modos",mc:"1.21.1",t:["Survival","PvP"]},{n:"MC Complex",h:"hub.mc-complex.com",d:"Más de 30 modos de juego en un solo lugar",mc:"1.21.1",t:["Minijuegos"]},{n:"Mineplex",h:"us.mineplex.com",d:"El clásico de los minijuegos",mc:"1.21.1",t:["Minijuegos"]},{n:"2b2t",h:"2b2t.org",d:"La anarquía más antigua: sin reglas",mc:"1.21.1",t:["Anarquía"]}];
function renderSrv(){$("sl").innerHTML=SERVERS.map((s,k)=>{const st=SST[s.h],on=st&&st.online;return `<div class="sv" style="--i:${k}"><div class="svi">${st&&st.icon?`<img src="${st.icon}" alt="">`:`<span>${s.n[0]}</span>`}</div><div class="svb"><b>${s.n}</b><small>${s.h}</small><p>${s.d}</p><div class="svm"><span class="dot ${st?(on?"on":"off"):""}"></span>${st?(on?fmtP(st.players)+" jugando"+(st.ping!=null&&st.ping>=0?" · "+st.ping+" ms":""):"Sin respuesta"):"Comprobando…"}<em>${s.mc}</em>${s.t.map(t=>`<i>${t}</i>`).join("")}</div></div><button class="btn jn" data-k="${k}">Unirse</button></div>`}).join("");
$("sl").querySelectorAll(".jn").forEach(b=>b.onclick=()=>joinSrv(SERVERS[+b.dataset.k],b))}
async function joinSrv(s,b){if(!A){pvJoin(b);return}
b.disabled=true;b.textContent="Preparando…";try{const ld=s.ld||"Vanilla";let i=I.find(x=>x.mc===s.mc&&x.ld===ld&&!x.novaPack&&!x.manual);if(!i){i=await A.saveInst({name:`${LDN(ld)} ${s.mc}`,mc:s.mc,ld,type:"release"});await loadI()}
show("home");$("go").disabled=true;try{await launch({id:i.id,server:{name:s.n,host:s.h,port:s.p||25565}})}finally{$("go").disabled=false}}finally{b.disabled=false;b.textContent="Unirse"}}
async function loadSrv(){renderSrv();renderMine();
if(!A){pvSrvAll();return}
const keys=[...SERVERS.map(z=>z.h),...(cfg.myServers||[]).map(mkey)];
try{SST=await A.srvStatus(keys)}catch{}renderSrv();renderMine()}
