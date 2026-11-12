package dev.astrion.nova;

/** Curvas de movimiento para las animaciones del menú y los avisos (todas devuelven 0 en 0 y 1 en 1; t se recorta a 0..1). */
final class NovaEase {
    private NovaEase() { }

    private static float c01(float t) { return t < 0f ? 0f : t > 1f ? 1f : t; }

    /** Entrada y salida suaves (smoothstep). */
    static float smooth(float t) { t = c01(t); return t * t * (3f - 2f * t); }

    /** Frena al llegar: rápido al principio y suave al final. */
    static float outCubic(float t) { float u = 1f - c01(t); return 1f - u * u * u; }

    /** Se pasa un poco del destino y vuelve (rebote corto), como el aviso de logros de Minecraft. */
    static float outBack(float t) { float u = c01(t) - 1f; return 1f + 2.4f * u * u * u + 1.4f * u * u; }
}
