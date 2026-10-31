package dev.astrion.nova;

import com.mojang.blaze3d.platform.NativeImage;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.renderer.texture.DynamicTexture;
import net.minecraft.resources.Identifier;

/**
 * Fondo en vídeo: lo que toca Minecraft (textura, imagen de cada fotograma, dibujo). El formato NVB1, el hilo de decodificación y el reloj están en NovaBgCore (mod-common).
 * Al salir del título de Nova se detiene todo y se liberan las texturas (así no consume nada en Ajustes, Multijugador ni en partida); al volver, el vídeo sigue por donde iba.
 */
final class NovaBg {
    static final Identifier ID = Identifier.tryParse("nova:bg/video");
    private static DynamicTexture tex;

    /** Crea la imagen de un fotograma a partir de su JPEG (se llama en el hilo de fondo). */
    private static final NovaBgCore.Sink SINK = new NovaBgCore.Sink() {
        public Object make(byte[] buf, int len, int w, int h) throws Exception {
            java.awt.image.BufferedImage im = javax.imageio.ImageIO.read(new java.io.ByteArrayInputStream(buf, 0, len));
            NativeImage ni = new NativeImage(NativeImage.Format.RGBA, w, h, false);
            if (im.getRaster().getDataBuffer() instanceof java.awt.image.DataBufferByte && im.getType() == java.awt.image.BufferedImage.TYPE_3BYTE_BGR) {
                byte[] d = ((java.awt.image.DataBufferByte) im.getRaster().getDataBuffer()).getData();
                int k = 0;
                for (int y = 0; y < h; y++) for (int x = 0; x < w; x++, k += 3)
                    NovaCompat.setPixel(ni, x, y, 0xFF000000 | ((d[k + 2] & 255) << 16) | ((d[k + 1] & 255) << 8) | (d[k] & 255));
            } else {
                for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
                    int p = im.getRGB(x, y);
                    NovaCompat.setPixel(ni, x, y, 0xFF000000 | (p & 0xFFFFFF));
                }
            }
            return ni;
        }
        public void close(Object img) { ((NativeImage) img).close(); }
    };

    /** Elige el archivo: la versión 720p si la pantalla es pequeña o hay poca potencia, y si existe. */
    static String pick(Minecraft mc, String p) {
        boolean small = false;
        try { small = mc.getWindow().getHeight() < 1080; } catch (Throwable ignored) { }
        return NovaBgCore.pick(p, small);
    }

    static void start(Minecraft mc) {
        if (NovaBgCore.tried()) return;
        NovaSettings.load();
        start(mc, NovaSettings.bgPath());
    }

    /** Cambia el fondo al momento (sin reiniciar el juego). Ruta vacía = fondo oscuro sin vídeo. */
    static void switchTo(Minecraft mc, String path) {
        stop(mc);
        NovaBgCore.restartFrom0();   // otro vídeo: empieza desde el principio
        start(mc, path);
    }

    private static void start(Minecraft mc, String p0) {
        NovaBgCore.begin();
        String p = pick(mc, p0);
        if (p == null || p.isEmpty()) return;
        try {
            if (!NovaBgCore.open(p)) return;
            int w = NovaBgCore.w(), h = NovaBgCore.h();
            NativeImage img = new NativeImage(NativeImage.Format.RGBA, w, h, false);
            for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) NovaCompat.setPixel(img, x, y, 0xFF080A14);   // azul oscuro
            tex = NovaCompat.newTex(img);
            try { NovaCompat.smooth(tex); } catch (Throwable ignored) { }
            mc.getTextureManager().register(ID, tex);
            NovaBgCore.go(p0, SINK);
        } catch (Throwable e) {
            System.out.println("[NOVA] fondo: no se pudo iniciar (" + p + "): " + e);
            e.printStackTrace(System.out);
        }
    }

    /** Dibuja el vídeo cubriendo toda la pantalla (recortando lo que sobre). Devuelve false si no hay vídeo. */
    static boolean draw(GuiGraphicsExtractor c, int sw, int sh, float alpha) {
        if (!NovaBgCore.ready()) return false;
        Object img = NovaBgCore.nextImage();
        if (img != null) {
            tex.setPixels((NativeImage) img);   // cierra la imagen anterior
            tex.upload();
            NovaBgCore.shown(true);
        }
        if (!NovaBgCore.shown()) return true;
        float[] r = NovaBgCore.cover(sw, sh);
        NovaCompat.blit(c, ID, 0, 0, sw, sh, r[0], r[1], (int) r[2], (int) r[3], NovaBgCore.w(), NovaBgCore.h(), alpha);
        return true;
    }

    /** Pausa: detiene el hilo, libera texturas y fotogramas y recuerda dónde iba el vídeo. */
    static void stop(Minecraft mc) {
        boolean was = NovaBgCore.stop();
        if (was) { try { mc.getTextureManager().release(ID); } catch (Throwable ignored) { } }
        tex = null;
    }
}
