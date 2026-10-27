package dev.astrion.nova;

import static dev.astrion.nova.NovaLang.tr;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import net.minecraft.ChatFormatting;
import net.minecraft.client.multiplayer.chat.GuiMessage;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.ChatComponent;
import net.minecraft.client.gui.components.EditBox;
import net.minecraft.client.gui.screens.ChatScreen;
import net.minecraft.client.resources.sounds.SimpleSoundInstance;
import net.minecraft.network.chat.Component;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.util.Util;

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
    public static Component decorate(Component msg) {
        try {
            if (msg == null) return msg;
            NovaSettings.load();
            if (!NovaSettings.chatTime && !NovaSettings.chatMention) return msg;
            Component out = msg;
            boolean mention = NovaSettings.chatMention && mentions(msg.getString());
            if (mention) {
                out = msg.copy().withStyle(ChatFormatting.YELLOW);
                ping();
            }
            if (NovaSettings.chatTime) {
                LocalTime t = LocalTime.now();
                out = Component.literal(String.format(Locale.ROOT, "[%02d:%02d] ", t.getHour(), t.getMinute())).withStyle(ChatFormatting.GRAY).append(out);
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
            Minecraft mc = Minecraft.getInstance();
            String n = mc.getUser().getName();
            return n == null ? "" : n;
        } catch (Throwable e) { return ""; }
    }

    private static void ping() {
        try {
            Minecraft mc = Minecraft.getInstance();
            if (mc.player == null) return;
            mc.getSoundManager().play(new SimpleSoundInstance(SoundEvents.EXPERIENCE_ORB_PICKUP, net.minecraft.sounds.SoundSource.PLAYERS, 0.35f, 1.5f,
                    net.minecraft.util.RandomSource.create(), mc.player.getX(), mc.player.getY(), mc.player.getZ()));
        } catch (Throwable ignored) { }
    }

    // ---- buscador ----

    /** El buscador que se pone en el chat abierto (ChatScreenMixin lo añade a la pantalla). */
    public static EditBox searchField(Minecraft mc, int screenW, int screenH) {
        try {
            NovaSettings.load();
            if (!NovaSettings.chatSearch) return null;
            int w = Math.min(150, Math.max(60, screenW - 8)), h = 14;
            int top = screenH - 40 - 18;
            try {
                ChatComponent hud = NovaGui.chat(mc);
                double sc = mc.options.chatScale().get();
                int lines = Math.min(hud.getLinesPerPage(), ((NovaChatAccess) (Object) hud).nova$visible().size());
                top = (int) (screenH - 40 - Math.ceil(lines * lineH(mc) * sc)) - h - 4;
            } catch (Throwable ignored) { }
            top = Math.max(2, Math.min(top, screenH - 60));
            EditBox f = new EditBox(mc.font, 4, top, w, h, Component.empty());
            f.setMaxLength(60);
            f.setValue(query);
            f.setSuggestion(query.isEmpty() ? tr("Buscar en el chat…") : "");
            f.setResponder(s -> { f.setSuggestion(s.isEmpty() ? tr("Buscar en el chat…") : ""); setQuery(s); });
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
        try { ((NovaChatAccess) (Object) NovaGui.chat(Minecraft.getInstance())).nova$refresh(); } catch (Throwable ignored) { }
    }

    /** Se llama al volver a cargar el chat: deja solo los mensajes que contienen lo buscado. */
    public static void filter(List<GuiMessage.Line> v) {
        try {
            String q = query;
            if (q.isEmpty() || v == null || v.isEmpty()) return;
            if (!(NovaGui.screen(Minecraft.getInstance()) instanceof ChatScreen) || !NovaSettings.chatSearch) return;
            String low = q.toLowerCase(Locale.ROOT);
            List<GuiMessage.Line> keep = new ArrayList<>();
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
    static String entryText(List<GuiMessage.Line> v, int bottom, int top) {
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

    private static double lineH(Minecraft mc) { return (int) (9.0 * (mc.options.chatLineSpacing().get() + 1.0)); }

    /** Cada fotograma desde el HUD: copia con clic derecho, repone el chat al cerrarlo y dibuja el «copiado». */
    static void frame(GuiGraphicsExtractor c, Minecraft mc) {
        try {
            NovaSettings.load();
            boolean chat = NovaGui.screen(mc) instanceof ChatScreen;
            if (!chat && (wasChat || !query.isEmpty())) { query = ""; dirty = false; reload(); }
            if (chat && dirty) { dirty = false; reload(); }
            wasChat = chat;
            if (chat && NovaSettings.chatCopy) {
                boolean down = NovaInput.mouse(mc, 1);
                if (down && !wasRight) copyAt(c, mc);
                wasRight = down;
            } else wasRight = false;
            toast(c, mc);
        } catch (Throwable ignored) { }
    }

    private static void copyAt(GuiGraphicsExtractor c, Minecraft mc) {
        int sw = c.guiWidth(), sh = c.guiHeight();
        double mx = mc.mouseHandler.xpos() * sw / (double) mc.getWindow().getScreenWidth(), my = mc.mouseHandler.ypos() * sh / (double) mc.getWindow().getScreenHeight();
        ChatComponent hud = NovaGui.chat(mc);
        NovaChatAccess acc = (NovaChatAccess) (Object) hud;
        List<GuiMessage.Line> v = acc.nova$visible();
        double sc = mc.options.chatScale().get();
        double cx = mx / sc - 4.0, cy = (sh - my - 40.0) / (sc * lineH(mc));
        if (cx < -4.0 || cx > Math.floor(ChatComponent.getWidth(mc.options.chatWidth().get()) / sc)) return;
        int shown = Math.min(hud.getLinesPerPage(), v.size());
        if (cy < 0.0 || cy >= shown) return;
        int i = (int) Math.floor(cy + acc.nova$scrolled());
        if (i < 0 || i >= v.size()) return;
        int b = i;
        while (b > 0 && !v.get(b).endOfEntry()) b--;   // hacia abajo hasta la línea que cierra el mensaje
        int t = b;
        while (t + 1 < v.size() && !v.get(t + 1).endOfEntry()) t++;
        String s = STAMP.matcher(entryText(v, b, t)).replaceFirst("");
        if (s.isEmpty()) return;
        mc.keyboardHandler.setClipboard(s);
        copiedText = s; copiedAt = Util.getMillis();
    }

    private static void toast(GuiGraphicsExtractor c, Minecraft mc) {
        if (copiedAt == 0) return;
        long age = Util.getMillis() - copiedAt;
        if (age > 1600) { copiedAt = 0; return; }
        float a = Math.min(1f, age / 120f) * Math.min(1f, (1600 - age) / 300f);
        if (a <= 0f) return;
        Font font = mc.font;
        String s = "✓ " + tr("Mensaje copiado");
        int w = font.width(s) + 12, h = 16, sw = c.guiWidth(), sh = c.guiHeight();
        int x = (sw - w) / 2, y = sh - 40 - 34 - (int) ((1f - Math.min(1f, age / 120f)) * 6);
        NovaButton.panel(c, x, y, w, h, 5, NovaShots.withAlpha(0xF010102A, a), NovaShots.withAlpha(0xFF4A3C8C, a));
        c.text(font, s, x + 6, y + 4, NovaShots.withAlpha(0xFFFFFFFF, a), true);
    }

}
