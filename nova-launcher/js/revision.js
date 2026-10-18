// Revisión de mods antes de jugar: ventana con lo que se ha encontrado y qué hacer
function revModal(id,r){return new Promise(res=>{
  const ins=I.find(x=>x.id===id)||{name:""};let done=false;
  const fin=v=>{if(done)return;done=true;pickRes=null;closeModal();res(v)};
  const items=r.problems.map(p=>{
    let t,h="";
    if(p.t==="loader"){t=p.name+" no funciona con "+p.ld;h="Es un mod de "+p.has}
    else if(p.t==="mc")t=p.name+" es para la "+p.mc+" y tu instancia es la "+p.now;
    else t=p.name+" no es compatible con "+p.other;
    return `<div class="dgs w2"><span>${esc(t)}</span>${h?`<small class="hint">${esc(h)}</small>`:""}<small class="hint">${esc(p.file)}</small></div>`}).concat(
    r.missing.map(m=>`<div class="dgs w2"><span>${esc(m.by.join(", ")+" necesita "+(m.name||"una dependencia")+", que no está instalado")}</span></div>`));
  const dis=[...new Set(r.problems.map(p=>p.file))];
  const d=modal(hdr(null,"Revisión de mods","Antes de jugar con «"+esc(ins.name)+"»")+`<p class="sub" style="margin-bottom:10px">Estos mods pueden dar problemas o impedir que el juego abra. Tú decides qué hacer.</p><div style="max-height:min(46vh,380px);overflow:auto">${items.join("")}</div>
  <div class="acts"><button class="btn" data-x>Cancelar</button><button class="btn" id="rvp">Jugar igualmente</button>${r.missing.length?`<button class="btn ${dis.length?"":"pr"}" id="rvi">Instalar lo que falta</button>`:""}${dis.length?`<button class="btn pr" id="rvd">Desactivar los problemáticos y jugar</button>`:""}</div>`);
  pickRes=v=>fin(v===null?"cancel":v);
  d.querySelectorAll("[data-x]").forEach(b=>b.onclick=()=>fin("cancel"));
  $("rvp").onclick=()=>fin("play");
  if($("rvd"))$("rvd").onclick=async()=>{const b=$("rvd");b.disabled=true;let n=0;for(const f of dis){try{await A.modsToggle({id,file:f});n++}catch(e){flash(em(e))}}if(n)flash("Mods desactivados: "+n);fin("play")};
  if($("rvi"))$("rvi").onclick=async()=>{const b=$("rvi");b.disabled=true;b.textContent="Instalando…";try{const x=await A.modsBundle({id,slugs:r.missing.map(m=>m.pid)});if(x&&x.failed&&x.failed.length)flash("No se pudo instalar: "+x.failed.length);fin("again")}catch(e){flash(em(e));b.disabled=false;b.textContent="Instalar lo que falta"}};
})}
