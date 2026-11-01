package dev.astrion.nova;

import com.google.gson.JsonObject;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;

/**
 * Modo streamer (lógica común): la tecla, qué se esconde y el archivo estado.json que lee el launcher para el overlay de OBS.
 * El archivo solo lleva FPS, nombre del servidor (nunca la IP), versión y tiempo de sesión.
 */
final class NovaStreamCore {
    private NovaStreamCore() { }

    /** «Modo streamer» activo: oculta coordenadas, brújula y las IP de las listas de servidores. */
    static volatile boolean on;
    /** Tecla del modo streamer (F7 por defecto). */
    static int key = NovaMc.defaultStreamKey();

    private static boolean wasKey;
    private static long lastWrite;
    private static String lastJson = "";

    static boolean edge(boolean down) {
        boolean r = down && !wasKey;
        wasKey = down;
        return r;
    }

    /** Una dirección lista para enseñar: con el modo streamer sale tapada. */
    static String addr(String a) { return on ? "••••••" : a; }

    /** Nombre del servidor para el overlay: el que el jugador le puso, o uno genérico si parece una IP/dominio. */
    static String serverLabel(String name, boolean online, boolean singleplayer) {
        if (singleplayer) return NovaLang.tr("Un jugador");
        if (!online) return "";
        String n = name == null ? "" : name.trim();
        if (n.isEmpty() || n.matches("(?i)^[a-z0-9._-]+\\.[a-z]{2,}(:\\d+)?$") || n.matches("^[0-9.:]+$")) return NovaLang.tr("Multijugador");
        return n;
    }

    static String json(int fps, String server, String version, String session, String player, boolean inWorld, long now) {
        JsonObject o = new JsonObject();
        o.addProperty("fps", fps);
        o.addProperty("server", server);
        o.addProperty("version", version);
        o.addProperty("session", session);
        o.addProperty("player", player);
        o.addProperty("inWorld", inWorld);
        o.addProperty("streamer", on);
        o.addProperty("ts", now);
        return o.toString();
    }

    private static boolean wasOn;

    /**
     * Escribe estado.json solo con el modo streamer activo y solo si algún dato cambió (sin contar la marca de tiempo), a lo sumo una vez por segundo.
     * Al apagar el modo se escribe una última vez (streamer:false) para que el overlay se quede sin datos. Fallos en silencio.
     */
    static void write(String dir, String json, long now) {
        try {
            if (dir == null || dir.isEmpty()) return;
            if (!on && !wasOn) return;
            boolean last = !on;
            if (now - lastWrite < 1000) return;
            String cmp = json.replaceAll("\"ts\":\\d+", "");
            if (cmp.equals(lastJson) && !last) return;
            lastWrite = now; lastJson = cmp; wasOn = on;
            File d = new File(dir);
            if (!d.isDirectory() && !d.mkdirs()) return;
            File tmp = new File(d, "estado.json.tmp"), f = new File(d, "estado.json");
            Files.write(tmp.toPath(), json.getBytes(StandardCharsets.UTF_8));
            Files.move(tmp.toPath(), f.toPath(), StandardCopyOption.REPLACE_EXISTING);
        } catch (Throwable ignored) { }
    }
}
