package dev.astrion.nova;

import java.util.UUID;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.multiplayer.PlayerInfo;

/** Presencia de Nova en la lista de jugadores (nombres de Mojang). La lógica (red, estado) está en NovaPresenceCore (mod-common). */
public final class NovaPresence {
    private NovaPresence() { }

    private static Object logo;                           // NovaGfx.Tex
    private static java.lang.reflect.Method idM;

    /** UUID del jugador de una fila: GameProfile.getId() hasta la 1.21.8 y id() (record) desde la 1.21.9. */
    static UUID uuid(PlayerInfo e) throws Exception {
        Object p = e.getProfile();
        if (idM == null) { for (String n : new String[] { "getId", "id" }) { try { idM = p.getClass().getMethod(n); break; } catch (NoSuchMethodException ignored) { } } }
        return (UUID) idM.invoke(p);
    }

    /** Se llama en cada fotograma de juego. */
    public static void frame(Minecraft mc) { NovaPresenceCore.frame(); }

    public static boolean has(PlayerInfo e) {
        try { return NovaPresenceCore.has(uuid(e)); } catch (Throwable t) { return false; }
    }

    /** Dibuja el logo en el hueco que deja el mixin delante del nombre (x,y = esquina de la fila, donde va la cabeza). */
    public static void draw(GuiGraphicsExtractor c, int x, int y, PlayerInfo e) {
        try {
            if (!has(e)) return;
            Minecraft mc = Minecraft.getInstance();
            boolean heads = true;
            if (logo == null) logo = NovaGfx.logo(mc, 8);
            ((NovaGfx.Tex) logo).drawSized(c, x + (heads ? 9 : 0), y, 8, 8, 1f);
        } catch (Throwable t) { /* sin logo */ }
    }
}
