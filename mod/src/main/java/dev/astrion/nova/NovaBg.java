package dev.astrion.nova;

import java.io.RandomAccessFile;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.texture.NativeImage;
import net.minecraft.client.texture.NativeImageBackedTexture;
import net.minecraft.util.Identifier;
import net.minecraft.util.Util;

/**
 * Fondo en vídeo: el launcher pasa en -Dnova.bg un archivo con los fotogramas JPEG ya listos (formato NVB1).
 * Un hilo decodifica el fotograma que toca y el hilo de dibujo solo lo sube a la textura.
 * Al salir del menú se detiene todo, así no consume nada mientras juegas.
 */
final class NovaBg {
    static final Identifier ID = Identifier.tryParse("nova:bg/video");
    private static boolean tried, ready;
    private static byte[] data;
    private static int n, fps, w, h;
    private static int[] off;
    private static NativeImageBackedTexture tex;
    private static volatile int[] pending;
    private static volatile boolean stop;
    private static Thread worker;
    private static boolean shown;
    private static long t0;

    static void start(MinecraftClient mc) {
        if (tried) return;
        tried = true;
        String p = System.getProperty("nova.bg", "");
        if (p.isEmpty()) return;
        try (RandomAccessFile f = new RandomAccessFile(p, "r")) {
            byte[] all = new byte[(int) f.length()];
            f.readFully(all);
            ByteBuffer b = ByteBuffer.wrap(all).order(ByteOrder.LITTLE_ENDIAN);
            if (b.getInt() != 0x3142564E) return;   // «NVB1»
            n = b.getInt(); fps = b.getShort() & 0xFFFF; w = b.getShort() & 0xFFFF; h = b.getShort() & 0xFFFF; b.getShort();
            if (n < 2 || fps < 1 || w < 16 || h < 16) return;
            off = new int[n + 1];
            for (int i = 0; i <= n; i++) off[i] = b.getInt();
            data = all;
            NativeImage img = new NativeImage(NativeImage.Format.RGBA, w, h, false);
            for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) img.setColor(x, y, 0xFF140A08);   // ABGR: azul oscuro
            tex = new NativeImageBackedTexture(img);
            try { tex.setFilter(true, false); } catch (Throwable ignored) { }
            mc.getTextureManager().registerTexture(ID, tex);
            stop = false;
            t0 = Util.getMeasuringTimeMs();
            worker = new Thread(NovaBg::run, "nova-bg");
            worker.setDaemon(true);
            worker.start();
            ready = true;
        } catch (Throwable e) {
            ready = false;
        }
    }

    private static void run() {
        int last = -1;
        while (!stop) {
            try {
                int idx = (int) (((Util.getMeasuringTimeMs() - t0) * fps / 1000L) % n);
                if (idx != last && pending == null) {
                    java.awt.image.BufferedImage im = javax.imageio.ImageIO.read(new java.io.ByteArrayInputStream(data, off[idx], off[idx + 1] - off[idx]));
                    int[] px = im.getRGB(0, 0, w, h, null, 0, w);
                    pending = px;
                    last = idx;
                }
                Thread.sleep(8);
            } catch (InterruptedException e) {
                return;
            } catch (Throwable e) {
                try { Thread.sleep(200); } catch (InterruptedException ie) { return; }
            }
        }
    }

    /** Dibuja el vídeo cubriendo toda la pantalla (recortando lo que sobre). Devuelve false si no hay vídeo. */
    static boolean draw(DrawContext c, int sw, int sh, float alpha) {
        if (!ready) return false;
        int[] px = pending;
        if (px != null) {
            pending = null;
            NativeImage img = tex.getImage();
            if (img != null) {
                for (int y = 0; y < h; y++) {
                    int r = y * w;
                    for (int x = 0; x < w; x++) {
                        int p = px[r + x];
                        img.setColor(x, y, 0xFF000000 | ((p & 255) << 16) | (p & 0xFF00) | ((p >> 16) & 255));
                    }
                }
                tex.upload();
                shown = true;
            }
        }
        if (!shown) return true;
        float ar = (float) sw / sh, vr = (float) w / h;
        int rw = w, rh = h;
        float u = 0, v = 0;
        if (ar > vr) { rh = Math.round(w / ar); v = (h - rh) / 2f; }
        else { rw = Math.round(h * ar); u = (w - rw) / 2f; }
        com.mojang.blaze3d.systems.RenderSystem.enableBlend();
        c.setShaderColor(1f, 1f, 1f, alpha);
        c.drawTexture(ID, 0, 0, sw, sh, u, v, rw, rh, w, h);
        c.setShaderColor(1f, 1f, 1f, 1f);
        return true;
    }

    static void stop(MinecraftClient mc) {
        stop = true;
        if (worker != null) worker.interrupt();
        worker = null;
        if (ready) { try { mc.getTextureManager().destroyTexture(ID); } catch (Throwable ignored) { } }
        ready = false; shown = false; pending = null; data = null; off = null; tex = null;
        tried = false;
    }
}
