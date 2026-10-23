package dev.astrion.nova;

import static dev.astrion.nova.NovaLang.tr;

import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.Element;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.text.Text;
import org.lwjgl.glfw.GLFW;

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
    private boolean wasDown, listening;

    public NovaHudScreen(Screen parent) {
        super(Text.literal(tr("Editar HUD")));
        this.parent = parent;
    }

    @Override
    protected void init() {
        NovaTitleScreen.ensure(client);
        NovaSettings.load();
        int pw = Math.min(262, width - 16), x = (width - pw) / 2, gap = 3, ib = 15;
        int rows = 5, total = rows * ib + (rows - 1) * gap;
        int y = height - total - 10;
        // 1) un botón por elemento
        int n = NovaHud.ALL.length, bw = (pw - (n - 1) * gap) / n;
        String[] names = { "FPS", "CPS", tr("Coordenadas"), tr("Teclas") };
        for (int i = 0; i < n; i++) {
            final NovaHud.El e = NovaHud.ALL[i];
            addDrawableChild(new NovaButton(x + i * (bw + gap), y, bw, ib, Text.literal(names[i]), e.on ? NovaGfx.I_CHECK : -1, e.on ? NovaButton.SELECTED : NovaButton.NORMAL, b -> { e.on = !e.on; clearAndInit(); })
                    .tip(names[i], e.on ? tr("Activado: pulsa para ocultarlo") : tr("Desactivado: pulsa para mostrarlo")));
        }
        y += ib + gap;
        // 2) zoom: activar y tecla
        int half = (pw - gap) / 2;
        addDrawableChild(new NovaButton(x, y, half, ib, Text.literal(tr("Zoom") + ": " + (NovaHud.zoomOn ? tr("Sí") : tr("No"))), NovaHud.zoomOn ? NovaGfx.I_CHECK : -1, NovaHud.zoomOn ? NovaButton.SELECTED : NovaButton.NORMAL, b -> { NovaHud.zoomOn = !NovaHud.zoomOn; clearAndInit(); })
                .tip(tr("Zoom"), tr("Mantén la tecla para acercar la vista")));
        addDrawableChild(new NovaButton(x + half + gap, y, pw - half - gap, ib, Text.literal(listening ? tr("Pulsa una tecla…") : tr("Tecla de zoom") + ": " + NovaHud.keyName(NovaHud.zoomKey)), -1, listening ? NovaButton.PRIMARY : NovaButton.NORMAL, b -> { listening = true; clearAndInit(); })
                .tip(tr("Tecla de zoom"), tr("Pulsa y luego la tecla que quieras (Esc cancela)")));
        y += ib + gap;
        // 3) mostrar que uso Nova
        addDrawableChild(new NovaButton(x, y, pw, ib, Text.literal(tr("Mostrar que uso Nova") + ": " + (NovaSettings.showNova ? tr("Sí") : tr("No"))), NovaSettings.showNova ? NovaGfx.I_CHECK : -1, NovaSettings.showNova ? NovaButton.SELECTED : NovaButton.NORMAL, b -> { NovaSettings.showNova = !NovaSettings.showNova; clearAndInit(); })
                .tip(tr("Mostrar que uso Nova"), tr("Los demás jugadores con Nova ven el logo junto a tu nombre")));
        y += ib + gap;
        // 4) restablecer y listo
        addDrawableChild(new NovaButton(x, y, half, ib, Text.literal(tr("Restablecer")), NovaGfx.I_SWAP, NovaButton.NORMAL, b -> { NovaHud.resetPositions(); clearAndInit(); })
                .tip(tr("Restablecer"), tr("Vuelve a las posiciones de fábrica")));
        addDrawableChild(new NovaButton(x + half + gap, y, pw - half - gap, ib, Text.literal(tr("Listo")), NovaGfx.I_CHECK, NovaButton.PRIMARY, b -> close()));
    }

    @Override
    public void close() {
        NovaSettings.save();
        client.setScreen(parent);
    }

    @Override
    public void removed() {
        NovaSettings.save();
        super.removed();
    }

    @Override
    public void render(DrawContext c, int mx, int my, float delta) {
        super.render(c, mx, my, delta);   // fondo (el juego oscurecido) y botones
        int sw = c.getScaledWindowWidth(), sh = c.getScaledWindowHeight();
        boolean sample = client.player == null;
        boolean down = NovaHud.mouseDown(client, 0);
        // elementos: se miden y se dibujan; el último dibujado queda encima
        int[][] box = new int[NovaHud.ALL.length][];
        for (int i = 0; i < NovaHud.ALL.length; i++) {
            NovaHud.El e = NovaHud.ALL[i];
            if (!e.on) continue;
            int[] s = NovaHud.sizeS(client, e, sample), p = NovaHud.pos(e, sw, sh, s[0], s[1]);
            box[i] = new int[] { p[0], p[1], s[0], s[1] };
        }
        if (down && !wasDown && !overWidget(mx, my)) {   // clic: primero la X (quitar), luego la esquina (tamaño) y por último el cuerpo (mover)
            for (int i = NovaHud.ALL.length - 1; i >= 0; i--) {
                int[] b = box[i];
                if (b == null) continue;
                int[] xb = xBtn(b, sw), hb = handle(b);
                if (in(mx, my, xb[0], xb[1], XS, XS)) { NovaHud.ALL[i].on = false; clearAndInit(); box[i] = null; break; }
                if (in(mx, my, hb[0], hb[1], HS, HS)) {
                    size = NovaHud.ALL[i]; sizeX0 = b[0]; sizeY0 = b[1];
                    int[] u = NovaHud.size(client, size, sample); sizeUW = u[0]; sizeUH = u[1];
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
            NovaHud.drawS(c, client, NovaHud.ALL[i], b[0], b[1], sample);
            boolean hot = NovaHud.ALL[i] == drag || NovaHud.ALL[i] == size || in(mx, my, b[0] - 2, b[1] - 2, b[2] + 4, b[3] + 4);
            int col = hot ? 0xCC000000 | (NovaSettings.accent & 0xFFFFFF) : 0x55FFFFFF;
            c.fill(b[0] - 2, b[1] - 2, b[0] + b[2] + 2, b[1] - 1, col);
            c.fill(b[0] - 2, b[1] + b[3] + 1, b[0] + b[2] + 2, b[1] + b[3] + 2, col);
            c.fill(b[0] - 2, b[1] - 1, b[0] - 1, b[1] + b[3] + 1, col);
            c.fill(b[0] + b[2] + 1, b[1] - 1, b[0] + b[2] + 2, b[1] + b[3] + 1, col);
            // X para quitarlo (rojo) y esquina para cambiar el tamaño
            int[] xb = xBtn(b, sw), hb = handle(b);
            boolean ox = in(mx, my, xb[0], xb[1], XS, XS), oh = in(mx, my, hb[0], hb[1], HS, HS) || NovaHud.ALL[i] == size;
            c.fill(xb[0], xb[1], xb[0] + XS, xb[1] + XS, ox ? 0xFFFF4D4D : 0xE0C93030);
            c.drawText(textRenderer, "x", xb[0] + 3, xb[1] + 1, 0xFFFFFFFF, false);
            c.fill(hb[0], hb[1], hb[0] + HS, hb[1] + HS, oh ? 0xFFFFFFFF : 0xE0000000 | (NovaSettings.accent & 0xFFFFFF));
            c.fill(hb[0] + 2, hb[1] + 2, hb[0] + HS - 2, hb[1] + HS - 2, 0xFF101018);
            if (hot) c.drawCenteredTextWithShadow(textRenderer, Math.round(NovaHud.ALL[i].scale * 100f) + "%", b[0] + b[2] / 2, Math.min(sh - 10, b[1] + b[3] + 4), 0xFFFFFFFF);
        }
        c.drawCenteredTextWithShadow(textRenderer, tr("Editar HUD"), width / 2, 10, 0xFFFFFFFF);
        c.drawCenteredTextWithShadow(textRenderer, tr("Arrastra: mover · Esquina: tamaño · X: quitar"), width / 2, 22, 0xFFB8B8D8);
    }

    private static final int XS = 9, HS = 8;

    private static boolean in(int mx, int my, int x, int y, int w, int h) { return mx >= x && mx < x + w && my >= y && my < y + h; }

    /** Botón X: arriba a la derecha del elemento, sin salirse de la pantalla. */
    private static int[] xBtn(int[] b, int sw) { return new int[] { Math.min(b[0] + b[2] + 3, sw - XS), Math.max(0, b[1] - XS - 1) }; }

    /** Esquina de abajo a la derecha para cambiar el tamaño. */
    private static int[] handle(int[] b) { return new int[] { b[0] + b[2] - 2, b[1] + b[3] - 2 }; }

    private boolean overWidget(int mx, int my) {
        for (Element ch : children()) if (ch.isMouseOver(mx, my)) return true;
        return false;
    }

    @Override
    protected boolean nClick(double mx, double my, int button) {
        for (Element ch : children()) if (ch.isMouseOver(mx, my) && childClick(ch, mx, my, button)) return true;
        return false;
    }

    @Override
    protected boolean nKey(int key, int scan, int mods) {
        if (listening) {
            if (key != GLFW.GLFW_KEY_ESCAPE) NovaHud.zoomKey = key;
            listening = false;
            clearAndInit();
            return true;
        }
        if (key == GLFW.GLFW_KEY_ESCAPE) { close(); return true; }
        return superKey(key, scan, mods);
    }

    @Override
    protected boolean nChar(char chr, int mods) { return false; }

    @Override
    public boolean shouldPause() { return false; }
}
