// Idiomas: el español es el idioma base. Los demás son archivos en lang/ que traducen cada texto.
// Si el idioma es el español no hace nada. Si es otro, traduce lo que hay en pantalla y lo que aparezca después.
// Banderas en SVG (Windows no dibuja los emojis de bandera, solo las letras del país)
const FL=x=>`<svg class="flg" viewBox="0 0 30 20" aria-hidden="true">${x}</svg>`;
const vb=(a,b,c)=>`<rect width="10" height="20" fill="${a}"/><rect x="10" width="10" height="20" fill="${b}"/><rect x="20" width="10" height="20" fill="${c}"/>`;
const LANG_FLAG={
  es:FL('<rect width="30" height="20" fill="#c60b1e"/><rect y="5" width="30" height="10" fill="#ffc400"/>'),
  "es-419":FL(vb("#006847","#fff","#ce1126")+'<circle cx="15" cy="10" r="2.6" fill="#8c6a2f"/><circle cx="15" cy="10" r="1.5" fill="#3a8a4a"/>'),
  en:FL('<rect width="30" height="20" fill="#fff"/>'+[0,2,4,6,8,10,12].map(i=>`<rect y="${(i*20/13).toFixed(2)}" width="30" height="${(20/13).toFixed(2)}" fill="#b22234"/>`).join("")+'<rect width="13" height="10.77" fill="#3c3b6e"/>'+[0,1,2,3,4].flatMap(r=>[0,1,2,3,4,5].filter(c=>(r+c)%2===0||true).map(c=>(r%2?c>4:false)?"":`<circle cx="${(1.1+c*2.1+(r%2?1.05:0)).toFixed(2)}" cy="${(1.2+r*2.1).toFixed(2)}" r=".55" fill="#fff"/>`)).join("")),
  fr:FL(vb("#0055a4","#fff","#ef4135")),
  de:FL('<rect width="30" height="20" fill="#000"/><rect y="6.67" width="30" height="6.67" fill="#dd0000"/><rect y="13.33" width="30" height="6.67" fill="#ffce00"/>'),
  it:FL(vb("#009246","#fff","#ce2b37")),
  "pt-BR":FL('<rect width="30" height="20" fill="#009c3b"/><path d="M15 2 27 10 15 18 3 10Z" fill="#ffdf00"/><circle cx="15" cy="10" r="4.3" fill="#002776"/><path d="M10.9 9.2Q15 8 19.1 11.2" stroke="#fff" stroke-width=".9" fill="none"/>'),
  pt:FL('<rect width="30" height="20" fill="#d62c2c"/><rect width="12" height="20" fill="#046a38"/><circle cx="12" cy="10" r="3.7" fill="#ffd400"/><path d="M10.2 8.3h3.6v2.6a1.8 1.8 0 0 1-3.6 0Z" fill="#d62c2c" stroke="#fff" stroke-width=".5"/>')
};
const langFlag=k=>LANG_FLAG[k]||"";
const LANG_ORDER=["es","es-419","en","fr","de","it","pt-BR","pt"];
const LANG_BASE={es:"Español (España)","es-419":"Español (Latinoamérica)",en:"English (US)",fr:"Français",de:"Deutsch",it:"Italiano","pt-BR":"Português (Brasil)",pt:"Português (Portugal)"};
const LANG_NAMES=()=>[["auto","Automático (el del sistema)"],...LANG_ORDER.map(k=>[k,LANG_BASE[k]||((window.LANGS||{})[k]||{}).name]).filter(x=>x[1]),...Object.entries(window.LANGS||{}).filter(([k])=>!LANG_ORDER.includes(k)).map(([k,v])=>[k,v.name])];
const LANG_OPTS=()=>Object.fromEntries(LANG_NAMES().map(([k,n])=>[k,k==="auto"?n:langFlag(k)+n]));
let LCUR="es",LMAP=new Map(),LPAT=[],LOBS=null;
// Idioma del sistema → idioma de la app (es-ES → español, otros es-* → Latinoamérica, pt-* → portugués…)
function langSys(){
  const n=String(navigator.language||"es").toLowerCase(),b=n.slice(0,2);
  if(b==="es")return n==="es"||n==="es-es"?"es":"es-419";
  if(b==="pt")return n==="pt-br"?"pt-BR":"pt";
  return LANG_ORDER.includes(b)?b:"es";
}
function langPick(v){
  v=v||"auto";if(v==="auto")v=langSys();
  return v==="es"||!LANG_ORDER.includes(v)?"es":v;
}
function langStored(){try{return localStorage.getItem("novaLang")||"auto"}catch{return"auto"}}
function langStore(v){try{localStorage.setItem("novaLang",v||"auto")}catch{}}
const reEsc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
function trad(s){
  if(LCUR==="es"||typeof s!=="string")return s;
  const m=/^(\s*)([\s\S]*?)(\s*)$/.exec(s),core=m[2];if(!core)return s;
  let r=LMAP.get(core);
  if(r===undefined)for(const [re,v] of LPAT){const x=re.exec(core);if(x){r=v.replace(/\{(\d+)\}/g,(_,i)=>trad(x[+i]||""));break}}
  return r===undefined?s:m[1]+r+m[3];
}
const L_ATTR=["placeholder","title","aria-label","alt"],L_SKIP="#log,.cov,#pq,.lpk,input,textarea,script,style";
function trNode(n){
  if(n.nodeType===3){const p=n.parentElement;if(!p||p.closest(L_SKIP))return;if(n.__t===n.nodeValue)return;const v=trad(n.nodeValue);n.__t=v;if(v!==n.nodeValue)n.nodeValue=v;return}
  if(n.nodeType!==1||/^(SCRIPT|STYLE)$/.test(n.tagName))return;
  for(const a of L_ATTR){if(n.hasAttribute&&n.hasAttribute(a)){const o=n.getAttribute(a),v=trad(o);if(v!==o)n.setAttribute(a,v)}}
  if(n.tagName==="TEXTAREA")return;
  for(let c=n.firstChild;c;c=c.nextSibling)trNode(c);
}
function langStart(l){
  LCUR=l;LMAP=new Map();LPAT=[];
  if(l==="es")return;
  const d=window.LANGS[l].d||{};
  for(const [k,v] of Object.entries(d)){if(/\{\d+\}/.test(k))LPAT.push([new RegExp("^"+k.split(/\{\d+\}/).map(reEsc).join("([\\s\\S]+?)")+"$"),v,k.length]);else LMAP.set(k,v)}
  LPAT.sort((a,b)=>b[2]-a[2]);
  document.documentElement.lang=l;
  trNode(document.body);
  LOBS=new MutationObserver(ms=>{
    for(const m of ms){
      if(m.type==="characterData")trNode(m.target);
      else if(m.type==="attributes"){const o=m.target.getAttribute(m.attributeName),v=trad(o);if(v!==o)m.target.setAttribute(m.attributeName,v)}
      else m.addedNodes.forEach(trNode);
    }
  });
  LOBS.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:L_ATTR});
}
try{if(sessionStorage.getItem("novaSI")==="1"){sessionStorage.removeItem("novaSI");window.__skipIntro=true;document.documentElement.classList.add("ni");const i=document.getElementById("intro");i&&i.remove()}}catch{}
// Solo se carga el archivo del idioma activo (el español no necesita ninguno). El script se inserta justo después de este y se ejecuta antes de idioma-inicio.js
{const w=langPick(langStored());if(w!=="es"&&!(window.LANGS&&window.LANGS[w]))document.write('<script src="lang/'+w+'.js"><\/script>')}
// Cuando el ajuste cambia (o llega la configuración real), si el idioma no coincide, se guarda y se recarga la interfaz una sola vez.
function langSync(v,boot){
  v=v||"auto";const want=langPick(v);langStore(v);
  if(want===LCUR)return;
  if(boot){try{if(sessionStorage.getItem("novaLR")===want)return;sessionStorage.setItem("novaLR",want)}catch{}}
  location.reload();
}

