// =====================================================================================
// Nova Launcher · main/logros-core.js
// Logros del launcher (lógica pura, sin Electron): lista de logros, métricas derivadas del historial y comprobación de cuáles se consiguen.
// Cada logro mira UNA métrica (`key`) y se consigue al llegar a `goal`. Las métricas salen de dos sitios:
//   · del historial que el launcher ya guarda (partidas, instancias, tiempo jugado…) → `derive()`
//   · de contadores de acciones (mods instalados, enlaces compartidos…) que apunta main/logros.js → `counters`
// El platino se consigue al tener todos los demás.
// =====================================================================================

// Tipos: b = bronce, s = plata, g = oro, p = platino. Los puntos son solo de adorno (se suman en la cabecera).
const TIERS = { b: { n: 'Bronce', pts: 10 }, s: { n: 'Plata', pts: 25 }, g: { n: 'Oro', pts: 50 }, p: { n: 'Platino', pts: 200 } };
const CATS = [
  ['jugar', 'Jugar'], ['inst', 'Instancias'], ['mods', 'Mods y modpacks'], ['online', 'Servidores'],
  ['media', 'Capturas'], ['estilo', 'Personalización'], ['cuidado', 'Cuidado del launcher'],
];

// [id, categoría, tipo, nombre, descripción, métrica, objetivo, secreto?]
// Por categoría: Jugar 25 · Instancias 16 · Mods y modpacks 12 · Servidores 8 · Capturas 8 · Personalización 8 · Cuidado del launcher 8 (85 + el platino).
const RAW = [
  ['j1', 'jugar', 'b', 'Primer paso', 'Lanza el juego por primera vez', 'launches', 1],
  ['j10', 'jugar', 'b', 'Ya le cojo el truco', 'Lanza el juego 10 veces', 'launches', 10],
  ['j50', 'jugar', 's', 'Habitual', 'Lanza el juego 50 veces', 'launches', 50],
  ['j100', 'jugar', 's', 'Cien arranques', 'Lanza el juego 100 veces', 'launches', 100],
  ['j200', 'jugar', 'g', 'Sin salir del launcher', 'Lanza el juego 200 veces', 'launches', 200],
  ['j500', 'jugar', 'g', 'El launcher ya me conoce', 'Lanza el juego 500 veces', 'launches', 500],
  ['h1', 'jugar', 'b', 'Calentando motores', 'Juega 1 hora en total', 'hours', 1],
  ['h10', 'jugar', 'b', 'Le voy cogiendo el gusto', 'Juega 10 horas en total', 'hours', 10],
  ['h25', 'jugar', 'b', 'Un día entero', 'Juega 25 horas en total', 'hours', 25],
  ['h50', 'jugar', 's', 'Medio centenar', 'Juega 50 horas en total', 'hours', 50],
  ['h100', 'jugar', 's', 'Cien horas', 'Juega 100 horas en total', 'hours', 100],
  ['h200', 'jugar', 'g', 'Vida propia', 'Juega 200 horas en total', 'hours', 200],
  ['h500', 'jugar', 'g', 'Leyenda del cubo', 'Juega 500 horas en total', 'hours', 500],
  ['h1000', 'jugar', 'g', 'Mil y una noches', 'Juega 1000 horas en total', 'hours', 1000],
  ['s1', 'jugar', 'b', 'Sesión larga', 'Juega una sola sesión de 1 hora', 'longest', 1],
  ['s2', 'jugar', 's', 'Maratón', 'Juega una sola sesión de 2 horas', 'longest', 2],
  ['s5', 'jugar', 'g', 'No me esperen a cenar', 'Juega una sola sesión de 5 horas', 'longest', 5],
  ['s10', 'jugar', 'g', 'Sin pausas', 'Juega una sola sesión de 10 horas', 'longest', 10],
  ['d3', 'jugar', 'b', 'Tres días seguidos', 'Juega 3 días seguidos', 'streak', 3],
  ['d7', 'jugar', 's', 'Una semana entera', 'Juega 7 días seguidos', 'streak', 7],
  ['d14', 'jugar', 'g', 'Quincena perfecta', 'Juega 14 días seguidos', 'streak', 14],
  ['d30', 'jugar', 'g', 'Mes de constancia', 'Juega en 30 días distintos', 'days', 30],
  ['d60', 'jugar', 'g', 'Dos meses de vicio', 'Juega en 60 días distintos', 'days', 60],
  ['d100', 'jugar', 'g', 'Cien días', 'Juega en 100 días distintos', 'days', 100],
  ['nt', 'jugar', 's', 'Noctámbulo', 'Empieza una partida entre las 2 y las 5 de la madrugada', 'night', 1, true],

  ['i1', 'inst', 'b', 'Mi primera instancia', 'Ten una instancia en el launcher', 'insts', 1],
  ['i3', 'inst', 'b', 'Tres son multitud', 'Ten 3 instancias a la vez', 'insts', 3],
  ['i5', 'inst', 's', 'Coleccionista de instancias', 'Ten 5 instancias a la vez', 'insts', 5],
  ['i10', 'inst', 's', 'Diez mundos', 'Ten 10 instancias a la vez', 'insts', 10],
  ['i15', 'inst', 'g', 'Almacén de mundos', 'Ten 15 instancias a la vez', 'insts', 15],
  ['i30', 'inst', 'g', 'Biblioteca infinita', 'Ten 30 instancias a la vez', 'insts', 30],
  ['lva', 'inst', 'b', 'Puro vanilla', 'Juega con Vanilla', 'ldVanilla', 1],
  ['lfa', 'inst', 'b', 'Fabricante', 'Juega con Fabric', 'ldFabric', 1],
  ['lfo', 'inst', 'b', 'Forjado a fuego', 'Juega con Forge', 'ldForge', 1],
  ['lne', 'inst', 'b', 'Neoviajero', 'Juega con NeoForge', 'ldNeoForge', 1],
  ['lal', 'inst', 'g', 'Todos los cargadores', 'Juega con Vanilla, Fabric, Forge y NeoForge', 'loaders', 4],
  ['v5', 'inst', 's', 'Viajero del tiempo', 'Juega 5 versiones distintas de Minecraft', 'versions', 5],
  ['v10', 'inst', 's', 'Cuaderno de versiones', 'Juega 10 versiones distintas de Minecraft', 'versions', 10],
  ['v15', 'inst', 'g', 'Maestro de versiones', 'Juega 15 versiones distintas de Minecraft', 'versions', 15],
  ['old', 'inst', 's', 'Nostalgia', 'Juega una versión de Minecraft anterior a la 1.14', 'oldMc', 1, true],
  ['new', 'inst', 'b', 'Mirando al futuro', 'Juega una versión 26.x de Minecraft', 'newMc', 1],

  ['m1', 'mods', 'b', 'Primer mod', 'Instala un mod desde el launcher', 'modsInstalled', 1],
  ['m10', 'mods', 'b', 'Aprendiz de modder', 'Instala 10 mods desde el launcher', 'modsInstalled', 10],
  ['m25', 'mods', 's', 'Modder', 'Instala 25 mods desde el launcher', 'modsInstalled', 25],
  ['m100', 'mods', 'g', 'Maestro de mods', 'Instala 100 mods desde el launcher', 'modsInstalled', 100],
  ['m250', 'mods', 'g', 'Mods hasta en la sopa', 'Instala 250 mods desde el launcher', 'modsInstalled', 250],
  ['p1', 'mods', 'b', 'Modpack instalado', 'Instala un modpack', 'packsInstalled', 1],
  ['p5', 'mods', 's', 'Fan de los modpacks', 'Instala 5 modpacks', 'packsInstalled', 5],
  ['sh1', 'mods', 'b', 'Compartir es vivir', 'Crea un enlace para compartir un modpack', 'packShares', 1],
  ['sh5', 'mods', 's', 'Embajador de modpacks', 'Crea 5 enlaces para compartir modpacks', 'packShares', 5],
  ['pl1', 'mods', 's', 'Del enlace a la partida', 'Instala un modpack desde un enlace', 'packLinks', 1],
  ['ex1', 'mods', 'b', 'Exportador', 'Exporta una instancia', 'exports', 1],
  ['im1', 'mods', 'b', 'Importador', 'Importa una instancia o un modpack', 'imports', 1],

  ['sv1', 'online', 'b', 'Primera conexión', 'Entra a un servidor desde el launcher', 'serverSessions', 1],
  ['sv10s', 'online', 'b', 'Visita frecuente', 'Entra 10 veces a un servidor', 'serverSessions', 10],
  ['sv50s', 'online', 'g', 'De la casa', 'Entra 50 veces a un servidor', 'serverSessions', 50],
  ['sv5', 'online', 's', 'Explorador de servidores', 'Juega en 5 servidores distintos', 'serversDistinct', 5],
  ['sv15', 'online', 'g', 'Trotamundos online', 'Juega en 15 servidores distintos', 'serversDistinct', 15],
  ['sv5h', 'online', 'b', 'Calentando en red', 'Pasa 5 horas jugando en servidores', 'serverHours', 5],
  ['sv20', 'online', 's', 'Alma de servidor', 'Pasa 20 horas jugando en servidores', 'serverHours', 20],
  ['sv100', 'online', 'g', 'Ciudadano del servidor', 'Pasa 100 horas jugando en servidores', 'serverHours', 100],

  ['sc1', 'media', 'b', 'Di «patata»', 'Haz tu primera captura de pantalla', 'shots', 1],
  ['sc10', 'media', 'b', 'Álbum en marcha', 'Ten 10 capturas', 'shots', 10],
  ['sc25', 'media', 's', 'Fotógrafo', 'Ten 25 capturas', 'shots', 25],
  ['sc100', 'media', 'g', 'Reportero', 'Ten 100 capturas', 'shots', 100],
  ['sc500', 'media', 'g', 'Archivo fotográfico', 'Ten 500 capturas', 'shots', 500],
  ['cl1', 'media', 'b', 'Acción', 'Guarda tu primer clip', 'clips', 1],
  ['cl10', 'media', 's', 'Director de cine', 'Guarda 10 clips', 'clips', 10],
  ['cl50', 'media', 'g', 'Sala de montaje', 'Guarda 50 clips', 'clips', 50],

  ['sk1', 'estilo', 'b', 'Nuevo look', 'Guarda una skin en el launcher', 'skinsSaved', 1],
  ['sk5', 'estilo', 's', 'Armario completo', 'Guarda 5 skins', 'skinsSaved', 5],
  ['st1', 'estilo', 'b', 'A tu gusto', 'Cambia un ajuste del launcher', 'settings', 1],
  ['st25', 'estilo', 's', 'Manitas', 'Cambia 25 ajustes del launcher', 'settings', 25],
  ['st100', 'estilo', 'g', 'Ingeniero de ajustes', 'Cambia 100 ajustes del launcher', 'settings', 100],
  ['lg1', 'estilo', 'b', 'Políglota', 'Cambia el idioma del launcher', 'langs', 1],
  ['bg1', 'estilo', 'b', 'Decorador', 'Añade un fondo propio al menú de Nova', 'bgAdded', 1],
  ['sm1', 'estilo', 's', 'En directo', 'Activa el overlay para streamers', 'streamerOn', 1],

  ['bn1', 'cuidado', 'b', 'Banco de pruebas', 'Haz una prueba de rendimiento', 'bench', 1],
  ['fp1', 'cuidado', 's', 'Modo FPS', 'Aplica las recomendaciones de una prueba de rendimiento', 'benchApply', 1],
  ['op1', 'cuidado', 'b', 'A toda máquina', 'Optimiza una instancia para ganar FPS', 'optimized', 1],
  ['bk1', 'cuidado', 'b', 'Previsor', 'Crea una copia de seguridad', 'backups', 1],
  ['bk10', 'cuidado', 's', 'Archivero', 'Crea 10 copias de seguridad', 'backups', 10],
  ['up1', 'cuidado', 'b', 'Siempre al día', 'Actualiza el launcher', 'updates', 1],
  ['dg1', 'cuidado', 'b', 'Doctor Nova', 'Ejecuta el diagnóstico', 'diags', 1],
  ['cn1', 'cuidado', 'b', 'Todo ordenado', 'Limpia archivos que ya no hacen falta', 'cleans', 1],
];

