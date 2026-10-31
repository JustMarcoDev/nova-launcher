package dev.astrion.nova;

import static dev.astrion.nova.NovaLang.tr;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.network.chat.Component;

/**
 * El panel de «Editar HUD», estilo Lunar: un solo panel con pestañas (Elementos, Juego, Perfiles y Accesibilidad) en vez de botones sueltos.
 * Lo usa NovaHudScreen. Los botones se añaden a través de {@link Host}; el fondo del panel es un "botón" inactivo que se pinta primero.
 */
final class NovaHudPanel {
    private NovaHudPanel() { }

    interface Host {
        void put(NovaButton b);
        void rebuild();
        int sw();
        int sh();
        void done();
    }

    static final int T_EL = 0, T_GAME = 1, T_PROF = 2, T_ACC = 3;
    /** Pestaña abierta y panel desplegado (se recuerdan mientras el juego está abierto). */
    static int tab = T_EL;
    static boolean open = true;
    /** Qué tecla se está eligiendo: 0 ninguna, 1 zoom, 2 freelook. */
    static int listening;
    /** Nombre que se está escribiendo al renombrar el perfil (null = no se renombra) y aviso breve. */
    static String typing;
    static String note = "";
    static long noteAt;
    static final int[] FPS_GOALS = { 30, 60, 90, 120, 144 };

    static int ib() { return 15; }

    static Component lit(String s) { return Component.literal(s); }

    private static NovaButton btn(Host h, int x, int y, int w, int hh, String label, int icon, int style, Runnable r) {
        NovaButton b = new NovaButton(x, y, w, hh, lit(label), icon, style, bb -> r.run());
        h.put(b);
        return b;
    }

    private static NovaButton tog(Host h, int x, int y, int w, int hh, String label, boolean on, Runnable r) {
        return btn(h, x, y, w, hh, label, on ? NovaGfx.I_CHECK : -1, on ? NovaButton.SELECTED : NovaButton.NORMAL, () -> { r.run(); h.rebuild(); });
    }

    private static String yn(boolean b) { return b ? tr("Sí") : tr("No"); }

    static void say(String s) { note = s; noteAt = System.currentTimeMillis(); }

    // ---- construcción ----

    static void build(Host h) {
        NovaSettings.load();
        int sw = h.sw(), sh = h.sh();
        int hh = sh < 250 ? 12 : 15, gap = 3;
        int pw = Math.min(300, sw - 12), x = (sw - pw) / 2, pad = 8, cw = pw - 2 * pad;
        int rows = 7;
        int headH = 16, tabsH = hh + 2, footH = hh;
        int ph = pad + headH + tabsH + 2 + rows * (hh + gap) + footH + pad - gap + 2;
        if (!open) {
            int y = sh - hh - 10, half = (pw - gap) / 2;
            btn(h, x, y, half, hh, tr("Mostrar panel"), -1, NovaButton.NORMAL, () -> { open = true; h.rebuild(); });
            btn(h, x + half + gap, y, pw - half - gap, hh, tr("Listo"), NovaGfx.I_CHECK, NovaButton.PRIMARY, h::done);
            return;
        }
        int y0 = sh - ph - 8;
        final int fx = x, fy = y0, fw = pw, fh = ph, fpad = pad;
        NovaButton bg = new NovaButton(fx, fy, fw, fh, lit(""), -1, NovaButton.NORMAL, b -> { });
        bg.active = false;
        bg.paint = o -> paintBg((GuiGraphicsExtractor) o, fx, fy, fw, fh, fpad);
        h.put(bg);
        int cx = x + pad, y = y0 + pad + headH;
        // pestañas
        String[] tn = { tr("Elementos"), tr("Juego"), tr("Perfiles"), tr("Accesibilidad") };
        int tw = (cw - 3 * gap) / 4;
        for (int i = 0; i < 4; i++) {
            final int k = i;
            btn(h, cx + i * (tw + gap), y, tw, hh, tn[i], -1, tab == i ? NovaButton.PRIMARY : NovaButton.NORMAL, () -> { tab = k; listening = 0; typing = null; h.rebuild(); });
        }
        y += tabsH + 2;
        int ry = y;
        switch (tab) {
            case T_EL: buildEls(h, cx, ry, cw, hh, gap); break;
            case T_GAME: buildGame(h, cx, ry, cw, hh, gap); break;
            case T_PROF: buildProf(h, cx, ry, cw, hh, gap); break;
            default: buildAcc(h, cx, ry, cw, hh, gap); break;
        }
        // pie: restablecer y listo
        int fyy = y0 + ph - pad - footH + 2, third = (cw - 2 * gap) / 3;
        btn(h, cx, fyy, third, hh, tr("Ocultar"), -1, NovaButton.NORMAL, () -> { open = false; h.rebuild(); });
        btn(h, cx + third + gap, fyy, third, hh, tr("Restablecer"), NovaGfx.I_SWAP, NovaButton.NORMAL, () -> { NovaHud.resetPositions(); h.rebuild(); });
        btn(h, cx + 2 * (third + gap), fyy, cw - 2 * (third + gap), hh, tr("Listo"), NovaGfx.I_CHECK, NovaButton.PRIMARY, h::done);
    }

