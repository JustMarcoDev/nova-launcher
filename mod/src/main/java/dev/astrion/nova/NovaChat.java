package dev.astrion.nova;

import static dev.astrion.nova.NovaLang.tr;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.font.TextRenderer;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.hud.ChatHud;
import net.minecraft.client.gui.hud.ChatHudLine;
import net.minecraft.client.gui.screen.ChatScreen;
import net.minecraft.client.gui.widget.TextFieldWidget;
import net.minecraft.client.sound.PositionedSoundInstance;
import net.minecraft.sound.SoundEvents;
import net.minecraft.text.Text;
import net.minecraft.util.Formatting;
import net.minecraft.util.Util;
import org.lwjgl.glfw.GLFW;

/**
 * «Chat mejorado»: hora delante de cada mensaje, clic derecho para copiar, buscador y aviso de menciones.
 * Cada opción se activa por separado (NovaSettings.chatTime / chatCopy / chatSearch / chatMention).
 * No depende de nada privado del chat: el texto se cambia al entrar el mensaje (ChatHudMixin) y el resto se resuelve
 * con las líneas visibles del chat, que son iguales en todas las versiones.
 */
public final class NovaChat {
    private NovaChat() { }

    private static final Pattern STAMP = Pattern.compile("^\\[\\d{2}:\\d{2}\\] ");
    private static volatile String query = "";
    private static volatile boolean dirty;
    private static boolean wasRight, wasChat;
    private static String copiedText = "";
    private static long copiedAt;

    // ---- hora y menciones (al entrar el mensaje) ----

    /** Devuelve el mensaje con la hora delante y el color de mención; lo llama ChatHudMixin antes de guardarlo. */
    public static Text decorate(Text msg) {
        try {
            if (msg == null) return msg;
            NovaSettings.load();
            if (!NovaSettings.chatTime && !NovaSettings.chatMention) return msg;
            Text out = msg;
            boolean mention = NovaSettings.chatMention && mentions(msg.getString());
            if (mention) {
                out = msg.copy().formatted(Formatting.YELLOW);
                ping();
            }
            if (NovaSettings.chatTime) {
                LocalTime t = LocalTime.now();
                out = Text.literal(String.format(Locale.ROOT, "[%02d:%02d] ", t.getHour(), t.getMinute())).formatted(Formatting.GRAY).append(out);
            }
            return out;
        } catch (Throwable e) { return msg; }
    }

    /** ¿El mensaje nombra al jugador sin ser suyo? Su nombre tiene que salir después del primer «>», «:» o «»» (lo de antes es quien habla). */
    static boolean mentions(String s) {
        String me = myName();
        if (me.isEmpty() || s == null) return false;
        String low = s.toLowerCase(Locale.ROOT), n = me.toLowerCase(Locale.ROOT);
        int sep = -1;
        for (int i = 0; i < low.length(); i++) { char ch = low.charAt(i); if (ch == '>' || ch == ':' || ch == '»') { sep = i; break; } }
        if (sep < 0) return false;   // sin «quién dice qué» (avisos del servidor, «X entró al juego»…) no cuenta
        int at = indexOfWord(low, n, 0);
        if (at < 0 || at < sep) return false;   // no aparece, o habla el propio jugador
        return true;
    }

    private static int indexOfWord(String low, String n, int from) {
        int i = from;
        while ((i = low.indexOf(n, i)) >= 0) {
            boolean l = i == 0 || !isNameChar(low.charAt(i - 1)), r = i + n.length() >= low.length() || !isNameChar(low.charAt(i + n.length()));
            if (l && r) return i;
            i++;
        }
        return -1;
    }

    private static boolean isNameChar(char c) { return Character.isLetterOrDigit(c) || c == '_'; }

    private static String myName() {
        try {
            MinecraftClient mc = MinecraftClient.getInstance();
            String n = mc.getSession().getUsername();
            return n == null ? "" : n;
        } catch (Throwable e) { return ""; }
    }

