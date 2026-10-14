// Novedades y asistente de bienvenida
// --- Novedades y asistente de bienvenida ---
function openNews(){const cv='<div class="cv">'+CLH.split('<div class="cv">')[1];modal(hdr(null,"Novedades de Nova Launcher "+VER,"Esto es lo que trae esta versión")+`<div class="cl" style="max-height:min(56vh,460px)">${cv}</div><div class="acts"><button class="btn pr" data-x>Entendido</button></div>`,"wide")}
function openWizard(){const api=A||DA;let st=0;const W={ld:sel.ld||"Vanilla",mc:sel.mc,type:sel.type};
const themes=SC.find(s=>s.id==="apar").rows.find(r=>r.k==="theme").o;
const dots=()=>`<div class="wzd">${[0,1,2,3].map(k=>`<i class="${k===st?"on":k<st?"dn":""}"></i>`).join("")}</div>`;
const B=[
()=>`<h3>1 · Tu cuenta</h3><p class="sub">Entra con Microsoft para jugar online, o crea un nombre offline para empezar ya.</p><div id="wza">${accHtml()}</div>`,
()=>{const m=SYS.total||16,r=rec();return`<h3>2 · Memoria RAM</h3><p class="sub">Tu PC tiene ${m} GB. Lo recomendado son ${r} GB (la mitad): más no siempre va mejor.</p><div class="rr" style="margin:16px 0"><input type="range" id="wzr" min="1" max="${m}" value="${Math.min(m,cfg.ram||r)}"><b id="wzv"></b></div><button class="btn sm" id="wzu">Usar recomendado (${r} GB)</button>`},
()=>`<h3>3 · Color y tema</h3><p class="sub">Puedes cambiarlo cuando quieras en Ajustes → Apariencia.</p><div class="fr"><label>Color</label><div class="cs" id="wzc">${Object.entries(ACC).map(([k,n])=>`<div class="sw2 ${k===cfg.accent?"on":""}" style="background:${k};color:${k}" title="${n}" data-v="${k}"></div>`).join("")}</div></div><div class="fr"><label>Tema</label><div class="chips" id="wzt"></div></div>`,
()=>`<h3>4 · Tu primera versión</h3><p class="sub">Elige con qué quieres jugar. Se instalará al pulsar «Lanzar juego».</p><div class="fr"><label>Cargador</label><div class="chips" id="wzl"></div></div><div class="fr"><label>Versión</label><select id="wzs"></select></div>`];
const draw=()=>{const last=st===3;modal(`<div class="wzb">${dots()}${B[st]()}</div><div class="acts">${st?'<button class="btn" id="wzp">Atrás</button>':'<button class="btn" data-x>Omitir</button>'}${last?'<button class="btn" id="wzf">Terminar</button><button class="btn pr" id="wzg">Terminar y jugar</button>':'<button class="btn pr" id="wzn">Siguiente</button>'}</div>`);
if(st===0)$("wza").onclick=e=>accClick(e,()=>{$("wza").innerHTML=accHtml()});
if(st===1){const r=$("wzr"),v=$("wzv"),u=()=>v.textContent=r.value+" GB";u();r.oninput=u;r.onchange=()=>sv({ram:+r.value,ramSet:true});$("wzu").onclick=()=>{r.value=rec();u();sv({ram:rec(),ramSet:true})}}
if(st===2){$("wzc").onclick=e=>{const s=e.target.closest(".sw2");if(!s)return;$("wzc").querySelectorAll(".sw2").forEach(x=>x.classList.toggle("on",x===s));sv({accent:s.dataset.v}).then(applyAp)};
const t=()=>chips($("wzt"),Object.entries(themes),cfg.theme||"oscuro",k=>{sv({theme:k}).then(()=>{applyAp();t()})});t()}
if(st===3){const fill=()=>{const L=V.filter(v=>v.type==="release"&&LD[W.ld](v.id)).slice(0,80);if(!L.find(v=>v.id===W.mc)&&L.length)W.mc=L[0].id;$("wzs").innerHTML=L.map(v=>`<option ${v.id===W.mc?"selected":""}>${v.id}</option>`).join("")};
const lc=()=>chips($("wzl"),Object.keys(LD).map(k=>[k,k]),W.ld,k=>{W.ld=k;lc();fill()});lc();fill();$("wzs").onchange=e=>{W.mc=e.target.value}}
if($("wzp"))$("wzp").onclick=()=>{st--;draw()};if($("wzn"))$("wzn").onclick=()=>{st++;draw()};
const fin=async go=>{pick(W.mc,"release",W.ld);await sv({setupDone:true});closeModal();flash("¡Listo! Ya puedes jugar");if(go&&A){show("home");play()}};
if($("wzf"))$("wzf").onclick=()=>fin(false);if($("wzg"))$("wzg").onclick=()=>fin(true)};
draw()}
function startup212(){if(!A)return;if(cfg._first){sv({setupDone:true,seenVersion:VER});openWizard()}else if(cfg.seenVersion!==VER){sv({seenVersion:VER});openNews()}}
