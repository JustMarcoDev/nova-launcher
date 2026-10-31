// =====================================================================================
// Nova Launcher · main/servidores.js
// Servidores: ping oficial, servers.dat (NBT) y estado
// (Parte del proceso principal; main.js carga todos los módulos. Mira «Estructura del proyecto» en el README.)
// =====================================================================================
const { ipcMain } = require('electron');
const dns = require('dns').promises;
const fs = require('fs');
const net = require('net');
const path = require('path');
const { R } = require('./compartido');
// De módulos anteriores (ya cargados):
const { sleep } = R; // descargas
const { get } = R; // red

// ===== Servidores y Nova Pack (0.2.10) =====
const modernQP = mc => { let m = /^(\d+)\.(\d+)/.exec(mc); if (m) return +m[1] > 1 || +m[2] >= 20; m = /^(\d\d)w/.exec(mc); return !!m && +m[1] >= 23; };
const stCache = {};
const vi = n => { const b = []; do { let x = n & 0x7f; n >>>= 7; if (n) x |= 0x80; b.push(x); } while (n); return Buffer.from(b); };
const pstr = t => { const b = Buffer.from(t, 'utf8'); return Buffer.concat([vi(b.length), b]); };
const pkt = b => Buffer.concat([vi(b.length), b]);
const rvi = (b, o) => { let n = 0, sh = 0, x; do { if (o >= b.length) return null; x = b[o++]; n |= (x & 0x7f) << sh; sh += 7; } while (x & 0x80); return [n, o]; };
const flat = d => typeof d === 'string' ? d : d ? (d.text || '') + (d.extra || []).map(flat).join('') : '';
// Ping oficial del juego (Server List Ping): jugadores, versión y latencia
async function slp(host, port, timeout = 4000) {
  try { const r = await Promise.race([dns.resolveSrv('_minecraft._tcp.' + host), sleep(1500).then(() => [])]); if (r && r[0]) { host = r[0].name; port = r[0].port; } } catch {}
  return new Promise((res, rej) => {
    const s = net.connect({ host, port }); let buf = Buffer.alloc(0), done = false, p0 = 0, st = null;
    const fin = (e, v) => { if (done) return; done = true; s.destroy(); e ? rej(e) : res(v); };
    s.setTimeout(timeout, () => fin(new Error('timeout'))); s.on('error', fin);
    s.on('connect', () => { s.write(Buffer.concat([pkt(Buffer.concat([vi(0), vi(765), pstr(host), Buffer.from([port >> 8, port & 255]), vi(1)])), pkt(vi(0))])); });
    s.on('data', d => { buf = Buffer.concat([buf, d]);
      for (;;) { const L = rvi(buf, 0); if (!L || buf.length < L[1] + L[0]) return; const body = buf.subarray(L[1], L[1] + L[0]); buf = buf.subarray(L[1] + L[0]);
        const id = rvi(body, 0); if (!id) return;
        if (id[0] === 0 && !st) { const sl = rvi(body, id[1]); try { st = JSON.parse(body.toString('utf8', sl[1], sl[1] + sl[0])); } catch { return fin(new Error('json')); } p0 = Date.now(); s.write(pkt(Buffer.concat([vi(1), Buffer.alloc(8)]))); }
        else if (id[0] === 1 && st) return fin(null, { online: true, players: st.players ? st.players.online : 0, max: st.players ? st.players.max : 0, version: st.version ? st.version.name : '', motd: flat(st.description).replace(/§./g, '').trim().slice(0, 120), ping: Date.now() - p0, icon: st.favicon || '' }); } });
  });
}
ipcMain.handle('srv:status', async (e, hosts) => {
  const out = {};
  await Promise.allSettled([...new Set(hosts)].map(async key => {
    const c = stCache[key]; if (c && Date.now() - c.t < 60000) { out[key] = c.v; return; }
    const m = /^([A-Za-z0-9._-]{1,255})(?::(\d{1,5}))?$/.exec(String(key)); if (!m) { out[key] = { online: false, players: 0, icon: '' }; return; }
    let v; try { v = await slp(m[1], +m[2] || 25565); }
    catch { try { const r = await get('https://api.mcsrvstat.us/3/' + encodeURIComponent(m[1] + (m[2] ? ':' + m[2] : ''))); v = { online: !!r.online, players: r.players ? r.players.online : 0, max: r.players ? r.players.max : 0, version: r.version || '', motd: '', ping: 0, icon: r.icon || '' }; } catch { v = { online: false, players: 0, icon: '' }; } }
    stCache[key] = { t: Date.now(), v }; out[key] = v;
  }));
  return out;
});
const nbtStr = s => { const b = Buffer.from(String(s), 'utf8'), l = Buffer.alloc(2); l.writeUInt16BE(b.length); return Buffer.concat([l, b]); };
// ---- NBT (para servers.dat) ----
function nbtRead(buf) {
  let o = 0; const rs = () => { const l = buf.readUInt16BE(o); o += 2; const t = buf.toString('utf8', o, o + l); o += l; return t; };
  const rd = t => { switch (t) {
    case 1: return { t, v: buf.readInt8(o++) };
    case 2: { const v = buf.readInt16BE(o); o += 2; return { t, v }; }
    case 3: { const v = buf.readInt32BE(o); o += 4; return { t, v }; }
    case 4: { const v = buf.readBigInt64BE(o); o += 8; return { t, v }; }
    case 5: { const v = buf.readFloatBE(o); o += 4; return { t, v }; }
    case 6: { const v = buf.readDoubleBE(o); o += 8; return { t, v }; }
    case 7: { const n = buf.readInt32BE(o); o += 4; const v = Buffer.from(buf.subarray(o, o + n)); o += n; return { t, v }; }
    case 8: return { t, v: rs() };
    case 9: { const et = buf[o++], n = buf.readInt32BE(o); o += 4; const v = []; for (let i = 0; i < n; i++) v.push(rd(et)); return { t, et, v }; }
    case 10: { const v = []; for (;;) { const tt = buf[o++]; if (tt === 0) break; const k = rs(); v.push([k, rd(tt)]); } return { t, v }; }
    case 11: { const n = buf.readInt32BE(o); o += 4; const v = []; for (let i = 0; i < n; i++) { v.push(buf.readInt32BE(o)); o += 4; } return { t, v }; }
    case 12: { const n = buf.readInt32BE(o); o += 4; const v = []; for (let i = 0; i < n; i++) { v.push(buf.readBigInt64BE(o)); o += 8; } return { t, v }; }
    default: throw new Error('NBT no válido'); } };
  const t = buf[o++]; const name = rs(); return { name, tag: rd(t) };
}
function nbtPay(tag) {
  const { t, v } = tag, B = n => Buffer.alloc(n);
  switch (t) {
    case 1: return Buffer.from([v & 255]);
    case 2: { const b = B(2); b.writeInt16BE(v); return b; }
    case 3: { const b = B(4); b.writeInt32BE(v); return b; }
    case 4: { const b = B(8); b.writeBigInt64BE(BigInt(v)); return b; }
    case 5: { const b = B(4); b.writeFloatBE(v); return b; }
    case 6: { const b = B(8); b.writeDoubleBE(v); return b; }
    case 7: { const l = B(4); l.writeInt32BE(v.length); return Buffer.concat([l, Buffer.from(v)]); }
    case 8: return nbtStr(v);
    case 9: { const l = B(5); l[0] = v.length ? tag.et : (tag.et || 0); l.writeInt32BE(v.length, 1); return Buffer.concat([l, ...v.map(nbtPay)]); }
    case 10: return Buffer.concat([...v.map(([k, x]) => Buffer.concat([Buffer.from([x.t]), nbtStr(k), nbtPay(x)])), Buffer.from([0])]);
    case 11: { const b = B(4 + v.length * 4); b.writeInt32BE(v.length); v.forEach((x, i) => b.writeInt32BE(x, 4 + i * 4)); return b; }
    case 12: { const b = B(4 + v.length * 8); b.writeInt32BE(v.length); v.forEach((x, i) => b.writeBigInt64BE(BigInt(x), 4 + i * 8)); return b; }
  }
}
const nbtWrite = r => Buffer.concat([Buffer.from([r.tag.t]), nbtStr(r.name), nbtPay(r.tag)]);
// Añade servidores a servers.dat sin tocar los que ya hay
function syncServers(dir, list) {
  if (!list.length) return false;
  const f = path.join(dir, 'servers.dat'); let root = null;
  try { root = nbtRead(fs.readFileSync(f)); } catch {}
  if (!root || root.tag.t !== 10) root = { name: '', tag: { t: 10, v: [] } };
  let sv = root.tag.v.find(([k, x]) => k === 'servers' && x.t === 9);
  if (!sv) { sv = ['servers', { t: 9, et: 10, v: [] }]; root.tag.v = root.tag.v.filter(([k]) => k !== 'servers'); root.tag.v.push(sv); }
  if (!sv[1].v.length) sv[1].et = 10;
  let ch = false;
  for (const s of list) {
    if (sv[1].v.some(c => c.t === 10 && c.v.some(([k, x]) => k === 'ip' && String(x.v).toLowerCase() === s.ip.toLowerCase()))) continue;
    sv[1].v.push({ t: 10, v: [['ip', { t: 8, v: s.ip }], ['name', { t: 8, v: s.name }]] }); ch = true;
  }
  if (ch) { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(f, nbtWrite(root)); }
  return ch;
}


// Lo que usan otros módulos
Object.assign(R, { modernQP, syncServers });