    private static void ping() {
        try {
            MinecraftClient mc = MinecraftClient.getInstance();
            if (mc.player == null) return;
            mc.getSoundManager().play(new PositionedSoundInstance(SoundEvents.ENTITY_EXPERIENCE_ORB_PICKUP, net.minecraft.sound.SoundCategory.PLAYERS, 0.35f, 1.5f,
                    net.minecraft.util.math.random.Random.create(), mc.player.getX(), mc.player.getY(), mc.player.getZ()));
        } catch (Throwable ignored) { }
    }

    // ---- buscador ----

    /** El buscador que se pone en el chat abierto (ChatScreenMixin lo añade a la pantalla). */
    public static TextFieldWidget searchField(MinecraftClient mc, int screenW, int screenH) {
        try {
            NovaSettings.load();
            if (!NovaSettings.chatSearch) return null;
            int w = Math.min(150, Math.max(60, screenW - 8)), h = 14;
            int top = screenH - 40 - 18;
            try {
                ChatHud hud = mc.inGameHud.getChatHud();
                double sc = mc.options.getChatScale().getValue();
                int lines = Math.min(hud.getVisibleLineCount(), ((NovaChatAccess) (Object) hud).nova$visible().size());
                top = (int) (screenH - 40 - Math.ceil(lines * lineH(mc) * sc)) - h - 4;
            } catch (Throwable ignored) { }
            top = Math.max(2, Math.min(top, screenH - 60));
            TextFieldWidget f = new TextFieldWidget(mc.textRenderer, 4, top, w, h, Text.empty());
            f.setMaxLength(60);
            f.setText(query);
            f.setSuggestion(query.isEmpty() ? tr("Buscar en el chat…") : "");
            f.setChangedListener(s -> { f.setSuggestion(s.isEmpty() ? tr("Buscar en el chat…") : ""); setQuery(s); });
            return f;
        } catch (Throwable e) { return null; }
    }

    private static void setQuery(String s) {
        String q = s == null ? "" : s.trim();
        if (q.equals(query)) return;
        query = q;
        reload();
    }

    private static void reload() {
        try { ((NovaChatAccess) (Object) MinecraftClient.getInstance().inGameHud.getChatHud()).nova$refresh(); } catch (Throwable ignored) { }
    }

    /** Se llama al volver a cargar el chat: deja solo los mensajes que contienen lo buscado. */
    public static void filter(List<ChatHudLine.Visible> v) {
        try {
            String q = query;
            if (q.isEmpty() || v == null || v.isEmpty()) return;
            if (!(MinecraftClient.getInstance().currentScreen instanceof ChatScreen) || !NovaSettings.chatSearch) return;
            String low = q.toLowerCase(Locale.ROOT);
            List<ChatHudLine.Visible> keep = new ArrayList<>();
            int n = v.size(), i = 0;
            while (i < n) {   // un mensaje son varias líneas seguidas: la de abajo es la que cierra el mensaje
                int t = i;
                while (t + 1 < n && !v.get(t + 1).endOfEntry()) t++;
                if (entryText(v, i, t).toLowerCase(Locale.ROOT).contains(low)) for (int k = i; k <= t; k++) keep.add(v.get(k));
                i = t + 1;
            }
            v.clear();
            v.addAll(keep);
        } catch (Throwable ignored) { }
    }

    /** Texto de un mensaje a partir de sus líneas visibles (de la de arriba a la de abajo). */
    static String entryText(List<ChatHudLine.Visible> v, int bottom, int top) {
        StringBuilder sb = new StringBuilder();
        for (int k = top; k >= bottom; k--) {
            StringBuilder ln = new StringBuilder();
            v.get(k).content().accept((idx, style, cp) -> { ln.appendCodePoint(cp); return true; });
            String t = ln.toString().trim();
            if (t.isEmpty()) continue;
            if (sb.length() > 0) sb.append(' ');
            sb.append(t);
        }
        return sb.toString();
    }

