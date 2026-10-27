package dev.astrion.nova;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.screens.ConnectScreen;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.multiplayer.ServerData;
import net.minecraft.client.multiplayer.resolver.ServerAddress;

/** Entrar a un servidor desde el menú de Nova (capa conn-d: la firma de ConnectScreen.connect cambia según la versión). */
final class NovaConnect {
    private NovaConnect() { }

    static void connect(Minecraft mc, Screen parent, String name, String address) {
        ServerData info = new ServerData(name, address, ServerData.Type.OTHER);
        ConnectScreen.startConnecting(parent, mc, ServerAddress.parseString(address), info, false, null);
    }
}
