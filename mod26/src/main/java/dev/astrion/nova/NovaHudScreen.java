package dev.astrion.nova;

import static dev.astrion.nova.NovaLang.tr;

import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.events.GuiEventListener;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;
import com.mojang.blaze3d.platform.InputConstants;

/**
 * «Editar HUD»: se arrastran los elementos del HUD (FPS, CPS, coordenadas, teclas) para colocarlos, se activan o desactivan por separado
 * y se elige la tecla del zoom. Se abre desde el menú de pausa y desde el panel de Nova del menú principal.
 * El arrastre se hace mirando el ratón en cada fotograma (así sirve igual en todas las versiones).
 */
public class NovaHudScreen extends NovaScreen {
    private final Screen parent;
    private NovaHud.El drag, size;
    private float sizeX0, sizeY0, sizeUW, sizeUH;
    private int offX, offY;
    private boolean wasDown;
    /** Qué tecla se está eligiendo: 0 ninguna, 1 zoom, 2 freelook. */
    private int listening;
    /** Panel de ajustes abierto o plegado (se recuerda mientras el juego está abierto). */
    private static boolean open = true;

    public NovaHudScreen(Screen parent) {
        super(Component.literal(tr("Editar HUD")));
        this.parent = parent;
    }

    @Override
    protected void init() {
        NovaTitleScreen.ensure(minecraft);
        NovaSettings.load();
        int pw = Math.min(262, width - 16), x = (width - pw) / 2, gap = 3, ib = 15;
        int rows = open ? 9 : 1, total = rows * ib + (rows - 1) * gap;
        int y = height - total - 10;
        if (open) buildPanel(x, y, pw, gap, ib); else addBar(x, y, pw, gap, ib);
    }

    /** Barra de abajo: abrir/plegar el panel y «Listo». */
    private void addBar(int x, int y, int pw, int gap, int ib) {
        int half = (pw - gap) / 2;
        addRenderableWidget(new NovaButton(x, y, half, ib, Component.literal(open ? tr("Ocultar panel") : tr("Mostrar panel")), -1, NovaButton.NORMAL, b -> { open = !open; rebuildWidgets(); })
                .tip(tr("Panel de ajustes"), tr("Ábrelo o ciérralo para mover el HUD sin que estorbe")));
        addRenderableWidget(new NovaButton(x + half + gap, y, pw - half - gap, ib, Component.literal(tr("Listo")), NovaGfx.I_CHECK, NovaButton.PRIMARY, b -> onClose()));
    }

