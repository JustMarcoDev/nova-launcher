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
        boolean remote, working;        // remote: fondo incluido que se descarga (Nebulosa, Earth); working: el launcher lo está bajando
        String rfile = "";              // nombre del archivo remoto (nova-earth.nvb)
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
        Entry n = remoteEntry("nebula", tr("Nebulosa"), "nova.bg2", "nova-nebulosa.nvb");
        Entry ea = remoteEntry("earth", "Earth", "nova.bg3", "nova-earth.nvb");
        L.add(h);
        if (!n.path.isEmpty()) L.add(n);
        if (!ea.path.isEmpty()) L.add(ea);
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

    /** Fondo que no va en el instalador: el launcher lo descarga al elegirlo y deja el progreso en fondos-estado.json. */
    private static Entry remoteEntry(String id, String name, String prop, String rfile) {
        Entry e = new Entry(); e.id = id; e.name = name; e.builtin = true; e.remote = true; e.rfile = rfile;
        e.path = System.getProperty(prop, "");
        e.ready = !e.path.isEmpty() && new File(e.path).isFile() && new File(e.path).length() > 32;
        if (!e.ready) {
            JsonObject st = json("fondos-estado.json");
            if (st.has(rfile)) {
                JsonObject s = st.getAsJsonObject(rfile);
                String state = s.has("state") ? s.get("state").getAsString() : "";
                e.error = state.equals("error");
                e.working = state.equals("working");
                e.progress = s.has("progress") ? s.get("progress").getAsFloat() : 0f;
            }
        }
        return e;
    }

    /** Fondos que el usuario pidió y aún se están descargando: cuando queden listos se activan solos. */
    static final java.util.Set<String> awaiting = new java.util.HashSet<>();

    /** Pide al launcher (por la consola del juego) que descargue un fondo. */
    static void request(Entry e) {
        if (e == null || !e.remote || e.ready || e.working) return;
        awaiting.add(e.id);
        NovaMark.say("GETBG", e.id);
    }

    private static boolean askedSaved = false;
    /** Si el fondo guardado es Nebulosa o Earth y todavía no está en el PC, se pide una vez al abrir el juego. */
    static void ensureSaved(String id) {
        if (askedSaved) return;
        askedSaved = true;
        Entry e = find(id);
        if (e != null && e.remote && !e.ready) request(e);
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
        return e == null || !e.ready ? System.getProperty("nova.bg", "") : e.path;   // sin descargar: se usa el agujero negro
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
            new File(cacheOf(file).getPath().replaceAll("\\.nvb$", ".720.nvb")).delete();
            rename(file, "");
        } catch (Throwable ignored) { }
    }
}
