package dev.astrion.nova;

import com.mojang.blaze3d.platform.NativeImage;
import net.minecraft.client.Minecraft;
import net.minecraft.client.multiplayer.PlayerInfo;
import net.minecraft.resources.Identifier;

/**
 * Skin local: la skin elegida en el launcher (cuenta sin conexión o de Microsoft) se pone al jugador local con los mixins de cada versión (capa skin-*).
 * Solo la ve quien juega; en Microsoft el launcher además la sube a Mojang para que la vean los demás.
 * La lectura de los archivos y la decodificación están en NovaLocalSkinCore (mod-common, en otro hilo); aquí solo se registra la textura.
 */
public final class NovaLocalSkin {
    private NovaLocalSkin() { }

    private static Identifier id;
    private static boolean slim;
    private static int seq;
    private static java.lang.reflect.Method nameM;

    /**
     * Textura de la skin elegida en el launcher, o null si no hay. El launcher deja <nova.dir>/skin-local.png y skin-local.json
     * ({on, user, model, v}); se vigila cada segundo, así que un cambio de skin se ve sin reiniciar el juego.
     */
    public static Identifier id() {
        poll();
        return id;
    }

    private static void poll() {
        NovaLocalSkinCore.Res r = NovaLocalSkinCore.take();
        if (r != null) apply(r);
        long now = System.currentTimeMillis();
        if (!NovaLocalSkinCore.due(now)) return;
        reapOld(now);
        NovaLocalSkinCore.checkAsync();
    }

    /** Hilo de render: solo registrar la textura. */
    private static void apply(NovaLocalSkinCore.Res r) {
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
    static void refresh() { NovaLocalSkinCore.refresh(); }

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
