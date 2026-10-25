package dev.astrion.nova;

import net.minecraft.client.gui.screen.multiplayer.ConnectScreen;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.network.ServerAddress;
import net.minecraft.client.network.ServerInfo;

/** Entrar a un servidor desde el menú de Nova (capa conn-c: la firma de ConnectScreen.connect cambia según la versión). */
final class NovaConnect {
    private NovaConnect() { }

    static void connect(MinecraftClient mc, Screen parent, String name, String address) {
        ServerInfo info = new ServerInfo(name, address, ServerInfo.ServerType.OTHER);
        ConnectScreen.connect(parent, mc, ServerAddress.parse(address), info, false);
    }
}
