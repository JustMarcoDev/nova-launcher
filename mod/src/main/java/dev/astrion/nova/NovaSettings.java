package dev.astrion.nova;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

/** Ajustes del menú de Nova (fondo elegido y color de los botones) y datos que pasa el launcher. */
final class NovaSettings {
    /** Fondos disponibles. Para añadir uno nuevo basta con una línea (id, nombre es/en, archivo NVB dentro de la carpeta de Nova). */
    static final class Bg {
        final String id, es, en, file;
        Bg(String id, String es, String en, String file) { this.id = id; this.es = es; this.en = en; this.file = file; }
    }
    static final Bg[] BGS = {
        new Bg("hole", "Agujero negro", "Black hole", null),            // null = el vídeo que pasa el launcher en -Dnova.bg
        new Bg("dark", "Espacio oscuro", "Dark space", ""),             // "" = sin vídeo
        new Bg("custom", "Personalizado", "Custom", "custom.nvb"),
    };
    static final int[] COLORS = { 0xFF8B6CFF, 0xFF4D8BFF, 0xFF2FD3E0, 0xFF3DDC84, 0xFFFF5FA8, 0xFFFF9A3D, 0xFFFF4D5E, 0xFFDADAF0 };

    static final String DIR = System.getProperty("nova.dir", "");
    static final String USER = System.getProperty("nova.user", "");
    static final boolean PREMIUM = "1".equals(System.getProperty("nova.premium", "0"));

    static String bg = "hole";
    static int accent = COLORS[0];
    private static boolean loaded;

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
            JsonObject o = JsonParser.parseString(new String(Files.readAllBytes(f.toPath()), StandardCharsets.UTF_8)).getAsJsonObject();
            if (o.has("bg")) bg = o.get("bg").getAsString();
            if (o.has("accent")) { int a = o.get("accent").getAsInt(); for (int c : COLORS) if (c == a) accent = a; }
        } catch (Throwable ignored) { }
        if (find(bg) == null) bg = "hole";
    }

    static void save() {
        try {
            File f = file();
            if (f == null) return;
            f.getParentFile().mkdirs();
            JsonObject o = new JsonObject();
            o.addProperty("bg", bg);
            o.addProperty("accent", accent);
            Files.write(f.toPath(), o.toString().getBytes(StandardCharsets.UTF_8));
        } catch (Throwable ignored) { }
    }

    static Bg find(String id) {
        for (Bg b : BGS) if (b.id.equals(id)) return b;
        return null;
    }

    /** Ruta del vídeo del fondo elegido, o "" si no hay (espacio oscuro o archivo que aún no existe). */
    static String bgPath() {
        Bg b = find(bg);
        if (b == null) return System.getProperty("nova.bg", "");
        if (b.file == null) return System.getProperty("nova.bg", "");
        if (b.file.isEmpty() || dir() == null) return "";
        File f = new File(dir(), b.file);
        return f.isFile() && f.length() > 32 ? f.getPath() : "";
    }

    /** Estado de la conversión del fondo personalizado que hace el launcher: working / ready / error / "" */
    static String customState = "";
    static float customProgress;
    static String customName = "", customError = "";
    static long customAt;

    static void pollCustom() {
        try {
            File d = dir();
            if (d == null) return;
            File f = new File(d, "custom.json");
            if (!f.isFile()) return;
            JsonObject o = JsonParser.parseString(new String(Files.readAllBytes(f.toPath()), StandardCharsets.UTF_8)).getAsJsonObject();
            customState = o.has("state") ? o.get("state").getAsString() : "";
            customProgress = o.has("progress") ? o.get("progress").getAsFloat() : 0f;
            customName = o.has("name") ? o.get("name").getAsString() : "";
            customError = o.has("error") ? o.get("error").getAsString() : "";
            customAt = o.has("at") ? o.get("at").getAsLong() : 0L;
        } catch (Throwable ignored) { }
    }

    static boolean hasCustom() {
        File d = dir();
        return d != null && new File(d, "custom.nvb").isFile();
    }
}
