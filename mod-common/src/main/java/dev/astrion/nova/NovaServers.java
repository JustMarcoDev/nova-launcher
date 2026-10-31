package dev.astrion.nova;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.File;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Servidores en el menú de Nova: el último en el que entraste, tus favoritos («Mis servidores» del launcher) y su ping.
 * El launcher deja la lista en <nova.dir>/servers.json; el mod apunta el último servidor en <nova.dir>/last-server.json y mide el ping él mismo
 * (el «Server List Ping» oficial del juego, sin depender de que el launcher esté mirando).
 * Código común: lo único de Minecraft (¿hay servidor?, su nombre y dirección) viene de NovaMc; entrar al servidor lo hace NovaConnect en cada proyecto.
 */
public final class NovaServers {
    private NovaServers() { }

    /** Un servidor: nombre para mostrar y dirección («host» o «host:puerto»). */
    public static final class Srv {
        public final String name, addr;
        Srv(String name, String addr) { this.name = name == null || name.isBlank() ? addr : name; this.addr = addr; }
    }

    /** Resultado de un ping. */
    public static final class Res {
        public volatile boolean done, ok;
        public volatile int ms = -1, online, max;
        volatile long at;
    }

    private static final Map<String, Res> RES = new ConcurrentHashMap<>();
    private static final ExecutorService POOL = Executors.newFixedThreadPool(3, r -> { Thread t = new Thread(r, "nova-ping"); t.setDaemon(true); return t; });
    private static String written = "";
    private static long favStamp = -1, favCheck;
    private static List<Srv> favs = new ArrayList<>();

    private static File file(String n) { File d = NovaSettings.dir(); return d == null ? null : new File(d, n); }

    private static JsonObject readObj(File f) {
        try {
            if (f == null || !f.isFile()) return null;
            return JsonParser.parseString(new String(Files.readAllBytes(f.toPath()), StandardCharsets.UTF_8)).getAsJsonObject();
        } catch (Throwable t) { return null; }
    }

    /** Favoritos que dejó el launcher (se vuelve a leer si el archivo cambió). */
    public static synchronized List<Srv> favs() {
        long now = System.currentTimeMillis();
        if (now - favCheck < 1000) return favs;
        favCheck = now;
        File f = file("servers.json");
        long st = f != null && f.isFile() ? f.lastModified() : 0;
        if (st == favStamp) return favs;
        favStamp = st;
        List<Srv> out = new ArrayList<>();
        JsonObject o = readObj(f);
        if (o != null && o.has("fav") && o.get("fav").isJsonArray()) {
            for (JsonElement e : o.getAsJsonArray("fav")) {
                try {
                    JsonObject s = e.getAsJsonObject();
                    String host = s.has("host") ? s.get("host").getAsString().trim() : "";
                    if (host.isEmpty()) continue;
                    int port = s.has("port") ? s.get("port").getAsInt() : 25565;
                    out.add(new Srv(s.has("name") ? s.get("name").getAsString() : host, port > 0 && port != 25565 ? host + ":" + port : host));
                } catch (Throwable ignored) { }
            }
        }
        favs = out;
        return favs;
    }

    /** Último servidor en el que entraste (o null). */
    public static Srv last() {
        JsonObject o = readObj(file("last-server.json"));
        if (o == null || !o.has("address")) return null;
        String a = o.get("address").getAsString().trim();
        return a.isEmpty() ? null : new Srv(o.has("name") ? o.get("name").getAsString() : a, a);
    }

    /** Se llama en cada fotograma con un mundo abierto: si se está en un servidor, se apunta como el último. */
    public static void frame() {
        try {
            if (!NovaMc.online()) return;
            String[] e = NovaMc.currentServer();   // {nombre, dirección}
            if (e == null || e[1] == null || e[1].isBlank()) return;
            String a = e[1].trim();
            if (a.equals(written)) return;
            written = a;
            File f = file("last-server.json");
            if (f == null) return;
            f.getParentFile().mkdirs();
            JsonObject o = new JsonObject();
            o.addProperty("name", e[0] == null || e[0].isBlank() || e[0].equals("Minecraft Server") ? a : e[0]);
            o.addProperty("address", a);
            o.addProperty("ts", System.currentTimeMillis());
            Files.write(f.toPath(), o.toString().getBytes(StandardCharsets.UTF_8));
        } catch (Throwable t) { /* nunca debe afectar al juego */ }
    }

    // ---------------------------------------------------------------- ping
    /** Último resultado de un servidor (o null si aún no se ha pedido). */
    public static Res result(String addr) { return RES.get(addr); }

