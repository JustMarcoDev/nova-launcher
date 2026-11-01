package dev.astrion.nova;

import net.minecraft.client.Minecraft;

/** Modo streamer (capa de esta rama): la tecla y el archivo estado.json para el overlay de OBS del launcher. */
final class NovaStream {
    private NovaStream() { }

    private static final String VER = System.getProperty("nova.mc", "");

    /** Cada fotograma (también fuera de una partida). */
    static void tick(Minecraft mc) {
        try {
            boolean down = NovaStreamCore.key > 0 && NovaGui.screen(mc) == null && NovaInput.key(NovaStreamCore.key);
            if (NovaStreamCore.edge(down)) {
                NovaStreamCore.on = !NovaStreamCore.on;
                NovaSettings.save();
                NovaToasts.push(NovaLang.tr("Modo streamer") + ": " + (NovaStreamCore.on ? NovaLang.tr("Sí") : NovaLang.tr("No")));
            }
            long now = System.currentTimeMillis();
            boolean inWorld = mc.player != null;
            String[] cs = inWorld ? NovaMc.currentServer() : null;
            String server = NovaStreamCore.serverLabel(cs == null ? "" : cs[0], cs != null, inWorld && cs == null);
            NovaStreamCore.write(NovaSettings.DIR, NovaStreamCore.json(mc.getFps(), server, VER, inWorld ? NovaSessionCore.fmt(NovaSessionCore.elapsedMs(now)) : "", NovaMc.userName(), inWorld, now), now);
        } catch (Throwable ignored) { }
    }
}
