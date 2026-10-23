#!/usr/bin/env node
// Recursos pesados de Nova Launcher (vídeos de fondo .nvb) que NO van en git ni en el instalador.
// Viven como assets de la release fija «recursos» de GitHub, junto a un fondos.json con la URL y el sha256 de cada uno.
//
//   node scripts/recursos.js bajar [nombres]  descarga a assets/ los .nvb de la release «recursos» (todos, o solo los que indiques) y los verifica con sha256
//   node scripts/recursos.js mods [--forzar]  descarga a assets/mods los nova-menu-<mc>.jar que falten, de la última release (para compilar el instalador en local sin Gradle)
//   node scripts/recursos.js subir <archivos> sube uno o varios .nvb (o el jar que quieras) a «recursos» y actualiza fondos.json
//   node scripts/recursos.js json             muestra el fondos.json publicado
//
// «subir» necesita la CLI de GitHub (gh) con sesión iniciada y permiso de escritura en el repositorio.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');

const REPO = 'JustMarcoDev/nova-launcher', TAG = 'recursos';
const BASE = `https://github.com/${REPO}/releases/download/${TAG}/`;
const ASSETS = path.join(__dirname, '..', 'assets');

const sha256 = f => new Promise((ok, ko) => { const h = crypto.createHash('sha256'); fs.createReadStream(f).on('data', d => h.update(d)).on('end', () => ok(h.digest('hex'))).on('error', ko); });
const gh = (...a) => execFileSync('gh', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
const ghTry = (...a) => { try { return gh(...a); } catch { return null; } };

async function manifest() {
  const r = await fetch(BASE + 'fondos.json', { redirect: 'follow' });
  if (!r.ok) throw new Error('No se pudo leer fondos.json de la release «' + TAG + '» (HTTP ' + r.status + ')');
  return r.json();
}

async function bajar(only) {
  const m = await manifest(); fs.mkdirSync(ASSETS, { recursive: true });
  for (const [name, e] of Object.entries(m.files || {})) {
    if (only.length && !only.includes(name)) continue;
    if (!name.endsWith('.nvb')) continue;
    const dst = path.join(ASSETS, name);
    if (fs.existsSync(dst) && await sha256(dst) === e.sha256) { console.log('ya está (sha256 correcto): ' + name); continue; }
    console.log('descargando ' + name + ' (' + Math.round((e.size || 0) / 1048576) + ' MB)…');
    const r = await fetch(e.url, { redirect: 'follow' }); if (!r.ok) throw new Error(name + ': HTTP ' + r.status);
    const tmp = dst + '.part'; fs.writeFileSync(tmp, Buffer.from(await r.arrayBuffer()));
    const h = await sha256(tmp); if (h !== e.sha256) { fs.unlinkSync(tmp); throw new Error(name + ': el sha256 no coincide (' + h + ')'); }
    fs.renameSync(tmp, dst);
  }
  console.log('Recursos listos en assets/');
}

// Los .jar del menú de Nova de la última release (nova-menu.json trae la URL y el sha256 de cada versión de Minecraft)
async function mods() {
  const r = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=30`, { headers: { 'User-Agent': 'nova-recursos', Accept: 'application/vnd.github+json' } });
  if (!r.ok) throw new Error('GitHub: HTTP ' + r.status);
  const rel = (await r.json()).find(x => !x.draft && (x.assets || []).some(a => a.name === 'nova-menu.json'));
  if (!rel) throw new Error('No hay ninguna release con nova-menu.json');
  const m = await (await fetch(`https://github.com/${REPO}/releases/download/${rel.tag_name}/nova-menu.json`, { redirect: 'follow' })).json();
  const dir = path.join(ASSETS, 'mods'); fs.mkdirSync(dir, { recursive: true });
  for (const [mc, e] of Object.entries(m.jars || {})) {
    const dst = path.join(dir, 'nova-menu-' + mc + '.jar');
    if (fs.existsSync(dst) && (!process.argv.includes('--forzar') || await sha256(dst) === e.sha256)) { console.log('ya está: nova-menu-' + mc + '.jar'); continue; }   // lo que ya hay no se pisa (salvo --forzar)
    const rr = await fetch(e.url, { redirect: 'follow' }); if (!rr.ok) throw new Error(mc + ': HTTP ' + rr.status);
    fs.writeFileSync(dst, Buffer.from(await rr.arrayBuffer()));
    if (await sha256(dst) !== e.sha256) { fs.unlinkSync(dst); throw new Error(mc + ': el sha256 no coincide'); }
    console.log('descargado nova-menu-' + mc + '.jar (' + rel.tag_name + ')');
  }
}

async function subir(files) {
  if (!files.length) throw new Error('Indica los archivos a subir: node scripts/recursos.js subir assets/nuevo.nvb');
  // 1. La release fija existe (como prerelease para no ser nunca «la última» y no molestar al actualizador del launcher)
  if (!ghTry('api', `repos/${REPO}/releases/tags/${TAG}`)) {
    gh('api', '-X', 'POST', `repos/${REPO}/releases`, '-f', `tag_name=${TAG}`, '-f', 'name=Recursos', '-F', 'prerelease=true', '-f', 'make_latest=false',
      '-f', 'body=Archivos pesados que descarga Nova Launcher (fondos de vídeo). No es una versión del launcher: mira scripts/recursos.js.');
  }
  // 2. fondos.json actual + los nuevos
  let m = { schema: 1, files: {} };
  try { m = await manifest(); } catch {}
  m.schema = 1; m.files = m.files || {};
  for (const f of files) {
    const name = path.basename(f);
    m.files[name] = { url: BASE + name, sha256: await sha256(f), size: fs.statSync(f).size };
  }
  const mj = path.join(require('os').tmpdir(), 'fondos.json'); fs.writeFileSync(mj, JSON.stringify(m, null, 2) + '\n');
  // 3. Subir (primero los archivos, luego fondos.json: así el JSON nunca apunta a algo que aún no existe)
  gh('release', 'upload', TAG, ...files, '--clobber', '--repo', REPO);
  gh('release', 'upload', TAG, mj, '--clobber', '--repo', REPO);
  console.log('Publicado en la release «' + TAG + '»:'); for (const f of files) console.log('  ' + path.basename(f) + '  ' + m.files[path.basename(f)].sha256);
}

(async () => {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'bajar') await bajar(rest);
  else if (cmd === 'mods') await mods();
  else if (cmd === 'subir') await subir(rest);
  else if (cmd === 'json') console.log(JSON.stringify(await manifest(), null, 2));
  else { console.log('Uso: node scripts/recursos.js bajar [nombres] | mods | subir <archivos> | json'); process.exit(cmd ? 1 : 0); }
})().catch(e => { console.error('Error: ' + e.message); process.exit(1); });
