package dev.astrion.nova;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

/** Ajustes del menú de Nova (fondo elegido y color de los botones) y datos que pasa el launcher. */
final class NovaSettings {
    static final int[] COLORS = { 0xFF8B6CFF, 0xFF4D8BFF, 0xFF2FD3E0, 0xFF3DDC84, 0xFFFF5FA8, 0xFFFF9A3D, 0xFFFF4D5E, 0xFFDADAF0 };

    static final String DIR = System.getProperty("nova.dir", "");
    static final boolean PREMIUM = "1".equals(System.getProperty("nova.premium", "0"));

    static String bg = "hole";
    static int accent = COLORS[0];
    /** «Mostrar que uso Nova»: enseña el logo de Nova junto a tu nombre a los demás jugadores que usan Nova (lista de jugadores). */
    static boolean showNova = true;
    /** «Capa de Nova»: los jugadores que usan Nova llevan una capa de Nova (la ven solo quienes también usan Nova). */
    static boolean showCape = true;
    /** «Avisos del launcher en el juego» (encendida de fábrica). */
    static boolean toasts = true;
    /** «Modo FPS»: activo o no, y las opciones de vídeo de antes para poder restaurarlas. */
    static boolean fpsOn;
    static String fpsParticles = "", fpsClouds = "";
    static boolean fpsShadows = true;
    static int fpsView, fpsSim;
    /** «No volver a preguntar» del aviso «Va lento, ¿activar Modo FPS?». */
    static boolean fpsNoAsk;
    /** FPS que intenta mantener el Modo FPS (30, 60, 90, 120 o 144). */
    static int fpsGoal = 60;
    /** Opciones de vídeo extra que el Modo FPS toca por niveles (para devolverlas): distancia de entidades y mezcla de biomas. */
    static int fpsBiome = -1;
    static double fpsEntity = -1;
    /** «Chat mejorado»: cuatro opciones que se activan por separado (todas apagadas de fábrica). */
    static boolean chatTime, chatCopy, chatSearch, chatMention;
    /** Versión de las «Novedades de Nova» que ya se vio (para no volver a enseñarlas). */
    static String newsSeen = "";
    private static boolean loaded;
    /** Fecha (lastModified) de menu.json cuando se leyó o guardó: el launcher puede cambiarlo con el juego abierto. */
    private static long stamp;

    static File dir() { return DIR.isEmpty() ? null : new File(DIR); }

    private static File file() {
        File d = dir();
        return d == null ? null : new File(d, "menu.json");
    }