const DEFS = RAW.map(([id, cat, tier, name, desc, key, goal, secret]) => ({ id, cat, tier, name, desc, key, goal, secret: !!secret }));
// ===== Logros de Minecraft (solo con el menú de Nova) =====
// Son los avances normales del juego (los de «Historia», «Nether», «El End», «Aventura» y «Granja»). El launcher los lee de las partidas guardadas
// (saves/<mundo>/advancements/*.json) de las instancias con el menú de Nova. NO cuentan para el platino ni para el total de logros del launcher.
const MC_CATS = { story: 'Avance de Minecraft · Historia', nether: 'Avance de Minecraft · Nether', end: 'Avance de Minecraft · El End', adventure: 'Avance de Minecraft · Aventura', husbandry: 'Avance de Minecraft · Granja' };
// [avance (sin «minecraft:»), tipo, nombre, secreto?]. Los «secretos» son los más difíciles: no enseñan su nombre hasta conseguirlos.
const MCRAW = [
  ['story/mine_stone', 'b', 'Edad de piedra'], ['story/upgrade_tools', 'b', 'Mejorando herramientas'], ['story/smelt_iron', 'b', 'Adquirir equipo'],
  ['story/obtain_armor', 'b', 'Equípate'], ['story/lava_bucket', 'b', 'Cosa caliente'], ['story/iron_tools', 'b', '¿No es de hierro?'],
  ['story/deflect_arrow', 's', 'No hoy, gracias'], ['story/form_obsidian', 's', 'Desafío del cubo de hielo'], ['story/mine_diamond', 's', '¡Diamantes!'],
  ['story/enter_the_nether', 's', 'Debemos ir más profundo'], ['story/shiny_gear', 's', 'Cúbreme de diamantes'], ['story/enchant_item', 's', 'Encantador'],
  ['story/follow_ender_eye', 's', 'Ojo espía'], ['story/cure_zombie_villager', 'g', 'Médico zombi'], ['story/enter_the_end', 'g', '¿El final?'],
  ['nether/obtain_blaze_rod', 'b', 'Dentro del fuego'], ['nether/brew_potion', 'b', 'Barman local'], ['nether/return_to_sender', 's', 'Devolver al remitente'],
  ['nether/find_bastion', 's', 'Aquellos eran otros tiempos'], ['nether/obtain_ancient_debris', 's', 'Escondido en las profundidades'], ['nether/find_fortress', 's', 'Una terrible fortaleza'],
  ['nether/obtain_crying_obsidian', 's', '¿Quién corta cebollas?'], ['nether/distract_piglin', 's', 'Oh, brillante'], ['nether/ride_strider', 's', 'Este barco tiene patas'],
  ['nether/create_beacon', 's', 'Trae el faro a casa'], ['nether/fast_travel', 'g', 'Viaje subespacial'], ['nether/netherite_armor', 'g', 'Cúbreme de restos antiguos'],
  ['nether/summon_wither', 'g', 'Marchitando'], ['nether/uneasy_alliance', 'g', 'Alianza incómoda', true],
  ['end/kill_dragon', 'g', 'Libera el End'], ['end/enter_end_gateway', 's', 'Escapada remota'], ['end/dragon_breath', 's', 'Hay que lavarse la boca'],
  ['end/find_end_city', 's', 'La ciudad del fin del juego'], ['end/elytra', 'g', 'El cielo es el límite'], ['end/dragon_egg', 'g', 'La siguiente generación'],
  ['adventure/kill_a_mob', 'b', 'Cazador de monstruos'], ['adventure/trade', 'b', '¡Qué buen trato!'], ['adventure/honey_block_slide', 'b', 'Situación pegajosa'],
  ['adventure/ol_betsy', 'b', 'Vieja Betsy'], ['adventure/sleep_in_bed', 'b', 'Dulces sueños'], ['adventure/shoot_arrow', 'b', 'Tirador'],
  ['adventure/voluntary_exile', 's', 'Exilio voluntario'], ['adventure/throw_trident', 's', 'Un tiro certero'], ['adventure/totem_of_undying', 's', 'Posmortal'],
  ['adventure/summon_iron_golem', 's', 'Contratar refuerzos'], ['adventure/hero_of_the_village', 'g', 'Héroe de la aldea'], ['adventure/adventuring_time', 'g', 'Hora de aventuras'],
  ['adventure/kill_all_mobs', 'g', 'Monstruos cazados'], ['adventure/sniper_duel', 'g', 'Duelo de francotiradores', true], ['adventure/bullseye', 'g', 'Diana', true],
  ['adventure/avoid_vibration', 's', 'Sigilo 100', true], ['adventure/overoverkill', 'g', 'Superexceso', true],
  ['husbandry/plant_seed', 'b', 'Un lugar con semillas'], ['husbandry/breed_an_animal', 'b', 'Los loros y los murciélagos'], ['husbandry/tame_an_animal', 'b', 'Mejores amigos para siempre'],
  ['husbandry/fishy_business', 'b', 'Negocio sospechoso'], ['husbandry/wax_on', 'b', 'Encerar'], ['husbandry/tactical_fishing', 'b', 'Pesca táctica'],
  ['husbandry/safely_harvest_honey', 'b', 'Un lugar acogedor'], ['husbandry/axolotl_in_a_bucket', 's', 'El más lindo de los depredadores'],
  ['husbandry/balanced_diet', 'g', 'Una dieta equilibrada'], ['husbandry/bred_all_animals', 'g', 'Dos por dos'], ['husbandry/obtain_netherite_hoe', 'g', 'Dedicación seria'],
  ['husbandry/complete_catalogue', 'g', 'Un catálogo completo', true],
];
const MCDEFS = MCRAW.map(([path, tier, name, secret]) => ({ id: 'mc:' + path, cat: 'mc', tier, name, desc: MC_CATS[path.split('/')[0]], key: 'mc:' + path, goal: 1, secret: !!secret, bonus: true, adv: 'minecraft:' + path }));
const MC_ADV = new Map(MCDEFS.map(d => [d.adv, d]));

