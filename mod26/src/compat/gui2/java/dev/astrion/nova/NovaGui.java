package dev.astrion.nova;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.components.ChatComponent;
import net.minecraft.client.gui.screens.Screen;

/** Capa «gui2» (26.2 y 26.3): Minecraft.gui gestiona las pantallas y el HUD está en gui.hud. */
final class NovaGui {
    private NovaGui() { }
    static Screen screen(Minecraft mc) { return mc.gui.screen(); }
    static void setScreen(Minecraft mc, Screen s) { mc.gui.setScreen(s); }
    static ChatComponent chat(Minecraft mc) { return mc.gui.hud.getChat(); }
    static boolean hidden(Minecraft mc) { return mc.gui.hud.isHidden(); }
}
