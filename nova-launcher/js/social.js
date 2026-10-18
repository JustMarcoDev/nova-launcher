// Discord y redes
// ===== Discord (0.2.6) =====
// ===== Redes del creador =====
// Para activar una red, pon su enlace en "u" (por ejemplo u:"https://www.youtube.com/@tucanal"). Si está vacío se muestra como «Próximamente».
const SOC=[{n:"YouTube",i:"b-youtube",c:"#FF0033",u:""},{n:"Twitch",i:"b-twitch",c:"#9146FF",u:""},{n:"Instagram",i:"b-instagram",c:"#E4405F",u:""},{n:"GitHub",i:"b-github",c:"#C9D1D9",u:""},{n:"Web",i:"i-globe",c:"#4FA8FF",u:""}];
function renderSoc(){$("sg").innerHTML=SOC.map((r,k)=>`<button class="sk${r.u?"":" off"}" data-k="${k}" style="--i:${k};--b:${r.c}"><div class="si"><svg class="ic"><use href="#${r.i}"/></svg></div><div><b>${r.n}</b>${r.u?"<span>Abrir</span>":"<em>Próximamente</em>"}</div></button>`).join("");
$("sg").querySelectorAll(".sk").forEach(b=>b.onclick=()=>{const r=SOC[b.dataset.k];if(!r.u)return;A&&A.open?A.open(r.u):window.open(r.u,"_blank")})}
renderSoc();
