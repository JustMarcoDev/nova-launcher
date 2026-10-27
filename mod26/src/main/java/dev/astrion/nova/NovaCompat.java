package dev.astrion.nova;

import com.mojang.blaze3d.platform.NativeImage;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.renderer.RenderPipelines;
import net.minecraft.client.renderer.texture.DynamicTexture;
import net.minecraft.resources.Identifier;

/** Lo que cambia entre versiones de Minecraft. Este es el de 1.21.11 (perfil «gui11»: nuevo sistema de dibujo con RenderPipelines y matrices 2D). */
final class NovaCompat {
    private NovaCompat() { }

    /** Dibuja una región de una textura con transparencia (alpha 0..1). */
    static void blit(GuiGraphicsExtractor c, Identifier id, int x, int y, int w, int h, float u, float v, int rw, int rh, int tw, int th, float alpha) {
        int a = Math.max(0, Math.min(255, Math.round(alpha * 255f)));
        c.blit(RenderPipelines.GUI_TEXTURED, id, x, y, u, v, w, h, rw, rh, tw, th, (a << 24) | 0xFFFFFF);
    }

    /** Escribe un píxel ARGB. */
    static void setPixel(NativeImage img, int x, int y, int argb) {
        img.setPixel(x, y, argb);
    }

    /** Textura dinámica a partir de una imagen. */
    static DynamicTexture newTex(NativeImage img) {
        return new Tex(img);
    }

    /** Filtro suave (bilineal) para texturas que se dibujan escaladas. */
    static void smooth(DynamicTexture t) {
        if (t instanceof Tex tt) tt.linear();
    }

    /** Escala todo lo que se dibuje hasta popScale (k veces, solo en X e Y). */
    static void pushScale(GuiGraphicsExtractor c, float k) {
        c.pose().pushMatrix();
        c.pose().scale(k, k);
    }

    static void popScale(GuiGraphicsExtractor c) {
        c.pose().popMatrix();
    }

    /** Número de versión de Minecraft («1.21.4»). */
    static String gameVersion() {
        return net.minecraft.SharedConstants.getCurrentVersion().name();
    }

    /** Sale del mundo o servidor actual (después el menú pone la pantalla siguiente). */
    static void disconnect(Minecraft mc, boolean local) {
        mc.level.disconnect(net.minecraft.client.multiplayer.ClientLevel.DEFAULT_QUIT_MESSAGE);
        if (local) mc.disconnectWithSavingScreen();
        else mc.disconnectWithProgressScreen();
    }

    /** En 1.21.11 el filtro de una textura es un «sampler» propio de la textura. */
    private static final class Tex extends DynamicTexture {
        Tex(NativeImage img) { super(() -> "nova", img); }
        void linear() { this.sampler = NovaVer.linearSampler(); }
    }
}