    static void buildEls(Host h, int x, int y, int w, int hh, int gap) {
        String[] names = { "FPS", "CPS", tr("Coords"), tr("Teclas"), tr("Estado"), tr("Armadura"), tr("Pociones"), tr("Reloj"), tr("Brújula") };
        int cw = (w - 2 * gap) / 3;
        for (int i = 0; i < NovaHud.ALL.length; i++) {
            final NovaHud.El e = NovaHud.ALL[i];
            int cx = x + (i % 3) * (cw + gap), cy = y + (i / 3) * (hh + gap), bw = (i % 3 == 2) ? w - 2 * (cw + gap) : cw;
            tog(h, cx, cy, bw, hh, names[i], e.on, () -> e.on = !e.on);
        }
    }

    static void buildGame(Host h, int x, int y, int w, int hh, int gap) {
        int half = (w - gap) / 2, st = hh + gap, r = 0;
        tog(h, x, y + r * st, half, hh, tr("Zoom") + ": " + yn(NovaHud.zoomOn), NovaHud.zoomOn, () -> NovaHud.zoomOn = !NovaHud.zoomOn);
        btn(h, x + half + gap, y + r * st, w - half - gap, hh, listening == 1 ? tr("Pulsa una tecla…") : NovaHud.keyName(NovaHud.zoomKey), -1, listening == 1 ? NovaButton.PRIMARY : NovaButton.NORMAL, () -> { listening = listening == 1 ? 0 : 1; h.rebuild(); });
        r++;
        tog(h, x, y + r * st, half, hh, tr("Freelook") + ": " + yn(NovaMove.freelook), NovaMove.freelook, () -> NovaMove.freelook = !NovaMove.freelook);
        btn(h, x + half + gap, y + r * st, w - half - gap, hh, listening == 2 ? tr("Pulsa una tecla…") : NovaHud.keyName(NovaMove.freelookKey), -1, listening == 2 ? NovaButton.PRIMARY : NovaButton.NORMAL, () -> { listening = listening == 2 ? 0 : 2; h.rebuild(); });
        r++;
        tog(h, x, y + r * st, half, hh, tr("Sprint fijo") + ": " + yn(NovaMove.sprintFixed), NovaMove.sprintFixed, () -> NovaMove.sprintFixed = !NovaMove.sprintFixed);
        tog(h, x + half + gap, y + r * st, w - half - gap, hh, tr("Agacharse fijo") + ": " + yn(NovaMove.crouchFixed), NovaMove.crouchFixed, () -> NovaMove.crouchFixed = !NovaMove.crouchFixed);
        r++;
        tog(h, x, y + r * st, half, hh, tr("Mostrar que uso Nova") + ": " + yn(NovaSettings.showNova), NovaSettings.showNova, () -> NovaSettings.showNova = !NovaSettings.showNova);
        tog(h, x + half + gap, y + r * st, w - half - gap, hh, tr("Capa de Nova") + ": " + yn(NovaSettings.showCape), NovaSettings.showCape, () -> NovaSettings.showCape = !NovaSettings.showCape);
        r++;
        int cw = (w - 3 * gap) / 4;
        String[] cn = { tr("Hora"), tr("Copiar"), tr("Buscar"), tr("Menciones") };
        boolean[] cv = { NovaSettings.chatTime, NovaSettings.chatCopy, NovaSettings.chatSearch, NovaSettings.chatMention };
        for (int i = 0; i < 4; i++) {
            final int k = i;
            tog(h, x + i * (cw + gap), y + r * st, i == 3 ? w - 3 * (cw + gap) : cw, hh, cn[i], cv[i], () -> {
                if (k == 0) NovaSettings.chatTime = !NovaSettings.chatTime; else if (k == 1) NovaSettings.chatCopy = !NovaSettings.chatCopy; else if (k == 2) NovaSettings.chatSearch = !NovaSettings.chatSearch; else NovaSettings.chatMention = !NovaSettings.chatMention;
            });
        }
        r++;
        btn(h, x, y + r * st, half, hh, tr("Objetivo") + ": " + NovaSettings.fpsGoal + " FPS", NovaGfx.I_BOLT, NovaButton.NORMAL, () -> {
            int i = 0;
            for (int k = 0; k < FPS_GOALS.length; k++) if (FPS_GOALS[k] == NovaSettings.fpsGoal) i = k;
            NovaSettings.fpsGoal = FPS_GOALS[(i + 1) % FPS_GOALS.length];
            h.rebuild();
        });
        tog(h, x + half + gap, y + r * st, w - half - gap, hh, tr("Modo FPS") + ": " + yn(NovaFps.on()), NovaFps.on(), () -> { Minecraft mc = Minecraft.getInstance(); if (NovaFps.on()) NovaFps.restore(mc); else NovaFps.enable(mc); });
        r++;
        tog(h, x, y + r * st, w, hh, tr("Avisos del launcher en el juego") + ": " + yn(NovaSettings.toasts), NovaSettings.toasts, () -> NovaSettings.toasts = !NovaSettings.toasts);
    }

