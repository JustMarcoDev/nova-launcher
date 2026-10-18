package dev.astrion.nova;

import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.LogoDrawer;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.screen.multiplayer.MultiplayerScreen;
import net.minecraft.client.gui.screen.multiplayer.MultiplayerWarningScreen;
import net.minecraft.client.gui.screen.option.LanguageOptionsScreen;
import net.minecraft.client.gui.screen.option.OptionsScreen;
import net.minecraft.client.gui.screen.world.SelectWorldScreen;
import net.minecraft.client.realms.gui.screen.RealmsMainScreen;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;
import net.minecraft.util.Util;

/** Pantalla de título de Nova Launcher: Minecraft «versión Nova». */
public class NovaTitleScreen extends Screen {
    static final Identifier MARK = Identifier.tryParse("nova:textures/gui/mark.png");
    static boolean loaded, tested;

    static final String LOADER = System.getProperty("nova.loader", "Nova");
    static final String VERSION = System.getProperty("nova.version", FabricLoader.getInstance()
            .getModContainer("nova-menu").map(m -> m.getMetadata().getVersion().getFriendlyString()).orElse(""));

    private final boolean es;
    private final long born = Util.getMeasuringTimeMs();
    private final LogoDrawer logo = new LogoDrawer(false);
    private int top;

    public NovaTitleScreen() {
        super(Text.literal("Nova"));
        String l = MinecraftClient.getInstance().options.language;
        es = l != null && l.startsWith("es");
    }

    static void ensure(MinecraftClient mc) {
        if (!loaded) {
            loaded = true;
            // Sin Fabric API los recursos del mod no entran en el gestor de recursos: los registramos a mano.
            NovaGfx.ok = true;
            reg(mc, "textures/gui/mark.png");
            reg(mc, "textures/gui/icons.png");
        }
    }

    static void reg(MinecraftClient mc, String path) {
        try (java.io.InputStream in = NovaTitleScreen.class.getResourceAsStream("/assets/nova/" + path)) {
            if (in == null) return;
            net.minecraft.client.texture.NativeImage img = net.minecraft.client.texture.NativeImage.read(in);
            net.minecraft.client.texture.NativeImageBackedTexture tex = new net.minecraft.client.texture.NativeImageBackedTexture(img);
            if (path.contains("mark")) { try { tex.setFilter(true, false); } catch (Throwable ignored) { } }
            mc.getTextureManager().registerTexture(Identifier.tryParse("nova:" + path), tex);
        } catch (Exception e) {
            // se queda con la textura de «no encontrada»
        }
    }

    static String mcVersion() {
        return net.minecraft.SharedConstants.getGameVersion().getName();
    }

    @Override public boolean shouldCloseOnEsc() { return false; }
    @Override public boolean shouldPause() { return false; }

    @Override
    protected void init() {
        ensure(client);
        NovaBg.start(client);
        if (System.getProperty("nova.selftest") != null && !tested) {
            tested = true;
            client.execute(() -> { client.setScreen(null); System.out.println("[NOVA-TEST] " + client.currentScreen.getClass().getName()); });
        }
        int cx = width / 2;
        int bw = Math.min(150, width - 20), bh = 18, gap = 4;
        int ly = ly();
        top = ly + 40;
        int y = top;
        addDrawableChild(new NovaButton(cx - bw / 2, y, bw, bh, Text.translatable("menu.singleplayer"), -1, NovaButton.PRIMARY,
                b -> client.setScreen(new SelectWorldScreen(this))));
        y += bh + gap;
        addDrawableChild(new NovaButton(cx - bw / 2, y, bw, bh, Text.translatable("menu.multiplayer"), -1, NovaButton.PRIMARY, b -> {
            if (client.options.skipMultiplayerWarning) client.setScreen(new MultiplayerScreen(this));
            else client.setScreen(new MultiplayerWarningScreen(this));
        }));
        y += bh + gap + 2;
        // fila de 5 botones: A ajustes · L idioma · N (reservado) · C realms · M launcher
        int s = 18, g = 4, bx = cx - (5 * s + 4 * g) / 2;
        addDrawableChild(new NovaButton(bx, y, s, s, Text.empty(), NovaButton.I_GEAR, NovaButton.NORMAL,
                b -> client.setScreen(new OptionsScreen(this, client.options))));
        addDrawableChild(new NovaButton(bx + (s + g), y, s, s, Text.empty(), NovaButton.I_GLOBE, NovaButton.NORMAL,
                b -> client.setScreen(new LanguageOptionsScreen(this, client.options, client.getLanguageManager()))));
        NovaButton lock = new NovaButton(bx + 2 * (s + g), y, s, s, Text.empty(), NovaButton.I_LOCK, NovaButton.NORMAL, b -> {});
        lock.active = false;
        addDrawableChild(lock);
        addDrawableChild(new NovaButton(bx + 3 * (s + g), y, s, s, Text.empty(), NovaButton.I_SQUARE, NovaButton.NORMAL,
                b -> client.setScreen(new RealmsMainScreen(this))));
        addDrawableChild(new NovaButton(bx + 4 * (s + g), y, s, s, Text.empty(), NovaButton.I_NOVA, NovaButton.NORMAL, b -> {
            // El launcher lee la salida del juego y abre sus ajustes
            System.out.println("[NOVA:SETTINGS]");
        }));
        // perfil (arriba izquierda)
        String name = client.getSession().getUsername();
        addDrawableChild(new NovaButton(7, 7, 16, 16, Text.literal(name.isEmpty() ? "?" : name.substring(0, 1).toUpperCase()), -1, NovaButton.NORMAL, b -> {}));
        int nw = Math.min(130, Math.max(60, textRenderer.getWidth(name) + 18));
        addDrawableChild(new NovaButton(27, 7, nw, 16, Text.literal(name), -1, NovaButton.NORMAL, b -> {}));
        // cerrar el juego (arriba derecha)
        addDrawableChild(new NovaButton(width - 23, 7, 16, 16, Text.empty(), NovaButton.I_CLOSE, NovaButton.DANGER, b -> client.scheduleStop()));
    }

