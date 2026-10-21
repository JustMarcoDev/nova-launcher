package dev.astrion.nova;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.MessageScreen;
import net.minecraft.client.texture.NativeImage;
import net.minecraft.client.texture.NativeImageBackedTexture;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;


/** Lo que cambia entre versiones de Minecraft. Este es el de 1.20 a 1.21.1 (perfil «legacy» en mod/versions.txt). */
final class NovaCompat {
    private NovaCompat() { }

    /** Dibuja una región de una textura con transparencia (alpha 0..1). */
    static void blit(DrawContext c, Identifier id, int x, int y, int w, int h, float u, float v, int rw, int rh, int tw, int th, float alpha) {
        com.mojang.blaze3d.systems.RenderSystem.enableBlend();
        c.setShaderColor(1f, 1f, 1f, alpha);
        c.drawTexture(id, x, y, w, h, u, v, rw, rh, tw, th);
        c.setShaderColor(1f, 1f, 1f, 1f);
    }

    /** Escribe un píxel ARGB. */
    static void setPixel(NativeImage img, int x, int y, int argb) {
        img.setColor(x, y, (argb & 0xFF00FF00) | ((argb >> 16) & 255) | ((argb & 255) << 16));   // en estas versiones NativeImage guarda ABGR
    }

    /** Textura dinámica a partir de una imagen. */
    static NativeImageBackedTexture newTex(NativeImage img) {
        return new NativeImageBackedTexture(img);
    }

    /** Filtro suave (bilineal) para texturas que se dibujan escaladas. */
    static void smooth(NativeImageBackedTexture t) {
        t.setFilter(true, false);
    }

    /** Escala todo lo que se dibuje hasta popScale (k veces, solo en X e Y). */
    static void pushScale(DrawContext c, float k) {
        c.getMatrices().push();
        c.getMatrices().scale(k, k, 1f);
    }

    static void popScale(DrawContext c) {
        c.getMatrices().pop();
    }

    /** Número de versión de Minecraft («1.21.4»). */
    static String gameVersion() {
        return net.minecraft.SharedConstants.getGameVersion().getName();
    }

    /** Sale del mundo o servidor actual (después el menú pone la pantalla siguiente). */
    static void disconnect(MinecraftClient mc, boolean local) {
        mc.world.disconnect();
        if (local) mc.disconnect(new MessageScreen(Text.translatable("menu.savingLevel")));
        else mc.disconnect();
    }
}
