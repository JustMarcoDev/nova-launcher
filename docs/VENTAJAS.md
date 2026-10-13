# Ventajas exclusivas dentro de Minecraft — preparación

Estado: **solo diseño**. Todavía no hay código de cosméticos.

## Ideas

- **Cosméticos**: capas, alas, gorros, mascotas, estelas de partículas, emotes.
- **Rangos y detalles en Nova Network**: color de nombre, prefijo, zona de pruebas.
- **Eventos y recompensas** para quien juegue con el launcher (por ejemplo, una capa por participar).

## Cómo se podría hacer sin pagar un servidor

1. **Un mod cliente de Nova** (Fabric) que se incluye en el Nova Pack. Dibuja las capas, alas y gorros en tu personaje. Ya existe el hueco para él: en `novapack/pack.json` el bloque `custom_ejemplo` enseña cómo añadir un `.jar` propio.
2. **Un catálogo estático** (`novapack/cosmetics.json`) alojado en GitHub, que gratis dice qué cosméticos existen y quién tiene cuáles (por UUID de Minecraft). El mod lo descarga al abrir el juego. No necesita servidor propio.
3. **En el servidor Nova Network**, un plugin de cosméticos (por ejemplo, partículas y mascotas) y un plugin de rangos. Eso sí corre en el servidor del juego.
4. El launcher mostraría una pantalla «Ventajas» con tus cosméticos y un botón para equiparlos (se guardaría en tu configuración).

## Formato del catálogo (`cosmetics.json`)

```json
{
  "version": 1,
  "items": [
    { "id": "capa-nova", "tipo": "capa", "nombre": "Capa Nova", "textura": "https://.../capa-nova.png" }
  ],
  "propietarios": {
    "uuid-del-jugador": ["capa-nova"]
  }
}
```

## Cosas a cuidar

- **Condiciones de Mojang**: las normas de uso comercial de Minecraft limitan lo que se puede vender. Los cosméticos que no dan ventaja en el juego suelen estar permitidos, pero conviene leer las normas oficiales antes de cobrar nada. Esto no es asesoramiento legal.
- **Sin ventajas de juego de pago**: nada que dé fuerza o ventaja a quien pague.
- **Seguridad**: el catálogo es público; no guardar datos personales, solo UUID.
- **Compatibilidad**: el mod cliente debe actualizarse con cada versión nueva de Minecraft.

## Siguiente paso cuando quieras empezar

Elegir 1 o 2 cosméticos de prueba (por ejemplo, una capa y un gorro) y crear el mod cliente mínimo para dibujarlos.
