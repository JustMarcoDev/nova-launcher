package dev.astrion.nova;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.File;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Avisos del launcher dentro del juego (parte común, sin Minecraft). El launcher añade eventos a <nova.dir>/avisos.json
 * ({id, texto, tipo, hora}: descarga terminada, actualización lista, copia de seguridad hecha). Cada 2 s se mira el lastModified del archivo
 * en otro hilo; solo si cambió se lee y se analiza. Los avisos nuevos (id no visto) pasan a una cola y se enseñan de uno en uno 5 s.
 * El dibujo lo hace NovaToast de cada proyecto.
 */
final class NovaToasts {
    private NovaToasts() { }

    static final long SHOW_MS = 5000;

    static final class Toast {
        final String id, texto, tipo;
        Toast(String id, String texto, String tipo) { this.id = id; this.texto = texto; this.tipo = tipo; }
    }

    private static final ConcurrentLinkedQueue<Toast> QUEUE = new ConcurrentLinkedQueue<>();
    private static final Set<String> SEEN = new HashSet<>();   // solo lo toca el hilo de fondo
    private static final AtomicBoolean busy = new AtomicBoolean();
    private static long lastCheck, stamp = -1;
    private static volatile Toast cur;
    private static long born;

    /** Se llama en cada fotograma desde el hilo de render: lanza la comprobación (cada 2 s, fuera del hilo de render) y devuelve el aviso que toca enseñar, o null. */
    static Toast tick(long now) {
        if (!NovaSettings.toasts || NovaOff.has("toasts")) { cur = null; return null; }
        if (now - lastCheck >= 2000 && busy.compareAndSet(false, true)) {
            lastCheck = now;
            CompletableFuture.runAsync(() -> { try { check(); } catch (Throwable ignored) { } finally { busy.set(false); } });
        }
        Toast c = cur;
        if (c != null && now - born > SHOW_MS) { cur = null; c = null; }
        if (c == null) {
            c = QUEUE.poll();
            if (c != null) { cur = c; born = now; }
        }
        return c;
    }

    /** Milisegundos que lleva el aviso actual en pantalla. */
    static long age(long now) { return now - born; }

    private static void check() throws Exception {
        File d = NovaSettings.dir();
        if (d == null) return;
        File f = new File(d, "avisos.json");
        if (!f.isFile()) return;
        long m = f.lastModified();
        if (m == stamp) return;                                  // nada cambió: ni se lee ni se analiza
        JsonElement e = JsonParser.parseString(new String(java.nio.file.Files.readAllBytes(f.toPath()), java.nio.charset.StandardCharsets.UTF_8));
        stamp = m;
        if (!e.isJsonArray()) return;
        JsonArray a = e.getAsJsonArray();
        long now = System.currentTimeMillis();
        for (JsonElement x : a) {
            try {
                JsonObject o = x.getAsJsonObject();
                String id = o.has("id") ? o.get("id").getAsString() : "";
                if (id.isEmpty() || !SEEN.add(id)) continue;     // un id ya visto no se vuelve a enseñar
                long hora = o.has("hora") ? o.get("hora").getAsLong() : 0;
                if (hora > 0 && now - hora > 5 * 60_000L) continue;   // un aviso viejo ya no interesa
                String txt = o.has("texto") ? o.get("texto").getAsString() : "";
                if (txt.isBlank()) continue;
                QUEUE.add(new Toast(id, txt, o.has("tipo") ? o.get("tipo").getAsString() : ""));
            } catch (Throwable ignored) { }
        }
    }
}