    static void load() {
        if (loaded) return;
        loaded = true;
        try {
            File f = file();
            if (f == null || !f.isFile()) return;
            stamp = f.lastModified();
            JsonObject o = JsonParser.parseString(new String(Files.readAllBytes(f.toPath()), StandardCharsets.UTF_8)).getAsJsonObject();
            if (o.has("bg")) bg = o.get("bg").getAsString();
            if (o.has("showNova")) showNova = o.get("showNova").getAsBoolean();
            if (o.has("showCape")) showCape = o.get("showCape").getAsBoolean();
            if (o.has("toasts")) toasts = o.get("toasts").getAsBoolean();
            if (o.has("fps") && o.get("fps").isJsonObject()) {
                JsonObject fo = o.getAsJsonObject("fps");
                fpsOn = fo.has("on") && fo.get("on").getAsBoolean();
                if (fo.has("particles")) fpsParticles = fo.get("particles").getAsString();
                if (fo.has("clouds")) fpsClouds = fo.get("clouds").getAsString();
                if (fo.has("shadows")) fpsShadows = fo.get("shadows").getAsBoolean();
                if (fo.has("view")) fpsView = fo.get("view").getAsInt();
                if (fo.has("sim")) fpsSim = fo.get("sim").getAsInt();
                fpsNoAsk = fo.has("noAsk") && fo.get("noAsk").getAsBoolean();
                if (fo.has("goal")) fpsGoal = Math.max(24, Math.min(240, fo.get("goal").getAsInt()));
                if (fo.has("biome")) fpsBiome = fo.get("biome").getAsInt();
                if (fo.has("entity")) fpsEntity = fo.get("entity").getAsDouble();
            }
            if (o.has("chat") && o.get("chat").isJsonObject()) {
                JsonObject co = o.getAsJsonObject("chat");
                chatTime = co.has("time") && co.get("time").getAsBoolean();
                chatCopy = co.has("copy") && co.get("copy").getAsBoolean();
                chatSearch = co.has("search") && co.get("search").getAsBoolean();
                chatMention = co.has("mention") && co.get("mention").getAsBoolean();
            }
            if (o.has("move") && o.get("move").isJsonObject()) NovaMove.read(o.getAsJsonObject("move"));
            if (o.has("newsSeen")) newsSeen = o.get("newsSeen").getAsString();
            if (o.has("hud") && o.get("hud").isJsonObject()) NovaHud.read(o.getAsJsonObject("hud"));
            NovaHud.readProfiles(o);
            if (o.has("acc") && o.get("acc").isJsonObject()) NovaAcc.read(o.getAsJsonObject("acc"));
            if (o.has("accent")) { int a = o.get("accent").getAsInt(); for (int c : COLORS) if (c == a) accent = a; }
        } catch (Throwable ignored) { }
        if (NovaBgs.find(bg) == null) bg = "hole";
        NovaBgs.ensureSaved(bg);
    }

    /** Al volver al menú: si el launcher cambió menu.json (su fecha es otra), lo vuelve a leer. */
    private static long lastStat;

    /** Vuelve a leer menu.json si cambió. El archivo se mira como mucho cada medio segundo (antes, en cada llamada) y solo se analiza si cambió su lastModified. */
    static void reloadIfChanged() {
        try {
            long now = System.currentTimeMillis();
            if (now - lastStat < 500) return;
            lastStat = now;
            File f = file();
            if (f == null || !f.isFile() || f.lastModified() == stamp) return;
            loaded = false;
            load();
        } catch (Throwable ignored) { }
    }

    static void save() {
        try {
            File f = file();
            if (f == null) return;
            f.getParentFile().mkdirs();
            JsonObject o = new JsonObject();
            o.addProperty("bg", bg);
            o.addProperty("accent", accent);
            o.addProperty("showNova", showNova);
            o.addProperty("showCape", showCape);
            o.addProperty("toasts", toasts);
            JsonObject fo = new JsonObject();
            fo.addProperty("on", fpsOn); fo.addProperty("particles", fpsParticles); fo.addProperty("clouds", fpsClouds);
            fo.addProperty("shadows", fpsShadows); fo.addProperty("view", fpsView); fo.addProperty("sim", fpsSim);
            fo.addProperty("noAsk", fpsNoAsk);
            fo.addProperty("goal", fpsGoal); fo.addProperty("biome", fpsBiome); fo.addProperty("entity", fpsEntity);
            o.add("fps", fo);
            JsonObject co = new JsonObject();
            co.addProperty("time", chatTime); co.addProperty("copy", chatCopy); co.addProperty("search", chatSearch); co.addProperty("mention", chatMention);
            o.add("chat", co);
            o.add("move", NovaMove.write());
            o.addProperty("newsSeen", newsSeen);
            o.add("hud", NovaHud.write());
            NovaHud.writeProfiles(o);
            o.add("acc", NovaAcc.write());
            Files.write(f.toPath(), o.toString().getBytes(StandardCharsets.UTF_8));
            stamp = f.lastModified();
        } catch (Throwable ignored) { }
    }

    /** Ruta del vídeo del fondo elegido, o "" si no hay (espacio oscuro o archivo que aún no está listo). */
    static String bgPath() { return NovaBgs.pathOf(bg); }

}
