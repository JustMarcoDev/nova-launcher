# Servidor de presencia de Nova (Cloudflare Worker)

Hace que, en la lista de jugadores (TAB), los usuarios de Nova vean un logo junto al nombre de otros usuarios de Nova.
Es opcional: si el servidor no responde, el mod simplemente no muestra nada.

## Desplegarlo (una vez, gratis)
1. Cuenta gratuita en <https://dash.cloudflare.com>.
2. En esta carpeta: `npx wrangler login`
3. `npx wrangler kv namespace create NOVA` → copia el `id` en `wrangler.toml`.
4. `npx wrangler deploy` → te da una URL tipo `https://nova-presencia.TU-USUARIO.workers.dev`.
5. Pon esa URL en el campo `novaPresence` de `package.json` (el launcher la pasa al mod como `-Dnova.presence`) y saca una versión nueva del launcher. Para probar sin recompilar: variable de entorno `NOVA_PRESENCE`.

## Cómo funciona
- `/challenge` da un `serverId` aleatorio. El mod hace `joinServer` en Mojang con ese id (necesita sesión premium real).
- `/verify` comprueba con `sessionserver.mojang.com/hasJoined` que ese jugador lo hizo → devuelve un token. Así nadie puede suplantar un UUID.
- `/heartbeat` (cada 30 s mientras estás en un servidor) mantiene tu UUID «activo» 2 minutos.
- `/query` recibe los UUID de la lista TAB y devuelve cuáles usan Nova.

No se guarda nada más que UUID activos (caducan solos) y tokens de 24 h.
