// Idiomas: el español es el idioma base. Los demás son archivos en lang/ que traducen cada texto.
// Si el idioma es el español no hace nada. Si es otro, traduce lo que hay en pantalla y lo que aparezca después.
const LANG_NAMES=()=>[["auto","Automático (el del sistema)"],["es","Español"],...Object.entries(window.LANGS||{}).map(([k,v])=>[k,v.name])];
const LANG_OPTS=()=>Object.fromEntries(LANG_NAMES());
let LCUR="es",LMAP=new Map(),LPAT=[],LOBS=null;
function langPick(v){
  v=v||"auto";if(v==="auto"){const n=String(navigator.language||"es").slice(0,2).toLowerCase();v=window.LANGS&&window.LANGS[n]?n:"es"}
  return v==="es"||!(window.LANGS&&window.LANGS[v])?"es":v;
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
const L_ATTR=["placeholder","title","aria-label","alt"],L_SKIP="#log,.cov,#pq,input,textarea,script,style";
function trNode(n){
  if(n.nodeType===3){const p=n.parentElement;if(!p||p.closest(L_SKIP))return;if(n.__t===n.nodeValue)return;const v=trad(n.nodeValue);n.__t=v;if(v!==n.nodeValue)n.nodeValue=v;return}
  if(n.nodeType!==1||/^(SCRIPT|STYLE|TEXTAREA)$/.test(n.tagName))return;
  for(const a of L_ATTR){if(n.hasAttribute&&n.hasAttribute(a)){const o=n.getAttribute(a),v=trad(o);if(v!==o)n.setAttribute(a,v)}}
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
langStart(langPick(langStored()));
// Cuando el ajuste cambia (o llega la configuración real), si el idioma no coincide, se guarda y se recarga la interfaz una sola vez.
function langSync(v,boot){
  v=v||"auto";const want=langPick(v);langStore(v);
  if(want===LCUR)return;
  if(boot){try{if(sessionStorage.getItem("novaLR")===want)return;sessionStorage.setItem("novaLR",want)}catch{}}
  location.reload();
}
