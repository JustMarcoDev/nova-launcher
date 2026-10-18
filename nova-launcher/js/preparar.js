// Preparar antes de jugar: al elegir una versión se descarga en segundo plano lo que falte
let prepT=0,prepMsg="";
function prepSoon(){
  if(!A||!A.prepRun||cfg.prefetch===false)return;
  clearTimeout(prepT);
  prepT=setTimeout(()=>{
    if(RUN||$("go").disabled)return;
    const i=sel.inst&&I.find(x=>x.id===sel.inst);
    A.prepRun({mc:sel.mc,ld:sel.ld,type:sel.type,loaderVersion:i&&i.loaderVersion||""}).catch(()=>{});
  },1500);
}
function prepShow(t,pct){
  if($("go").disabled)return;
  const st=$("st");st.textContent=t;prepMsg=t;
  $("pb").style.width=pct==null?"0":pct+"%";
}
function prepEvent(d){
  if(!d||$("go").disabled)return;
  if(d.state==="start")prepShow("Preparando Minecraft "+d.mc+" en segundo plano…",0);
  else if(d.state==="progress")prepShow("Preparando Minecraft "+d.mc+" · "+d.pct+"%",d.pct);
  else if(d.state==="done"){
    if(d.mc===sel.mc)prepShow("Listo: Minecraft "+d.mc+" se abrirá al instante ✓",100);
    setTimeout(()=>{if($("st").textContent===prepMsg){$("st").textContent="";$("pb").style.width="0"}},4500);
  }
  else if(d.state==="error"&&prepMsg)setTimeout(()=>{if($("st").textContent===prepMsg){$("st").textContent="";$("pb").style.width="0"}},300);
}
if(A&&A.on)A.on("prep",prepEvent);
{const _p=pick;pick=function(){const r=_p.apply(this,arguments);try{prepSoon()}catch{}return r}}
