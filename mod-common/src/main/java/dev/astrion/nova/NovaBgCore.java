package dev.astrion.nova;

import java.io.File;
import java.io.RandomAccessFile;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.concurrent.ConcurrentLinkedQueue;

/**
 * Fondo en vídeo (lógica común): el launcher pasa en -Dnova.bg un archivo con los fotogramas JPEG ya listos (formato NVB1).
 * Un hilo decodifica los fotogramas que van a tocar (un búfer de {@link #BUF} como máximo, nunca el vídeo entero); el hilo de dibujo solo sube el que toca a la textura.
 * Existe una versión 720p del archivo («x.nvb» → «x.720.nvb»): se usa si la pantalla mide menos de 1080 px de alto o con -Dnova.lowpower=true.
 * Aquí está todo menos lo que toca Minecraft: crear la imagen de un fotograma y cerrarla (Sink), la textura y el blit (NovaBg de cada proyecto).
 */
final class NovaBgCore {
    private NovaBgCore() { }

    /** Lo que pone cada proyecto: convertir los bytes JPEG de un fotograma en su imagen nativa (en el hilo de fondo) y cerrarla. */
    interface Sink {
        Object make(byte[] jpeg, int len, int w, int h) throws Exception;
        void close(Object img);
    }

    /** Fotogramas decodificados por adelantado como máximo (pocos, para gastar poca memoria). */
    private static final int BUF = Boolean.getBoolean("nova.lowpower") ? 2 : 3;
    private static final boolean DBG = System.getProperty("nova.debughud") != null;

    private static boolean tried, ready, shown, workerErr;
    private static RandomAccessFile file;
    private static int n, fps, w, h;
    private static int[] off;
    private static final ConcurrentLinkedQueue<Frame> queue = new ConcurrentLinkedQueue<>();
    private static volatile boolean stop;
    private static Thread worker;
    private static long t0, dbgT;
    /** Dónde iba el vídeo (ms) al pausarlo, para seguir desde ahí al volver al título. */
    private static long resumeMs;
    private static String resumePath = "";
    private static String curPath = "";
    private static Sink sink;

    private static final class Frame {
        final long abs; final Object img;
        Frame(long abs, Object img) { this.abs = abs; this.img = img; }
    }

    static boolean tried() { return tried; }
    static boolean ready() { return ready; }
    static boolean shown() { return shown; }
    static void shown(boolean v) { shown = v; }
    static int w() { return w; }
    static int h() { return h; }
    static long now() { return System.nanoTime() / 1_000_000L; }

    /** Elige el archivo: la versión 720p si la pantalla es pequeña (small) o hay poca potencia, y si existe. */
    static String pick(String p, boolean small) {
        if (p == null || !p.endsWith(".nvb") || p.endsWith(".720.nvb")) return p;
        if (small || Boolean.getBoolean("nova.lowpower")) {
            File low = new File(p.substring(0, p.length() - 4) + ".720.nvb");
            if (low.isFile() && low.length() > 32) return low.getPath();
        }
        return p;
    }

    /** Marca que ya se intentó (para no repetir) y se prepara el cambio de vídeo: otro vídeo empieza desde el principio. */
    static void begin() { tried = true; }
    static void restartFrom0() { resumeMs = 0; }

    /** Abre el archivo y lee la cabecera y el índice. false si no es un NVB1 válido. Después hay que llamar a {@link #go}. */
    static boolean open(String p) {
        try {
            RandomAccessFile f = new RandomAccessFile(p, "r");
            byte[] head = new byte[16];
            f.readFully(head);
            ByteBuffer b = ByteBuffer.wrap(head).order(ByteOrder.LITTLE_ENDIAN);
            if (b.getInt() != 0x3142564E) { f.close(); return false; }   // «NVB1»
            n = b.getInt(); fps = b.getShort() & 0xFFFF; w = b.getShort() & 0xFFFF; h = b.getShort() & 0xFFFF;
            if (n < 1 || fps < 1 || w < 16 || h < 16) { f.close(); return false; }
            byte[] idx = new byte[4 * (n + 1)];
            f.readFully(idx);
            ByteBuffer ib = ByteBuffer.wrap(idx).order(ByteOrder.LITTLE_ENDIAN);
            off = new int[n + 1];
            for (int i = 0; i <= n; i++) off[i] = ib.getInt();
            file = f;   // los fotogramas se leen del disco según toca: no se carga el archivo entero en memoria
            return true;
        } catch (Throwable e) {
            System.out.println("[NOVA] fondo: no se pudo iniciar (" + p + "): " + e);
            e.printStackTrace(System.out);
            return false;
        }
    }

    /** Arranca el hilo de decodificación (ya con la textura creada por el proyecto). p0 = ruta pedida, para retomar por donde iba. */
    static void go(String p0, Sink s) {
        sink = s;
        stop = false;
        curPath = p0 == null ? "" : p0;
        t0 = now() - (curPath.equals(resumePath) && !NovaAcc.still() ? resumeMs : 0);
        worker = new Thread(NovaBgCore::run, "nova-bg");
        worker.setDaemon(true);
        worker.start();
        ready = true;
        if (DBG) System.out.println("[NOVA-BG] listo n=" + n + " " + w + "x" + h + "@" + fps);
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
                    Object img = sink.make(buf, len, w, h);
                    if (stop) { sink.close(img); return; }
                    queue.add(new Frame(next, img));
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

    /** El fotograma que toca ahora (los anteriores se descartan), o null si aún no hay uno nuevo. */
    static Object nextImage() {
        if (DBG && now() - dbgT > 3000) { dbgT = now(); System.out.println("[NOVA-BG] draw ready=" + ready + " shown=" + shown + " cola=" + queue.size()); }
        long cur = NovaAcc.still() ? 0 : (now() - t0) * fps / 1000L;
        Frame take = null;
        for (Frame f; (f = queue.peek()) != null && f.abs <= cur; ) {   // el último fotograma que ya toca; los anteriores se descartan
            queue.poll();
            if (take != null) sink.close(take.img);
            take = f;
        }
        return take == null ? null : take.img;
    }

    /** Qué parte del vídeo cubre toda la pantalla sw×sh (recortando lo que sobre): {u, v, ancho, alto}. */
    static float[] cover(int sw, int sh) {
        float ar = (float) sw / sh, vr = (float) w / h;
        int rw = w, rh = h;
        float u = 0, v = 0;
        if (ar > vr) { rh = Math.round(w / ar); v = (h - rh) / 2f; }
        else { rw = Math.round(h * ar); u = (w - rw) / 2f; }
        return new float[] { u, v, rw, rh };
    }

    /** Pausa: detiene el hilo, libera los fotogramas y recuerda dónde iba el vídeo. Devuelve true si había vídeo en marcha (hay que destruir la textura). */
    static boolean stop() {
        boolean was = ready;
        if (ready) { resumeMs = Math.max(0, now() - t0); resumePath = curPath; }
        stop = true;
        Thread t = worker;
        worker = null;
        if (t != null) { t.interrupt(); try { t.join(300); } catch (InterruptedException ignored) { } }
        for (Frame f; (f = queue.poll()) != null; ) { try { sink.close(f.img); } catch (Throwable ignored) { } }
        try { if (file != null) file.close(); } catch (Throwable ignored) { }
        file = null; off = null; ready = false; shown = false;
        tried = false;
        return was;
    }
}
