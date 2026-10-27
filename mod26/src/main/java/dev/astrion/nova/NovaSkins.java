package dev.astrion.nova;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.awt.image.BufferedImage;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import net.minecraft.client.Minecraft;

/**
 * Skins guardadas del launcher, vistas desde el juego: la misma carpeta (<nova.dir>/skins con skins.json y un .png por skin).
 * Desde aquí se puede usar una skin (se escribe skin-local.png/json, que NovaLocalSkin vigila cada segundo), quitarla, borrarla,
 * cambiar su modelo y guardar la skin actual. El launcher se entera por el campo «by: mod» de skin-local.json.
 */
final class NovaSkins {
    private NovaSkins() { }

    static final class E {
        final String id; String name; boolean slim;
        E(String id, String name, boolean slim) { this.id = id; this.name = name; this.slim = slim; }
        File png() { return new File(dir(), id + ".png"); }
    }

    static File base() { String d = System.getProperty("nova.dir", ""); return d.isEmpty() ? null : new File(d); }

    static File dir() { File b = base(); if (b == null) return null; File d = new File(b, "skins"); d.mkdirs(); return d; }

    static boolean available() { return base() != null; }

    static String user() {
        try { var s = Minecraft.getInstance().getUser(); return s == null ? "" : s.getName(); } catch (Throwable t) { return ""; }
    }

    private static JsonArray readIdx() {
        try {
            File f = new File(dir(), "skins.json");
            if (!f.isFile()) return new JsonArray();
            JsonElement e = JsonParser.parseString(new String(Files.readAllBytes(f.toPath()), StandardCharsets.UTF_8));
            return e.isJsonArray() ? e.getAsJsonArray() : new JsonArray();
        } catch (Throwable t) { return new JsonArray(); }
    }

    private static void write(File f, String text) throws Exception {
        File tmp = new File(f.getPath() + ".tmp");
        Files.write(tmp.toPath(), text.getBytes(StandardCharsets.UTF_8));
        Files.move(tmp.toPath(), f.toPath(), StandardCopyOption.REPLACE_EXISTING);
    }

    private static void writeIdx(JsonArray a) throws Exception { write(new File(dir(), "skins.json"), a.toString()); }

    static boolean validId(String s) { return s != null && s.matches("s\\w{3,20}"); }

    static String clean(String n) {
        String s = n == null ? "" : n.replaceAll("[^\\p{L}\\p{N} _.\\-]", "").trim();
        return s.length() > 30 ? s.substring(0, 30) : s;
    }

    static boolean looksSlim(BufferedImage s) {
        return s.getHeight() == 64 && (s.getRGB(47, 20) >>> 24) == 0 && (s.getRGB(47, 26) >>> 24) == 0;
    }

    static BufferedImage read(File f) {
        try { BufferedImage i = javax.imageio.ImageIO.read(f); return i != null && i.getWidth() == 64 && (i.getHeight() == 64 || i.getHeight() == 32) ? i : null; } catch (Throwable t) { return null; }
    }

    private static String newId() { return "s" + Long.toString(System.currentTimeMillis(), 36) + Long.toString((long) (Math.random() * 46656), 36); }

    /** Lista las skins. Los .png sueltos que se hayan dejado en la carpeta se añaden solos. */
    static List<E> list() {
        List<E> out = new ArrayList<>();
        if (!available()) return out;
        try {
            JsonArray idx = readIdx();
            boolean changed = false;
            java.util.Set<String> known = new java.util.HashSet<>();
            for (JsonElement el : idx) {
                if (!el.isJsonObject()) continue;
                JsonObject o = el.getAsJsonObject();
                String id = o.has("id") ? o.get("id").getAsString() : "";
                if (!validId(id)) continue;
                known.add(id);
                E e = new E(id, o.has("name") ? o.get("name").getAsString() : "Skin", o.has("model") && "slim".equals(o.get("model").getAsString()));
                if (e.png().isFile()) out.add(e);
            }
            File[] fs = dir().listFiles((d, n) -> n.toLowerCase(java.util.Locale.ROOT).endsWith(".png"));
            if (fs != null) {
                java.util.Arrays.sort(fs);
                for (File f : fs) {
                    String base = f.getName().substring(0, f.getName().length() - 4);
                    if (known.contains(base)) continue;
                    BufferedImage im = read(f);
                    if (im == null || out.size() >= 60) continue;
                    String id = validId(base) ? base : newId();
                    if (!id.equals(base)) { File to = new File(dir(), id + ".png"); if (!f.renameTo(to)) continue; }
                    String nm = clean(base);
                    JsonObject o = new JsonObject();
                    o.addProperty("id", id); o.addProperty("name", nm.isEmpty() ? "Skin" : nm); o.addProperty("model", looksSlim(im) ? "slim" : "classic");
                    idx.add(o); known.add(id); changed = true;
                    out.add(new E(id, nm.isEmpty() ? "Skin" : nm, looksSlim(im)));
                }
            }
            if (changed) writeIdx(idx);
        } catch (Throwable t) { /* lista vacía */ }
        return out;
    }