    static void buildProf(Host h, int x, int y, int w, int hh, int gap) {
        int st = hh + gap, r = 0, ar = 22, half = (w - gap) / 2;
        boolean def = NovaHud.profile.equals(NovaHud.DEFAULT);
        btn(h, x, y, ar, hh, "<", -1, NovaButton.NORMAL, () -> { typing = null; NovaHud.cycleProfile(-1); h.rebuild(); });
        String nm = typing != null ? typing + (((System.currentTimeMillis() / 500L) & 1L) == 0 ? "_" : " ") : NovaHud.profileLabel(NovaHud.profile);
        btn(h, x + ar + gap, y, w - 2 * (ar + gap), hh, nm, -1, typing != null ? NovaButton.PRIMARY : NovaButton.SELECTED, () -> { });
        btn(h, x + w - ar, y, ar, hh, ">", -1, NovaButton.NORMAL, () -> { typing = null; NovaHud.cycleProfile(1); h.rebuild(); });
        r++;
        btn(h, x, y + r * st, half, hh, tr("Nuevo"), NovaGfx.I_PLUS, NovaButton.NORMAL, () -> { typing = null; NovaHud.profileNew(); h.rebuild(); });
        btn(h, x + half + gap, y + r * st, w - half - gap, hh, tr("Duplicar"), -1, NovaButton.NORMAL, () -> { typing = null; NovaHud.profileDup(); h.rebuild(); });
        r++;
        NovaButton rn = btn(h, x, y + r * st, half, hh, typing != null ? tr("Aceptar") : tr("Renombrar"), NovaGfx.I_EDIT, typing != null ? NovaButton.PRIMARY : NovaButton.NORMAL, () -> {
            if (typing == null) { typing = NovaHud.profile; }
            else { if (!NovaHud.profileRename(typing)) say(tr("Ese nombre no vale")); typing = null; }
            h.rebuild();
        });
        rn.active = !def;
        NovaButton dl = btn(h, x + half + gap, y + r * st, w - half - gap, hh, tr("Borrar"), NovaGfx.I_CLOSE, NovaButton.DANGER, () -> { typing = null; NovaHud.profileDelete(); h.rebuild(); });
        dl.active = !def;
        r++;
        String key = NovaHud.currentKey(Minecraft.getInstance());
        String cur = NovaHud.ruleFor(key);
        boolean on = !key.isEmpty() && NovaHud.profile.equals(cur);
        NovaButton use = btn(h, x, y + r * st, w - (cur != null ? hh + gap + 40 : 0), hh, on ? tr("Perfil de este servidor") : tr("Usar en este servidor"), on ? NovaGfx.I_CHECK : NovaGfx.I_EARTH, on ? NovaButton.SELECTED : NovaButton.NORMAL, () -> { NovaHud.ruleSet(key, NovaHud.profile); say(tr("Hecho")); h.rebuild(); });
        use.active = !key.isEmpty();
        if (cur != null) btn(h, x + w - hh - 40 - 0, y + r * st, hh + 40, hh, tr("Quitar"), -1, NovaButton.NORMAL, () -> { NovaHud.ruleClear(key); h.rebuild(); });
    }

