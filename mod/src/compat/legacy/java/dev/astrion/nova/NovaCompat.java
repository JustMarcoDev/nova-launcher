package dev.astrion.nova;

import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.texture.NativeImage;
import net.minecraft.util.Identifier;

/** Lo que cambia entre versiones de Minecraft. Este es el de 1.20.x y 1.21 / 1.21.1 (perfil «legacy» en mod/versions.txt). */
final class NovaCompat {
    private NovaCompat() { }

    /** Dibuja una región de una textura con transparencia (alpha 0..1). */
    static void blit(DrawContext c, Identifier id, int x, int y, int w, int h, float u, float v, int rw, int rh, int tw, int th, float alpha) {
        com.mojang.blaze3d.systems.RenderSystem.enableBlend();
        c.setShaderColor(1f, 1f, 1f, alpha);
        c.drawTexture(id, x, y, w, h, u, v, rw, rh, tw, th);
        c.setShaderColor(1f, 1f, 1f, 1f);
    }

    /** Escribe un píxel ARGB (en estas versiones NativeImage guarda ABGR). */
    static void setPixel(NativeImage img, int x, int y, int argb) {
        img.setColor(x, y, (argb & 0xFF00FF00) | ((argb >> 16) & 255) | ((argb & 255) << 16));
    }
}
