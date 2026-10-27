package dev.astrion.nova;

import java.util.List;
import net.minecraft.client.multiplayer.chat.GuiMessage;

/** Lo que el mixin de ChatHud enseña del chat del juego (líneas visibles, desplazamiento y recarga). */
public interface NovaChatAccess {
    List<GuiMessage.Line> nova$visible();

    int nova$scrolled();

    void nova$refresh();
}
