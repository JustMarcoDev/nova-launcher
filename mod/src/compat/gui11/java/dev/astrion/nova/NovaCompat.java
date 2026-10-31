package dev.astrion.nova;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.texture.NativeImage;
import net.minecraft.client.texture.NativeImageBackedTexture;
import net.minecraft.util.Identifier;
import net.minecraft.client.gl.RenderPipelines;

/** Lo que cambia entre versiones de Minecraft. Este es el de 1.21.11 (perfil «gui11»: nuevo sistema de dibujo con RenderPipelines y matrices 2D). */
final class NovaCompat {
    private NovaCompat() { }

    /** Dibuja una región de una textura con transparencia (alpha 0..1). */
    static void blit(DrawContext c, Identifier id, int x, int y, int w, int h, float u, float v, int rw, int rh, int tw, int th, float alpha) {
        int a = Math.max(0, Math.min(255, Math.round(alpha * 255f)));
        c.drawTexture(RenderPipelines.GUI_TEXTURED, id, x, y, u, v, w, h, rw, rh, tw, th, (a << 24) | 0xFFFFFF);
    }

    /** Escribe un píxel ARGB. */
    static void setPixel(NativeImage img, int x, int y, int argb) {
        img.setColorArgb(x, y, argb);
    }

    /** Textura dinámica a partir de una imagen. */
    static NativeImageBackedTexture newTex(NativeImage img) {
        return new Tex(img);
    }

    /** Filtro suave (bilineal) para texturas que se dibujan escaladas. */
    static void smooth(NativeImageBackedTexture t) {
        if (t instanceof Tex tt) tt.linear();
    }

    /** Escala todo lo que se dibuje hasta popScale (k veces, solo en X e Y). */
    static void pushScale(DrawContext c, float k) {
        c.getMatrices().pushMatrix();
        c.getMatrices().scale(k, k);
    }

    static void popScale(DrawContext c) {
        c.getMatrices().popMatrix();
    }

    /** Número de versión de Minecraft («1.21.4»). */
    static String gameVersion() {
        return net.minecraft.SharedConstants.getGameVersion().name();
    }

    /** Sale del mundo o servidor actual (después el menú pone la pantalla siguiente). */
    static void disconnect(MinecraftClient mc, boolean local) {
        mc.world.disconnect(net.minecraft.client.world.ClientWorld.QUITTING_MULTIPLAYER_TEXT);
        if (local) mc.disconnectWithSavingScreen();
        else mc.disconnectWithProgressScreen();
    }

    /** En 1.21.11 el filtro de una textura es un «sampler» propio de la textura. */
    private static final class Tex extends NativeImageBackedTexture {
        Tex(NativeImage img) { super(() -> "nova", img); }
        void linear() { this.sampler = com.mojang.blaze3d.systems.RenderSystem.getSamplerCache().get(com.mojang.blaze3d.textures.FilterMode.LINEAR); }
    }
}