const PLAT = { id: 'plat', cat: 'plat', tier: 'p', name: 'Platino de Nova', desc: 'Consigue todos los demás logros', key: 'unlockedCount', goal: DEFS.length, secret: false };
const ALL = [...DEFS, PLAT];
const BY_ID = new Map([...ALL, ...MCDEFS].map(d => [d.id, d]));   // incluye los de Minecraft (para validar avisos), que no están en ALL ni cuentan para el platino

const dayNum = t => { const d = new Date(t); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); };

/**
 * Métricas que salen del historial: sessions = [{mc, ld, server, start, ms}], before = [{ms}] (tiempo anterior al historial), insts = nº de instancias.
 * Se unen a los contadores y a `shots` (capturas hechas) para formar el objeto que mira `check`.
 */
function derive({ sessions = [], before = [], insts = 0, shots = 0, counters = {} } = {}) {
  const ok = sessions.filter(s => s && Number.isFinite(+s.start));
  const m = { ...counters, shots, insts };
  m.launches = ok.length;
  const total = ok.reduce((a, s) => a + Math.max(0, +s.ms || 0), 0) + before.reduce((a, s) => a + Math.max(0, +s.ms || 0), 0);
  m.hours = total / 36e5;
  m.longest = ok.reduce((a, s) => Math.max(a, +s.ms || 0), 0) / 36e5;
  const lds = new Set(ok.map(s => s.ld || 'Vanilla'));
  m.ldVanilla = +lds.has('Vanilla'); m.ldFabric = +lds.has('Fabric'); m.ldForge = +lds.has('Forge'); m.ldNeoForge = +lds.has('NeoForge');
  m.loaders = m.ldVanilla + m.ldFabric + m.ldForge + m.ldNeoForge;
  const vs = new Set(ok.map(s => String(s.mc || '')).filter(Boolean));
  m.versions = vs.size;
  m.oldMc = +[...vs].some(v => /^1\.(?:[0-9]|1[0-3])(?:[.\-]|$)/.test(v) || /^[abc]\d/.test(v));
  m.newMc = +[...vs].some(v => /^2\d\./.test(v));
  const sv = ok.filter(s => s.server);
  m.serverSessions = sv.length;
  m.serversDistinct = new Set(sv.map(s => String(s.server).toLowerCase())).size;
  m.serverHours = sv.reduce((a, s) => a + Math.max(0, +s.ms || 0), 0) / 36e5;
  m.night = ok.filter(s => { const h = new Date(s.start).getHours(); return h >= 2 && h < 5; }).length;
  const days = [...new Set(ok.map(s => dayNum(s.start)))].sort((a, b) => a - b);
  m.days = days.length;
  let best = 0, run = 0, prev = null;
  for (const d of days) { run = prev !== null && d === prev + 1 ? run + 1 : 1; prev = d; if (run > best) best = run; }
  m.streak = best;
  return m;
}

