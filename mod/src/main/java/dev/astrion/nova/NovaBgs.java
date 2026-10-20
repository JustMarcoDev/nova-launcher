package dev.astrion.nova;

import static dev.astrion.nova.NovaLang.tr;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * Lista de fondos del menú: los incluidos (agujero negro, espacio oscuro) y los que el usuario deja en la carpeta «fondos».
 * El launcher convierte cada foto o vídeo de esa carpeta a un archivo NVB dentro de «cache» y anota el progreso en «fondos-estado.json».
 */
final class NovaBgs {
    static final String[] EXT = { ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif", ".mp4", ".m4v", ".mov", ".webm", ".mkv" };

    static final class Entry {
        String id, name, file;          // file = nombre del archivo del usuario (null en los incluidos)
        boolean builtin, ready, error;
        float progress;
        String path = "";               // ruta del NVB listo para reproducir ("" = sin vídeo)
    }

    static File dir() { return NovaSettings.dir(); }
    static File folder() { File d = dir(); return d == null ? null : new File(d, "fondos"); }
    static File cacheOf(String file) { return new File(new File(dir(), "cache"), file + ".nvb"); }

    static boolean isMedia(String n) {
        String l = n.toLowerCase(Locale.ROOT);
        for (String e : EXT) if (l.endsWith(e)) return true;
        return false;
    }

    private static JsonObject json(String name) {
        try {
            File d = dir();
            if (d == null) return new JsonObject();
            File f = new File(d, name);
            if (!f.isFile()) return new JsonObject();
            return JsonParser.parseString(new String(Files.readAllBytes(f.toPath()), StandardCharsets.UTF_8)).getAsJsonObject();
        } catch (Throwable e) { return new JsonObject(); }
    }

    static String baseName(String file) {
        int i = file.lastIndexOf('.');
        return i > 0 ? file.substring(0, i) : file;
    }

    static List<Entry> list() {
        List<Entry> L = new ArrayList<>();
        Entry h = new Entry(); h.id = "hole"; h.name = tr("Agujero negro"); h.builtin = true; h.ready = true; h.path = System.getProperty("nova.bg", "");
        Entry n = new Entry(); n.id = "nebula"; n.name = tr("Nebulosa"); n.builtin = true; n.path = System.getProperty("nova.bg2", ""); n.ready = !n.path.isEmpty() && new File(n.path).isFile();
        Entry ea = new Entry(); ea.id = "earth"; ea.name = "Earth"; ea.builtin = true; ea.path = System.getProperty("nova.bg3", ""); ea.ready = !ea.path.isEmpty() && new File(ea.path).isFile();
        L.add(h); if (n.ready) L.add(n); if (ea.ready) L.add(ea);
        File f = folder();
        if (f == null || !f.isDirectory()) return L;
        JsonObject names = json("nombres.json"), st = json("fondos-estado.json");
        File[] fs = f.listFiles(x -> x.isFile() && isMedia(x.getName()));
        if (fs == null) return L;
        Arrays.sort(fs, (a, b) -> a.getName().compareToIgnoreCase(b.getName()));
        for (File x : fs) {
            Entry e = new Entry();
            e.file = x.getName(); e.id = "f:" + e.file;
            e.name = names.has(e.file) ? names.get(e.file).getAsString() : baseName(e.file);
            File c = cacheOf(e.file);
            e.ready = c.isFile() && c.length() > 32 && c.lastModified() >= x.lastModified();
            if (e.ready) e.path = c.getPath();
            else if (st.has(e.file)) {
                JsonObject s = st.getAsJsonObject(e.file);
                String state = s.has("state") ? s.get("state").getAsString() : "";
                e.error = state.equals("error");
                e.progress = s.has("progress") ? s.get("progress").getAsFloat() : 0f;
            }
            L.add(e);
        }
        return L;
    }

    static Entry find(String id) {
        for (Entry e : list()) if (e.id.equals(id)) return e;
        return null;
    }

    /** Cambia si algo de la lista cambió (archivos nuevos o borrados, nombres, progreso); sirve para no redibujar de más. */
    static String signature() {
        StringBuilder b = new StringBuilder();
        for (Entry e : list()) b.append(e.id).append('|').append(e.name).append('|').append(e.ready).append('|').append(e.error).append('|').append(Math.round(e.progress * 20)).append(';');
        return b.toString();
    }

    static String pathOf(String id) {
        Entry e = find(id);
        return e == null ? System.getProperty("nova.bg", "") : e.path;
    }

    static void rename(String file, String name) {
        try {
            File d = dir();
            if (d == null) return;
            JsonObject o = json("nombres.json");
            name = name.trim();
            if (name.isEmpty() || name.equals(baseName(file))) o.remove(file); else o.addProperty(file, name);
            Files.write(new File(d, "nombres.json").toPath(), o.toString().getBytes(StandardCharsets.UTF_8));
        } catch (Throwable ignored) { }
    }

    /** Borra la foto o el vídeo de la carpeta y su copia convertida. */
    static void delete(String file) {
        try {
            File f = folder();
            if (f != null) new File(f, file).delete();
            cacheOf(file).delete();
            rename(file, "");
        } catch (Throwable ignored) { }
    }
}
