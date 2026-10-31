package dev.astrion.nova;

import static dev.astrion.nova.NovaLang.tr;

import java.util.List;
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

    // ---- hora y menciones (al entrar el mensaje) ----

    /** Devuelve el mensaje con la hora delante y el color de mención; lo llama ChatHudMixin antes de guardarlo. */
    public static Text decorate(Text msg) {
        try {
            if (msg == null) return msg;
            NovaSettings.load();
            if (!NovaSettings.chatTime && !NovaSettings.chatMention) return msg;
            Text out = msg;
            boolean mention = NovaSettings.chatMention && NovaChatCore.mentions(msg.getString(), myName());
            if (mention) {
                out = msg.copy().formatted(Formatting.YELLOW);
                ping();
            }
            if (NovaSettings.chatTime) {
                out = Text.literal(NovaChatCore.stamp()).formatted(Formatting.GRAY).append(out);
            }
            return out;
        } catch (Throwable e) { return msg; }
    }

    private static String myName() { return NovaMc.userName(); }

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
            f.setText(NovaChatCore.query);
            f.setSuggestion(NovaChatCore.query.isEmpty() ? tr("Buscar en el chat…") : "");
            f.setChangedListener(s -> { f.setSuggestion(s.isEmpty() ? tr("Buscar en el chat…") : ""); setQuery(s); });
            return f;
        } catch (Throwable e) { return null; }
    }

    private static void setQuery(String s) { if (NovaChatCore.setQuery(s)) reload(); }

    private static void reload() {
        try { ((NovaChatAccess) (Object) MinecraftClient.getInstance().inGameHud.getChatHud()).nova$refresh(); } catch (Throwable ignored) { }
    }

    /** Texto de una línea visible del chat. */
    private static String lineText(ChatHudLine.Visible l) {
        StringBuilder ln = new StringBuilder();
        l.content().accept((idx, style, cp) -> { ln.appendCodePoint(cp); return true; });
        return ln.toString();
    }

    /** Se llama al volver a cargar el chat: deja solo los mensajes que contienen lo buscado. */
    public static void filter(List<ChatHudLine.Visible> v) {
        try {
            if (NovaChatCore.query.isEmpty() || v == null || v.isEmpty()) return;
            if (!(MinecraftClient.getInstance().currentScreen instanceof ChatScreen) || !NovaSettings.chatSearch) return;
            NovaChatCore.filter(v, ChatHudLine.Visible::endOfEntry, NovaChat::lineText);
        } catch (Throwable ignored) { }
    }

    /** Un mensaje nuevo con el buscador activo: hay que volver a filtrar. */
    public static void added() { if (!NovaChatCore.query.isEmpty()) NovaChatCore.dirty = true; }

    // ---- clic derecho para copiar ----

    private static double lineH(MinecraftClient mc) { return (int) (9.0 * (mc.options.getChatLineSpacing().getValue() + 1.0)); }

    /** Cada fotograma desde el HUD: copia con clic derecho, repone el chat al cerrarlo y dibuja el «copiado». */
    static void frame(DrawContext c, MinecraftClient mc) {
        try {
            NovaSettings.load();
            boolean chat = mc.currentScreen instanceof ChatScreen;
            if (!chat && (NovaChatCore.wasChat || !NovaChatCore.query.isEmpty())) { NovaChatCore.query = ""; NovaChatCore.dirty = false; reload(); }
            if (chat && NovaChatCore.dirty) { NovaChatCore.dirty = false; reload(); }
            NovaChatCore.wasChat = chat;
            if (chat && NovaSettings.chatCopy) {
                boolean down = GLFW.glfwGetMouseButton(mc.getWindow().getHandle(), GLFW.GLFW_MOUSE_BUTTON_RIGHT) == GLFW.GLFW_PRESS;
                if (down && !NovaChatCore.wasRight) copyAt(c, mc);
                NovaChatCore.wasRight = down;
            } else NovaChatCore.wasRight = false;
            toast(c, mc);
        } catch (Throwable ignored) { }
    }

    private static void copyAt(DrawContext c, MinecraftClient mc) {
        int sw = c.getScaledWindowWidth(), sh = c.getScaledWindowHeight();
        double mx = mc.mouse.getX() * sw / (double) mc.getWindow().getWidth(), my = mc.mouse.getY() * sh / (double) mc.getWindow().getHeight();
        ChatHud hud = mc.inGameHud.getChatHud();
        NovaChatAccess acc = (NovaChatAccess) (Object) hud;
        List<ChatHudLine.Visible> v = acc.nova$visible();
        int i = NovaChatCore.lineAt(mx, my, sh, mc.options.getChatScale().getValue(), lineH(mc), ChatHud.getWidth(mc.options.getChatWidth().getValue()), Math.min(hud.getVisibleLineCount(), v.size()), acc.nova$scrolled(), v.size());
        if (i < 0) return;
        String s = NovaChatCore.entryAt(v, i, ChatHudLine.Visible::endOfEntry, NovaChat::lineText);
        if (s.isEmpty()) return;
        mc.keyboard.setClipboard(s);
        NovaChatCore.copiedAt = Util.getMeasuringTimeMs();
    }

    private static void toast(DrawContext c, MinecraftClient mc) {
        if (NovaChatCore.copiedAt == 0) return;
        long age = Util.getMeasuringTimeMs() - NovaChatCore.copiedAt;
        if (age > NovaChatCore.TOAST_MS) { NovaChatCore.copiedAt = 0; return; }
        float a = NovaChatCore.toastAlpha(age);
        if (a <= 0f) return;
        TextRenderer font = mc.textRenderer;
        String s = "✓ " + tr("Mensaje copiado");
        int w = font.getWidth(s) + 12, h = 16, sw = c.getScaledWindowWidth(), sh = c.getScaledWindowHeight();
        int x = (sw - w) / 2, y = sh - 40 - 34 - NovaChatCore.toastRise(age);
        NovaButton.panel(c, x, y, w, h, 5, NovaShots.withAlpha(0xF010102A, a), NovaShots.withAlpha(0xFF4A3C8C, a));
        c.drawText(font, s, x + 6, y + 4, NovaShots.withAlpha(0xFFFFFFFF, a), true);
    }
}