/** Progreso de un logro con unas métricas: { have, goal, pct } (pct de 0 a 100). */
function progress(def, m) {
  const have = Math.max(0, +m[def.key] || 0), goal = def.goal;
  return { have: Math.min(have, goal), goal, pct: Math.min(100, Math.floor(have / goal * 100)) };
}

/**
 * Qué logros se consiguen ahora. unlocked = { id: algo } (los ya conseguidos). Devuelve los ids nuevos, en orden, con el platino al final
 * si con ellos se completan todos los demás.
 */
function check(m, unlocked = {}) {
  const fresh = DEFS.filter(d => !unlocked[d.id] && (+m[d.key] || 0) >= d.goal).map(d => d.id);
  const have = DEFS.filter(d => unlocked[d.id] || fresh.includes(d.id)).length;
  if (!unlocked[PLAT.id] && have === DEFS.length) fresh.push(PLAT.id);
  return fresh;
}

/** Hora de un avance en el JSON de Minecraft («2024-01-02 10:20:30 +0100») en milisegundos; 0 si no se entiende. */
function advTime(t) { const n = Date.parse(String(t).replace(' ', 'T').replace(/ ([+-])(\d\d)(\d\d)$/, '$1$2:$3')); return Number.isFinite(n) ? n : 0; }