// Primer arranque: si nunca se ha elegido idioma, se muestra el selector (el del sistema viene marcado)
const LANG_NATIVE=[["es","Español (España)","Continuar"],["es-419","Español (Latinoamérica)","Continuar"],["en","English (US)","Continue"],["fr","Français","Continuer"],["de","Deutsch","Weiter"],["it","Italiano","Continua"],["pt-BR","Português (Brasil)","Continuar"],["pt","Português (Portugal)","Continuar"]];
function langFirst(){
  let seen=true;try{seen=localStorage.getItem("novaLang")!==null}catch{}
  if(seen||window.__langAsk)return;window.__langAsk=true;
  const list=LANG_NATIVE;let cur=langSys();if(!list.some(x=>x[0]===cur))cur="es";
  const d=document.createElement("div");d.className="lpk";d.setAttribute("role","dialog");d.setAttribute("aria-modal","true");d.setAttribute("aria-label","Language");
  const draw=()=>{const cont=(list.find(x=>x[0]===cur)||list[0])[2];
    d.innerHTML=`<div class="lpb"><div class="lpl"><svg viewBox="0 0 120 120"><use href="#logo"/></svg></div><h2>Nova Launcher</h2><p>Idioma · Language · Langue · Sprache · Lingua</p><div class="lpg">${list.map(x=>`<button type="button" class="${x[0]===cur?"on":""}" data-l="${x[0]}">${langFlag(x[0])}<span>${x[1]}</span></button>`).join("")}</div><button type="button" class="lpc" id="lpc">${cont} →</button></div>`;};
  draw();document.body.appendChild(d);
  const go=async()=>{
    const v=cur,A=window.api;langStore(v);
    try{if(A&&A.set)await A.set({lang:v})}catch{}
    if(langPick(v)===LCUR){d.remove();return}
    try{sessionStorage.setItem("novaSI","1");sessionStorage.setItem("novaLR",langPick(v))}catch{}
    location.reload();
  };
  d.onclick=e=>{const b=e.target.closest("button");if(!b)return;if(b.id==="lpc"){go();return}if(b.dataset.l){cur=b.dataset.l;draw();const n=d.querySelector(".lpc");n&&n.focus()}};
  d.onkeydown=e=>{if(e.key==="Enter"&&!e.target.closest("[data-l]")){e.preventDefault();go()}};
  setTimeout(()=>{const b=d.querySelector(".lpc");b&&b.focus()},50);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",langFirst);else langFirst();
