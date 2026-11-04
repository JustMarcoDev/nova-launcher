// Ajustes → «Menú de Nova»: configura el mod del juego desde el launcher.
// Lee y escribe nova/menu.json (el mismo archivo que usa el mod). Si el juego está abierto, el mod lo relee al volver al menú.
// Elementos del HUD del mod: el perfil «default» se crea copiando estos del HUD de siempre
const NM_IDS = ["fps", "cps", "xyz", "keys", "state", "armor", "pots", "clock", "compass", "session"];
let NM = { cfg: {}, bgs: [], accents: [], vals: [], ok: false, prof: "default" }, nmHud = {}, nmSaveT = 0;
const nmHas = () => typeof A !== "undefined" && A && A.nmenuGet;
const nmG = (o, p, d) => { for (const k of p.split(".")) { if (o == null || typeof o !== "object") return d; o = o[k]; } return o === undefined ? d : o };
// Perfiles del HUD: «default» es el de siempre (y el que está en "hud"); cada servidor puede tener el suyo (hudProfiles + hudRules)
const nmProfs = () => { const o = NM.cfg.hudProfiles && typeof NM.cfg.hudProfiles === "object" ? NM.cfg.hudProfiles : {}; return ["default", ...Object.keys(o).filter(k => k !== "default")] };
const nmLabel = n => n === "default" ? "Predeterminado" : n;
function nmLay(p) { const hp = NM.cfg.hudProfiles && NM.cfg.hudProfiles[p]; if (hp && typeof hp === "object" && (p !== "default" || Object.keys(hp).length)) return hp; return p === "default" ? (NM.cfg.hud || {}) : {} }
function nmSetProfiles(profs, rules) { NM.cfg.hudProfiles = profs; NM.cfg.hudRules = rules; clearTimeout(nmSaveT); nmHud = {}; A.nmenuSet({ _set: { hudProfiles: profs, hudRules: rules } }).then(r => { if (!r || !r.ok) flash("No se pudo guardar el menú de Nova") }) }
const nmRe = () => { const h = $("nmenu"); if (h) { h.innerHTML = nmHtml() } };
function nmProfsObj() { const o = JSON.parse(JSON.stringify(NM.cfg.hudProfiles || {})); if (!o.default || !Object.keys(o.default).length) { const d = {}; for (const id of NM_IDS) { const j = (NM.cfg.hud || {})[id]; if (j) d[id] = { ...j } } o.default = d } return o }
const nmRulesObj = () => JSON.parse(JSON.stringify(NM.cfg.hudRules || {}));
const nmUniq = (base, o) => { let n = base, k = 2; while (n === "default" || o[n]) n = base + " " + k++; return n };
function nmProfClick(e) {
  const c = e.target.closest("[data-nmp] [data-v]"); if (c) { NM.prof = c.dataset.v; nmRe(); return true }
  const id = e.target.closest("button") && e.target.closest("button").id, rx = e.target.closest("[data-nmrx]");
  if (rx) { const r = nmRulesObj(); delete r[rx.dataset.nmrx]; nmSetProfiles(nmProfsObj(), r); nmRe(); return true }
  if (id === "nmpn") { const o = nmProfsObj(), n = nmUniq("Perfil", o); o[n] = {}; nmSetProfiles(o, nmRulesObj()); NM.prof = n; nmRe(); return true }
  if (id === "nmpd") { const o = nmProfsObj(), n = nmUniq(nmLabel(NM.prof).replace(/ \d+$/, ""), o); o[n] = JSON.parse(JSON.stringify(Object.keys(nmLay(NM.prof)).length ? nmLay(NM.prof) : (o[NM.prof] || {}))); nmSetProfiles(o, nmRulesObj()); NM.prof = n; nmRe(); return true }
  if (id === "nmprb") { const nn = ($("nmprn").value || "").replace(/["\\]/g, "").trim().slice(0, 24), o = nmProfsObj(); if (!nn || nn === "default" || (o[nn] && nn !== NM.prof)) { flash("Ese nombre no vale"); return true } if (nn !== NM.prof) { o[nn] = o[NM.prof]; delete o[NM.prof]; const r = nmRulesObj(); for (const k of Object.keys(r)) if (r[k] === NM.prof) r[k] = nn; nmSetProfiles(o, r); NM.prof = nn; nmRe() } return true }
  if (id === "nmpx") { if (!confirm("¿Borrar el perfil «" + NM.prof + "»?")) return true; const o = nmProfsObj(), r = nmRulesObj(); delete o[NM.prof]; for (const k of Object.keys(r)) if (r[k] === NM.prof) delete r[k]; nmSetProfiles(o, r); NM.prof = "default"; nmRe(); return true }
  if (id === "nmrb") { const k = ($("nmra").value || "").trim().toLowerCase(); if (!k) { flash("Escribe la dirección del servidor"); return true } const r = nmRulesObj(); r[k] = $("nmrp").value; nmSetProfiles(nmProfsObj(), r); nmRe(); return true }
  return false
}
function nmProfHtml() {
  const L = nmProfs(), rules = NM.cfg.hudRules && typeof NM.cfg.hudRules === "object" ? NM.cfg.hudRules : {}, sel = L.includes(NM.prof) ? NM.prof : "default";
  const opts = v => L.map(n => `<option value="${esc(n)}" ${n === v ? "selected" : ""}>${esc(nmLabel(n))}</option>`).join("");
  return `<div class="o" style="display:block"><b style="display:block;margin-bottom:4px">Perfiles del HUD</b><span style="color:var(--m);font-size:12px;display:block;margin-bottom:8px">Cada servidor puede tener su propia distribución. Al entrar en un servidor se aplica su perfil y, al salir, el predeterminado. Los perfiles son los mismos que en el juego (Editar HUD → Perfiles).</span>
<div class="chips" data-nmp="sel">${L.map(n => `<button class="chip ${n === sel ? "on" : ""}" data-v="${esc(n)}">${esc(nmLabel(n))}</button>`).join("")}</div>
<div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0"><button class="btn sm" id="nmpn">Nuevo</button><button class="btn sm" id="nmpd">Duplicar</button>${sel !== "default" ? `<input id="nmprn" maxlength="24" value="${esc(sel)}" style="width:150px"><button class="btn sm" id="nmprb">Renombrar</button><button class="btn sm dg" id="nmpx">Borrar</button>` : ""}</div>
<b style="display:block;margin:6px 0 4px;font-size:12px">Servidores con perfil</b>
${Object.keys(rules).length ? Object.keys(rules).map(k => `<div style="display:flex;gap:8px;align-items:center;margin-bottom:4px"><span style="flex:1;font-size:12px;overflow:hidden;text-overflow:ellipsis">${esc(k === "singleplayer" ? "Un jugador" : k)}</span><select data-nmrule="${esc(k)}">${opts(rules[k])}</select><button class="btn sm" data-nmrx="${esc(k)}">Quitar</button></div>`).join("") : '<span style="color:var(--m);font-size:12px">Ninguno todavía.</span>'}
<div style="display:flex;gap:8px;margin-top:6px"><input id="nmra" maxlength="120" placeholder="play.ejemplo.com o singleplayer" style="flex:1"><select id="nmrp">${opts(sel)}</select><button class="btn sm" id="nmrb">Añadir</button></div></div>`
}
function nmSave(patch) {
  // junta el cambio en lo que ya se tiene y lo manda al main un instante después (así arrastrar no escribe el archivo cien veces)
  const m = (a, b) => { for (const k of Object.keys(b)) { if (b[k] && typeof b[k] === "object") { a[k] = m(a[k] && typeof a[k] === "object" ? a[k] : {}, b[k]) } else a[k] = b[k] } return a };
  m(NM.cfg, patch); nmHud = m(nmHud, patch); clearTimeout(nmSaveT);
  nmSaveT = setTimeout(() => { const p = nmHud; nmHud = {}; A.nmenuSet(p).then(r => { if (!r || !r.ok) flash("No se pudo guardar el menú de Nova") }) }, 250);
}
function nmTg(k, t, d, v) { return `<div class="o"><div class="ot"><b>${t}</b><span>${d}</span></div><label class="tg"><input type="checkbox" data-nm="${k}" ${v ? "checked" : ""}><i></i></label></div>` }
function nmHtml() {
  const c = NM.cfg, bg = nmG(c, "bg", "hole"), ac = (nmG(c, "accent", NM.vals[0]) | 0);
  return `<div class="o" style="display:block"><b style="display:block;margin-bottom:4px">Fondo del menú</b><div class="chips" data-nmc="bg">${NM.bgs.map(b => `<button class="chip ${b.id === bg ? "on" : ""}" data-v="${esc(b.id)}">${esc(b.name)}</button>`).join("")}</div>
<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:8px"><button class="btn sm" id="nmbga">+ Añadir fondo…</button><span style="color:var(--m);font-size:12px">Una imagen o un vídeo tuyo (png, jpg, webp, gif, mp4, webm, mov o mkv)</span></div></div>
<div class="o" style="display:block"><b style="display:block;margin-bottom:6px">Color de los botones</b><div class="cs" data-nmc="accent">${NM.accents.map((h, i) => `<div class="sw2 ${NM.vals[i] === ac ? "on" : ""}" style="background:${h};color:${h}" data-v="${NM.vals[i]}"></div>`).join("")}</div></div>
${nmTg("hud.zoom.on", "Zoom con tecla", "Mantén la tecla (C de fábrica) para acercar la vista; la tecla se cambia en el juego, en «Editar HUD»", nmG(c, "hud.zoom.on", true))}
${nmTg("chat.time", "Chat: hora", "Pone [HH:mm] delante de cada mensaje", nmG(c, "chat.time", false))}
${nmTg("chat.copy", "Chat: copiar mensajes", "Clic derecho sobre un mensaje para copiarlo", nmG(c, "chat.copy", false))}
${nmTg("chat.search", "Chat: buscador", "Un buscador en el chat abierto que filtra el historial", nmG(c, "chat.search", false))}
${nmTg("chat.mention", "Chat: menciones", "Resalta y suena suave cuando alguien dice tu nombre", nmG(c, "chat.mention", false))}
${nmTg("showCape", "Capa de Nova", "Los jugadores con Nova llevan una capa de Nova", nmG(c, "showCape", true))}
${nmTg("toasts", "Avisos del launcher en el juego", "Descarga terminada, actualización lista y copia de seguridad hecha aparecen 5 s en una esquina", nmG(c, "toasts", true))}
${nmTg("showNova", "Mostrar que uso Nova", "Los demás con Nova ven el logo junto a tu nombre", nmG(c, "showNova", true))}
${nmTg("move.freelook.on", "Freelook", "Mantén una tecla (Alt de fábrica) para mirar alrededor sin girar al jugador", nmG(c, "move.freelook.on", false))}
${nmTg("move.sprint.on", "Sprint fijo", "Una pulsación activa el sprint y otra lo desactiva", nmG(c, "move.sprint.on", false))}
${nmTg("move.crouch.on", "Agacharse fijo", "Una pulsación te agacha y otra te levanta", nmG(c, "move.crouch.on", false))}
${nmTg("acc.launcher", "Accesibilidad: usar la del launcher", "El launcher copia aquí su tamaño de texto, alto contraste y reducir animaciones al lanzar el juego", nmG(c, "acc.launcher", false))}
<div class="o" style="display:block"><b style="display:block;margin-bottom:4px">Accesibilidad del menú de Nova</b><span style="color:var(--m);font-size:12px;display:block;margin-bottom:8px">Afecta a todas las pantallas del mod y al HUD. Si «usar la del launcher» está activado, estos valores se sustituyen al lanzar.</span>
<label style="display:flex;gap:10px;align-items:center;margin-bottom:6px">Escala del texto <input type="range" min="80" max="150" step="10" value="${nmG(c, "acc.text", 100)}" data-nmr="acc.text" style="flex:1"><b id="nmtv">${nmG(c, "acc.text", 100)}%</b></label>
${nmTg("acc.contrast", "Alto contraste", "Fondos opacos, bordes y texto en blanco puro", nmG(c, "acc.contrast", false))}
${nmTg("acc.motion", "Reducir movimiento", "Sin animaciones y con el fondo como imagen fija del primer fotograma", nmG(c, "acc.motion", false))}</div>
<div class="o" style="display:block"><b style="display:block;margin-bottom:4px">Modo FPS: objetivo</b><span style="color:var(--m);font-size:12px;display:block;margin-bottom:8px">El Modo FPS sube o baja los recortes (distancias, partículas, nubes…) para acercarse a este número de FPS. No es una garantía: si el equipo no llega, el juego lo dice.</span><div class="chips" data-nmc="fpsgoal">${[30, 60, 90, 120, 144].map(g => `<button class="chip ${g === nmG(c, "fps.goal", 60) ? "on" : ""}" data-v="${g}">${g}</button>`).join("")}</div></div>
${nmProfHtml()}`
}
async function nmInit() {
  const h = $("nmenu"); if (!h) return;
  if (!nmHas()) { h.innerHTML = `<div class="o"><div class="ot"><b>Menú de Nova</b><span>Solo en la app instalada</span></div></div>`; return }
  try { const r = await A.nmenuGet(); NM = { ...NM, cfg: r.cfg || {}, bgs: r.bgs || [], accents: r.accents || [], vals: r.accentVals || [], ok: true } } catch { h.innerHTML = `<div class="o"><div class="ot"><b>Menú de Nova</b><span>No se pudo leer menu.json</span></div></div>`; return }
  h.innerHTML = nmHtml();
  if (h.dataset.on) return; h.dataset.on = "1";
  h.addEventListener("change", e => { const t = e.target, k = t.dataset.nm; if (!k) return; const p = {}; let o = p; const a = k.split("."); a.forEach((q, i) => { o[q] = i === a.length - 1 ? t.checked : (o[q] = {}) , o = o[q] }); nmSave(p) });
  h.addEventListener("input", e => { const t = e.target; if (t.dataset && t.dataset.nmr) { const v = Math.max(80, Math.min(150, +t.value || 100)); const tv = $("nmtv"); if (tv) tv.textContent = v + "%"; nmSave({ acc: { text: v } }) } });
  h.addEventListener("change", e => { const t = e.target; if (t.dataset && t.dataset.nmrule) { const r = nmRulesObj(); r[t.dataset.nmrule] = t.value; nmSetProfiles(nmProfsObj(), r) } });
  h.addEventListener("click", async e => {
    if (nmProfClick(e)) return;
    const c = e.target.closest("[data-nmc] [data-v]"); if (c) { const k = c.parentElement.dataset.nmc, raw = c.dataset.v; if (k === "bg") setTimeout(fondoSync, 700); nmSave(k === "fpsgoal" ? { fps: { goal: +raw } } : { [k]: k === "accent" ? +raw : raw }); c.parentElement.querySelectorAll("[data-v]").forEach(x => x.classList.toggle("on", x === c)); return }
    const id = e.target.closest("button") && e.target.closest("button").id;
    if (id === "nmbga") {   // elegir una imagen o un vídeo y dejarlo como fondo del menú del juego (el mod lo convierte solo)
      const b = e.target.closest("button"); b.disabled = true;
      try {
        const r = await A.nmenuAddBg();
        if (r && r.added && r.added.length) {
          const g = await A.nmenuGet(); NM.bgs = g.bgs || NM.bgs;
          nmSave({ bg: "f:" + r.added[0] }); setTimeout(fondoSync, 700); nmRe();
          flash(r.added.length > 1 ? "Fondos añadidos; el primero ya está elegido" : "Fondo añadido y elegido");
        }
      } catch (er) { flash(em(er)) } finally { b.disabled = false }
    }
  });
}