/** Avances de nuestra lista hechos (done) y conseguidos a partir de `since`, dentro del JSON de un jugador (saves/<mundo>/advancements/<uuid>.json). */
function advDone(j, since) {
  const out = [];
  if (!j || typeof j !== 'object') return out;
  for (const [k, v] of Object.entries(j)) {
    if (!v || v.done !== true || !MC_ADV.has(k)) continue;
    const ts = Object.values(v.criteria || {}).map(advTime).filter(Boolean);
    if (ts.length && Math.max(...ts) >= since) out.push(k);
  }
  return out;
}

/** Logros de Minecraft nuevos: done = Set con los avances hechos («minecraft:story/mine_stone»…). */
function checkMc(done, unlocked = {}) {
  return MCDEFS.filter(d => !unlocked[d.id] && done.has(d.adv)).map(d => d.id);
}

/** Datos de un logro para la interfaz y para el juego. Los secretos no enseñan nombre ni descripción hasta conseguirlos. */
function view(def, m, entry) {
  const got = !!entry, hide = def.secret && !got;
  const p = progress(def, m);   // el platino mira `unlockedCount` (los logros ya conseguidos), que pone quien llama
  return { id: def.id, cat: def.cat, tier: def.tier, name: hide ? 'Logro secreto' : def.name, desc: hide ? 'Sigue jugando para descubrirlo' : def.desc, secret: def.secret, got, t: got ? entry.t : 0, seen: got ? entry.seen !== false : true, have: hide ? 0 : p.have, goal: hide ? 0 : p.goal, pct: hide ? 0 : p.pct, pts: TIERS[def.tier].pts, bonus: !!def.bonus };
}

module.exports = { TIERS, CATS, DEFS, PLAT, ALL, BY_ID, MCDEFS, MC_ADV, MC_CATS, derive, progress, check, checkMc, advTime, advDone, view };
