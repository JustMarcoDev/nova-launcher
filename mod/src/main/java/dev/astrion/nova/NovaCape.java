package dev.astrion.nova;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.PlayerListEntry;
import net.minecraft.util.Identifier;

/**
 * Capa de Nova: los jugadores que usan Nova (los que el servidor de presencia reconoce, los mismos que llevan el logo en la lista TAB)
 * llevan una capa de Nova que solo ven quienes también usan Nova. Si el jugador ya tiene una capa de verdad, se respeta la suya.
 * Se activa o se quita en «Editar HUD» → «Capa de Nova».
 */
public final class NovaCape {
    private NovaCape() { }

    private static final Identifier ID = Identifier.tryParse("nova:textures/cape/nova.png");
    private static boolean reg;
    private static long lastLoad;
    /** Solo para pruebas (-Dnova.cape.test=1): todos los jugadores llevan la capa aunque no haya servidor de presencia. */
    private static final boolean TEST = System.getProperty("nova.cape.test") != null;

    /** Textura de la capa (se registra la primera vez, en el hilo de render), o null si aún no se puede. */
    public static Identifier id() {
        if (!reg) {
            try {
                MinecraftClient mc = MinecraftClient.getInstance();
                if (mc == null || !mc.isOnThread()) return null;
                reg = true;
                NovaTitleScreen.reg(mc, "textures/cape/nova.png");
            } catch (Throwable t) { return null; }
        }
        return ID;
    }

    /** ¿Debe llevar la capa de Nova este jugador de la lista? */
    public static boolean wants(PlayerListEntry e) {
        try {
            long now = System.currentTimeMillis();
            if (now - lastLoad > 2000) { lastLoad = now; NovaSettings.load(); }   // los ajustes se releen como mucho cada 2 s (esto se llama por jugador y fotograma)
            if (!NovaSettings.showCape) return false;
            return TEST || NovaPresence.has(e);
        } catch (Throwable t) { return false; }
    }
}
