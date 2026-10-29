package dev.astrion.nova;

import static dev.astrion.nova.NovaLang.tr;

import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.events.GuiEventListener;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.input.MouseButtonEvent;
import net.minecraft.network.chat.Component;
import com.mojang.blaze3d.platform.InputConstants;

/**
 * «Editar HUD»: se arrastran los elementos del HUD (FPS, CPS, coordenadas, teclas) para colocarlos, se activan o desactivan por separado
 * y se elige la tecla del zoom. Se abre desde el menú de pausa y desde el panel de Nova del menú principal.
 * El arrastre se hace mirando el ratón en cada fotograma (así sirve igual en todas las versiones).
 */
public class NovaHudScreen extends NovaScreen implements NovaHudPanel.Host {
    private final Screen parent;
    private NovaHud.El drag, size;
    private float sizeX0, sizeY0, sizeUW, sizeUH;
    private int offX, offY;
    /** Botón izquierdo pulsado ahora (lo marcan los eventos del ratón) y clic pendiente de atender en el siguiente fotograma. */
    private boolean pressed, clickPending;
    private int clickX, clickY;

    public NovaHudScreen(Screen parent) {
        super(Component.literal(tr("Editar HUD")));
        this.parent = parent;
    }

    @Override
    protected void init() {
        NovaTitleScreen.ensure(minecraft);
        NovaSettings.load();
        NovaHud.syncServer(minecraft);
        NovaHudPanel.build(this);
    }

    // ---- el panel (NovaHudPanel) añade sus botones por aquí ----
    @Override public void put(NovaButton b) { addRenderableWidget(b); }
    @Override public void rebuild() { rebuildWidgets(); }
    @Override public int sw() { return width; }
    @Override public int sh() { return height; }
    @Override public void done() { onClose(); }

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
        // elementos: se miden y se dibujan; el último dibujado queda encima
        int[][] box = new int[NovaHud.ALL.length][];
        for (int i = 0; i < NovaHud.ALL.length; i++) {
            NovaHud.El e = NovaHud.ALL[i];
            if (!e.on) continue;
            int[] s = NovaHud.sizeS(minecraft, e, sample), p = NovaHud.pos(e, sw, sh, s[0], s[1]);
            box[i] = new int[] { p[0], p[1], s[0], s[1] };
        }
        if (clickPending) {
            clickPending = false;
            int cx = clickX, cy = clickY;
            if (DBG) { StringBuilder sb = new StringBuilder("[NOVA-HUD] atender " + cx + "," + cy + " cajas:"); for (int[] q : box) sb.append(q == null ? " -" : " " + java.util.Arrays.toString(q)); System.out.println(sb); }   // clic: primero la X (quitar), luego la esquina (tamaño) y por último el cuerpo (mover)
            for (int i = NovaHud.ALL.length - 1; i >= 0; i--) {
                int[] b = box[i];
                if (b == null) continue;
                int[] xb = xBtn(b, sw), hb = handle(b);
                if (in(cx, cy, xb[0], xb[1], XS, XS)) { NovaHud.ALL[i].on = false; rebuildWidgets(); box[i] = null; break; }
                if (in(cx, cy, hb[0], hb[1], HS, HS)) {
                    size = NovaHud.ALL[i]; sizeX0 = b[0]; sizeY0 = b[1];
                    int[] u = NovaHud.size(minecraft, size, sample); sizeUW = u[0] * NovaAcc.text(); sizeUH = u[1] * NovaAcc.text();
                    break;
                }
                if (in(cx, cy, b[0], b[1], b[2], b[3])) { drag = NovaHud.ALL[i]; offX = cx - b[0]; offY = cy - b[1]; break; }
            }
        }
        if (!pressed) { drag = null; size = null; }
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

    private static final boolean DBG = System.getProperty("nova.debughud") != null;
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
        if (DBG) System.out.println("[NOVA-HUD] clic " + mx + "," + my + " b=" + button + " sobreWidget=" + overWidget((int) mx, (int) my));
        for (GuiEventListener ch : children()) if (ch.isMouseOver(mx, my) && childClick(ch, mx, my, button)) return true;
        if (button == 0 && !overWidget((int) mx, (int) my)) {   // clic sobre el lienzo: se atiende al dibujar (ahí están las cajas de los elementos)
            pressed = true; clickPending = true; clickX = (int) mx; clickY = (int) my;
            return true;
        }
        return false;
    }

    @Override
    public boolean mouseReleased(MouseButtonEvent event) {
        if (NovaVer.btn(event.button()) == 0) pressed = false;
        return super.mouseReleased(event);
    }

    @Override
    protected boolean nKey(int key, int scan, int mods) {
        if (NovaHudPanel.key(this, key)) return true;
        if (key == InputConstants.KEY_ESCAPE) { onClose(); return true; }
        return superKey(key, scan, mods);
    }

    @Override
    protected boolean nChar(char chr, int mods) { return NovaHudPanel.typed(this, chr); }

    @Override
    public boolean isPauseScreen() { return true; }   // en un mundo de un jugador se para, como con Esc
}