    private void buildPanel(int x, int y, int pw, int gap, int ib) {
        // 1) un botón por elemento
        int n = NovaHud.ALL.length, bw = (pw - (n - 1) * gap) / n;
        String[] names = { "FPS", "CPS", tr("Coords"), tr("Teclas"), tr("Estado") };
        for (int i = 0; i < n; i++) {
            final NovaHud.El e = NovaHud.ALL[i];
            addRenderableWidget(new NovaButton(x + i * (bw + gap), y, bw, ib, Component.literal(names[i]), e.on ? NovaGfx.I_CHECK : -1, e.on ? NovaButton.SELECTED : NovaButton.NORMAL, b -> { e.on = !e.on; rebuildWidgets(); })
                    .tip(names[i], e.on ? tr("Activado: pulsa para ocultarlo") : tr("Desactivado: pulsa para mostrarlo")));
        }
        y += ib + gap;
        // 2) zoom: activar y tecla
        int half = (pw - gap) / 2;
        addRenderableWidget(new NovaButton(x, y, half, ib, Component.literal(tr("Zoom") + ": " + (NovaHud.zoomOn ? tr("Sí") : tr("No"))), NovaHud.zoomOn ? NovaGfx.I_CHECK : -1, NovaHud.zoomOn ? NovaButton.SELECTED : NovaButton.NORMAL, b -> { NovaHud.zoomOn = !NovaHud.zoomOn; rebuildWidgets(); })
                .tip(tr("Zoom"), tr("Mantén la tecla para acercar la vista")));
        addRenderableWidget(new NovaButton(x + half + gap, y, pw - half - gap, ib, Component.literal(listening == 1 ? tr("Pulsa una tecla…") : tr("Tecla de zoom") + ": " + NovaHud.keyName(NovaHud.zoomKey)), -1, listening == 1 ? NovaButton.PRIMARY : NovaButton.NORMAL, b -> { listening = 1; rebuildWidgets(); })
                .tip(tr("Tecla de zoom"), tr("Pulsa y luego la tecla que quieras (Esc cancela)")));
        y += ib + gap;
        // 2b) freelook: activar y tecla
        addRenderableWidget(new NovaButton(x, y, half, ib, Component.literal(tr("Freelook") + ": " + (NovaMove.freelook ? tr("Sí") : tr("No"))), NovaMove.freelook ? NovaGfx.I_CHECK : -1, NovaMove.freelook ? NovaButton.SELECTED : NovaButton.NORMAL, b -> { NovaMove.freelook = !NovaMove.freelook; rebuildWidgets(); })
                .tip(tr("Freelook"), tr("Mantén la tecla para mirar alrededor sin girar al jugador; al soltarla la cámara vuelve suave")));
        addRenderableWidget(new NovaButton(x + half + gap, y, pw - half - gap, ib, Component.literal(listening == 2 ? tr("Pulsa una tecla…") : tr("Tecla de freelook") + ": " + NovaMove.keyName()), -1, listening == 2 ? NovaButton.PRIMARY : NovaButton.NORMAL, b -> { listening = 2; rebuildWidgets(); })
                .tip(tr("Tecla de freelook"), tr("Pulsa y luego la tecla que quieras (Esc cancela)")));
        y += ib + gap;
        // 2c) sprint fijo y agacharse fijo
        addRenderableWidget(new NovaButton(x, y, half, ib, Component.literal(tr("Sprint fijo") + ": " + (NovaMove.sprintFixed ? tr("Sí") : tr("No"))), NovaMove.sprintFixed ? NovaGfx.I_CHECK : -1, NovaMove.sprintFixed ? NovaButton.SELECTED : NovaButton.NORMAL, b -> { NovaMove.sprintFixed = !NovaMove.sprintFixed; rebuildWidgets(); })
                .tip(tr("Sprint fijo"), tr("Una pulsación de la tecla de correr lo activa y otra lo desactiva")));
        addRenderableWidget(new NovaButton(x + half + gap, y, pw - half - gap, ib, Component.literal(tr("Agacharse fijo") + ": " + (NovaMove.crouchFixed ? tr("Sí") : tr("No"))), NovaMove.crouchFixed ? NovaGfx.I_CHECK : -1, NovaMove.crouchFixed ? NovaButton.SELECTED : NovaButton.NORMAL, b -> { NovaMove.crouchFixed = !NovaMove.crouchFixed; rebuildWidgets(); })
                .tip(tr("Agacharse fijo"), tr("Una pulsación de la tecla de agacharse lo activa y otra lo desactiva")));
        y += ib + gap;
        // 3) mostrar que uso Nova
        addRenderableWidget(new NovaButton(x, y, pw, ib, Component.literal(tr("Mostrar que uso Nova") + ": " + (NovaSettings.showNova ? tr("Sí") : tr("No"))), NovaSettings.showNova ? NovaGfx.I_CHECK : -1, NovaSettings.showNova ? NovaButton.SELECTED : NovaButton.NORMAL, b -> { NovaSettings.showNova = !NovaSettings.showNova; rebuildWidgets(); })
                .tip(tr("Mostrar que uso Nova"), tr("Los demás jugadores con Nova ven el logo junto a tu nombre") + presenceNote()));
        y += ib + gap;
        addRenderableWidget(new NovaButton(x, y, pw, ib, Component.literal(tr("Capa de Nova") + ": " + (NovaSettings.showCape ? tr("Sí") : tr("No"))), NovaSettings.showCape ? NovaGfx.I_CHECK : -1, NovaSettings.showCape ? NovaButton.SELECTED : NovaButton.NORMAL, b -> { NovaSettings.showCape = !NovaSettings.showCape; rebuildWidgets(); })
                .tip(tr("Capa de Nova"), tr("Los jugadores con Nova llevan una capa de Nova (la ves en ellos y ellos en ti)") + presenceNote()));
        y += ib + gap;
        // 4) chat mejorado: cuatro opciones por separado
        int cw = (pw - 3 * gap) / 4;
        String[] cn = { tr("Hora"), tr("Copiar"), tr("Buscar"), tr("Menciones") };
        boolean[] cv = { NovaSettings.chatTime, NovaSettings.chatCopy, NovaSettings.chatSearch, NovaSettings.chatMention };
        String[] ct = { tr("Pone [HH:mm] delante de cada mensaje del chat"), tr("Clic derecho sobre un mensaje del chat para copiarlo"), tr("Un buscador en el chat abierto que filtra el historial"), tr("Resalta con color y suena suave cuando alguien dice tu nombre") };
        for (int i = 0; i < 4; i++) {
            final int k = i;
            addRenderableWidget(new NovaButton(x + i * (cw + gap), y, cw, ib, Component.literal(cn[i]), cv[i] ? NovaGfx.I_CHECK : -1, cv[i] ? NovaButton.SELECTED : NovaButton.NORMAL, b -> {
                if (k == 0) NovaSettings.chatTime = !NovaSettings.chatTime; else if (k == 1) NovaSettings.chatCopy = !NovaSettings.chatCopy; else if (k == 2) NovaSettings.chatSearch = !NovaSettings.chatSearch; else NovaSettings.chatMention = !NovaSettings.chatMention;
                rebuildWidgets();
            }).tip(tr("Chat") + ": " + cn[i], ct[i]));
        }
        y += ib + gap;
        // 5) restablecer
        addRenderableWidget(new NovaButton(x, y, pw, ib, Component.literal(tr("Restablecer")), NovaGfx.I_SWAP, NovaButton.NORMAL, b -> { NovaHud.resetPositions(); rebuildWidgets(); })
                .tip(tr("Restablecer"), tr("Vuelve a las posiciones de fábrica")));
        y += ib + gap;
        addBar(x, y, pw, gap, ib);
    }

