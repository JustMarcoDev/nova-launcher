// Núcleo: navegación, versiones, instancias automáticas y jugar
const A=window.api||null,$=id=>document.getElementById(id);
const DEMO=[["1.21.1","release"],["1.20.1","release"],["1.16.5","release"],["1.12.2","release"],["1.8.9","release"],["25w02a","snapshot"],["b1.7.3","old_beta"],["a1.2.6","old_alpha"]].map(([id,type])=>({id,type}));
const ord=v=>v.replace(/^[ab]/,"").split(".").map(Number),gte=(v,m)=>{const a=ord(v),b=ord(m);for(let i=0;i<3;i++){const x=a[i]||0,y=b[i]||0;if(x!==y)return x>y}return true};
let LS={f:null,g:null,n:null};
const LD={Vanilla:()=>true,Fabric:v=>LS.f?LS.f.has(v):(/^\d/.test(v)&&gte(v,"1.14")),Forge:v=>/^\d/.test(v)&&gte(v,"1.12")&&(LS.g?LS.g.has(v):true),NeoForge:v=>LS.n?LS.n.has(v):(/^\d/.test(v)&&gte(v,"1.20.2"))};
const TN={all:"Todas",release:"Release",snapshot:"Snapshot",old_beta:"Beta",old_alpha:"Alpha"},PT={home:"Launchpad",vers:"Versiones",mods:"Mods",inst:"Instancias",con:"Consola",set:"Ajustes",soc:"Redes",srv:"Servidores"};
const ACC={"#2ee06f":"Verde","#4f8cff":"Azul","#8b5cff":"Violeta","#22d3ee":"Cian","#ff5fa8":"Rosa","#ff4d4d":"Rojo","#ff9f2e":"Naranja","#ffd93d":"Amarillo","#f2f4f8":"Blanco"};
let V=DEMO,sel={mc:"1.21.1",ld:"Vanilla",type:"release"},tf="release",I=[],cfg={username:"Jugador",ram:4,javaPath:"",width:1280,height:720,fullscreen:false,jvmArgs:"",closeOnLaunch:false,autoBackup:true,backupKeep:8,cfKey:"",accent:"#2ee06f",theme:"oscuro",bh:"dorado",font:"Segoe UI",tsize:100,bold:false,contrast:false,rmotion:false,quality:"alta",pauseGame:true,intro:true,ramSet:false,fontCustom:"",radius:100,panelAlpha:60,glassBlur:12,density:"normal",navW:76,focusRing:false,lsp:0,lh:145,showLog:true,reopen:true,tray:true,notify:true,channel:"estable",myServers:[],accounts:[],activeAccount:"",seenVersion:"",setupDone:false,autoUpdate:true,autoDownload:true,autoInstall:true,updPopup:true,shortcuts:true,hwaccel:true,listN:150,cb:"Ninguno",dys:false,navLabels:false,bigTargets:false,solid:false,wsp:0,discord:true,discordId:"",bhSize:100,bhSpeed:100,bhTilt:-6,stars:100,bhLens:true,bhBloom:true,bhOther:true,greet:true,showNews:true,showInst:true,showStatus:true,showAvatar:true,newsN:4,fps:60,pauseBlur:true,dlLimit:0,lang:"auto",instSort:"last",prefetch:true};
const chips=(el,items,on,fn)=>{el.innerHTML=items.map(([k,n,d])=>`<button class="chip ${k===on?"on":""} ${d?"dis":""}" data-k="${k}">${n}</button>`).join("");el.querySelectorAll("button").forEach(b=>b.onclick=e=>{e.stopPropagation();fn(b.dataset.k)})};
// Navegación
document.querySelectorAll("nav button").forEach(b=>{b.onclick=()=>show(b.dataset.p);b.setAttribute("aria-label",b.title);b.insertAdjacentHTML("beforeend",`<span class="nlb">${b.title}</span>`)});
function show(p){document.querySelectorAll(".pg,nav button").forEach(e=>e.classList.remove("on"));$(p).classList.add("on");document.querySelector(`nav [data-p=${p}]`).classList.add("on");$("pt").textContent=PT[p];$("pop").classList.remove("on");dirty=60;HR=null;if(p==="set")setTimeout(renderU,0);if(p==="vers")rv();if(p==="inst")ri();if(p==="mods"){mchips();mods()}if(p==="srv")loadSrv();if(p==="con")rcon();}
// Selección de versión (sin crear instancias a mano)
const save=()=>sv({last:sel});
function head(){$("gs").textContent=`Minecraft ${sel.mc} con ${sel.ld}`;const n=curAcc().name;$("hn").textContent=$("un").textContent=n;$("av").src="https://minotar.net/avatar/"+encodeURIComponent(n)+"/44";$("av").onerror=()=>$("av").style.display="none";
$("k1").textContent=curAcc().type==="microsoft"?"Microsoft":"Offline";$("k5").textContent=fPl(I.reduce((t,i)=>t+(i.playMs||0),0));$("k2").textContent=cfg.ram+" GB";$("k3").textContent=cfg.javaPath?"Personalizado":"Automático";$("k4").textContent=VER;rp();qi()}
function pick(mc,type,ld){sel.inst=null;sel.mc=mc;sel.type=type;if(ld)sel.ld=ld;if(!LD[sel.ld](mc))sel.ld="Vanilla";if(tf!=="all")tf=type;head();save()}
$("cp").onclick=e=>{e.stopPropagation();const p=$("pop"),on=!p.classList.contains("on");if(on){const r=$("cp").getBoundingClientRect(),below=innerHeight-r.bottom,need=Math.min(440,p.scrollHeight+30);p.classList.toggle("up",below<need&&r.top>below)}p.classList.toggle("on",on)};
addEventListener("keydown",e=>{if(e.key==="Escape"){$("pop").classList.remove("on");$("um").classList.remove("on");closeModal()}
if(cfg.shortcuts===false)return;const P=["home","vers","mods","srv","inst","con","soc","set"];
if(e.altKey&&/^[1-8]$/.test(e.key)){e.preventDefault();show(P[+e.key-1])}
if(e.ctrlKey&&e.key==="Enter"){e.preventDefault();const g=$("go");g&&!g.disabled&&g.click()}});document.addEventListener("click",e=>{if(!e.target.closest(".pop"))$("pop").classList.remove("on")});
$("pop").onclick=e=>e.stopPropagation();
function rp(){chips($("ld"),Object.keys(LD).map(k=>[k,k,!LD[k](sel.mc)]),sel.ld,k=>{sel.ld=k;head();save()});
chips($("tf"),Object.entries(TN),tf,k=>{tf=k;rp()});
const key=tf+"|"+sel.ld+"|"+sel.mc+"|"+V.length+"|"+(LS.f?1:0)+(LS.g?1:0)+(LS.n?1:0);if(key===rpK)return;rpK=key;
let list=V.filter(v=>(tf==="all"||v.type===tf)&&LD[sel.ld](v.id));if(!list.find(v=>v.id===sel.mc))list.unshift({id:sel.mc,type:sel.type});
$("ver").innerHTML=list.map(v=>`<option ${v.id===sel.mc?"selected":""}>${v.id}</option>`).join("");}
$("ver").onchange=e=>{const v=V.find(z=>z.id===e.target.value);pick(e.target.value,v?v.type:tf)};
let vlim=150,rpK="",vsrc="demo",vt;
const cnt=k=>k==="all"?V.length:V.filter(v=>v.type===k).length;
function rv(more){if(!more)vlim=+cfg.listN||150;$("vinfo").textContent=A?(vsrc==="error"?"No se pudo cargar la lista oficial. Pulsa «Recargar lista».":V.length+" versiones · "+(vsrc==="cache"?"copia guardada (sin conexión)":"lista oficial de Mojang")):"Vista previa con "+V.length+" versiones de ejemplo. La app de escritorio carga todas.";chips($("tf2"),Object.entries(TN).map(([k,n])=>[k,`${n} (${cnt(k)})`]),tf,k=>{tf=k;rv()});const q=$("vq").value.toLowerCase().trim();
const L=V.filter(v=>(tf==="all"||v.type===tf)&&v.id.toLowerCase().includes(q));
$("vl").innerHTML=L.slice(0,vlim).map(v=>`<div class="row ${v.id===sel.mc?"on":""}" data-v="${v.id}" data-t="${v.type}"><span class="n">${v.id}</span>${tf==="all"?`<span class="s">${TN[v.type]||v.type}</span>`:""}<span class="s">${Object.keys(LD).filter(k=>LD[k](v.id)).join(" · ")}</span></div>`).join("")+(L.length>vlim?`<button class="btn" id="vm" style="margin-top:10px">Mostrar más (${L.length-vlim} restantes)</button>`:"")+(L.length?"":'<div style="color:var(--m)">Sin resultados</div>')}
$("vl").onclick=e=>{if(e.target.id==="vm"){vlim+=250;rv(1);return}const r=e.target.closest(".row");if(r){pick(r.dataset.v,r.dataset.t);show("home")}};
$("vq").oninput=()=>{clearTimeout(vt);vt=setTimeout(()=>rv(),120)};
$("vre").onclick=async()=>{if(!A)return;$("vinfo").textContent="Cargando…";try{const r=await A.versions(true);V=r.v||r;vsrc=r.src||"mojang"}catch{vsrc="error"}rpK="";rp();rv();loadLoaders()};
async function loadLoaders(){const r=await Promise.allSettled([H("https://meta.fabricmc.net/v2/versions/game"),H("https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json"),H("https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge")]);
if(r[0].value)LS.f=new Set(r[0].value.map(v=>v.version));
if(r[1].value)LS.g=new Set(Object.keys(r[1].value.promos).map(k=>k.replace(/-(latest|recommended)$/,"")));
if(r[2].value)LS.n=new Set(r[2].value.versions.flatMap(v=>{const p=v.split("."),a=+p[0],b=+p[1],c=parseInt(p[2])||0;return a<26?["1."+a+(b?"."+b:"")]:[a+"."+b,a+"."+b+"."+c]}));
rpK="";rp();rv()}
// Instancias (automáticas)
async function loadI(){I=A?await A.insts():[{id:"d1",name:"Fabric 1.20.1",mc:"1.20.1",ld:"Fabric",type:"release",fav:true,tags:["Survival"],note:"Mundo con amigos, mods de optimización",playMs:18e6,lastPlayed:Date.now()-36e5},{id:"d2",name:"Vanilla 1.8.9",mc:"1.8.9",ld:"Vanilla",type:"release",tags:["Pruebas"],playMs:3e6,lastPlayed:Date.now()-864e5*3},{id:"d3",name:"Forge 1.12.2",mc:"1.12.2",ld:"Forge",type:"release",tags:["Survival","Pruebas"],note:"Modpack de magia",playMs:9e6,lastPlayed:Date.now()-864e5*9}];qi();ri()}
async function ensure(){let i=(sel.inst&&I.find(x=>x.id===sel.inst&&x.mc===sel.mc&&x.ld===sel.ld))||I.find(x=>x.mc===sel.mc&&x.ld===sel.ld&&!x.novaPack&&!x.custom);if(!i&&A){i=await A.saveInst({name:`${sel.ld} ${sel.mc}`,mc:sel.mc,ld:sel.ld,type:sel.type});await loadI()}return i}
function qi(){$("qi").innerHTML=I.length?[...I].sort((a,b)=>(!!b.fav-!!a.fav)||(b.lastPlayed||0)-(a.lastPlayed||0)).slice(0,6).map(i=>`<div class="row ${sel.inst?i.id===sel.inst:i.mc===sel.mc&&i.ld===sel.ld&&!i.novaPack&&!i.custom?"on":""}" data-i="${i.id}"><span class="n">${i.fav?"★ ":""}${i.name}</span><span class="s">${i.mc}</span></div>`).join(""):'<div style="color:var(--m)">Aún no hay instancias. Elige una versión y pulsa Lanzar juego: se crea sola.</div>';
$("qi").querySelectorAll(".row").forEach(r=>r.onclick=()=>{const i=I.find(x=>x.id===r.dataset.i);pick(i.mc,i.type||"release",i.ld);sel.inst=i.id;save();qi()})}
// Jugar
$("go").onclick=()=>play();
async function play(id){if(!A){$("st").textContent="Vista previa: instala la app de escritorio para jugar";return}$("go").disabled=true;try{const i=id?I.find(x=>x.id===id):await ensure();if(i)await A.play({id:i.id})}finally{$("go").disabled=false}}