    /** Id de la skin que está puesta ahora, o "" si no hay ninguna local. */
    /** ¿El launcher pidió la skin de Steve para este usuario? (cuenta sin conexión sin skin elegida) */
    static boolean steve() {
        try {
            File f = new File(base(), "skin-local.json");
            if (!f.isFile()) return false;
            JsonObject o = JsonParser.parseString(new String(Files.readAllBytes(f.toPath()), StandardCharsets.UTF_8)).getAsJsonObject();
            return o.has("steve") && o.get("steve").getAsBoolean() && o.has("on") && o.get("on").getAsBoolean() && o.has("user") && o.get("user").getAsString().equals(user());
        } catch (Throwable t) { return false; }
    }

    static String current() {
        try {
            File f = new File(base(), "skin-local.json");
            if (!f.isFile()) return "";
            JsonObject o = JsonParser.parseString(new String(Files.readAllBytes(f.toPath()), StandardCharsets.UTF_8)).getAsJsonObject();
            boolean on = o.has("on") && o.get("on").getAsBoolean() && o.has("user") && o.get("user").getAsString().equals(user());
            return on && o.has("id") ? o.get("id").getAsString() : "";
        } catch (Throwable t) { return ""; }
    }

    private static void writeLocal(boolean on, String id, boolean slim) throws Exception {
        JsonObject o = new JsonObject();
        o.addProperty("on", on); o.addProperty("user", user()); o.addProperty("model", on && slim ? "slim" : "classic");
        o.addProperty("v", System.currentTimeMillis()); o.addProperty("id", on ? id : ""); o.addProperty("by", "mod");
        write(new File(base(), "skin-local.json"), o.toString());
        NovaLocalSkin.refresh();
        NovaSkin.reload();
    }

    static void use(E e) throws Exception {
        File dst = new File(base(), "skin-local.png"), tmp = new File(dst.getPath() + ".tmp");
        Files.copy(e.png().toPath(), tmp.toPath(), StandardCopyOption.REPLACE_EXISTING);
        Files.move(tmp.toPath(), dst.toPath(), StandardCopyOption.REPLACE_EXISTING);
        writeLocal(true, e.id, e.slim);
    }

    static void unset() throws Exception { writeLocal(false, "", false); }

    static void setSlim(E e, boolean slim) throws Exception {
        JsonArray idx = readIdx();
        for (JsonElement el : idx) if (el.isJsonObject() && e.id.equals(el.getAsJsonObject().has("id") ? el.getAsJsonObject().get("id").getAsString() : "")) el.getAsJsonObject().addProperty("model", slim ? "slim" : "classic");
        writeIdx(idx);
        e.slim = slim;
        if (e.id.equals(current())) writeLocal(true, e.id, slim);
    }

    static void delete(E e) throws Exception {
        boolean cur = e.id.equals(current());
        JsonArray idx = readIdx(), n = new JsonArray();
        for (JsonElement el : idx) if (!(el.isJsonObject() && e.id.equals(el.getAsJsonObject().has("id") ? el.getAsJsonObject().get("id").getAsString() : ""))) n.add(el);
        writeIdx(n);
        e.png().delete();
        if (cur) unset();
    }

    /** Guarda la skin que llevas ahora (la local o la de tu cuenta) en la lista. Devuelve la skin guardada y si ya estaba. */
    static Object[] saveCurrent() throws Exception {
        File src = null;
        if (!current().isEmpty() && new File(base(), "skin-local.png").isFile()) src = new File(base(), "skin-local.png");
        if (src == null) { String p = System.getProperty("nova.skin", ""); if (!p.isEmpty() && new File(p).isFile()) src = new File(p); }
        if (src == null || read(src) == null) return null;
        byte[] data = Files.readAllBytes(src.toPath());
        List<E> l = list();
        for (E e : l) if (java.util.Arrays.equals(Files.readAllBytes(e.png().toPath()), data)) return new Object[] { e, Boolean.TRUE };
        if (l.size() >= 60) return null;
        BufferedImage im = read(src);
        String id = newId(), nm = clean(user());
        Files.write(new File(dir(), id + ".png").toPath(), data);
        JsonArray idx = readIdx();
        JsonObject o = new JsonObject();
        o.addProperty("id", id); o.addProperty("name", nm.isEmpty() ? "Skin" : nm); o.addProperty("model", looksSlim(im) ? "slim" : "classic");
        idx.add(o); writeIdx(idx);
        return new Object[] { new E(id, nm.isEmpty() ? "Skin" : nm, looksSlim(im)), Boolean.FALSE };
    }

    static void openFolder() {
        try {
            String d = dir().getAbsolutePath(), os = System.getProperty("os.name", "").toLowerCase(java.util.Locale.ROOT);
            new ProcessBuilder(os.contains("win") ? new String[] { "explorer", d } : os.contains("mac") ? new String[] { "open", d } : new String[] { "xdg-open", d }).start();
        } catch (Throwable t) { /* sin carpeta */ }
    }
}
