package dev.astrion.nova;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.awt.image.BufferedImage;
import java.io.File;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Skin local (lógica común): vigila skin-local.json y skin-local.png que deja el launcher, sin gastar tiempo del hilo de render.
 * Cada segundo el hilo de render pide una comprobación en otro hilo; esa comprobación mira el lastModified de los dos archivos y solo si
 * cambió alguno los lee y decodifica la imagen (64×64 ya convertida si era antigua). El hilo de render solo registra la textura (NovaLocalSkin de cada proyecto).
 */
final class NovaLocalSkinCore {
    private NovaLocalSkinCore() { }

    /** Lo que el hilo de fondo deja listo para el hilo de render: o «quitar la skin», o los 64×64 píxeles ya decodificados. */
    static final class Res { boolean clear; int[] px; boolean slim; }

    private static volatile Res pending;
    private static final AtomicBoolean busy = new AtomicBoolean();
    private static volatile boolean force;
    private static long lastCheck;
    private static long jMod = -1, pMod = -1;   // lastModified de skin-local.json y del png que ya se leyeron (solo los toca el hilo de fondo)
    private static int fails;

    /** Fuerza que la próxima consulta lea ya los archivos (tras cambiar la skin desde el menú del juego). */
    static void refresh() { force = true; }

    /** Lo que dejó el hilo de fondo desde la última vez (o null). */
    static Res take() { Res r = pending; if (r != null) pending = null; return r; }

    /** ¿Toca comprobar ya? Cada segundo, o al forzarlo, y solo desde el hilo de render (así no se gasta el turno si lo pide otro hilo). */
    static boolean due(long now) {
        if (now - lastCheck < 1000 && !force) return false;
        if (!NovaMc.onRenderThread()) return false;
        lastCheck = now; force = false;
        return true;
    }

    /** Lanza la comprobación en otro hilo (si no hay ya una en marcha). */
    static void checkAsync() {
        if (!busy.compareAndSet(false, true)) return;
        CompletableFuture.runAsync(() -> { try { check(); } catch (Throwable e) { /* sin skin local: se ve la normal */ } finally { busy.set(false); } });
    }

    private static Res clearRes() { Res c = new Res(); c.clear = true; return c; }

    /** Hilo de fondo: lectura de disco y decodificación. */
    private static void check() throws Exception {
        String dir = System.getProperty("nova.dir", "");
        if (dir.isEmpty()) return;
        File jf = new File(dir, "skin-local.json"), pf = new File(dir, "skin-local.png");
        if (!jf.isFile()) { if (jMod != -2) { jMod = -2; pMod = -1; pending = clearRes(); } return; }
        long jm = jf.lastModified(), pm = pf.isFile() ? pf.lastModified() : 0;
        if (jm == jMod && pm == pMod) return;                          // nada cambió: ni se lee ni se analiza
        JsonObject o = JsonParser.parseString(new String(java.nio.file.Files.readAllBytes(jf.toPath()), java.nio.charset.StandardCharsets.UTF_8)).getAsJsonObject();
        boolean on = o.has("on") && o.get("on").getAsBoolean() && o.has("user") && o.get("user").getAsString().equalsIgnoreCase(NovaMc.userName());
        if (!on) { jMod = jm; pMod = pm; pending = clearRes(); return; }
        boolean steve = o.has("steve") && o.get("steve").getAsBoolean();
        BufferedImage img = steve ? NovaSkin.steve() : pf.isFile() ? javax.imageio.ImageIO.read(pf) : null;
        if (img == null || img.getWidth() != 64 || (img.getHeight() != 64 && img.getHeight() != 32)) {
            // puede ser una lectura a medias: no se anota el lastModified, así que se reintenta cada segundo antes de darla por mala (y se sigue enseñando la skin anterior)
            if (++fails >= 5) { fails = 0; jMod = jm; pMod = pm; pending = clearRes(); }
            return;
        }
        fails = 0;
        BufferedImage full = legacy(img);
        Res r = new Res();
        r.px = new int[64 * 64];
        for (int y = 0; y < 64; y++) for (int x = 0; x < 64; x++) r.px[y * 64 + x] = full.getRGB(x, y);
        r.slim = o.has("model") && "slim".equals(o.get("model").getAsString());
        jMod = jm; pMod = pm;
        pending = r;
    }

    /** Las skins antiguas de 64×32 se convierten a 64×64 como hace el juego (la pierna y el brazo izquierdos son el espejo de los derechos). */
    static BufferedImage legacy(BufferedImage s) {
        BufferedImage o = new BufferedImage(64, 64, BufferedImage.TYPE_INT_ARGB);
        for (int y = 0; y < s.getHeight(); y++) for (int x = 0; x < 64; x++) o.setRGB(x, y, s.getRGB(x, y));
        if (s.getHeight() == 64) return o;
        int[][] r = { {4, 16, 16, 32, 4, 4}, {8, 16, 16, 32, 4, 4}, {0, 20, 24, 32, 4, 12}, {4, 20, 16, 32, 4, 12}, {8, 20, 8, 32, 4, 12}, {12, 20, 16, 32, 4, 12},
                      {44, 16, -8, 32, 4, 4}, {48, 16, -8, 32, 4, 4}, {40, 20, 0, 32, 4, 12}, {44, 20, -8, 32, 4, 12}, {48, 20, -16, 32, 4, 12}, {52, 20, -8, 32, 4, 12} };
        for (int[] q : r) for (int j = 0; j < q[5]; j++) for (int i = 0; i < q[4]; i++) o.setRGB(q[0] + q[2] + (q[4] - 1 - i), q[1] + q[3] + j, s.getRGB(q[0] + i, q[1] + j));
        return o;
    }
}
