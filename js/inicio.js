// Arranque: se ejecuta el último, cuando ya existe todo lo demás
// Aviso remoto (nova-config.json firmado): sale en Inicio una sola vez por id
function avisoRemoto(o){try{const b=$("avb");if(!b||!o)return;let t="",lv="info",id="";if(o.aviso){t=o.aviso.texto;lv=o.aviso.nivel;id="a:"+o.aviso.id}else if(o.launcherViejo){t="Hay una versión nueva del launcher: actualízalo desde Ajustes.";lv="aviso";id="v:"+VER}else return;
let seen=[];try{seen=JSON.parse(localStorage.getItem("nova.avisosVistos")||"[]")}catch{}if(seen.includes(id))return;seen.push(id);try{localStorage.setItem("nova.avisosVistos",JSON.stringify(seen.slice(-50)))}catch{}
$("avt").textContent=trad(t);b.className="avb "+lv;b.hidden=false;$("avx").onclick=()=>{b.hidden=true}}catch{}}
if(A&&A.cfgRemote){A.on("cfg:remote",avisoRemoto);setTimeout(()=>{A.cfgRemote().then(avisoRemoto).catch(()=>{})},2500)}

// Eventos
if(A){A.on("shot:new",()=>{try{if(SHOTRL)SHOTRL();if($("sta").classList.contains("on"))statsOpen()}catch{}});A.on("bk:auto",o=>{try{flash("Copia de seguridad hecha · "+o.name)}catch{}});A.on("nav",p=>{try{show(p)}catch{}});A.on("acc:switched",r=>{try{applyAccs(r);accAnim()}catch{}});A.on("upd:state",setU);A.on("discord:state",setD);A.on("status",t=>{$("st").textContent=t;if(busyBtn&&t)busyBtn.textContent=t.replace(/^Modpack: /,"").slice(0,24)});A.on("crash",showCrash);A.on("progress",p=>{$("pb").style.width=p&&p.total?Math.round(p.task/p.total*100)+"%":"0"});
A.on("running",n=>{RUN=!!n;if(n&&cfg.conOpen!==false){try{show("con")}catch{}}gameMode(!!n);if(!n){setTimeout(autoInst,1500);loadI();}dirty=40;const r=$("rn");r.classList.toggle("on",!!n);r.querySelector("span").textContent=n?"1 instancia en ejecución":"0 instancias en ejecución"});
A.on("log",t=>{conAdd(t)})}
(async()=>{if(A){cfg={...cfg,...await A.cfg()};langSync(cfg.lang,true);try{SYS=await A.sys()}catch{}try{const r=await A.versions();V=r.v||r;vsrc=r.src||"mojang"}catch{vsrc="error"}try{VER=await A.ver()}catch{}try{setU(await A.updGet())}catch{}try{setD(await A.discordGet())}catch{}if(cfg.last)sel=cfg.last;if(cfg.lowRam&&!cfg.lowDone)await sv({...ECO,lowRam:true,lowDone:true})}await ramInit();if(A)loadLoaders();fillCfg();acc();rv();await loadI();head();news();setTimeout(startup212,window.__skipIntro?900:Math.max(500,5300-performance.now()))})();
if(A)setTimeout(()=>prepSoon(),9000);
