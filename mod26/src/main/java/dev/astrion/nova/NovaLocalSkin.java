package dev.astrion.nova;

import java.awt.image.BufferedImage;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.mojang.blaze3d.platform.NativeImage;
import java.io.File;
import net.minecraft.client.Minecraft;
import net.minecraft.client.multiplayer.PlayerInfo;
import net.minecraft.resources.Identifier;

/**
 * Skin local: la skin elegida en el launcher (cuenta sin conexión o de Microsoft) se pone al jugador local con los mixins de cada versión (capa skin-*).
 * Solo la ve quien juega; en Microsoft el launcher además la sube a Mojang para que la vean los demás.
 */
public final class NovaLocalSkin {
    private NovaLocalSkin() { }

    private static Identifier id;
    private static boolean slim;
    private static long lastCheck;
    private static int seq;
    private static java.lang.reflect.Method nameM;

    /**
     * Textura de la skin elegida en el launcher, o null si no hay. El launcher deja <nova.dir>/skin-local.png y skin-local.json
     * ({on, user, model, v}); aquí se vigila cada segundo, así que un cambio de skin se ve sin reiniciar el juego.
     */
    public static Identifier id() {
        poll();
        return id;
    }

    /** Lo que el hilo de fondo deja listo para el hilo de render: o «quitar la skin», o los 64×64 píxeles ya decodificados. */
    private static final class Res { boolean clear; int[] px; boolean slim; }
    private static volatile Res pending;
    private static final java.util.concurrent.atomic.AtomicBoolean busy = new java.util.concurrent.atomic.AtomicBoolean();
    private static volatile boolean force;
    private static long jMod = -1, pMod = -1;   // lastModified de skin-local.json y del png que ya se leyeron (solo los toca el hilo de fondo)

    /**
     * Cada segundo el hilo de render lanza una comprobación en otro hilo. Esa comprobación mira el lastModified de los dos archivos y solo
     * si cambió alguno los lee y decodifica la imagen (sin tocar el hilo de render). El hilo de render solo registra la textura cuando está lista.
     */
    private static void poll() {
        Res r = pending;
        if (r != null) { pending = null; apply(r); }
        long now = System.currentTimeMillis();
        if (now - lastCheck < 1000 && !force) return;
        if (!NovaMc.onRenderThread()) return;                          // y no se gasta el turno si lo pide otro hilo
        lastCheck = now; force = false;
        reapOld(now);
        if (!busy.compareAndSet(false, true)) return;
        java.util.concurrent.CompletableFuture.runAsync(() -> { try { check(); } catch (Throwable e) { /* sin skin local: se ve la normal */ } finally { busy.set(false); } });
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

    /** Hilo de render: solo registrar la textura. */
    private static void apply(Res r) {
        try {
            Minecraft mc = Minecraft.getInstance();
            if (r.clear) { clear(mc); return; }
            NativeImage ni = new NativeImage(NativeImage.Format.RGBA, 64, 64, false);
            for (int y = 0; y < 64; y++) for (int x = 0; x < 64; x++) NovaCompat.setPixel(ni, x, y, r.px[y * 64 + x]);
            Identifier n = Identifier.tryParse("nova:skin/local" + (seq++));
            mc.getTextureManager().register(n, NovaCompat.newTex(ni));
            Identifier old = id;
            id = n;
            slim = r.slim;
            if (old != null) retire(old);
        } catch (Throwable e) { /* sin skin local: se ve la normal */ }
    }

    private static void clear(Minecraft mc) {
        if (id == null) return;
        Identifier old = id;
        id = null;
        retire(old);
    }

    // La textura anterior no se destruye al momento: algún fotograma aún puede llevarla y saldría la textura «no encontrada».
    private static final java.util.ArrayDeque<Object[]> OLD = new java.util.ArrayDeque<>();
    private static int fails;
    private static void retire(Identifier old) { OLD.add(new Object[] { old, System.currentTimeMillis() + 3000 }); }
    private static void reapOld(long now) {
        Minecraft mc = Minecraft.getInstance();
        while (!OLD.isEmpty() && (long) OLD.peek()[1] <= now) {
            Identifier o = (Identifier) OLD.poll()[0];
            try { mc.getTextureManager().release(o); } catch (Throwable ignored) { }
        }
    }

    public static boolean slim() { return slim; }

    /** Fuerza que la próxima consulta lea ya los archivos (tras cambiar la skin desde el menú del juego). */
    static void refresh() { force = true; }

    /** Las skins antiguas de 64×32 se convierten a 64×64 como hace el juego (la pierna y el brazo izquierdos son el espejo de los derechos). */
    private static BufferedImage legacy(BufferedImage s) {
        BufferedImage o = new BufferedImage(64, 64, BufferedImage.TYPE_INT_ARGB);
        for (int y = 0; y < s.getHeight(); y++) for (int x = 0; x < 64; x++) o.setRGB(x, y, s.getRGB(x, y));
        if (s.getHeight() == 64) return o;
        int[][] r = { {4, 16, 16, 32, 4, 4}, {8, 16, 16, 32, 4, 4}, {0, 20, 24, 32, 4, 12}, {4, 20, 16, 32, 4, 12}, {8, 20, 8, 32, 4, 12}, {12, 20, 16, 32, 4, 12},
                      {44, 16, -8, 32, 4, 4}, {48, 16, -8, 32, 4, 4}, {40, 20, 0, 32, 4, 12}, {44, 20, -8, 32, 4, 12}, {48, 20, -16, 32, 4, 12}, {52, 20, -8, 32, 4, 12} };
        for (int[] q : r) for (int j = 0; j < q[5]; j++) for (int i = 0; i < q[4]; i++) o.setRGB(q[0] + q[2] + (q[4] - 1 - i), q[1] + q[3] + j, s.getRGB(q[0] + i, q[1] + j));
        return o;
    }

    /** ¿Esta fila de la lista de jugadores es la del jugador local? (se compara el nombre de la sesión; GameProfile.getName() / name() según la versión) */
    public static boolean mine(PlayerInfo e) {
        try {
            if (e == null) return false;
            Object p = e.getProfile();
            if (nameM == null) { for (String n : new String[] { "getName", "name" }) { try { nameM = p.getClass().getMethod(n); break; } catch (NoSuchMethodException ignored) { } } }
            var s = Minecraft.getInstance().getUser();
            return s != null && String.valueOf(nameM.invoke(p)).equalsIgnoreCase(s.getName());
        } catch (Throwable t) { return false; }
    }
}
