# Cómo alojar Nova Network gratis o barato

El launcher ya está preparado: cuando tengas la dirección del servidor, escríbela en `novapack/pack.json` (bloque `server`, campo `host`) y publícalo en GitHub. Los launchers ya instalados la recogen solos, sin versión nueva.

## Opciones (de menos a más trabajo)

| Opción | Coste | Para qué sirve | Pegas |
|---|---|---|---|
| **Tu propio PC + playit.gg** | Gratis | Probar con amigos | El PC debe estar encendido; no es para público |
| **Aternos** | Gratis | Servidor pequeño de amigos | Se apaga solo, tiene cola, mods limitados |
| **Oracle Cloud «Always Free»** (máquina ARM) | Gratis | Un servidor 24/7 de verdad | Hay que registrar tarjeta, a veces no hay máquinas libres, lo montas tú |
| **Hosting de Minecraft** (alquiler) | Desde unos pocos euros al mes | Lo más fácil y estable | Pago mensual |

## Qué instalar en el servidor

1. **Fabric** de la misma versión que el Nova Pack (ver `pack.json`, ahora 1.21.1) con los mismos mods de rendimiento que acepten servidor (Fabric API, Lithium, FerriteCore).
2. Para cosméticos, rangos y mapa: más adelante, según `docs/VENTAJAS.md`.
3. `online-mode=true` en `server.properties` para que solo entren cuentas de Microsoft originales.
4. Una copia de seguridad semanal del mundo.

## Seguridad básica

- Lista blanca (`white-list=true`) al principio.
- No expongas más puertos que el 25565.
- Mantén Java y el servidor actualizados.
