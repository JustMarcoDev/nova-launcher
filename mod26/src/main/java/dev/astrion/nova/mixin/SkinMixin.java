package dev.astrion.nova.mixin;

import dev.astrion.nova.NovaCape;
import dev.astrion.nova.NovaLocalSkin;
import net.minecraft.client.multiplayer.PlayerInfo;
import net.minecraft.core.ClientAsset;
import net.minecraft.resources.Identifier;
import net.minecraft.world.entity.player.PlayerModelType;
import net.minecraft.world.entity.player.PlayerSkin;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Skin local y capa de Nova desde la 1.21.9: las texturas son «assets» con id y ruta. */
@Mixin(PlayerInfo.class)
public class SkinMixin {
    @Inject(method = "getSkin", at = @At("RETURN"), cancellable = true)
    private void nova$skin(CallbackInfoReturnable<PlayerSkin> cir) {
        PlayerInfo self = (PlayerInfo) (Object) this;
        PlayerSkin o = cir.getReturnValue();
        Identifier id = NovaLocalSkin.mine(self) ? NovaLocalSkin.id() : null;
        Identifier cape = o.cape() == null && NovaCape.wants(self) ? NovaCape.id() : null;   // la capa de Nova solo si no tiene ya una suya
        if (id == null && cape == null) return;
        ClientAsset.ResourceTexture ca = cape == null ? null : new ClientAsset.ResourceTexture(cape, cape);
        cir.setReturnValue(new PlayerSkin(id != null ? new ClientAsset.ResourceTexture(id, id) : o.body(),
                ca != null ? ca : o.cape(), ca != null ? ca : o.elytra(),
                id != null ? (NovaLocalSkin.slim() ? PlayerModelType.SLIM : PlayerModelType.WIDE) : o.model(), id != null || o.secure()));
    }
}
