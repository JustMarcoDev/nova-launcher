package dev.astrion.nova;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.components.ChatComponent;
import net.minecraft.client.gui.screens.Screen;

/** Capa «gui1» (26.1.x): las pantallas son de Minecraft y el chat y el HUD son de Gui. */
final class NovaGui {
    private NovaGui() { }
    static Screen screen(Minecraft mc) { return mc.screen; }
    static void setScreen(Minecraft mc, Screen s) { mc.setScreen(s); }
    static ChatComponent chat(Minecraft mc) { return mc.gui.getChat(); }
    static boolean hidden(Minecraft mc) { return mc.options.hideGui; }
}