    /** Pide el ping de estos servidores; no repite los que se midieron hace menos de 25 s. */
    public static void refresh(List<String> addrs) {
        long now = System.currentTimeMillis();
        for (String a : addrs) {
            Res r = RES.get(a);
            if (r != null && (!r.done || now - r.at < 25_000)) continue;
            Res n = new Res(); n.at = now; RES.put(a, n);
            POOL.execute(() -> measure(a, n));
        }
    }

    private static void measure(String addr, Res r) {
        try {
            String host = addr; int port = 25565;
            int c = addr.lastIndexOf(':');
            if (c > 0 && c == addr.indexOf(':')) { try { port = Integer.parseInt(addr.substring(c + 1)); host = addr.substring(0, c); } catch (NumberFormatException ignored) { } }
            else if (c < 0) { String[] srv = srv(host); if (srv != null) { host = srv[0]; port = Integer.parseInt(srv[1]); } }
            try (Socket s = new Socket()) {
                s.connect(new InetSocketAddress(host, port), 3500);
                s.setSoTimeout(4000);
                DataOutputStream out = new DataOutputStream(s.getOutputStream());
                DataInputStream in = new DataInputStream(s.getInputStream());
                ByteArrayOutputStream hs = new ByteArrayOutputStream();
                DataOutputStream h = new DataOutputStream(hs);
                varint(h, 0); varint(h, 760); byte[] hb = host.getBytes(StandardCharsets.UTF_8); varint(h, hb.length); h.write(hb); h.writeShort(port); varint(h, 1);
                packet(out, hs.toByteArray());
                packet(out, new byte[] { 0 });
                readVarint(in); int id = readVarint(in);
                if (id != 0) throw new IllegalStateException();
                int len = readVarint(in); byte[] js = new byte[len]; in.readFully(js);
                JsonObject o = JsonParser.parseString(new String(js, StandardCharsets.UTF_8)).getAsJsonObject();
                if (o.has("players")) { JsonObject p = o.getAsJsonObject("players"); r.online = p.has("online") ? p.get("online").getAsInt() : 0; r.max = p.has("max") ? p.get("max").getAsInt() : 0; }
                long t0 = System.nanoTime();
                ByteArrayOutputStream pb = new ByteArrayOutputStream();
                DataOutputStream pd = new DataOutputStream(pb);
                varint(pd, 1); pd.writeLong(t0);
                packet(out, pb.toByteArray());
                try { readVarint(in); readVarint(in); in.readLong(); r.ms = (int) Math.max(1, (System.nanoTime() - t0) / 1_000_000); }
                catch (Throwable e) { r.ms = (int) Math.max(1, (System.nanoTime() - t0) / 1_000_000); }
                r.ok = true;
            }
        } catch (Throwable t) { r.ok = false; }
        finally { r.at = System.currentTimeMillis(); r.done = true; }
    }

    /** Registro SRV (_minecraft._tcp) si el servidor lo tiene: devuelve {host, puerto} o null. */
    private static String[] srv(String host) {
        try {
            if (host.matches("[0-9.]+") || host.indexOf(':') >= 0) return null;
            java.util.Hashtable<String, String> env = new java.util.Hashtable<>();
            env.put("java.naming.factory.initial", "com.sun.jndi.dns.DnsContextFactory");
            env.put("com.sun.jndi.dns.timeout.initial", "1500");
            env.put("com.sun.jndi.dns.timeout.retries", "1");
            javax.naming.directory.Attribute a = new javax.naming.directory.InitialDirContext(env).getAttributes("_minecraft._tcp." + host, new String[] { "SRV" }).get("srv");
            if (a == null || a.size() == 0) return null;
            String[] p = a.get(0).toString().split(" ");
            return new String[] { p[3].replaceAll("\\.$", ""), p[2] };
        } catch (Throwable t) { return null; }
    }

    private static void varint(DataOutputStream o, int v) throws java.io.IOException {
        while ((v & ~0x7F) != 0) { o.writeByte((v & 0x7F) | 0x80); v >>>= 7; }
        o.writeByte(v);
    }

    private static void packet(DataOutputStream out, byte[] body) throws java.io.IOException {
        varint(out, body.length); out.write(body); out.flush();
    }

    private static int readVarint(DataInputStream in) throws java.io.IOException {
        int n = 0, shift = 0, b;
        do { b = in.readUnsignedByte(); n |= (b & 0x7F) << shift; shift += 7; if (shift > 35) throw new java.io.IOException(); } while ((b & 0x80) != 0);
        return n;
    }
}
