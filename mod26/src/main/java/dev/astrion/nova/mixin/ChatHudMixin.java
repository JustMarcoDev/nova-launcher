package dev.astrion.nova.mixin;

import dev.astrion.nova.NovaChat;
import dev.astrion.nova.NovaChatAccess;
import java.util.List;
import net.minecraft.client.multiplayer.chat.GuiMessage;
import net.minecraft.client.gui.components.ChatComponent;
import net.minecraft.network.chat.Component;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.ModifyVariable;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * «Chat mejorado» (hora y menciones al entrar el mensaje, buscador al recargar el chat).
 * addMessage(Text, firma, indicador) es público y igual en las 19 versiones; refresh() y los campos de líneas visibles también.
 */
@Mixin(ChatComponent.class)
public abstract class ChatHudMixin implements NovaChatAccess {
    @Shadow @org.spongepowered.asm.mixin.Final private List<GuiMessage.Line> trimmedMessages;
    @Shadow private int chatScrollbarPos;

    @Shadow protected abstract void refreshTrimmedMessages();

    @Override public List<GuiMessage.Line> nova$visible() { return trimmedMessages; }
    @Override public int nova$scrolled() { return chatScrollbarPos; }
    @Override public void nova$refresh() { refreshTrimmedMessages(); }

    @ModifyVariable(method = "addMessage(Lnet/minecraft/network/chat/Component;Lnet/minecraft/network/chat/MessageSignature;Lnet/minecraft/client/multiplayer/chat/GuiMessageSource;Lnet/minecraft/client/multiplayer/chat/GuiMessageTag;)V", at = @At("HEAD"), argsOnly = true, require = 0)
    private Component nova$decorate(Component message) {
        return NovaChat.decorate(message);
    }

    @Inject(method = "addMessage(Lnet/minecraft/network/chat/Component;Lnet/minecraft/network/chat/MessageSignature;Lnet/minecraft/client/multiplayer/chat/GuiMessageSource;Lnet/minecraft/client/multiplayer/chat/GuiMessageTag;)V", at = @At("TAIL"), require = 0)
    private void nova$added(Component message, net.minecraft.network.chat.MessageSignature sig, net.minecraft.client.multiplayer.chat.GuiMessageSource src, net.minecraft.client.multiplayer.chat.GuiMessageTag ind, CallbackInfo ci) {
        NovaChat.added();
    }

    @Inject(method = "refreshTrimmedMessages()V", at = @At("TAIL"), require = 0)
    private void nova$filter(CallbackInfo ci) {
        NovaChat.filter(trimmedMessages);
    }
}
