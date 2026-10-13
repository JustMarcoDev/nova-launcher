# Sistema de amigos — plan de preparación

Estado: **solo diseño**. No hay código todavía. Este documento recoge lo que hace falta decidir y construir.

## Qué podría hacer

1. Lista de amigos con estado: en línea, en el launcher, jugando (con la versión de Minecraft), desconectado.
2. Solicitudes de amistad: enviar, aceptar y rechazar, buscando por nombre de usuario.
3. Perfil: nombre, skin, versión favorita y tiempo jugado (opcional).
4. Invitar a un amigo a jugar la misma versión o el mismo modpack.
5. Modo invisible y bloqueo de usuarios.
6. Más adelante: chat sencillo y grupos.

## Lo que necesita (y que hoy no existe)

Los amigos necesitan un **servidor propio**, porque el launcher ahora funciona solo en el PC de cada persona. Hay que decidir cuál:

| Opción | Ventajas | Inconvenientes |
|---|---|---|
| **A. Supabase** (base de datos + login + tiempo real) | Rápido de montar, plan gratis, tiempo real incluido, reglas de seguridad por usuario | Dependes de un servicio externo y sus límites gratuitos |
| B. Firebase | Muy conocido, tiempo real | Datos menos relacionales, costes menos previsibles |
| C. Servidor propio (Node.js + WebSocket + PostgreSQL) | Control total | Hay que alquilarlo, mantenerlo y asegurarlo |

Recomendación: **A (Supabase)** para empezar. Se puede migrar a C si crece.

## Identidad

- Con cuenta de Microsoft: se usa el UUID de Minecraft como identidad. Es único y difícil de suplantar.
- En modo offline cualquiera puede escribir cualquier nombre, así que **no se pueden garantizar amigos con cuenta offline**. Propuesta: amigos solo con Microsoft, o un registro propio con correo.

## Datos mínimos

- `perfiles`: id, uuid de Minecraft, nombre, fecha de alta.
- `amistades`: quién, con quién, estado (pendiente, aceptada, bloqueada).
- `presencia`: id, estado, versión que juega, última conexión.

Con reglas de acceso por fila para que cada persona solo vea lo suyo y lo de sus amigos.

## Privacidad (importante)

- Pedir consentimiento antes de activar la función y explicar qué datos se guardan.
- Botón para borrar la cuenta y todos sus datos.
- Modo invisible y bloqueo.
- Guardar el mínimo posible. Si hay usuarios en la UE, aplica el RGPD.
- Moderación: botón de denunciar y forma de contactar con Astrion Studio.

## Cómo encaja con lo que ya existe

- La actividad de Discord ya sabe qué versión juegas. La misma información alimentaría la presencia de amigos.
- La pestaña **Redes** o una nueva pestaña **Amigos** en la barra lateral.
- Las actualizaciones automáticas ya permiten publicar los cambios del launcher sin que nadie reinstale.

## Fases propuestas

1. Decisiones (ver preguntas) y crear el proyecto del servidor.
2. Login con Microsoft y perfil.
3. Solicitudes de amistad y lista.
4. Presencia en tiempo real.
5. Invitaciones a jugar.
6. Chat y grupos (opcional).

## Preguntas que hay que responder antes de programar

1. ¿Servidor: Supabase, Firebase o propio?
2. ¿Amigos solo con cuenta de Microsoft o también offline?
3. ¿Qué es lo mínimo para la primera versión: lista + estado, o también chat?
4. ¿Quién paga y mantiene el servidor? (Astrion Studio)
5. ¿Hay límite de edad o necesitáis control parental?
6. ¿Queréis perfiles públicos o solo entre amigos?
7. ¿Habrá moderación y quién la hará?
