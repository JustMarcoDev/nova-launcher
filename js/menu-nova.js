// Ajustes → «Menú de Nova»: configura el mod del juego desde el launcher.
// Lee y escribe nova/menu.json (el mismo archivo que usa el mod). Si el juego está abierto, el mod lo relee al volver al menú.
// El editor del HUD guarda las mismas posiciones relativas que el mod: x, y = fracción del espacio libre de la pantalla, s = tamaño.
const NM_EL = [
  { id: "fps", n: "FPS", w: 46, h: 12, d: { on: true, x: .010, y: .020, s: 1 }, txt: ["120 FPS"] },
  { id: "cps", n: "CPS", w: 52, h: 22, d: { on: true, x: .010, y: .085, s: 1 }, txt: ["CPS: 6 | 4"] },
  { id: "xyz", n: "Coords", w: 100, h: 28, d: { on: true, x: .010, y: .150, s: 1 }, txt: ["XYZ: 120 64 -35", "Mirando: +X"] },
  { id: "keys", n: "Teclas", w: 58, h: 72, d: { on: true, x: .010, y: .420, s: 1 }, keys: true },
  { id: "state", n: "Estado", w: 70, h: 25, d: { on: false, x: .010, y: .600, s: 1 }, txt: ["Sprint fijo", "Agachado fijo"] }
];
const NM_GUI = [640, 360]; // pantalla de 1080p con GUI x3: las medidas del mod están en estos píxeles
let NM = { cfg: {}, bgs: [], accents: [], vals: [], shot: null, ok: false }, nmHud = {}, nmSaveT = 0;
const nmHas = () => typeof A !== "undefined" && A && A.nmenuGet;
const nmG = (o, p, d) => { for (const k of p.split(".")) { if (o == null || typeof o !== "object") return d; o = o[k]; } return o === undefined ? d : o };
function nmEl(id) { const e = NM_EL.find(x => x.id === id), j = nmG(NM.cfg, "hud." + id, {}); return { on: j.on === undefined ? e.d.on : !!j.on, x: j.x === undefined ? e.d.x : j.x, y: j.y === undefined ? e.d.y : j.y, s: j.s === undefined ? 1 : j.s } }
function nmSave(patch) {
  // junta el cambio en lo que ya se tiene y lo manda al main un instante después (así arrastrar no escribe el archivo cien veces)
  const m = (a, b) => { for (const k of Object.keys(b)) { if (b[k] && typeof b[k] === "object") { a[k] = m(a[k] && typeof a[k] === "object" ? a[k] : {}, b[k]) } else a[k] = b[k] } return a };
  m(NM.cfg, patch); nmHud = m(nmHud, patch); clearTimeout(nmSaveT);
  nmSaveT = setTimeout(() => { const p = nmHud; nmHud = {}; A.nmenuSet(p).then(r => { if (!r || !r.ok) flash("No se pudo guardar el menú de Nova") }) }, 250);
}
function nmTg(k, t, d, v) { return `<div class="o"><div class="ot"><b>${t}</b><span>${d}</span></div><label class="tg"><input type="checkbox" data-nm="${k}" ${v ? "checked" : ""}><i></i></label></div>` }
function nmHtml() {
  const c = NM.cfg, bg = nmG(c, "bg", "hole"), ac = (nmG(c, "accent", NM.vals[0]) | 0);
  return `<div class="o" style="display:block"><b style="display:block;margin-bottom:4px">Fondo del menú</b><div class="chips" data-nmc="bg">${NM.bgs.map(b => `<button class="chip ${b.id === bg ? "on" : ""}" data-v="${esc(b.id)}">${esc(b.name)}</button>`).join("")}</div></div>
<div class="o" style="display:block"><b style="display:block;margin-bottom:6px">Color de los botones</b><div class="cs" data-nmc="accent">${NM.accents.map((h, i) => `<div class="sw2 ${NM.vals[i] === ac ? "on" : ""}" style="background:${h};color:${h}" data-v="${NM.vals[i]}"></div>`).join("")}</div></div>
${nmTg("hud.zoom.on", "Zoom con tecla", "Mantén la tecla (C de fábrica) para acercar la vista; la tecla se cambia en el juego, en «Editar HUD»", nmG(c, "hud.zoom.on", true))}
${nmTg("chat.time", "Chat: hora", "Pone [HH:mm] delante de cada mensaje", nmG(c, "chat.time", false))}
${nmTg("chat.copy", "Chat: copiar mensajes", "Clic derecho sobre un mensaje para copiarlo", nmG(c, "chat.copy", false))}
${nmTg("chat.search", "Chat: buscador", "Un buscador en el chat abierto que filtra el historial", nmG(c, "chat.search", false))}
${nmTg("chat.mention", "Chat: menciones", "Resalta y suena suave cuando alguien dice tu nombre", nmG(c, "chat.mention", false))}
${nmTg("showCape", "Capa de Nova", "Los jugadores con Nova llevan una capa de Nova", nmG(c, "showCape", true))}
${nmTg("showNova", "Mostrar que uso Nova", "Los demás con Nova ven el logo junto a tu nombre", nmG(c, "showNova", true))}
${nmTg("move.freelook.on", "Freelook", "Mantén una tecla (Alt de fábrica) para mirar alrededor sin girar al jugador", nmG(c, "move.freelook.on", false))}
${nmTg("move.sprint.on", "Sprint fijo", "Una pulsación activa el sprint y otra lo desactiva", nmG(c, "move.sprint.on", false))}
${nmTg("move.crouch.on", "Agacharse fijo", "Una pulsación te agacha y otra te levanta", nmG(c, "move.crouch.on", false))}
<div class="o" style="display:block"><b style="display:block;margin-bottom:4px">Editar el HUD</b><span style="color:var(--m);font-size:12px;display:block;margin-bottom:8px">Arrastra cada elemento para moverlo, tira de la esquina para cambiar su tamaño y pulsa el ojo para mostrarlo u ocultarlo. Se guarda al momento.</span>
<div id="nmcv" class="nmcv"></div>
<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn" id="nmx">Exportar…</button><button class="btn" id="nmi">Importar…</button><button class="btn" id="nmcc">Copiar código</button><button class="btn" id="nmpc">Pegar código</button><button class="btn" id="nmr">Restablecer</button></div></div>`
}
function nmCanvas() {
  const cv = $("nmcv"); if (!cv) return;
  cv.innerHTML = (NM.shot ? `<img src="${NM.shot}" draggable="false">` : `<div class="nmbg"></div>`) + NM_EL.map(e => `<div class="nme" data-e="${e.id}"><span class="nml">${e.n}</span><i class="nmh" data-h="${e.id}"></i><button class="nmv" data-t="${e.id}" title="Mostrar / ocultar">${IC("eye")}</button></div>`).join("");
  nmLayout();
}
function nmLayout() {
  const cv = $("nmcv"); if (!cv) return; const k = cv.clientWidth / NM_GUI[0];
  for (const e of NM_EL) {
    const n = cv.querySelector(`[data-e="${e.id}"]`), v = nmEl(e.id), w = e.w * v.s, h = e.h * v.s;
    n.style.width = w * k + "px"; n.style.height = h * k + "px"; n.style.left = v.x * Math.max(0, NM_GUI[0] - w) * k + "px"; n.style.top = v.y * Math.max(0, NM_GUI[1] - h) * k + "px";
    n.style.fontSize = 8 * v.s * k + "px"; n.classList.toggle("off", !v.on);
    n.querySelector(".nml").innerHTML = e.keys ? "W<br>A S D" : e.txt.map(esc).join("<br>");
  }
}
let nmDrag = null;
function nmDown(ev) {
  const cv = $("nmcv"), t = ev.target.closest("[data-t]"); if (t) { const id = t.dataset.t, v = nmEl(id); nmSave({ hud: { [id]: { on: !v.on } } }); nmLayout(); return }
  const n = ev.target.closest("[data-e]"); if (!n) return; const id = n.dataset.e, e = NM_EL.find(x => x.id === id), v = nmEl(id), r = cv.getBoundingClientRect(), k = r.width / NM_GUI[0];
  nmDrag = { id, e, resize: !!ev.target.closest("[data-h]"), x0: ev.clientX, y0: ev.clientY, v: { ...v }, k };
  ev.preventDefault(); n.setPointerCapture && n.setPointerCapture(ev.pointerId)
}
function nmMove(ev) {
  if (!nmDrag) return; const d = nmDrag, e = d.e, dx = (ev.clientX - d.x0) / d.k, dy = (ev.clientY - d.y0) / d.k;
  let s = d.v.s, x, y;
  if (d.resize) { s = Math.min(3, Math.max(.5, Math.round((d.v.s * (e.w * d.v.s + dx) / (e.w * d.v.s)) * 20) / 20)) }
  const w = e.w * s, h = e.h * s, fw = Math.max(1, NM_GUI[0] - w), fh = Math.max(1, NM_GUI[1] - h);
  if (d.resize) { x = Math.min(1, d.v.x); y = d.v.y } else { x = (d.v.x * Math.max(1, NM_GUI[0] - e.w * s) + dx) / fw; y = (d.v.y * Math.max(1, NM_GUI[1] - e.h * s) + dy) / fh }
  x = Math.round(Math.min(1, Math.max(0, x)) * 10000) / 10000; y = Math.round(Math.min(1, Math.max(0, y)) * 10000) / 10000;
  nmSave({ hud: { [d.id]: { x, y, s } } }); nmLayout()
}
function nmCode() { const o = { v: 1, hud: {}, move: {} }; for (const e of NM_EL) o.hud[e.id] = nmEl(e.id); o.hud.zoom = { on: nmG(NM.cfg, "hud.zoom.on", true) }; for (const k of ["freelook", "sprint", "crouch"]) o.move[k] = { on: !!nmG(NM.cfg, "move." + k + ".on", false) }; return "NOVAHUD1:" + btoa(unescape(encodeURIComponent(JSON.stringify(o)))) }
function nmParse(t) {
  t = String(t || "").trim(); const m = t.match(/NOVAHUD1:([A-Za-z0-9+/=]+)/); let o;
  try { o = JSON.parse(m ? decodeURIComponent(escape(atob(m[1]))) : t) } catch { return null }
  return o && typeof o === "object" && (o.hud || o.move) ? { hud: o.hud || {}, move: o.move || {} } : null
}
function nmApply(o) { nmSave({ hud: o.hud, move: o.move }); const h = $("nmenu"); if (h) { h.innerHTML = nmHtml(); nmCanvas() } }
async function nmInit() {
  const h = $("nmenu"); if (!h) return;
  if (!nmHas()) { h.innerHTML = `<div class="o"><div class="ot"><b>Menú de Nova</b><span>Solo en la app instalada</span></div></div>`; return }
  try { const r = await A.nmenuGet(); NM = { ...NM, cfg: r.cfg || {}, bgs: r.bgs || [], accents: r.accents || [], vals: r.accentVals || [], ok: true } } catch { h.innerHTML = `<div class="o"><div class="ot"><b>Menú de Nova</b><span>No se pudo leer menu.json</span></div></div>`; return }
  h.innerHTML = nmHtml(); nmCanvas();
  A.nmenuShot().then(s => { NM.shot = s; if ($("nmcv")) nmCanvas() }).catch(() => { });
  if (h.dataset.on) return; h.dataset.on = "1";
  h.addEventListener("change", e => { const t = e.target, k = t.dataset.nm; if (!k) return; const p = {}; let o = p; const a = k.split("."); a.forEach((q, i) => { o[q] = i === a.length - 1 ? t.checked : (o[q] = {}) , o = o[q] }); nmSave(p) });
  h.addEventListener("click", async e => {
    const c = e.target.closest("[data-nmc] [data-v]"); if (c) { const k = c.parentElement.dataset.nmc, raw = c.dataset.v; nmSave({ [k]: k === "accent" ? +raw : raw }); c.parentElement.querySelectorAll("[data-v]").forEach(x => x.classList.toggle("on", x === c)); return }
    const id = e.target.closest("button") && e.target.closest("button").id;
    if (id === "nmx") { const r = await A.nmenuExport(nmCode()); if (r && r.ok) flash("HUD exportado"); else if (r && !r.canceled) flash("No se pudo exportar") }
    if (id === "nmi") { const r = await A.nmenuImport(); if (!r || r.canceled) return; const o = r.ok && nmParse(r.text); if (!o) { flash("Ese archivo no es un HUD de Nova"); return } nmApply(o); flash("HUD importado") }
    if (id === "nmcc") { const t = nmCode(); try { await navigator.clipboard.writeText(t); flash("Código copiado") } catch { prompt("Copia este código:", t) } }
    if (id === "nmpc") { let t = ""; try { t = await navigator.clipboard.readText() } catch { t = prompt("Pega el código del HUD:") || "" } if (!t) return; const o = nmParse(t); if (!o) { flash("Ese código no es de un HUD de Nova"); return } nmApply(o); flash("HUD importado") }
    if (id === "nmr") { const p = { hud: {}, move: {} }; for (const el of NM_EL) p.hud[el.id] = { ...el.d }; nmApply(p) }
  });
  const cv = () => $("nmcv"); h.addEventListener("pointerdown", e => { if (cv() && cv().contains(e.target)) nmDown(e) });
  addEventListener("pointermove", nmMove); addEventListener("pointerup", () => { nmDrag = null }); addEventListener("resize", nmLayout)
}
