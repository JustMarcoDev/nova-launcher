package dev.astrion.nova;

import com.mojang.blaze3d.platform.NativeImage;
import java.io.File;
import java.io.RandomAccessFile;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.renderer.texture.DynamicTexture;
import net.minecraft.resources.Identifier;
import net.minecraft.util.Util;

/**
 * Fondo en vídeo: el launcher pasa en -Dnova.bg un archivo con los fotogramas JPEG ya listos (formato NVB1).
 * Un hilo decodifica los fotogramas que van a tocar (un búfer de {@link #BUF} como máximo, nunca el vídeo entero) y el hilo de dibujo solo sube el que toca a la textura.
 * Existe una versión 720p del archivo («x.nvb» → «x.720.nvb»): se usa si la pantalla mide menos de 1080 px de alto o con -Dnova.lowpower=true.
 * Al salir del título de Nova se detiene todo y se liberan las texturas (así no consume nada en Ajustes, Multijugador ni en partida);
 * al volver, el vídeo sigue por donde iba.
 */
final class NovaBg {
    static final Identifier ID = Identifier.tryParse("nova:bg/video");
    /** Fotogramas decodificados por adelantado como máximo (pocos, para gastar poca memoria). */
    private static final int BUF = Boolean.getBoolean("nova.lowpower") ? 2 : 3;
    private static boolean tried, ready;
    private static RandomAccessFile file;
    private static int n, fps, w, h;
    private static int[] off;
    private static DynamicTexture tex;
    private static boolean workerErr, drawErr;
    private static final boolean DBG = System.getProperty("nova.debughud") != null;
    private static long dbgT;
    private static final java.util.concurrent.ConcurrentLinkedQueue<Frame> queue = new java.util.concurrent.ConcurrentLinkedQueue<>();
    private static volatile boolean stop;
    private static Thread worker;
    private static boolean shown;
    private static long t0;
    /** Dónde iba el vídeo (ms) al pausarlo, para seguir desde ahí al volver al título. */
    private static long resumeMs;
    private static String resumePath = "";
    private static String curPath = "";

    private static final class Frame {
        final long abs; final NativeImage img;
        Frame(long abs, NativeImage img) { this.abs = abs; this.img = img; }
    }

    /** Elige el archivo: la versión 720p si la pantalla es pequeña o hay poca potencia, y si existe. */
    static String pick(Minecraft mc, String p) {
        if (p == null || !p.endsWith(".nvb") || p.endsWith(".720.nvb")) return p;
        boolean small = false;
        try { small = mc.getWindow().getHeight() < 1080; } catch (Throwable ignored) { }
        if (small || Boolean.getBoolean("nova.lowpower")) {
            File low = new File(p.substring(0, p.length() - 4) + ".720.nvb");
            if (low.isFile() && low.length() > 32) return low.getPath();
        }
        return p;
    }

    static void start(Minecraft mc) {
        if (tried) return;
        NovaSettings.load();
        start(mc, NovaSettings.bgPath());
    }

    /** Cambia el fondo al momento (sin reiniciar el juego). Ruta vacía = fondo oscuro sin vídeo. */
    static void switchTo(Minecraft mc, String path) {
        stop(mc);
        resumeMs = 0;   // otro vídeo: empieza desde el principio
        start(mc, path);
    }

    private static long now() { return Util.getMillis(); }

