package dev.astrion.nova.mixin;

import dev.astrion.nova.NovaChat;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.screen.ChatScreen;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.widget.TextFieldWidget;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** «Chat mejorado»: pone el buscador en el chat abierto (si está activado). init() es igual en todas las versiones. */
@Mixin(ChatScreen.class)
public abstract class ChatScreenMixin {
    @Inject(method = "init", at = @At("TAIL"), require = 0)
    private void nova$search(CallbackInfo ci) {
        Screen s = (Screen) (Object) this;
        TextFieldWidget f = NovaChat.searchField(MinecraftClient.getInstance(), s.width, s.height);
        if (f != null) ((ScreenInvoker) (Object) s).nova$add(f);
    }
}
