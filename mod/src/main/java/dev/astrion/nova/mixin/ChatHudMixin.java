package dev.astrion.nova.mixin;

import dev.astrion.nova.NovaChat;
import dev.astrion.nova.NovaChatAccess;
import java.util.List;
import net.minecraft.client.gui.hud.ChatHud;
import net.minecraft.client.gui.hud.ChatHudLine;
import net.minecraft.text.Text;
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
@Mixin(ChatHud.class)
public abstract class ChatHudMixin implements NovaChatAccess {
    @Shadow @org.spongepowered.asm.mixin.Final private List<ChatHudLine.Visible> visibleMessages;
    @Shadow private int scrolledLines;

    @Shadow protected abstract void refresh();

    @Override public List<ChatHudLine.Visible> nova$visible() { return visibleMessages; }
    @Override public int nova$scrolled() { return scrolledLines; }
    @Override public void nova$refresh() { refresh(); }

    @ModifyVariable(method = "addMessage(Lnet/minecraft/text/Text;Lnet/minecraft/network/message/MessageSignatureData;Lnet/minecraft/client/gui/hud/MessageIndicator;)V", at = @At("HEAD"), argsOnly = true, require = 0)
    private Text nova$decorate(Text message) {
        return NovaChat.decorate(message);
    }

    @Inject(method = "addMessage(Lnet/minecraft/text/Text;Lnet/minecraft/network/message/MessageSignatureData;Lnet/minecraft/client/gui/hud/MessageIndicator;)V", at = @At("TAIL"), require = 0)
    private void nova$added(Text message, net.minecraft.network.message.MessageSignatureData sig, net.minecraft.client.gui.hud.MessageIndicator ind, CallbackInfo ci) {
        NovaChat.added();
    }

    @Inject(method = "refresh()V", at = @At("TAIL"), require = 0)
    private void nova$filter(CallbackInfo ci) {
        NovaChat.filter(visibleMessages);
    }
}