    /** Aviso honesto: sin servidor de presencia o sin cuenta Microsoft, los demás no pueden verte (tú sí te ves). */
    private static String presenceNote() {
        String w = NovaPresence.why();
        return w.isEmpty() ? "" : w.equals("sin-servidor") ? tr(" · Aún no hay servidor de presencia: de momento solo lo ves tú") : tr(" · Con cuenta sin conexión solo lo ves tú");
    }

    @Override
    public void onClose() {
        NovaSettings.save();
        NovaGui.setScreen(minecraft, parent);
    }

    @Override
    public void removed() {
        NovaSettings.save();
        super.removed();
    }

    @Override
    public void extractRenderState(GuiGraphicsExtractor c, int mx, int my, float delta) {
        super.extractRenderState(c, mx, my, delta);   // fondo (el juego oscurecido) y botones
        int sw = c.guiWidth(), sh = c.guiHeight();
        boolean sample = minecraft.player == null;
        boolean down = NovaHud.mouseDown(minecraft, 0);
        // elementos: se miden y se dibujan; el último dibujado queda encima
        int[][] box = new int[NovaHud.ALL.length][];
        for (int i = 0; i < NovaHud.ALL.length; i++) {
            NovaHud.El e = NovaHud.ALL[i];
            if (!e.on) continue;
            int[] s = NovaHud.sizeS(minecraft, e, sample), p = NovaHud.pos(e, sw, sh, s[0], s[1]);
            box[i] = new int[] { p[0], p[1], s[0], s[1] };
        }
        if (down && !wasDown && !overWidget(mx, my)) {   // clic: primero la X (quitar), luego la esquina (tamaño) y por último el cuerpo (mover)
            for (int i = NovaHud.ALL.length - 1; i >= 0; i--) {
                int[] b = box[i];
                if (b == null) continue;
                int[] xb = xBtn(b, sw), hb = handle(b);
                if (in(mx, my, xb[0], xb[1], XS, XS)) { NovaHud.ALL[i].on = false; rebuildWidgets(); box[i] = null; break; }
                if (in(mx, my, hb[0], hb[1], HS, HS)) {
                    size = NovaHud.ALL[i]; sizeX0 = b[0]; sizeY0 = b[1];
                    int[] u = NovaHud.size(minecraft, size, sample); sizeUW = u[0]; sizeUH = u[1];
                    break;
                }
                if (in(mx, my, b[0], b[1], b[2], b[3])) { drag = NovaHud.ALL[i]; offX = mx - b[0]; offY = my - b[1]; break; }
            }
        }
        if (!down) { drag = null; size = null; }
        if (size != null) {   // cambiar el tamaño: la esquina de arriba a la izquierda se queda quieta
            int i = java.util.Arrays.asList(NovaHud.ALL).indexOf(size);
            float k = NovaHud.clampS(Math.max((mx - sizeX0) / sizeUW, (my - sizeY0) / sizeUH));
            size.scale = k;
            int nw = Math.max(1, Math.round(sizeUW * k)), nh = Math.max(1, Math.round(sizeUH * k));
            size.fx = NovaHud.clamp01(sizeX0 / Math.max(1, sw - nw));
            size.fy = NovaHud.clamp01(sizeY0 / Math.max(1, sh - nh));
            int[] p = NovaHud.pos(size, sw, sh, nw, nh);
            box[i] = new int[] { p[0], p[1], nw, nh };
        }
        if (drag != null) {
            int i = java.util.Arrays.asList(NovaHud.ALL).indexOf(drag);
            int[] b = box[i];
            int fw = Math.max(1, sw - b[2]), fh = Math.max(1, sh - b[3]);
            drag.fx = NovaHud.clamp01((mx - offX) / (float) fw);
            drag.fy = NovaHud.clamp01((my - offY) / (float) fh);
            int[] p = NovaHud.pos(drag, sw, sh, b[2], b[3]);
            box[i][0] = p[0]; box[i][1] = p[1];
        }
        wasDown = down;
        for (int i = 0; i < NovaHud.ALL.length; i++) {
            int[] b = box[i];
            if (b == null) continue;
            NovaHud.drawS(c, minecraft, NovaHud.ALL[i], b[0], b[1], sample);
            boolean hot = NovaHud.ALL[i] == drag || NovaHud.ALL[i] == size || in(mx, my, b[0] - 2, b[1] - 2, b[2] + 4, b[3] + 4);
            int col = hot ? 0xCC000000 | (NovaSettings.accent & 0xFFFFFF) : 0x55FFFFFF;
            c.fill(b[0] - 2, b[1] - 2, b[0] + b[2] + 2, b[1] - 1, col);
            c.fill(b[0] - 2, b[1] + b[3] + 1, b[0] + b[2] + 2, b[1] + b[3] + 2, col);
            c.fill(b[0] - 2, b[1] - 1, b[0] - 1, b[1] + b[3] + 1, col);
            c.fill(b[0] + b[2] + 1, b[1] - 1, b[0] + b[2] + 2, b[1] + b[3] + 1, col);
            // X para quitarlo (rojo) y esquina para cambiar el tamaño
            int[] xb = xBtn(b, sw), hb = handle(b);
            boolean ox = in(mx, my, xb[0], xb[1], XS, XS), oh = in(mx, my, hb[0], hb[1], HS, HS) || NovaHud.ALL[i] == size;
            boolean drawn = false;
            if (NovaGfx.ok) {
                try {   // los mismos botones redondeados del menú principal
                    NovaGfx.button(minecraft, XS, XS, "", NovaGfx.I_CLOSE, NovaButton.DANGER, ox, true).draw(c, xb[0] - 5, xb[1] - 5, 1f);
                    NovaGfx.button(minecraft, HS, HS, "", NovaGfx.I_RESIZE, oh ? NovaButton.PRIMARY : NovaButton.NORMAL, oh, true).draw(c, hb[0] - 5, hb[1] - 5, 1f);
                    drawn = true;
                } catch (Throwable ex) { NovaGfx.ok = false; }
            }
            if (!drawn) {
                c.fill(xb[0], xb[1], xb[0] + XS, xb[1] + XS, ox ? 0xFFFF4D4D : 0xE0C93030);
                c.text(font, "x", xb[0] + 4, xb[1] + 3, 0xFFFFFFFF, false);
                c.fill(hb[0], hb[1], hb[0] + HS, hb[1] + HS, oh ? 0xFFFFFFFF : 0xE0000000 | (NovaSettings.accent & 0xFFFFFF));
            }
            if (hot) c.centeredText(font, Math.round(NovaHud.ALL[i].scale * 100f) + "%", b[0] + b[2] / 2, Math.min(sh - 10, b[1] + b[3] + 4), 0xFFFFFFFF);
        }
        c.centeredText(font, tr("Editar HUD"), width / 2, 10, 0xFFFFFFFF);
        c.centeredText(font, tr("Arrastra: mover · Esquina: tamaño · X: quitar"), width / 2, 22, 0xFFB8B8D8);
    }

