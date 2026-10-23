// Servidor de presencia de Nova (Cloudflare Worker + KV).
// Permite que el menú de Nova muestre el logo junto al nombre de los jugadores que usan Nova.
//
// Endpoints (todos devuelven JSON):
//   GET  /challenge                         → { serverId }                       (id aleatorio de un solo uso, caduca en 2 min)
//   POST /verify    { name, uuid, serverId } → { token }                         (comprueba con Mojang que el jugador hizo joinServer con ese serverId)
//   POST /heartbeat { token }                → { ok:true }                       (marca el UUID como activo durante 2 min; el mod lo envía cada 30 s)
//   POST /query     { uuids:[…] }            → { nova:[uuids que usan Nova] }    (máx. 200 por consulta)
//
// Sin cuentas premium no hay verificación: el mod solo usa esto si se lanzó con -Dnova.premium=1.
// KV necesario: NOVA (binding). Despliegue: ver servidor/README.md.

const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
const hex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');
const UUID = /^[0-9a-f]{32}$/;
const norm = u => String(u || '').replace(/-/g, '').toLowerCase();

export default {
  async fetch(req, env) {
    const url = new URL(req.url), p = url.pathname;
    if (req.method === 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST' } });
    try {
      if (p === '/challenge' && req.method === 'GET') {
        const serverId = hex(20);
        await env.NOVA.put('c:' + serverId, '1', { expirationTtl: 120 });
        return J({ serverId });
      }
      if (req.method !== 'POST') return J({ error: 'nope' }, 404);
      const b = await req.json().catch(() => ({}));

      if (p === '/verify') {
        const name = String(b.name || ''), uuid = norm(b.uuid), serverId = String(b.serverId || '');
        if (!/^\w{1,16}$/.test(name) || !UUID.test(uuid) || !/^[0-9a-f]{40}$/.test(serverId)) return J({ error: 'datos' }, 400);
        if (!await env.NOVA.get('c:' + serverId)) return J({ error: 'caducado' }, 403);
        await env.NOVA.delete('c:' + serverId);                                   // un solo uso
        const r = await fetch('https://sessionserver.mojang.com/session/minecraft/hasJoined?username=' + encodeURIComponent(name) + '&serverId=' + serverId);
        if (r.status !== 200) return J({ error: 'mojang' }, 403);
        const j = await r.json();
        if (norm(j.id) !== uuid) return J({ error: 'uuid' }, 403);
        const token = hex(24);
        await env.NOVA.put('t:' + token, uuid, { expirationTtl: 86400 });
        await env.NOVA.put('u:' + uuid, '1', { expirationTtl: 120 });
        return J({ token });
      }

      if (p === '/heartbeat') {
        const uuid = await env.NOVA.get('t:' + String(b.token || ''));
        if (!uuid) return J({ error: 'token' }, 401);
        await env.NOVA.put('u:' + uuid, '1', { expirationTtl: 120 });
        return J({ ok: true });
      }

      if (p === '/query') {
        const list = (Array.isArray(b.uuids) ? b.uuids : []).slice(0, 200).map(norm).filter(u => UUID.test(u));
        const hit = await Promise.all(list.map(async u => (await env.NOVA.get('u:' + u)) ? u : null));
        return J({ nova: hit.filter(Boolean) });
      }
      return J({ error: 'nope' }, 404);
    } catch (e) { return J({ error: 'interno' }, 500); }
  }
};