    private static void start(Minecraft mc, String p0) {
        tried = true;
        String p = pick(mc, p0);
        if (DBG) System.out.println("[NOVA-BG] start p0=" + p0 + " p=" + p);
        if (p == null || p.isEmpty()) return;
        try {
            RandomAccessFile f = new RandomAccessFile(p, "r");
            byte[] head = new byte[16];
            f.readFully(head);
            ByteBuffer b = ByteBuffer.wrap(head).order(ByteOrder.LITTLE_ENDIAN);
            if (b.getInt() != 0x3142564E) { f.close(); return; }   // «NVB1»
            n = b.getInt(); fps = b.getShort() & 0xFFFF; w = b.getShort() & 0xFFFF; h = b.getShort() & 0xFFFF;
            if (n < 1 || fps < 1 || w < 16 || h < 16) { f.close(); return; }
            byte[] idx = new byte[4 * (n + 1)];
            f.readFully(idx);
            ByteBuffer ib = ByteBuffer.wrap(idx).order(ByteOrder.LITTLE_ENDIAN);
            off = new int[n + 1];
            for (int i = 0; i <= n; i++) off[i] = ib.getInt();
            file = f;   // los fotogramas se leen del disco según toca: no se carga el archivo entero en memoria
            NativeImage img = new NativeImage(NativeImage.Format.RGBA, w, h, false);
            for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) NovaCompat.setPixel(img, x, y, 0xFF080A14);   // azul oscuro
            tex = NovaCompat.newTex(img);
            try { NovaCompat.smooth(tex); } catch (Throwable ignored) { }
            mc.getTextureManager().register(ID, tex);
            stop = false;
            curPath = p0 == null ? "" : p0;
            t0 = now() - (curPath.equals(resumePath) && !NovaAcc.still() ? resumeMs : 0);
            worker = new Thread(NovaBg::run, "nova-bg");
            worker.setDaemon(true);
            worker.start();
            ready = true;
            if (DBG) System.out.println("[NOVA-BG] listo n=" + n + " " + w + "x" + h + "@" + fps);
        } catch (Throwable e) {
            ready = false;
            System.out.println("[NOVA] fondo: no se pudo iniciar (" + p + "): " + e);
            e.printStackTrace(System.out);
        }
    }

    private static NativeImage decode(byte[] buf, int len) throws Exception {
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

    /** Hilo de decodificación: va por delante del reloj hasta {@link #BUF} fotogramas y descarta los que ya llegaron tarde. */
    private static void run() {
        long lastAbs = -1;
        byte[] buf = new byte[1 << 20];
        while (!stop) {
            try {
                if (NovaAcc.still() && lastAbs >= 0) { try { Thread.sleep(50); } catch (InterruptedException e) { return; } continue; }   // reducir movimiento: solo el primer fotograma
                long cur = NovaAcc.still() ? 0 : (now() - t0) * fps / 1000L;                  // fotograma que toca ahora (sin dar la vuelta)
                long next = Math.max(lastAbs + 1, cur);
                if (queue.size() < BUF && next <= cur + BUF) {
                    int i = (int) (next % n), len = off[i + 1] - off[i];
                    if (len > buf.length) buf = new byte[len];
                    file.seek(off[i]);
                    file.readFully(buf, 0, len);
                    NativeImage ni = decode(buf, len);
                    if (stop) { ni.close(); return; }
                    queue.add(new Frame(next, ni));
                    lastAbs = next;
                    continue;
                }
                Thread.sleep(4);
            } catch (InterruptedException e) {
                return;
            } catch (Throwable e) {
                if (!workerErr) { workerErr = true; System.out.println("[NOVA] fondo: error al leer un fotograma: " + e); e.printStackTrace(System.out); }
                try { Thread.sleep(200); } catch (InterruptedException ie) { return; }
            }
        }
    }

    /** Dibuja el vídeo cubriendo toda la pantalla (recortando lo que sobre). Devuelve false si no hay vídeo. */
    static boolean draw(GuiGraphicsExtractor c, int sw, int sh, float alpha) {
        if (DBG && now() - dbgT > 3000) { dbgT = now(); System.out.println("[NOVA-BG] draw ready=" + ready + " shown=" + shown + " cola=" + queue.size()); }
        if (!ready) return false;
        long cur = NovaAcc.still() ? 0 : (now() - t0) * fps / 1000L;
        Frame take = null;
        for (Frame f; (f = queue.peek()) != null && f.abs <= cur; ) {   // el último fotograma que ya toca; los anteriores se descartan
            queue.poll();
            if (take != null) take.img.close();
            take = f;
        }
        if (take != null) {
            tex.setPixels(take.img);   // cierra la imagen anterior
            tex.upload();
            shown = true;
        }
        if (!shown) return true;
        float ar = (float) sw / sh, vr = (float) w / h;
        int rw = w, rh = h;
        float u = 0, v = 0;
        if (ar > vr) { rh = Math.round(w / ar); v = (h - rh) / 2f; }
        else { rw = Math.round(h * ar); u = (w - rw) / 2f; }
        NovaCompat.blit(c, ID, 0, 0, sw, sh, u, v, rw, rh, w, h, alpha);
        return true;
    }

    /** Pausa: detiene el hilo, libera texturas y fotogramas y recuerda dónde iba el vídeo. */
    static void stop(Minecraft mc) {
        if (ready) { resumeMs = Math.max(0, now() - t0); resumePath = curPath; }
        stop = true;
        Thread t = worker;
        worker = null;
        if (t != null) { t.interrupt(); try { t.join(300); } catch (InterruptedException ignored) { } }
        for (Frame f; (f = queue.poll()) != null; ) { try { f.img.close(); } catch (Throwable ignored) { } }
        if (ready) { try { mc.getTextureManager().release(ID); } catch (Throwable ignored) { } }
        try { if (file != null) file.close(); } catch (Throwable ignored) { }
        file = null; off = null; tex = null; ready = false; shown = false;
        tried = false;
    }
}
