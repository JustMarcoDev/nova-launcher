// Vista previa: datos y avisos de ejemplo para abrir index.html en un navegador (sin la app).
// Solo se carga cuando no existe window.api y no va dentro del instalador (build.files).
// Avisos «Vista previa»
const PVN={rep:"se abriría la carpeta de informes",txt:"en la app se guarda un archivo .txt",wfo:"se abriría la carpeta de mundos",wim:"en la app eliges un .zip con el mapa",imp:"en la app puedes importar un .mrpack o un .zip de Nova Launcher",ifo:"abre la carpeta del juego desde la app",mad:"en la app puedes añadir tus propios .jar",ifol:"se abriría la carpeta de la instancia",exp:"en la app se guardaría un archivo ."};
const pv=(k,x)=>flash("Vista previa: "+PVN[k]+(x||""));
const pvPlay=()=>{$("st").textContent="Vista previa: instala la app de escritorio para jugar"};
const pvJoin=el=>{el.textContent="Vista previa";setTimeout(()=>el.textContent="Unirse",1500)};
// ---- base ----
// --- Datos de ejemplo para la vista previa (sin la app) ---
const DMOD=[{file:"sodium-fabric-0.5.11.jar",enabled:true,size:1.2e6,sha1:"a1",t:"Sodium",v:"0.5.11",u:"0.6.0"},{file:"lithium-fabric-0.13.0.jar",enabled:true,size:640e3,sha1:"a2",t:"Lithium",v:"0.13.0"},{file:"iris-1.7.3.jar",enabled:false,size:2.3e6,sha1:"a3",t:"Iris Shaders",v:"1.7.3",u:"1.8.0"},{file:"fabric-api-0.102.0.jar",enabled:true,size:2.1e6,sha1:"a4",t:"Fabric API",v:"0.102.0"},{file:"mi-mod-casero.jar",enabled:true,size:88e3,sha1:"a5"}];
let DBK=[{file:"1",date:Date.now()-36e5,size:48e6,reason:"antes de actualizar mods"},{file:"2",date:Date.now()-864e5,size:47e6,reason:"manual"}];
const DA={modsList:async()=>DMOD.map(m=>({file:m.file,enabled:m.enabled,size:m.size,sha1:m.sha1})),
modsCheck:async()=>Object.fromEntries(DMOD.filter(m=>m.t).map(m=>[m.sha1,{title:m.t,icon:"",ver:m.v,update:m.u?{ver:m.u,url:"https://x",filename:m.file,sha1:"",sha512:""}:null}])),
modsToggle:async({file})=>{const m=DMOD.find(x=>x.file===file);if(m)m.enabled=!m.enabled;return file},modsRemove:async({file})=>{const k=DMOD.findIndex(x=>x.file===file);if(k>=0)DMOD.splice(k,1);return true},
modsUpdate:async({file})=>{const m=DMOD.find(x=>x.file===file);if(m){m.v=m.u;m.u=""}return file},modsAdd:async()=>0,
bkList:async()=>DBK,bkCreate:async()=>{DBK.unshift({file:"n"+Date.now(),date:Date.now(),size:48e6,reason:"manual"});return"x"},bkRestore:async()=>true,bkDel:async({file})=>{DBK=DBK.filter(b=>b.file!==file);return true},bkOpen:async()=>{},
instUpdate:async(id,p)=>{const i=I.find(x=>x.id===id);Object.assign(i,p);return i},instDup:async id=>{const i=I.find(x=>x.id===id);I.push({...i,id:"d"+Date.now(),name:i.name+" (copia)",custom:true});return 1},instOpen:async()=>{},
instExport:async()=>({ok:true,file:"demo.mrpack"}),instImport:async()=>({canceled:true}),loaderVersions:async({ld})=>ld==="Fabric"?[{v:"0.16.9",stable:true},{v:"0.16.8",stable:true},{v:"0.16.5",stable:true}]:[{v:"52.0.3",stable:true},{v:"52.0.1",stable:true}],
packVersions:async()=>[{id:"p3",name:"Fabulously Optimized 10.0",num:"10.0.0",mc:["1.21","1.21.1"],ld:["fabric"],date:"2026-09-30T10:00:00Z",type:"release"},{id:"p2",name:"Fabulously Optimized 9.5",num:"9.5.0",mc:["1.20.4","1.20.6"],ld:["fabric"],date:"2026-06-12T10:00:00Z",type:"release"},{id:"p1",name:"Beta 11.0",num:"11.0.0-beta.2",mc:["1.21.4"],ld:["fabric"],date:"2026-10-05T10:00:00Z",type:"beta"}],
pack:async()=>({failed:[]}),delInst:async id=>{I=I.filter(x=>x.id!==id)},sys:async()=>({total:16})};
// ---- acc1 ----
if(!A){cfg.accounts=[{id:"o1",type:"offline",name:"Jugador"},{id:"m1",type:"microsoft",name:"Marco"}];cfg.activeAccount="o1"}
Object.assign(DA,{accAddOffline:async n=>{if(!/^[A-Za-z0-9_]{3,16}$/.test(n))throw new Error("El nombre debe tener de 3 a 16 letras, números o _");if(cfg.accounts.some(a=>a.type==="offline"&&a.name.toLowerCase()===n.toLowerCase()))throw new Error("Ya tienes una cuenta offline con ese nombre");const id="o"+Date.now();cfg.accounts=[...cfg.accounts,{id,type:"offline",name:n}];return{accounts:cfg.accounts,active:id}},
accSwitch:async id=>({accounts:cfg.accounts,active:id}),accRemove:async id=>{if(cfg.accounts.length<2)throw new Error("Debe quedar al menos una cuenta");cfg.accounts=cfg.accounts.filter(a=>a.id!==id);return{accounts:cfg.accounts,active:cfg.activeAccount===id?cfg.accounts[0].id:cfg.activeAccount}},
login:async()=>({error:"Vista previa: el inicio de sesión de Microsoft solo funciona en la app instalada"})});
// ---- insts ----
const demoInsts=()=>[{id:"d1",name:"Fabric 1.20.1",mc:"1.20.1",ld:"Fabric",type:"release",fav:true,tags:["Survival"],note:"Mundo con amigos, mods de optimización",playMs:18e6,lastPlayed:Date.now()-36e5},{id:"d2",name:"Vanilla 1.8.9",mc:"1.8.9",ld:"Vanilla",type:"release",tags:["Pruebas"],playMs:3e6,lastPlayed:Date.now()-864e5*3},{id:"d3",name:"Forge 1.12.2",mc:"1.12.2",ld:"Forge",type:"release",tags:["Survival","Pruebas"],note:"Modpack de magia",playMs:9e6,lastPlayed:Date.now()-864e5*9}];
// ---- vers ----
const demoVers=()=>"Vista previa con "+V.length+" versiones de ejemplo. La app de escritorio carga todas.";
// ---- upd ----
let demoT=null;
function demoUpd(s){clearInterval(demoT);
if(s==="ready"){setU({s:"none"});return}
if(s==="available"){let p=0;demoT=setInterval(()=>{p+=7+Math.random()*9;if(p>=100){clearInterval(demoT);setU({s:"ready",v:"0.2.6 (simulación)"})}else setU({s:"downloading",v:"0.2.6 (simulación)",p,bps:2400000+Math.random()*900000})},320);return}
setU({s:"checking"});demoT=setTimeout(()=>setU({s:"available",v:"0.2.6 (simulación)"}),1200)}
// (los botones de actualizar se enlazan en actualizaciones.js: este archivo no va en la app instalada)
// ---- acc2 ----
const shSvg=(a,b)=>"data:image/svg+xml;utf8,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="160" height="90" fill="url(#g)"/><path d="M0 70 L30 52 L55 66 L90 40 L125 62 L160 48 V90 H0Z" fill="#0006"/><circle cx="125" cy="22" r="9" fill="#fff8"/></svg>`);
let DSH=null;
Object.assign(DA,{statsGet:async()=>{const n=Date.now(),L=[];for(let k=0;k<26;k++)L.push({id:"d"+(k%3),name:["Supervivencia","Skyblock","Pruebas"][k%3],mc:["1.21.4","1.20.1","1.21.1"][k%3],ld:["Fabric","Vanilla","Fabric"][k%3],server:k%4===0?"Hypixel":k%5===0?"Mi servidor":"",start:n-k*864e5*2.3,ms:(k%6+1)*18e5});return{sessions:L,before:[{id:"d0",name:"Supervivencia",mc:"1.21.4",ld:"Fabric",ms:432e5}],shots:14}}});
Object.assign(DA,{shotsList:async()=>{if(!DSH){const c=[["#4fa8ff","#1b2a5a"],["#2ee06f","#0d3b2a"],["#ff9f2e","#5a2a1b"],["#a78bfa","#2a1b5a"],["#f472b6","#5a1b3d"],["#22d3ee","#0d3b4a"]];DSH=Array.from({length:9},(_,k)=>({inst:(I[k%Math.max(1,I.length)]||{id:"d1"}).id,file:`2026-10-${10-k}_20.${10+k}.${k}.png`,date:Date.now()-k*864e5*.7,size:1.4e6+k*1e5,url:shSvg(...c[k%6])}))}return DSH},
shotsOpen:async()=>{flash("Vista previa: se abriría la imagen")},shotsCopy:async()=>{flash("Vista previa: se copiaría la imagen")},shotsDelete:async({file})=>{DSH=DSH.filter(s=>s.file!==file);return true},shotsFolder:async()=>{flash("Vista previa: se abriría la carpeta")}});
// ---- con ----
const demoCon=()=>["── Fabric 1.21.1 · Minecraft 1.21.1 · Jugador ──","[20:14:02] [main/INFO]: Loading Minecraft 1.21.1 with Fabric Loader 0.16.9","[20:14:03] [main/INFO]: Loading 12 mods","[20:14:05] [main/WARN]: Mod 'examplemod' uses a deprecated API","[20:14:07] [Render thread/INFO]: Setting user: Jugador","[20:14:09] [Render thread/ERROR]: Failed to load texture minecraft:textures/missing.png","\tat net.minecraft.client.texture.TextureManager.load(TextureManager.java:88)","[20:14:11] [Render thread/INFO]: Sound engine started"].forEach(conAdd);
// ---- dq ----
// Vista previa: simula una descarga para poder ver el widget
function demoDq(){let n=0;dqDraw({active:3,paused:false,speed:4.2e6});const t=setInterval(()=>{if(DQS.paused)return;if(++n>14||DQS.active===0){clearInterval(t);dqDraw({active:0});return}dqDraw({speed:(2+Math.random()*4)*1048576/(DQS.limit?Math.max(1,6/DQS.limit):1)})},800)}
window.demoDq=demoDq;
// ---- diag ----
async function demoDiag(){await new Promise(r=>setTimeout(r,700));const checks=[{level:"ok",t:"Conexión con Mojang",d:"Los servidores de Mojang responden."},{level:"ok",t:"Memoria RAM",d:"4 GB para el juego, 16 GB en total (9.1 GB libres)."},{level:"ok",t:"Java automático",d:"Instalado: Java 21."},{level:"warn",t:"Espacio en disco",d:"Quedan 3.2 GB libres donde se guarda el launcher. Libera espacio."},{level:"ok",t:"Cuenta: Jugador",d:"Cuenta offline: no podrás entrar en servidores con verificación de cuenta (online-mode)."},{level:"ok",t:"Última partida",d:"No se ven errores conocidos en el registro."}];return{name:"Fabric 1.21.1",checks,text:checks.map(c=>`[${c.level.toUpperCase()}] ${c.t}: ${c.d}`).join("\n")}}
// ---- prep ----
// Vista previa: simula la preparación para poder verla
function demoPrep(){let p=0;prepShow("Preparando Minecraft "+sel.mc+" en segundo plano…",0);const t=setInterval(()=>{p+=12;if(p>=100){clearInterval(t);prepEvent({state:"done",mc:sel.mc});return}prepEvent({state:"progress",mc:sel.mc,pct:p})},350)}
window.demoPrep=demoPrep;
// ---- clean ----
async function demoClean(){await new Promise(r=>setTimeout(r,600));return{running:false,cats:[
 {id:"versions",title:"Versiones de Minecraft sin uso",desc:"Versiones y cargadores que ninguna instancia usa. Se descargan otra vez si los necesitas.",count:3,size:612e6,sample:["1.8.9","1.16.5","fabric-loader-0.14.0-1.19.4"]},
 {id:"libs",title:"Librerías sin uso",desc:"Archivos de versiones antiguas de librerías que ya no necesita ninguna versión instalada.",count:41,size:186e6,sample:["org/lwjgl/lwjgl/3.2.2","com/google/guava/guava/21.0"]},
 {id:"backups",title:"Copias de seguridad antiguas",desc:"Copias de más de 30 días (se conservan las 2 últimas de cada instancia) y las de instancias ya borradas.",count:6,size:340e6,sample:["20260801-100000__antes-de-actualizar-mods.zip"]},
 {id:"logs",title:"Registros e informes de fallos viejos",desc:"Registros del launcher de más de 14 días (se conservan los 5 últimos) e informes de fallos de más de 30 días.",count:17,size:4.2e6,sample:["2026-08-01-10-00-00_Fabric.log"]},
 {id:"imgs",title:"Caché de imágenes",desc:"Imágenes de mods y modpacks guardadas para verse al instante. Se vuelven a descargar al abrir el buscador.",count:1,size:64e6,sample:["Caché de imágenes"]},
 {id:"temp",title:"Archivos temporales",desc:"Restos de instalaciones, de la preparación en segundo plano y descargas a medias de más de 2 días.",count:0,size:0,sample:[]}]}}
// ---- dm ----
const DM={mod:[["Sodium","Motor de render que multiplica los FPS","jellysquid3",98e5,41e3,["optimization"]],["Lithium","Optimiza la lógica del juego sin cambiar nada","jellysquid3",7e6,3e4,["optimization"]],["Fabric API","Biblioteca base para casi todos los mods Fabric","modmuss50",9e7,31e3,["library"]],["Iris Shaders","Shaders modernos compatibles con Sodium","coderbot",2e7,18e3,["decoration"]],["Mod Menu","Lista y configura tus mods desde el menú","Prospector",3e7,9e3,["utility"]],["Create","Máquinas, engranajes y automatización","simibubi",2e7,25e3,["technology"]],["Xaero's Minimap","Minimapa con waypoints y cadenas","xaero96",3e7,8e3,["utility"]],["Just Enough Items","Recetas y objetos al alcance","mezz",2e8,15e3,["utility"]],["Farmer's Delight","Cocina y agricultura ampliada","vectorwing",9e6,12e3,["food"]],["Ender IO","Tecnología y logística","Team",5e6,4e3,["technology"]],["Botania","Magia basada en flores","Vazkii",8e6,6e3,["magic"]],["Waystones","Teletransportes entre mundos","BlayTheNinth",9e6,7e3,["adventure"]]],
modpack:[["Fabulously Optimized","Rendimiento y calidad, listo para jugar","robotkoer",5e6,12e3,["optimization"],["1.21.1"]],["Better Minecraft","Vanilla+ con cientos de mejoras","Better",3e6,6e3,["adventure"],["1.20.1"]],["Create: Above and Beyond","Progresión con Create","simibubi",1e6,4e3,["technology"],["1.18.2"]],["Simply Optimized","Mínimo consumo, máximos FPS","Simply",2e6,5e3,["lightweight"],["1.21.1"]],["Cobblemon Pack","Atrapa criaturas en Minecraft","Cobble",4e6,9e3,["adventure"],["1.21.1"]],["Adrenaline","Optimización agresiva para PCs modestos","Adrenaline",9e5,3e3,["optimization"],["1.20.4"]]],
shader:[["Complementary Reimagined","Shaders bonitos y rápidos","EminGT",9e6,11e3,["semi-realistic"]],["BSL Shaders","Clásicos y muy personalizables","CaptTatsu",7e6,9e3,["realistic"]],["Photon","Iluminación y sombras suaves","sixthsurge",1e6,3e3,["fantasy"]]],
resourcepack:[["Faithful 32x","Texturas vanilla al doble de resolución","Faithful",8e6,10e3,["32x"]],["Fresh Animations","Mobs con animaciones nuevas","Fresh",7e6,9e3,["vanilla-like"]],["Bare Bones","Texturas simples y suaves","Bare",6e6,7e3,["16x"]]]};
// ---- mods ----
function pvMods(kind,q,cat){let L=DM[kind].map(([t2,d,a,dl,fl,c,v],i)=>({id:"d"+i,t:t2,d,a,dl,fl,c,v})).filter(h=>(!q||h.t.toLowerCase().includes(q.toLowerCase()))&&(!cat||h.c.includes(cat)));MH=L;total=L.length;$("mi").textContent="Vista previa con datos de ejemplo · en la app se busca en Modrinth (miles de resultados)";drawMods();}
// ---- inst ----
async function pvInstall(b,L,h,kind){if(kind==="modpack"){const v=await pickPackVersion(h);if(!v){b.disabled=false;b.textContent=L;return}}setTimeout(()=>{b.textContent=kind==="modpack"?"Instancia creada ✓":"Instalado ✓";b.classList.add("ok")},700);}
// ---- her1 ----
Object.assign(DA,{worldsList:async()=>[{name:"Mi mundo",date:Date.now()-36e5,size:84e6,icon:""},{name:"Supervivencia con amigos",date:Date.now()-5*864e5,size:210e6,icon:""},{name:"Creativo",date:Date.now()-30*864e5,size:12e6,icon:""}],worldsCopy:async({world})=>world+" (copia)",worldsImport:async()=>({canceled:true})});
// ---- her2 ----
Object.assign(DA,{importScan:async()=>[{src:"oficial",label:"Launcher oficial",name:"Minecraft oficial",dir:"/x/.minecraft",mc:"1.21.1",ld:"Vanilla",worlds:6,mods:0,unsupported:""},{src:"prism",label:"Prism",name:"Mi Prism",dir:"/x/prism",mc:"1.20.1",ld:"Fabric",worlds:2,mods:34,unsupported:""},{src:"curseforge",label:"CurseForge",name:"All the Mods 9",dir:"/x/cf",mc:"1.20.1",ld:"Forge",worlds:1,mods:180,unsupported:""}],importRun:async()=>({ins:{}})});
// ---- her3 ----
Object.assign(DA,{releases:async()=>[{version:"0.2.11",date:"2026-10-05T10:00:00Z",size:84e6,pre:false,url:"https://x"},{version:"0.2.10",date:"2026-09-28T10:00:00Z",size:83e6,pre:false,url:"https://x"},{version:"0.2.9",date:"2026-09-20T10:00:00Z",size:82e6,pre:false,url:"https://x"}],rollback:async()=>{throw new Error("Vista previa: solo funciona en la app instalada")}});
// ---- her_srv ----
function pvSrv(s){SST[mkey(s)]={online:true,players:Math.round(Math.random()*40),max:100,ping:30,version:"1.21.1",motd:"Servidor de ejemplo"}}
// ---- srv ----
function pvSrvAll(){[...SERVERS.map(z=>z.h),...(cfg.myServers||[]).map(mkey)].forEach(h=>SST[h]={online:true,players:Math.round(300+Math.random()*30000),max:40000,ping:Math.round(20+Math.random()*80),version:"1.21.1",motd:"Servidor de ejemplo"});renderSrv();renderMine();}
// ---- world ----
const demoWorld=()=>({inst:"d1",name:"Mi mundo de supervivencia",date:Date.now()-72e5,instName:"Fabric 1.21.1",mc:"1.21.1",ld:"Fabric"});
// ---- drop ----
Object.assign(DA,{dropInstall:async o=>{await new Promise(r=>setTimeout(r,300));if(o.kind==="unknown")throw new Error("Tipo no reconocido");return{kind:o.kind,name:o.path}}});

// Simulaciones que arrancan solas en la vista previa
setTimeout(()=>demoDq(),9000);setTimeout(()=>demoPrep(),11000);setTimeout(()=>{if(U.s==="idle")demoUpd("idle")},9000);
