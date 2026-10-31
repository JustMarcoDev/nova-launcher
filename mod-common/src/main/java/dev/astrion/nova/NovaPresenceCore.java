package dev.astrion.nova;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Presencia de Nova (lógica común): quién de la lista de jugadores (TAB) también usa Nova.
 * Solo funciona con cuenta premium (el launcher pasa -Dnova.premium=1) y si hay un servidor de presencia (-Dnova.presence=URL).
 * Si el servidor no responde no se muestra nada y no pasa nada más. Lo que toca Minecraft (¿hay servidor?, lista de jugadores, sesión) viene de NovaMc;
 * NovaPresence de cada proyecto solo traduce la fila de la lista (PlayerListEntry / PlayerInfo) y dibuja el logo.
 */
final class NovaPresenceCore {
    private NovaPresenceCore() { }

    /** URL del Worker de Cloudflare (servidor/README.md). Vacía = desactivado. */
    static final String URL = System.getProperty("nova.presence", "").replaceAll("/+$", "");

    private static final ExecutorService POOL = Executors.newSingleThreadExecutor(r -> { Thread t = new Thread(r, "nova-presence"); t.setDaemon(true); return t; });
    private static HttpClient http;
    private static volatile String token;                 // token de /verify (24 h)
    private static volatile Set<UUID> nova = new HashSet<>();
    private static volatile boolean busy, wasOnServer;
    private static long lastBeat, lastQuery, retryAt;
    private static volatile UUID me;

    static boolean enabled() { return NovaSettings.PREMIUM && !URL.isEmpty(); }

    /** Se llama en cada fotograma de juego. */
    static void frame() {
        if (NovaOff.has("presence")) return;
        try {
            if (!enabled()) return;
            if (!NovaMc.online()) { if (wasOnServer) { wasOnServer = false; nova = new HashSet<>(); } return; }
            wasOnServer = true;
            long now = System.currentTimeMillis();
            if (busy || now < retryAt) return;
            me = NovaMc.userUuid();
            if (me == null) return;
            boolean beat = NovaSettings.showNova && (token == null || now - lastBeat >= 30_000);
            boolean ask = now - lastQuery >= 30_000;
            if (!beat && !ask) return;
            final String name = NovaMc.userName(), access = NovaMc.accessToken();
            final List<String> ids = new ArrayList<>();
            for (UUID u : NovaMc.tabUuids()) ids.add(u.toString().replace("-", ""));
            if (beat) lastBeat = now;
            if (ask) lastQuery = now;
            busy = true;
            POOL.execute(() -> {
                try {
                    if (beat) heartbeat(name, access);
                    if (ask && !ids.isEmpty()) query(ids);
                } catch (Throwable t) {
                    retryAt = System.currentTimeMillis() + 60_000;     // el servidor no responde: se reintenta en un minuto
                } finally { busy = false; }
            });
        } catch (Throwable t) { /* nunca debe afectar al juego */ }
    }

    private static HttpClient client() {
        if (http == null) http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
        return http;
    }

    private static HttpResponse<String> send(HttpRequest.Builder b) throws Exception {
        return client().send(b.timeout(Duration.ofSeconds(6)).build(), HttpResponse.BodyHandlers.ofString());
    }

    private static HttpResponse<String> post(String url, JsonObject body) throws Exception {
        return send(HttpRequest.newBuilder(URI.create(url)).header("content-type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body.toString())));
    }

    private static void heartbeat(String name, String access) throws Exception {
        if (token != null) {
            JsonObject b = new JsonObject(); b.addProperty("token", token);
            HttpResponse<String> r = post(URL + "/heartbeat", b);
            if (r.statusCode() == 200) return;
            token = null;                                  // caducado: se vuelve a verificar
        }
        // 1. el servidor da un id aleatorio, 2. nos unimos a él en Mojang con nuestra sesión, 3. el servidor comprueba con Mojang que es cierto
        HttpResponse<String> c = send(HttpRequest.newBuilder(URI.create(URL + "/challenge")).GET());
        if (c.statusCode() != 200) throw new IllegalStateException();
        String serverId = JsonParser.parseString(c.body()).getAsJsonObject().get("serverId").getAsString();
        String id = me.toString().replace("-", "");
        JsonObject j = new JsonObject(); j.addProperty("accessToken", access); j.addProperty("selectedProfile", id); j.addProperty("serverId", serverId);
        HttpResponse<String> m = post("https://sessionserver.mojang.com/session/minecraft/join", j);
        if (m.statusCode() != 204 && m.statusCode() != 200) throw new IllegalStateException();
        JsonObject v = new JsonObject(); v.addProperty("name", name); v.addProperty("uuid", id); v.addProperty("serverId", serverId);
        HttpResponse<String> r = post(URL + "/verify", v);
        if (r.statusCode() != 200) throw new IllegalStateException();
        token = JsonParser.parseString(r.body()).getAsJsonObject().get("token").getAsString();
    }

    private static void query(List<String> ids) throws Exception {
        JsonArray a = new JsonArray(); for (String s : ids) a.add(s);
        JsonObject b = new JsonObject(); b.add("uuids", a);
        HttpResponse<String> r = post(URL + "/query", b);
        if (r.statusCode() != 200) throw new IllegalStateException();
        Set<UUID> out = new HashSet<>();
        for (var e : JsonParser.parseString(r.body()).getAsJsonObject().getAsJsonArray("nova")) {
            String h = e.getAsString();
            if (h.length() == 32) out.add(UUID.fromString(h.replaceFirst("(\\w{8})(\\w{4})(\\w{4})(\\w{4})(\\w{12})", "$1-$2-$3-$4-$5")));
        }
        nova = out;
    }

    /** UUID de la sesión actual (no depende del servidor de presencia: sirve también con cuenta sin conexión). */
    static UUID self() {
        UUID u = NovaMc.userUuid();
        return u != null ? u : me;
    }

    /** ¿Este jugador (por UUID) usa Nova? Uno mismo se ve siempre que no haya ocultado su logo; los demás, si el servidor de presencia los reconoce. */
    static boolean has(UUID u) {
        if (u == null) return false;
        if (u.equals(self())) return NovaSettings.showNova;
        return enabled() && nova.contains(u);
    }
}
