package dev.astrion.nova;

import java.awt.image.BufferedImage;
import java.io.File;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.PlayerListEntry;
import net.minecraft.client.texture.NativeImage;
import net.minecraft.client.texture.NativeImageBackedTexture;
import net.minecraft.util.Identifier;

/**
 * Skin local para cuentas sin conexión: el launcher pasa la skin elegida (-Dnova.skin) y -Dnova.skinlocal=1,
 * y los mixins de cada versión (capa skin-*) la ponen al jugador local. Solo la ve quien juega, nadie más.
 */
public final class NovaLocalSkin {
    private NovaLocalSkin() { }

    private static boolean tried;
    private static Identifier id;
    private static boolean slim;
    private static java.lang.reflect.Method nameM;

    private static boolean wanted() { return "1".equals(System.getProperty("nova.skinlocal", "0")); }

    /** Textura de la skin (se crea la primera vez que hace falta). Null si no hay skin local. */
    public static Identifier id() {
        if (!wanted()) return null;
        if (!tried) {
            tried = true;
            try {
                File f = new File(System.getProperty("nova.skin", ""));
                BufferedImage s = f.isFile() ? javax.imageio.ImageIO.read(f) : null;
                if (s != null && s.getWidth() == 64 && (s.getHeight() == 64 || s.getHeight() == 32)) {
                    slim = "slim".equals(System.getProperty("nova.skinmodel", ""));
                    BufferedImage full = legacy(s);
                    NativeImage ni = new NativeImage(NativeImage.Format.RGBA, 64, 64, false);
                    for (int y = 0; y < 64; y++) for (int x = 0; x < 64; x++) NovaCompat.setPixel(ni, x, y, full.getRGB(x, y));
                    NativeImageBackedTexture t = NovaCompat.newTex(ni);
                    Identifier i = Identifier.tryParse("nova:skin/local");
                    MinecraftClient.getInstance().getTextureManager().registerTexture(i, t);
                    id = i;
                }
            } catch (Throwable e) { id = null; }
        }
        return id;
    }

    public static boolean slim() { return slim; }

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
    public static boolean mine(PlayerListEntry e) {
        try {
            if (!wanted() || e == null) return false;
            Object p = e.getProfile();
            if (nameM == null) { for (String n : new String[] { "getName", "name" }) { try { nameM = p.getClass().getMethod(n); break; } catch (NoSuchMethodException ignored) { } } }
            var s = MinecraftClient.getInstance().getSession();
            return s != null && String.valueOf(nameM.invoke(p)).equals(s.getUsername());
        } catch (Throwable t) { return false; }
    }
}
