// Arranque: se ejecuta el último, cuando ya existe todo lo demás
// Eventos
if(A){A.on("upd:state",setU);A.on("discord:state",setD);A.on("status",t=>{$("st").textContent=t;if(busyBtn&&t)busyBtn.textContent=t.replace(/^Modpack: /,"").slice(0,24)});A.on("crash",showCrash);A.on("progress",p=>{$("pb").style.width=p&&p.total?Math.round(p.task/p.total*100)+"%":"0"});
A.on("running",n=>{RUN=!!n;if(!n){setTimeout(autoInst,1500);loadI();const lg=$("log");lg.style.display="none";lg.textContent=""}dirty=40;const r=$("rn");r.classList.toggle("on",!!n);r.querySelector("span").textContent=n?"1 instancia en ejecución":"0 instancias en ejecución"});
A.on("log",t=>{conAdd(t);if(cfg.showLog===false)return;const l=$("log");l.style.display="block";l.textContent=(l.textContent+t).slice(-12000);l.scrollTop=1e9})}
(async()=>{if(A){cfg={...cfg,...await A.cfg()};langSync(cfg.lang,true);try{SYS=await A.sys()}catch{}try{const r=await A.versions();V=r.v||r;vsrc=r.src||"mojang"}catch{vsrc="error"}try{VER=await A.ver()}catch{}try{setU(await A.updGet())}catch{}try{setD(await A.discordGet())}catch{}if(cfg.last)sel=cfg.last;tf="all"}await ramInit();if(A)loadLoaders();fillCfg();mchips();acc();rv();await loadI();head();news();setTimeout(startup212,Math.max(500,5300-performance.now()))})();
if(!A)setTimeout(()=>demoDq(),9000);