    int ly() { return Math.max(8, Math.min(34, height / 2 - 58)); }

    void txt(DrawContext c, String str, int x, int y, float px, int argb, boolean bold, int anchor) {
        if (NovaGfx.ok) {
            try {
                NovaGfx.Tex t = NovaGfx.text(client, str, px, argb, bold);
                int dx = anchor == 1 ? -t.w() : anchor == 2 ? -t.w() / 2 : 0;
                t.draw(c, x + dx, y, 1f);
                return;
            } catch (Throwable e) { NovaGfx.ok = false; }
        }
        int tw = textRenderer.getWidth(str);
        c.drawText(textRenderer, str, anchor == 1 ? x - tw : anchor == 2 ? x - tw / 2 : x, y + 1, argb, true);
    }

    // 1.20.x: renderBackground(c); 1.21: renderBackground(c, mx, my, delta)
    public void renderBackground(DrawContext c) { renderBackground(c, 0, 0, 0f); }

    public void renderBackground(DrawContext c, int mx, int my, float delta) {
        float t = (Util.getMeasuringTimeMs() - born) / 1000f;
        c.fill(0, 0, width, height, 0xFF04040C);
        NovaBg.draw(c, width, height, Math.min(1f, t / 0.9f));
        c.fillGradient(0, 0, width, height, 0x10000000, 0x90000008);   // oscurece un poco abajo para leer los textos
    }

    @Override
    public void removed() {
        NovaBg.stop(client);
        super.removed();
    }

    @Override
    public void render(DrawContext c, int mx, int my, float delta) {
        super.render(c, mx, my, delta);   // fondo + botones
        float fade = Math.min(1f, (Util.getMeasuringTimeMs() - born) / 600f);
        // logo del propio juego (LogoDrawer), reducido
        float k = 0.62f;
        net.minecraft.client.util.math.MatrixStack ms = c.getMatrices();
        ms.push();
        ms.scale(k, k, 1f);
        logo.draw(c, (int) (width / k), fade, (int) (ly() / k));
        ms.pop();

        // abajo izquierda: versión
        txt(c, (es ? "Versión: " : "Version: ") + mcVersion() + "/" + LOADER, 7, height - 14, 6.5f, 0xB8FFFFFF, false, 0);
        // abajo derecha: logo de Nova Launcher, blanco y translúcido
        String n = "NOVA LAUNCHER";
        int tw = textRenderer.getWidth(n) * 3 / 4 + 2;
        if (NovaGfx.ok) { try { tw = NovaGfx.text(client, n, 6.5f, 0xB8FFFFFF, true).w(); } catch (Throwable e) { NovaGfx.ok = false; } }
        int mx0 = width - 7 - tw - 3 - 9;
        com.mojang.blaze3d.systems.RenderSystem.enableBlend();
        c.setShaderColor(1f, 1f, 1f, 0.7f);
        c.drawTexture(MARK, mx0, height - 14, 9, 9, 0, 0, 64, 64, 64, 64);
        c.setShaderColor(1f, 1f, 1f, 1f);
        txt(c, n, width - 7, height - 14, 6.5f, 0xB8FFFFFF, true, 1);
        txt(c, "Not affiliated with Mojang or Microsoft", width / 2, height - 10, 5.5f, 0x58FFFFFF, false, 2);
    }
}
