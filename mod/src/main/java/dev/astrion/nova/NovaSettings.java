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
            if (o.has("showNova")) showNova = o.get("showNova").getAsBoolean();
            if (o.has("hud") && o.get("hud").isJsonObject()) NovaHud.read(o.getAsJsonObject("hud"));
            if (o.has("accent")) { int a = o.get("accent").getAsInt(); for (int c : COLORS) if (c == a) accent = a; }
        } catch (Throwable ignored) { }
        if (NovaBgs.find(bg) == null) bg = "hole";
        NovaBgs.ensureSaved(bg);
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
            o.add("hud", NovaHud.write());
            Files.write(f.toPath(), o.toString().getBytes(StandardCharsets.UTF_8));
        } catch (Throwable ignored) { }
    }

    /** Ruta del vídeo del fondo elegido, o "" si no hay (espacio oscuro o archivo que aún no está listo). */
    static String bgPath() { return NovaBgs.pathOf(bg); }

}