    /** Un mensaje nuevo con el buscador activo: hay que volver a filtrar. */
    public static void added() { if (!query.isEmpty()) dirty = true; }

    // ---- clic derecho para copiar ----

    private static double lineH(MinecraftClient mc) { return (int) (9.0 * (mc.options.getChatLineSpacing().getValue() + 1.0)); }

    /** Cada fotograma desde el HUD: copia con clic derecho, repone el chat al cerrarlo y dibuja el «copiado». */
    static void frame(DrawContext c, MinecraftClient mc) {
        try {
            NovaSettings.load();
            boolean chat = mc.currentScreen instanceof ChatScreen;
            if (!chat && (wasChat || !query.isEmpty())) { query = ""; dirty = false; reload(); }
            if (chat && dirty) { dirty = false; reload(); }
            wasChat = chat;
            if (chat && NovaSettings.chatCopy) {
                boolean down = GLFW.glfwGetMouseButton(mc.getWindow().getHandle(), GLFW.GLFW_MOUSE_BUTTON_RIGHT) == GLFW.GLFW_PRESS;
                if (down && !wasRight) copyAt(c, mc);
                wasRight = down;
            } else wasRight = false;
            toast(c, mc);
        } catch (Throwable ignored) { }
    }

    private static void copyAt(DrawContext c, MinecraftClient mc) {
        int sw = c.getScaledWindowWidth(), sh = c.getScaledWindowHeight();
        double mx = mc.mouse.getX() * sw / (double) mc.getWindow().getWidth(), my = mc.mouse.getY() * sh / (double) mc.getWindow().getHeight();
        ChatHud hud = mc.inGameHud.getChatHud();
        NovaChatAccess acc = (NovaChatAccess) (Object) hud;
        List<ChatHudLine.Visible> v = acc.nova$visible();
        double sc = mc.options.getChatScale().getValue();
        double cx = mx / sc - 4.0, cy = (sh - my - 40.0) / (sc * lineH(mc));
        if (cx < -4.0 || cx > Math.floor(ChatHud.getWidth(mc.options.getChatWidth().getValue()) / sc)) return;
        int shown = Math.min(hud.getVisibleLineCount(), v.size());
        if (cy < 0.0 || cy >= shown) return;
        int i = (int) Math.floor(cy + acc.nova$scrolled());
        if (i < 0 || i >= v.size()) return;
        int b = i;
        while (b > 0 && !v.get(b).endOfEntry()) b--;   // hacia abajo hasta la línea que cierra el mensaje
        int t = b;
        while (t + 1 < v.size() && !v.get(t + 1).endOfEntry()) t++;
        String s = STAMP.matcher(entryText(v, b, t)).replaceFirst("");
        if (s.isEmpty()) return;
        mc.keyboard.setClipboard(s);
        copiedText = s; copiedAt = Util.getMeasuringTimeMs();
    }

    private static void toast(DrawContext c, MinecraftClient mc) {
        if (copiedAt == 0) return;
        long age = Util.getMeasuringTimeMs() - copiedAt;
        if (age > 1600) { copiedAt = 0; return; }
        float a = Math.min(1f, age / 120f) * Math.min(1f, (1600 - age) / 300f);
        if (a <= 0f) return;
        TextRenderer font = mc.textRenderer;
        String s = "✓ " + tr("Mensaje copiado");
        int w = font.getWidth(s) + 12, h = 16, sw = c.getScaledWindowWidth(), sh = c.getScaledWindowHeight();
        int x = (sw - w) / 2, y = sh - 40 - 34 - (int) ((1f - Math.min(1f, age / 120f)) * 6);
        NovaButton.panel(c, x, y, w, h, 5, NovaShots.withAlpha(0xF010102A, a), NovaShots.withAlpha(0xFF4A3C8C, a));
        c.drawText(font, s, x + 6, y + 4, NovaShots.withAlpha(0xFFFFFFFF, a), true);
    }

}