    private static final int XS = 13, HS = 13;

    private static boolean in(int mx, int my, int x, int y, int w, int h) { return mx >= x && mx < x + w && my >= y && my < y + h; }

    /** Botón X: arriba a la derecha del elemento, sin salirse de la pantalla. */
    private static int[] xBtn(int[] b, int sw) { return new int[] { Math.min(b[0] + b[2] + 1, sw - XS), Math.max(0, b[1] - XS + 1) }; }

    /** Esquina de abajo a la derecha para cambiar el tamaño. */
    private static int[] handle(int[] b) { return new int[] { b[0] + b[2] - 6, b[1] + b[3] - 6 }; }

    private boolean overWidget(int mx, int my) {
        for (GuiEventListener ch : children()) if (ch.isMouseOver(mx, my)) return true;
        return false;
    }

    @Override
    protected boolean nClick(double mx, double my, int button) {
        for (GuiEventListener ch : children()) if (ch.isMouseOver(mx, my) && childClick(ch, mx, my, button)) return true;
        return false;
    }

    @Override
    protected boolean nKey(int key, int scan, int mods) {
        if (listening != 0) {
            if (key != InputConstants.KEY_ESCAPE) { if (listening == 1) NovaHud.zoomKey = key; else NovaMove.freelookKey = key; }
            listening = 0;
            rebuildWidgets();
            return true;
        }
        if (key == InputConstants.KEY_ESCAPE) { onClose(); return true; }
        return superKey(key, scan, mods);
    }

    @Override
    protected boolean nChar(char chr, int mods) { return false; }

    @Override
    public boolean isPauseScreen() { return true; }   // en un mundo de un jugador se para, como con Esc
}
