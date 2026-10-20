package dev.astrion.nova;

import static dev.astrion.nova.NovaLang.tr;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.screen.TitleScreen;
import net.minecraft.client.gui.screen.advancement.AdvancementsScreen;
import net.minecraft.client.gui.screen.multiplayer.MultiplayerScreen;
import net.minecraft.client.gui.screen.option.OptionsScreen;
import net.minecraft.client.gui.screen.StatsScreen;
import net.minecraft.client.gui.screen.MessageScreen;
import net.minecraft.text.Text;

/**
 * Menú de pausa de Nova (sustituye al GameMenuScreen del juego): volver, logros, estadísticas, ajustes, abrir el launcher y salir.
 * No tiene «Abrir a LAN». El fondo es el propio juego oscurecido (y difuminado en 1.21): no se usa el vídeo.
 */
public class NovaPauseScreen extends Screen {
    public NovaPauseScreen() { super(Text.translatable("menu.game")); }

    @Override
    protected void init() {
        NovaTitleScreen.ensure(client);
        int cx = width / 2, bw = Math.min(124, width - 20), bh = 16, gap = 3;
        int total = 4 * bh + 3 * gap + 3;                       // volver · logros/estadísticas · ajustes · launcher · salir
        int y = Math.max(34, (height - total) / 2 + 6), x = cx - bw / 2;
        int half = (bw - gap) / 2;

        addDrawableChild(new NovaButton(x, y, bw, bh, Text.literal(tr("Volver al juego")), NovaGfx.I_CHECK, NovaButton.PRIMARY, b -> client.setScreen(null)));
        y += bh + gap;
        NovaButton adv = new NovaButton(x, y, half, bh, Text.literal(tr("Logros")), -1, NovaButton.NORMAL,
                b -> client.setScreen(new AdvancementsScreen(client.player.networkHandler.getAdvancementHandler())));
        NovaButton st = new NovaButton(x + half + gap, y, bw - half - gap, bh, Text.literal(tr("Estadísticas")), -1, NovaButton.NORMAL,
                b -> client.setScreen(new StatsScreen(this, client.player.getStatHandler())));
        adv.active = client.player != null; st.active = client.player != null;
        addDrawableChild(adv); addDrawableChild(st);
        y += bh + gap;
        addDrawableChild(new NovaButton(x, y, bw, bh, Text.literal(tr("Ajustes")), NovaGfx.I_GEAR, NovaButton.NORMAL,
                b -> client.setScreen(new OptionsScreen(this, client.options))));
        y += bh + gap;
        addDrawableChild(new NovaButton(x, y, bw, bh, Text.literal(tr("Abrir launcher")), NovaGfx.I_NOVA, NovaButton.NORMAL,
                b -> System.out.println("[NOVA:SHOW]")));
        y += bh + gap + 3;
        boolean local = client.isInSingleplayer();
        addDrawableChild(new NovaButton(x, y, bw, bh, Text.literal(local ? tr("Guardar y salir") : tr("Desconectar")), NovaGfx.I_CLOSE, NovaButton.DANGER, b -> {
            b.active = false;
            client.world.disconnect();
            if (local) client.disconnect(new MessageScreen(Text.translatable("menu.savingLevel")));
            else client.disconnect();
            TitleScreen title = new TitleScreen();   // el mixin lo cambia por el menú de Nova
            if (local) client.setScreen(title);
            else client.setScreen(new MultiplayerScreen(title));
        }));
    }

    @Override
    public void render(DrawContext c, int mx, int my, float delta) {
        super.render(c, mx, my, delta);   // fondo del juego + botones
        String t = tr("Juego en pausa");
        int ty = Math.max(14, Math.max(34, (height - (4 * 16 + 3 * 3 + 3)) / 2 + 6) - 18);
        if (NovaGfx.ok) {
            try { NovaGfx.text(client, t, 9f, 0xFFFFFFFF, true).draw(c, width / 2 - NovaGfx.text(client, t, 9f, 0xFFFFFFFF, true).w() / 2, ty, 1f); return; }
            catch (Throwable e) { NovaGfx.ok = false; }
        }
        c.drawCenteredTextWithShadow(textRenderer, t, width / 2, ty, 0xFFFFFF);
    }
}
