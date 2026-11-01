package dev.astrion.nova;

import net.minecraft.client.Minecraft;
import java.io.File;

/** Clips de los últimos 30 s (capa de esta rama): la tecla F8 y los avisos. La lógica está en NovaClipCore. */
final class NovaClip {
    private NovaClip() { }

    /** Cada fotograma con el jugador en el mundo. */
    static void tick(Minecraft mc) {
        try {
            if (!NovaClipCore.ON) return;
            File dir = new File(mc.gameDirectory, "screenshots");
            long now = System.currentTimeMillis();
            boolean down = NovaGui.screen(mc) == null && NovaInput.key(NovaMc.keyClip());
            String say = NovaClipCore.edge(down) ? NovaClipCore.request(dir, now) : null;
            if (say == null) say = NovaClipCore.poll(dir, now);
            if (say != null) NovaToasts.push(say);
        } catch (Throwable ignored) { }
    }
}
