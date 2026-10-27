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
    private static long lastCheck, version = -1;
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

    private static void poll() {
        long now = System.currentTimeMillis();
        if (now - lastCheck < 1000) return;
        Minecraft mc0 = Minecraft.getInstance();
        if (mc0 == null || !mc0.isSameThread()) return;                  // las texturas solo se registran en el hilo de render (y no se gasta el turno si lo pide otro hilo)
        lastCheck = now;
        reapOld(now);
        try {
            Minecraft mc = mc0;
            String dir = System.getProperty("nova.dir", "");
            if (dir.isEmpty()) return;
            File jf = new File(dir, "skin-local.json");
            if (!jf.isFile()) { clear(mc); return; }
            JsonObject o = JsonParser.parseString(new String(java.nio.file.Files.readAllBytes(jf.toPath()), java.nio.charset.StandardCharsets.UTF_8)).getAsJsonObject();
            var s = mc.getUser();
            boolean on = o.has("on") && o.get("on").getAsBoolean() && s != null && o.has("user") && o.get("user").getAsString().equalsIgnoreCase(s.getName());
            long v = o.has("v") ? o.get("v").getAsLong() : 0;
            if (!on) { clear(mc); version = v; return; }
            if (v == version && id != null) return;
            File pf = new File(dir, "skin-local.png");
            boolean steve = o.has("steve") && o.get("steve").getAsBoolean();
            BufferedImage img = steve ? NovaSkin.steve() : pf.isFile() ? javax.imageio.ImageIO.read(pf) : null;
            if (img == null || img.getWidth() != 64 || (img.getHeight() != 64 && img.getHeight() != 32)) {
                // puede ser una lectura a medias: se reintenta cada segundo antes de darla por mala (y se sigue enseñando la skin anterior)
                if (++fails >= 5) { clear(mc); version = v; fails = 0; }
                return;
            }
            fails = 0;
            BufferedImage full = legacy(img);
            NativeImage ni = new NativeImage(NativeImage.Format.RGBA, 64, 64, false);
            for (int y = 0; y < 64; y++) for (int x = 0; x < 64; x++) NovaCompat.setPixel(ni, x, y, full.getRGB(x, y));
            Identifier n = Identifier.tryParse("nova:skin/local" + (seq++));
            mc.getTextureManager().register(n, NovaCompat.newTex(ni));
            Identifier old = id;
            id = n;
            slim = o.has("model") && "slim".equals(o.get("model").getAsString());
            version = v;
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
    static void refresh() { lastCheck = 0; }

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