    static void buildAcc(Host h, int x, int y, int w, int hh, int gap) {
        int st = hh + gap, r = 0, ar = 22;
        btn(h, x, y, ar, hh, "-", -1, NovaButton.NORMAL, () -> { NovaAcc.textPct = NovaAcc.clampPct(NovaAcc.textPct - 10); NovaAcc.useLauncher = false; h.rebuild(); });
        btn(h, x + ar + gap, y, w - 2 * (ar + gap), hh, tr("Escala del texto") + ": " + NovaAcc.textPct + "%", -1, NovaButton.SELECTED, () -> { NovaAcc.textPct = 100; h.rebuild(); });
        btn(h, x + w - ar, y, ar, hh, "+", -1, NovaButton.NORMAL, () -> { NovaAcc.textPct = NovaAcc.clampPct(NovaAcc.textPct + 10); NovaAcc.useLauncher = false; h.rebuild(); });
        r++;
        tog(h, x, y + r * st, w, hh, tr("Alto contraste") + ": " + yn(NovaAcc.contrast), NovaAcc.contrast, () -> { NovaAcc.contrast = !NovaAcc.contrast; NovaAcc.useLauncher = false; });
        r++;
        tog(h, x, y + r * st, w, hh, tr("Reducir movimiento") + ": " + yn(NovaAcc.motion), NovaAcc.motion, () -> { NovaAcc.motion = !NovaAcc.motion; NovaAcc.useLauncher = false; });
        r++;
        tog(h, x, y + r * st, w, hh, tr("Usar la accesibilidad del launcher") + ": " + yn(NovaAcc.useLauncher), NovaAcc.useLauncher, () -> NovaAcc.useLauncher = !NovaAcc.useLauncher);
    }

    // ---- pintado del fondo ----

    static void paintBg(GuiGraphicsExtractor c, int x, int y, int w, int h, int pad) {
        Minecraft mc = Minecraft.getInstance();
        NovaButton.panel(c, x, y, w, h, 7, 0xE8101024, NovaAcc.hc() ? 0xFFFFFFFF : ((NovaSettings.accent & 0xFFFFFF) | 0x88000000));
        c.fill(x + 6, y + 5, x + 8, y + 15, NovaSettings.accent);
        NovaX.text(c, mc, tr("Editar HUD"), x + 12, y + 6, 0xFFFFFFFF, true);
        String hint = tr("Arrastra: mover · Esquina: tamaño · X: quitar");
        int hw = NovaX.width(mc, hint);
        if (hw < w - 110) NovaX.text(c, mc, hint, x + w - pad - hw, y + 6, 0xFF9A9AC0, false);
        if (tab == T_PROF) {
            String key = NovaHud.currentKey(mc), cur = NovaHud.ruleFor(key);
            int ly = y + h - pad - 15 - 2 - 12 - 12;
            String a = key.isEmpty() ? tr("Fuera de una partida: abre el panel dentro de un servidor para asignarle un perfil") : tr("Partida") + ": " + (key.equals("singleplayer") ? tr("Un jugador") : key);
            NovaX.text(c, mc, a, x + pad, ly, 0xFFB8B8D8, false);
            if (!key.isEmpty()) NovaX.text(c, mc, cur == null ? tr("Sin perfil asignado: usa el predeterminado") : tr("Perfil asignado") + ": " + NovaHud.profileLabel(cur), x + pad, ly + 11, 0xFFB8B8D8, false);
        }
        if (tab == T_GAME && NovaFps.on() && listening == 0 && (note.isEmpty() || System.currentTimeMillis() - noteAt >= 2500)) NovaX.text(c, mc, "Modo FPS: " + NovaFps.status(), x + pad, y + h - pad - 15 - 2 - 12, 0xFFB8B8D8, false);
        if (listening != 0) NovaX.text(c, mc, tr("Pulsa la tecla que quieras (Esc cancela)"), x + pad, y + h - pad - 15 - 2 - 12, 0xFFFFD27A, false);
        if (!note.isEmpty() && System.currentTimeMillis() - noteAt < 2500) NovaX.text(c, mc, note, x + pad, y + h - pad - 15 - 2 - 12, 0xFFFFD27A, false);
    }

    // ---- teclado ----

    /** Devuelve true si el panel se ha quedado con la tecla (elegir tecla o escribir un nombre). */
    static boolean key(Host h, int key) {
        if (listening != 0) {
            if (key != 256) { if (listening == 1) NovaHud.zoomKey = key; else NovaMove.freelookKey = key; }
            listening = 0;
            h.rebuild();
            return true;
        }
        if (typing != null) {
            if (key == 256) { typing = null; h.rebuild(); }
            else if (key == 257 || key == 335) { if (!NovaHud.profileRename(typing)) say(tr("Ese nombre no vale")); typing = null; h.rebuild(); }
            else if (key == 259) { if (!typing.isEmpty()) typing = typing.substring(0, typing.length() - 1); h.rebuild(); }
            return true;
        }
        return false;
    }

    static boolean typed(Host h, char ch) {
        if (typing == null) return false;
        if (ch >= 32 && ch != 127 && typing.length() < 24) { typing += ch; h.rebuild(); }
        return true;
    }
}
