// Limpieza de espacio: versiones y librerías sin uso, copias y registros viejos
function fB(b){b=+b||0;return b>=1073741824?(b/1073741824).toFixed(2)+" GB":b>=1048576?(b/1048576).toFixed(1)+" MB":Math.max(0,Math.round(b/1024))+" KB"}
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
