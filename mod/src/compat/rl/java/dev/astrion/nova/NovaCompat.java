package dev.astrion.nova;

import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.texture.NativeImage;
import net.minecraft.client.render.RenderLayer;
import net.minecraft.util.Identifier;

/** Lo que cambia entre versiones de Minecraft. Este es el de 1.21.2 a 1.21.5 (perfil «rl»: el dibujo de texturas usa RenderLayer y un color ARGB). */
final class NovaCompat {
    private NovaCompat() { }

    /** Dibuja una región de una textura con transparencia (alpha 0..1). */
    static void blit(DrawContext c, Identifier id, int x, int y, int w, int h, float u, float v, int rw, int rh, int tw, int th, float alpha) {
        int a = Math.max(0, Math.min(255, Math.round(alpha * 255f)));
        c.drawTexture(RenderLayer::getGuiTextured, id, x, y, u, v, w, h, rw, rh, tw, th, (a << 24) | 0xFFFFFF);
    }

    /** Escribe un píxel ARGB. */
    static void setPixel(NativeImage img, int x, int y, int argb) {
        img.setColorArgb(x, y, argb);
    }
}
