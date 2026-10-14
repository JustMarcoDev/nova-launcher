// Limpieza de espacio: versiones y librerías sin uso, copias y registros viejos
function fB(b){b=+b||0;return b>=1073741824?(b/1073741824).toFixed(2)+" GB":b>=1048576?(b/1048576).toFixed(1)+" MB":Math.max(0,Math.round(b/1024))+" KB"}
async function demoClean(){await new Promise(r=>setTimeout(r,600));return{running:false,cats:[
 {id:"versions",title:"Versiones de Minecraft sin uso",desc:"Versiones y cargadores que ninguna instancia usa. Se descargan otra vez si los necesitas.",count:3,size:612e6,sample:["1.8.9","1.16.5","fabric-loader-0.14.0-1.19.4"]},
 {id:"libs",title:"Librerías sin uso",desc:"Archivos de versiones antiguas de librerías que ya no necesita ninguna versión instalada.",count:41,size:186e6,sample:["org/lwjgl/lwjgl/3.2.2","com/google/guava/guava/21.0"]},
 {id:"backups",title:"Copias de seguridad antiguas",desc:"Copias de más de 30 días (se conservan las 2 últimas de cada instancia) y las de instancias ya borradas.",count:6,size:340e6,sample:["20260801-100000__antes-de-actualizar-mods.zip"]},
 {id:"logs",title:"Registros e informes de fallos viejos",desc:"Registros del launcher de más de 14 días (se conservan los 5 últimos) e informes de fallos de más de 30 días.",count:17,size:4.2e6,sample:["2026-08-01-10-00-00_Fabric.log"]},
 {id:"temp",title:"Archivos temporales",desc:"Restos de instalaciones y de la preparación en segundo plano.",count:0,size:0,sample:[]}]}}
async function openClean(){
  modal(hdr(null,"Limpieza de espacio","Busca lo que ya no usa ninguna instancia")+`<div class="cll" id="cll"><div class="dgw"><i class="spn"></i>Buscando archivos que ya no hacen falta…</div></div><div class="acts"><button class="btn" data-x>Cerrar</button><button class="btn pr" id="clg" disabled>Liberar espacio</button></div>`,"wide");
  let r;try{r=A?await A.cleanScan():await demoClean()}catch(e){if($("cll"))$("cll").innerHTML=`<div class="dgw">${esc(em(e))}</div>`;return}
  if(!$("cll"))return;
  const tot=r.cats.reduce((a,c)=>a+c.size,0);
  if(!tot){$("cll").innerHTML=`<div class="dgs ok">Todo limpio: no hay nada que borrar</div>`;return}
  $("cll").innerHTML=(r.running?`<div class="dgs w2">Minecraft está abierto: ciérralo para poder limpiar</div>`:"")+r.cats.map(c=>`<label class="clr ${c.size?"":"emp"}"><input type="checkbox" data-c="${c.id}" ${c.size&&!r.running?"checked":"disabled"}><div class="clt"><b>${esc(c.title)}</b><span>${esc(c.desc)}</span>${c.sample.length?`<em>${c.sample.map(esc).join(" · ")}${c.count>c.sample.length?" …":""}</em>`:""}</div><div class="cls"><b>${fB(c.size)}</b><span>${c.count} ${c.count===1?"elemento":"elementos"}</span></div></label>`).join("");
  const upd=()=>{const ids=[...$("cll").querySelectorAll("input:checked")].map(x=>x.dataset.c),s=r.cats.filter(c=>ids.includes(c.id)).reduce((a,c)=>a+c.size,0);$("clg").textContent=ids.length?"Liberar "+fB(s):"Liberar espacio";$("clg").disabled=!ids.length||r.running;return ids};
  $("cll").onchange=upd;upd();
  $("clg").onclick=async()=>{
    const ids=upd();if(!ids.length)return;const b=$("clg");b.disabled=true;b.textContent="Limpiando…";
    try{const x=A?await A.cleanRun(ids):{freed:r.cats.filter(c=>ids.includes(c.id)).reduce((a,c)=>a+c.size,0),count:ids.length};closeModal();flash("Espacio liberado: "+fB(x.freed));if($("set").classList.contains("on"))buildSet()}catch(e){b.disabled=false;flash(em(e))}
  };
}
