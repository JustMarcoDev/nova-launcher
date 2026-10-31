# Servidor de presencia de Nova (Cloudflare Worker)

Hace que, en la lista de jugadores (TAB), los usuarios de Nova vean un logo junto al nombre de otros usuarios de Nova.
Es opcional: si el servidor no responde, el mod simplemente no muestra nada.

## Desplegarlo (una vez, gratis)
1. Cuenta gratuita en <https://dash.cloudflare.com>.
2. En esta carpeta: `npx wrangler login`
3. `npx wrangler kv namespace create NOVA` → copia el `id` en `wrangler.toml`. (El Durable Object no necesita crearse: lo crea la migración `new_sqlite_classes` del primer despliegue, que es la que admite el plan gratis.)
4. `npx wrangler deploy` → te da una URL tipo `https://nova-presencia.TU-USUARIO.workers.dev`.
5. Pon esa URL en el campo `novaPresence` de `package.json` (el launcher la pasa al mod como `-Dnova.presence`) y saca una versión nueva del launcher. Para probar sin recompilar: variable de entorno `NOVA_PRESENCE`.

## Cómo funciona
- `/challenge` da un `serverId` aleatorio. El mod hace `joinServer` en Mojang con ese id (necesita sesión premium real).
- `/verify` comprueba con `sessionserver.mojang.com/hasJoined` que ese jugador lo hizo → devuelve un token. Así nadie puede suplantar un UUID.
- `/heartbeat` (cada 30 s mientras estás en un servidor) mantiene tu UUID «activo» 2 minutos.
- `/query` recibe los UUID de la lista TAB (como mucho 100) y devuelve cuáles usan Nova.

## Dónde se guarda cada cosa
- **Durable Object `Presence`** (uno global, `idFromName('global')`): guarda **en memoria** el mapa `uuid → última vez visto`, los tokens activos y los contadores de peticiones. `/heartbeat` y `/query` ya no escriben ni leen KV, que en el plan gratis tiene muy pocas escrituras al día.
- **KV (`NOVA`)**: solo el `serverId` de `/challenge` (caduca en 2 min) y los tokens de `/verify` (24 h), los dos con `expirationTtl`. Si el Durable Object se reinicia y no conoce un token, `/heartbeat` lo recupera de KV una vez y se lo vuelve a dar al Durable Object.
- Un reinicio del Durable Object solo vacía el mapa de «activos», que de todas formas caduca a los 2 minutos.

## Límites
- **10 peticiones por minuto por IP y por token** (ventana de 60 s dentro del Durable Object; se pasa a 429 con `retry-after: 60`). Se cambia con la variable `RATE_LIMIT` de `wrangler.toml`. Ojo: varios jugadores detrás de la misma IP (un colegio, una familia) comparten el límite de IP; cada jugador usa unas 4 peticiones por minuto (heartbeat + consulta cada 30 s).
- **100 UUID como máximo por consulta** (`/query`).
- El plan gratis de Cloudflare permite unas 100 000 peticiones al día a Durable Objects: con un heartbeat y una consulta cada 30 s, unos 30 jugadores a la vez durante todo un día. Si hace falta más, plan de pago o subir el intervalo en el mod.

No se guarda nada más que los UUID activos (caducan solos) y tokens de 24 h.

## Informes de error anónimos (`/report` y `/reports`)

- `POST /report` — lo envía el launcher (solo si el usuario activa «Enviar informes de error anónimos»). Cuerpo JSON: `id` (32 hex aleatorios por instalación), `launcher`, `mc`, `loader`, `loaderVersion`, `mod`, `cause`, `code` y `log` (últimas 30 líneas, ya sin usuarios, rutas `C:\Users\…`, IPs ni tokens). Máximo **10 informes al día por id**; se guardan en el Durable Object (los 2000 más recientes).
- `GET /reports?limit=100` — para que los leas tú. Necesita la cabecera `Authorization: Bearer <REPORTS_SECRET>`.
- Crear el secreto: `npx wrangler secret put REPORTS_SECRET` (sin él, `/reports` responde 401).

## Recuento anónimo de versiones (opcional)
- El launcher envía `POST /usage` con `{id, launcher, mc, loader}` solo si la persona marcó «Enviar estadísticas anónimas de uso» en Ajustes → Juego (apagada de fábrica) y `nova-config.json` no lleva `"usage"` en `off`. El `id` son 32 hex aleatorios de esa instalación (distintos de los de los informes de error). Nunca se envían nombres, cuentas ni IPs: la IP solo se usa para el límite de peticiones y no se guarda.
- El Durable Object suma por día los lanzamientos de cada combinación launcher·Minecraft·cargador y las instalaciones distintas (se guardan 90 días).
- Para leerlo: `npx wrangler secret put USAGE_SECRET` y luego `USAGE_SECRET=… node ../scripts/uso.js [días]` (también `GET /usage-summary?days=30` con `Authorization: Bearer <secreto>`).
