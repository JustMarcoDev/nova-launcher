package dev.astrion.nova;

import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.CubeMapRenderer;
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
    static final Identifier HOLE = Identifier.tryParse("nova:textures/gui/blackhole.png");
    static final Identifier MARK = Identifier.tryParse("nova:textures/gui/mark.png");
    static CubeMapRenderer cube;
    static boolean loaded;

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
        if (cube == null) cube = new CubeMapRenderer(Identifier.tryParse("nova:textures/gui/panorama/panorama"));
        if (!loaded) {
            loaded = true;
            // Sin Fabric API los recursos del mod no entran en el gestor de recursos: los registramos a mano.
            for (int i = 0; i < 6; i++) reg(mc, "textures/gui/panorama/panorama_" + i + ".png");
            reg(mc, "textures/gui/blackhole.png");
            reg(mc, "textures/gui/mark.png");
            reg(mc, "textures/gui/icons.png");
        }
    }

    static void reg(MinecraftClient mc, String path) {
        try (java.io.InputStream in = NovaTitleScreen.class.getResourceAsStream("/assets/nova/" + path)) {
            if (in == null) return;
            net.minecraft.client.texture.NativeImage img = net.minecraft.client.texture.NativeImage.read(in);
            mc.getTextureManager().registerTexture(Identifier.tryParse("nova:" + path), new net.minecraft.client.texture.NativeImageBackedTexture(img));
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
        int cx = width / 2;
        int bw = Math.min(200, width - 20), bh = 24, gap = 5;
        int ly = Math.max(10, Math.min(34, height / 2 - 84));
        top = ly + 74;
        int y = top;
        addDrawableChild(new NovaButton(cx - bw / 2, y, bw, bh, Text.translatable("menu.singleplayer"), -1, NovaButton.PRIMARY,
                b -> client.setScreen(new SelectWorldScreen(this))));
        y += bh + gap;
        addDrawableChild(new NovaButton(cx - bw / 2, y, bw, bh, Text.translatable("menu.multiplayer"), -1, NovaButton.PRIMARY, b -> {
            if (client.options.skipMultiplayerWarning) client.setScreen(new MultiplayerScreen(this));
            else client.setScreen(new MultiplayerWarningScreen(this));
        }));
        y += bh + gap + 3;
        // fila de 5 botones: A ajustes · L idioma · N (reservado) · C realms · M launcher
        int s = 24, g = 6, bx = cx - (5 * s + 4 * g) / 2;
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
        addDrawableChild(new NovaButton(8, 8, 22, 22, Text.literal(name.isEmpty() ? "?" : name.substring(0, 1).toUpperCase()), -1, NovaButton.NORMAL, b -> {}));
        int nw = Math.min(150, Math.max(70, textRenderer.getWidth(name) + 18));
        addDrawableChild(new NovaButton(34, 8, nw, 22, Text.literal(name), -1, NovaButton.NORMAL, b -> {}));
        // cerrar el juego (arriba derecha)
        addDrawableChild(new NovaButton(width - 30, 8, 22, 22, Text.empty(), NovaButton.I_CLOSE, NovaButton.DANGER, b -> client.scheduleStop()));
    }

    // 1.20.x: renderBackground(c); 1.21: renderBackground(c, mx, my, delta)
    public void renderBackground(DrawContext c) { renderBackground(c, 0, 0, 0f); }

    public void renderBackground(DrawContext c, int mx, int my, float delta) {
        float t = (Util.getMeasuringTimeMs() - born) / 1000f;
        cube.draw(client, (float) Math.sin(t * 0.2f) * 3f + 18f, -(t * 1.2f + (born % 360)), 1f);
        c.fillGradient(0, 0, width, height, 0x30000000, 0xA0000010);
        // agujero negro de fondo, con una respiración muy leve
        float fade = Math.min(1f, t / 0.8f);
        int dw = Math.min(width - 6, 400), dh = dw / 2;
        int hx = (width - dw) / 2, hy = height / 2 - dh / 2 + (int) (Math.sin(t * 0.5f) * 2f) + 16;
        com.mojang.blaze3d.systems.RenderSystem.enableBlend();
        c.setShaderColor(1f, 1f, 1f, 0.85f * fade);
        c.drawTexture(HOLE, hx, hy, dw, dh, 0, 0, 1024, 512, 1024, 512);
        c.setShaderColor(1f, 1f, 1f, 1f);
    }

    @Override
    public void render(DrawContext c, int mx, int my, float delta) {
        super.render(c, mx, my, delta);   // fondo + botones
        float fade = Math.min(1f, (Util.getMeasuringTimeMs() - born) / 600f);
        logo.draw(c, width, fade, Math.max(10, Math.min(34, height / 2 - 84)));

        // abajo izquierda: versión
        String v = (es ? "Versión: " : "Version: ") + mcVersion() + "/" + LOADER;
        c.drawText(textRenderer, v, 8, height - 14, 0xB0FFFFFF, true);
        // abajo derecha: logo de Nova Launcher, blanco y translúcido
        String n = "NOVA LAUNCHER";
        int tw = textRenderer.getWidth(n), mx0 = width - 8 - tw - 4 - 14;
        com.mojang.blaze3d.systems.RenderSystem.enableBlend();
        c.setShaderColor(1f, 1f, 1f, 0.7f);
        c.drawTexture(MARK, mx0, height - 17, 14, 14, 0, 0, 64, 64, 64, 64);
        c.setShaderColor(1f, 1f, 1f, 1f);
        c.drawText(textRenderer, n, width - 8 - tw, height - 14, 0xB0FFFFFF, true);
        String na = "Not affiliated with Mojang or Microsoft";
        c.drawText(textRenderer, na, (width - textRenderer.getWidth(na)) / 2, height - 10, 0x50FFFFFF, false);
    }
}
