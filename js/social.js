// Discord y redes
// ===== Discord (0.2.6) =====
let DS={s:"off"};
function dlabel(){switch(DS.s){case"on":return"Conectado"+(DS.user?" como "+DS.user:"")+" ✓";case"connecting":return"Conectando…";case"noid":return"Falta el ID de aplicación";case"error":return(DS.msg||"No se pudo conectar")+" · reintentando";default:return A?"Desactivado":"Solo funciona en la app instalada"}}
function setD(o){DS=o||{s:"off"};const m=$("dscm");if(m)m.textContent=dlabel()}
// ===== Redes del creador =====
// Para activar una red, pon su enlace en "u" (por ejemplo u:"https://www.youtube.com/@tucanal"). Si está vacío se muestra como «Próximamente».
const SOC=[{n:"YouTube",i:"b-youtube",c:"#FF0033",u:""},{n:"Twitch",i:"b-twitch",c:"#9146FF",u:""},{n:"TikTok",i:"b-tiktok",c:"#25F4EE",u:""},{n:"Instagram",i:"b-instagram",c:"#E4405F",u:""},{n:"X (Twitter)",i:"b-x",c:"#E7E9EA",u:""},{n:"Discord",i:"b-discord",c:"#5865F2",u:""},{n:"GitHub",i:"b-github",c:"#C9D1D9",u:""},{n:"Web",i:"i-globe",c:"#4FA8FF",u:""}];
function renderSoc(){$("sg").innerHTML=SOC.map((r,k)=>`<button class="sk${r.u?"":" off"}" data-k="${k}" style="--i:${k};--b:${r.c}"><div class="si"><svg class="ic"><use href="#${r.i}"/></svg></div><div><b>${r.n}</b>${r.u?"<span>Abrir</span>":"<em>Próximamente</em>"}</div></button>`).join("");
$("sg").querySelectorAll(".sk").forEach(b=>b.onclick=()=>{const r=SOC[b.dataset.k];if(!r.u)return;A&&A.open?A.open(r.u):window.open(r.u,"_blank")})}
renderSoc();
setTimeout(()=>{if(!A&&U.s==="idle")demoUpd("idle")},9000);
