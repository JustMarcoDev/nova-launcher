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
    private static RandomAccessFile file;
    private static int n, fps, w, h;
    private static int[] off;
    private static NativeImageBackedTexture tex;
    private static volatile NativeImage pending;
    private static volatile boolean stop;
    private static Thread worker;
    private static boolean shown;
    private static long t0;

    static void start(MinecraftClient mc) {
        if (tried) return;
        tried = true;
        String p = System.getProperty("nova.bg", "");
        if (p.isEmpty()) return;
        try {
            RandomAccessFile f = new RandomAccessFile(p, "r");
            byte[] head = new byte[16];
            f.readFully(head);
            ByteBuffer b = ByteBuffer.wrap(head).order(ByteOrder.LITTLE_ENDIAN);
            if (b.getInt() != 0x3142564E) { f.close(); return; }   // «NVB1»
            n = b.getInt(); fps = b.getShort() & 0xFFFF; w = b.getShort() & 0xFFFF; h = b.getShort() & 0xFFFF;
            if (n < 2 || fps < 1 || w < 16 || h < 16) { f.close(); return; }
            byte[] idx = new byte[4 * (n + 1)];
            f.readFully(idx);
            ByteBuffer ib = ByteBuffer.wrap(idx).order(ByteOrder.LITTLE_ENDIAN);
            off = new int[n + 1];
            for (int i = 0; i <= n; i++) off[i] = ib.getInt();
            file = f;   // los fotogramas se leen del disco según toca: no se carga el archivo entero en memoria
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
        byte[] buf = new byte[1 << 20];
        while (!stop) {
            try {
                int idx = (int) (((Util.getMeasuringTimeMs() - t0) * fps / 1000L) % n);
                if (idx != last && pending == null) {
                    int len = off[idx + 1] - off[idx];
                    if (len > buf.length) buf = new byte[len];
                    file.seek(off[idx]);
                    file.readFully(buf, 0, len);
                    java.awt.image.BufferedImage im = javax.imageio.ImageIO.read(new java.io.ByteArrayInputStream(buf, 0, len));
                    NativeImage ni = new NativeImage(NativeImage.Format.RGBA, w, h, false);
                    if (im.getRaster().getDataBuffer() instanceof java.awt.image.DataBufferByte && im.getType() == java.awt.image.BufferedImage.TYPE_3BYTE_BGR) {
                        byte[] d = ((java.awt.image.DataBufferByte) im.getRaster().getDataBuffer()).getData();
                        int k = 0;
                        for (int y = 0; y < h; y++) for (int x = 0; x < w; x++, k += 3)
                            ni.setColor(x, y, 0xFF000000 | ((d[k] & 255) << 16) | ((d[k + 1] & 255) << 8) | (d[k + 2] & 255));
                    } else {
                        for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
                            int p = im.getRGB(x, y);
                            ni.setColor(x, y, 0xFF000000 | ((p & 255) << 16) | (p & 0xFF00) | ((p >> 16) & 255));
                        }
                    }
                    if (stop) { ni.close(); return; }
                    pending = ni;
                    last = idx;
                }
                Thread.sleep(6);
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
        NativeImage ni = pending;
        if (ni != null) {
            pending = null;
            tex.setImage(ni);   // cierra la imagen anterior
            tex.upload();
            shown = true;
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
        Thread t = worker;
        worker = null;
        if (t != null) { t.interrupt(); try { t.join(300); } catch (InterruptedException ignored) { } }
        NativeImage left = pending;
        pending = null;
        if (left != null) { try { left.close(); } catch (Throwable ignored) { } }
        if (ready) { try { mc.getTextureManager().destroyTexture(ID); } catch (Throwable ignored) { } }
        try { if (file != null) file.close(); } catch (Throwable ignored) { }
        file = null; off = null; tex = null; ready = false; shown = false;
        tried = false;
    }
}
