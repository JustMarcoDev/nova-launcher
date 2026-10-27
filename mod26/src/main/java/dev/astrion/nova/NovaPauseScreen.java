package dev.astrion.nova;

import static dev.astrion.nova.NovaLang.tr;

import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.gui.screens.TitleScreen;
import net.minecraft.client.gui.screens.achievement.StatsScreen;
import net.minecraft.client.gui.screens.advancements.AdvancementsScreen;
import net.minecraft.client.gui.screens.multiplayer.JoinMultiplayerScreen;
import net.minecraft.network.chat.Component;

/**
 * Menú de pausa de Nova (sustituye al GameMenuScreen del juego): volver, logros, estadísticas, ajustes, abrir el launcher y salir.
 * No tiene «Abrir a LAN». El fondo es el propio juego oscurecido (y difuminado en 1.21): no se usa el vídeo.
 */
public class NovaPauseScreen extends Screen {
    public NovaPauseScreen() { super(Component.translatable("menu.game")); }

    @Override
    protected void init() {
        NovaTitleScreen.ensure(minecraft);
        int cx = width / 2, bw = Math.min(124, width - 20), bh = 16, gap = 3;
        int total = 6 * bh + 5 * gap + 3;                       // volver · logros/estadísticas · ajustes · HUD · launcher · salir
        int y = Math.max(34, (height - total) / 2 + 6), x = cx - bw / 2;
        int half = (bw - gap) / 2;

        addRenderableWidget(new NovaButton(x, y, bw, bh, Component.literal(tr("Volver al juego")), NovaGfx.I_CHECK, NovaButton.PRIMARY, b -> NovaGui.setScreen(minecraft, null)));
        y += bh + gap;
        NovaButton adv = new NovaButton(x, y, half, bh, Component.literal(tr("Logros")), -1, NovaButton.NORMAL,
                b -> NovaGui.setScreen(minecraft, new AdvancementsScreen(minecraft.player.connection.getAdvancements())));
        NovaButton st = new NovaButton(x + half + gap, y, bw - half - gap, bh, Component.literal(tr("Estadísticas")), -1, NovaButton.NORMAL,
                b -> NovaGui.setScreen(minecraft, new StatsScreen(this, minecraft.player.getStats())));
        adv.active = minecraft.player != null; st.active = minecraft.player != null;
        addRenderableWidget(adv); addRenderableWidget(st);
        y += bh + gap;
        addRenderableWidget(new NovaButton(x, y, bw, bh, Component.literal(tr("Ajustes")), NovaGfx.I_GEAR, NovaButton.NORMAL,
                b -> NovaGui.setScreen(minecraft, NovaVer.options(this, minecraft.options, true))));
        y += bh + gap;
        addRenderableWidget(new NovaButton(x, y, bw, bh, Component.literal(tr("Editar HUD")), NovaGfx.I_EDIT, NovaButton.NORMAL,
                b -> NovaGui.setScreen(minecraft, new NovaHudScreen(this))).tip(tr("Editar HUD"), tr("Mueve FPS, CPS, coordenadas y teclas")));
        y += bh + gap;
        if (!NovaFps.on()) {
            addRenderableWidget(new NovaButton(x, y, bw, bh, Component.literal(tr("Modo FPS")), NovaGfx.I_BOLT, NovaButton.NORMAL, b -> { NovaFps.enable(minecraft); rebuildWidgets(); })
                    .tip(tr("Modo FPS"), tr("Partículas mínimas, sin nubes ni sombras, distancia 8: más rendimiento")));
        } else {
            addRenderableWidget(new NovaButton(x, y, half, bh, Component.literal(tr("Modo FPS")), NovaGfx.I_CHECK, NovaButton.SELECTED, b -> { })
                    .tip(tr("Modo FPS activo"), tr("Tus opciones de vídeo de antes están guardadas")));
            addRenderableWidget(new NovaButton(x + half + gap, y, bw - half - gap, bh, Component.literal(tr("Restaurar")), NovaGfx.I_SWAP, NovaButton.NORMAL, b -> { NovaFps.restore(minecraft); rebuildWidgets(); })
                    .tip(tr("Restaurar"), tr("Vuelve a tus opciones de vídeo de antes")));
        }
        y += bh + gap;
        addRenderableWidget(new NovaButton(x, y, bw, bh, Component.literal(tr("Abrir launcher")), NovaGfx.I_NOVA, NovaButton.NORMAL,
                b -> NovaMark.say("SHOW")));
        y += bh + gap + 3;
        boolean local = minecraft.isLocalServer();
        addRenderableWidget(new NovaButton(x, y, bw, bh, Component.literal(local ? tr("Guardar y salir") : tr("Desconectar")), NovaGfx.I_CLOSE, NovaButton.DANGER, b -> {
            b.active = false;
            NovaCompat.disconnect(minecraft, local);
            TitleScreen title = new TitleScreen();   // el mixin lo cambia por el menú de Nova
            if (local) NovaGui.setScreen(minecraft, title);
            else NovaGui.setScreen(minecraft, new JoinMultiplayerScreen(title));
        }));
    }

    @Override
    public void extractRenderState(GuiGraphicsExtractor c, int mx, int my, float delta) {
        super.extractRenderState(c, mx, my, delta);   // fondo del juego + botones
        String t = tr("Juego en pausa");
        int ty = Math.max(14, Math.max(34, (height - (6 * 16 + 5 * 3 + 3)) / 2 + 6) - 18);
        if (NovaGfx.ok) {
            try { NovaGfx.text(minecraft, t, 9f, 0xFFFFFFFF, true).draw(c, width / 2 - NovaGfx.text(minecraft, t, 9f, 0xFFFFFFFF, true).w() / 2, ty, 1f); return; }
            catch (Throwable e) { NovaGfx.ok = false; }
        }
        c.centeredText(font, t, width / 2, ty, 0xFFFFFF);
    }
}
