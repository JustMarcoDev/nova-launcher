package dev.astrion.nova;

import static dev.astrion.nova.NovaLang.tr;

import java.util.List;
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
 * No depende de nada privado del chat: el texto se cambia al entrar el mensaje (ChatComponentMixin) y el resto se resuelve
 * con las líneas visibles del chat, que son iguales en todas las versiones.
 */
public final class NovaChat {
    private NovaChat() { }

    // ---- hora y menciones (al entrar el mensaje) ----

    /** Devuelve el mensaje con la hora delante y el color de mención; lo llama ChatComponentMixin antes de guardarlo. */
    public static Component decorate(Component msg) {
        try {
            if (msg == null) return msg;
            NovaSettings.load();
            if (!NovaSettings.chatTime && !NovaSettings.chatMention) return msg;
            Component out = msg;
            boolean mention = NovaSettings.chatMention && NovaChatCore.mentions(msg.getString(), myName());
            if (mention) {
                out = msg.copy().withStyle(ChatFormatting.YELLOW);
                ping();
            }
            if (NovaSettings.chatTime) {
                out = Component.literal(NovaChatCore.stamp()).withStyle(ChatFormatting.GRAY).append(out);
            }
            return out;
        } catch (Throwable e) { return msg; }
    }

    private static String myName() { return NovaMc.userName(); }

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
            f.setValue(NovaChatCore.query);
            f.setSuggestion(NovaChatCore.query.isEmpty() ? tr("Buscar en el chat…") : "");
            f.setResponder(s -> { f.setSuggestion(s.isEmpty() ? tr("Buscar en el chat…") : ""); setQuery(s); });
            return f;
        } catch (Throwable e) { return null; }
    }

    private static void setQuery(String s) { if (NovaChatCore.setQuery(s)) reload(); }

    private static void reload() {
        try { ((NovaChatAccess) (Object) NovaGui.chat(Minecraft.getInstance())).nova$refresh(); } catch (Throwable ignored) { }
    }

    /** Texto de una línea visible del chat. */
    private static String lineText(GuiMessage.Line l) {
        StringBuilder ln = new StringBuilder();
        l.content().accept((idx, style, cp) -> { ln.appendCodePoint(cp); return true; });
        return ln.toString();
    }

    /** Se llama al volver a cargar el chat: deja solo los mensajes que contienen lo buscado. */
    public static void filter(List<GuiMessage.Line> v) {
        try {
            if (NovaChatCore.query.isEmpty() || v == null || v.isEmpty()) return;
            if (!(NovaGui.screen(Minecraft.getInstance()) instanceof ChatScreen) || !NovaSettings.chatSearch) return;
            NovaChatCore.filter(v, GuiMessage.Line::endOfEntry, NovaChat::lineText);
        } catch (Throwable ignored) { }
    }

    /** Un mensaje nuevo con el buscador activo: hay que volver a filtrar. */
    public static void added() { if (!NovaChatCore.query.isEmpty()) NovaChatCore.dirty = true; }

    // ---- clic derecho para copiar ----

    private static double lineH(Minecraft mc) { return (int) (9.0 * (mc.options.chatLineSpacing().get() + 1.0)); }

    /** Cada fotograma desde el HUD: copia con clic derecho, repone el chat al cerrarlo y dibuja el «copiado». */
    static void frame(GuiGraphicsExtractor c, Minecraft mc) {
        try {
            NovaSettings.load();
            boolean chat = NovaGui.screen(mc) instanceof ChatScreen;
            if (!chat && (NovaChatCore.wasChat || !NovaChatCore.query.isEmpty())) { NovaChatCore.query = ""; NovaChatCore.dirty = false; reload(); }
            if (chat && NovaChatCore.dirty) { NovaChatCore.dirty = false; reload(); }
            NovaChatCore.wasChat = chat;
            if (chat && NovaSettings.chatCopy) {
                boolean down = NovaInput.mouse(mc, 1);
                if (down && !NovaChatCore.wasRight) copyAt(c, mc);
                NovaChatCore.wasRight = down;
            } else NovaChatCore.wasRight = false;
            toast(c, mc);
        } catch (Throwable ignored) { }
    }

    private static void copyAt(GuiGraphicsExtractor c, Minecraft mc) {
        int sw = c.guiWidth(), sh = c.guiHeight();
        double mx = mc.mouseHandler.xpos() * sw / (double) mc.getWindow().getScreenWidth(), my = mc.mouseHandler.ypos() * sh / (double) mc.getWindow().getScreenHeight();
        ChatComponent hud = NovaGui.chat(mc);
        NovaChatAccess acc = (NovaChatAccess) (Object) hud;
        List<GuiMessage.Line> v = acc.nova$visible();
        int i = NovaChatCore.lineAt(mx, my, sh, mc.options.chatScale().get(), lineH(mc), ChatComponent.getWidth(mc.options.chatWidth().get()), Math.min(hud.getLinesPerPage(), v.size()), acc.nova$scrolled(), v.size());
        if (i < 0) return;
        String s = NovaChatCore.entryAt(v, i, GuiMessage.Line::endOfEntry, NovaChat::lineText);
        if (s.isEmpty()) return;
        mc.keyboardHandler.setClipboard(s);
        NovaChatCore.copiedAt = Util.getMillis();
    }

    private static void toast(GuiGraphicsExtractor c, Minecraft mc) {
        if (NovaChatCore.copiedAt == 0) return;
        long age = Util.getMillis() - NovaChatCore.copiedAt;
        if (age > NovaChatCore.TOAST_MS) { NovaChatCore.copiedAt = 0; return; }
        float a = NovaChatCore.toastAlpha(age);
        if (a <= 0f) return;
        Font font = mc.font;
        String s = "✓ " + tr("Mensaje copiado");
        int w = font.width(s) + 12, h = 16, sw = c.guiWidth(), sh = c.guiHeight();
        int x = (sw - w) / 2, y = sh - 40 - 34 - NovaChatCore.toastRise(age);
        NovaButton.panel(c, x, y, w, h, 5, NovaShots.withAlpha(0xF010102A, a), NovaShots.withAlpha(0xFF4A3C8C, a));
        c.text(font, s, x + 6, y + 4, NovaShots.withAlpha(0xFFFFFFFF, a), true);
    }
}
