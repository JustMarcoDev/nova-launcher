package dev.astrion.nova;

import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.CubeMapRenderer;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.RotatingCubeMapRenderer;
import net.minecraft.client.gui.screen.ConfirmLinkScreen;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.screen.multiplayer.MultiplayerScreen;
import net.minecraft.client.gui.screen.multiplayer.MultiplayerWarningScreen;
import net.minecraft.client.gui.screen.option.AccessibilityOptionsScreen;
import net.minecraft.client.gui.screen.option.LanguageOptionsScreen;
import net.minecraft.client.gui.screen.option.OptionsScreen;
import net.minecraft.client.gui.screen.world.SelectWorldScreen;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;
import net.minecraft.util.Util;

import java.io.File;

/** Pantalla de título de Nova Launcher. */
public class NovaTitleScreen extends Screen {
    static final Identifier LOGO = Identifier.tryParse("nova:textures/gui/logo.png");
    static CubeMapRenderer cube;
    static RotatingCubeMapRenderer spin;
    static boolean loaded;

    static final String DISCORD = System.getProperty("nova.discord", "");
    static final String VERSION = System.getProperty("nova.version", FabricLoader.getInstance()
            .getModContainer("nova-menu").map(m -> m.getMetadata().getVersion().getFriendlyString()).orElse(""));

    private final boolean es;
    private long born = Util.getMeasuringTimeMs();

    public NovaTitleScreen() {
        super(Text.literal("Nova"));
        String l = MinecraftClient.getInstance().options.language;
        es = l != null && l.startsWith("es");
    }

    static void ensure(MinecraftClient mc) {
        if (cube == null) {
            cube = new CubeMapRenderer(Identifier.tryParse("nova:textures/gui/panorama/panorama"));
            spin = new RotatingCubeMapRenderer(cube);
        }
        if (!loaded) {
            loaded = true;
            // Sin Fabric API los recursos del mod no entran en el gestor de recursos: los registramos a mano.
            for (int i = 0; i < 6; i++) reg(mc, "textures/gui/panorama/panorama_" + i + ".png");
            reg(mc, "textures/gui/logo.png");
            reg(mc, "textures/gui/icons.png");
        }
    }

    static void reg(MinecraftClient mc, String path) {
        try (java.io.InputStream in = NovaTitleScreen.class.getResourceAsStream("/assets/nova/" + path)) {
            if (in == null) return;
            net.minecraft.client.texture.NativeImage img = net.minecraft.client.texture.NativeImage.read(in);
            mc.getTextureManager().registerTexture(Identifier.tryParse("nova:" + path), new net.minecraft.client.texture.NativeImageBackedTexture(img));
        } catch (Exception e) {
            // se queda con la textura de "no encontrada"
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
        int bw = Math.min(200, width - 20);
        int top = Math.max(62, height / 2 - 34);
        int bh = 24, gap = 4;
        int y = top;
        addDrawableChild(new NovaButton(cx - bw / 2, y, bw, bh, Text.translatable("menu.singleplayer"), -1, true,
                b -> client.setScreen(new SelectWorldScreen(this))));
        y += bh + gap;
        addDrawableChild(new NovaButton(cx - bw / 2, y, bw, bh, Text.translatable("menu.multiplayer"), -1, true, b -> {
            if (client.options.skipMultiplayerWarning) client.setScreen(new MultiplayerScreen(this));
            else client.setScreen(new MultiplayerWarningScreen(this));
        }));
        y += bh + gap;
        int hw = (bw - gap) / 2;
        addDrawableChild(new NovaButton(cx - bw / 2, y, hw, 20, Text.translatable("menu.options"), 1, false,
                b -> client.setScreen(new OptionsScreen(this, client.options))));
        addDrawableChild(new NovaButton(cx + gap / 2, y, hw, 20, Text.translatable("menu.quit"), 7, false,
                b -> client.scheduleStop()));
        y += 20 + gap + 2;
        // banner de comunidad
        if (!DISCORD.isEmpty()) {
            addDrawableChild(new NovaButton(cx - bw / 2, y, bw, 26,
                    Text.literal(es ? "Únete a la comunidad de Nova" : "Join the Nova community"), 3, false,
                    b -> client.setScreen(new ConfirmLinkScreen(ok -> {
                        if (ok) Util.getOperatingSystem().open(DISCORD);
                        client.setScreen(this);
                    }, DISCORD, true))));
        }
        // chip de cuenta (arriba izquierda) y ajustes (arriba derecha)
        String name = client.getSession().getUsername();
        int cw = Math.min(140, textRenderer.getWidth(name) + 30);
        addDrawableChild(new NovaButton(8, 8, cw, 20, Text.literal(name), 0, false, b -> {}));
        addDrawableChild(new NovaButton(width - 28, 8, 20, 20, Text.empty(), 1, false,
                b -> client.setScreen(new OptionsScreen(this, client.options))));
        // barra de iconos inferior
        int n = 4, s = 22, g = 6, bx = cx - (n * s + (n - 1) * g) / 2, by = height - 34;
        addDrawableChild(new NovaButton(bx, by, s, s, Text.empty(), 4, false, b -> {
            File f = new File(client.runDirectory, "screenshots");
            f.mkdirs();
            Util.getOperatingSystem().open(f);
        }));
        addDrawableChild(new NovaButton(bx + (s + g), by, s, s, Text.empty(), 5, false,
                b -> client.setScreen(new AccessibilityOptionsScreen(this, client.options))));
        addDrawableChild(new NovaButton(bx + 2 * (s + g), by, s, s, Text.empty(), 6, false,
                b -> client.setScreen(new LanguageOptionsScreen(this, client.options, client.getLanguageManager()))));
        addDrawableChild(new NovaButton(bx + 3 * (s + g), by, s, s, Text.empty(), 7, false, b -> client.scheduleStop()));
    }

    // 1.20.x: renderBackground(c); 1.21: renderBackground(c, mx, my, delta)
    public void renderBackground(DrawContext c) { renderBackground(c, 0, 0, 0f); }

    public void renderBackground(DrawContext c, int mx, int my, float delta) {
        float t = (Util.getMeasuringTimeMs() - born) / 1000f;
        float pitch = (float) Math.sin(t * 0.25f) * 4f + 22f;
        float yaw = -(t * 1.6f + (born % 360));
        cube.draw(client, pitch, yaw, 1f);
        c.fillGradient(0, 0, width, height, 0x40000000, 0xC0000010);
    }

    @Override
    public void render(DrawContext c, int mx, int my, float delta) {
        float fade = Math.min(1f, (Util.getMeasuringTimeMs() - born) / 500f);
        super.render(c, mx, my, delta);
        // logo
        int lw = 128, lh = 32, lx = (width - lw) / 2, ly = Math.max(14, Math.max(62, height / 2 - 34) - lh - 10);
        com.mojang.blaze3d.systems.RenderSystem.enableBlend();
        c.setShaderColor(1f, 1f, 1f, fade);
        c.drawTexture(LOGO, lx, ly, lw, lh, 0, 0, 256, 64, 256, 64);
        c.setShaderColor(1f, 1f, 1f, 1f);

        String mcv = mcVersion();
        // tarjeta de novedades (abajo izquierda)
        if (width >= 330) {
            int x = 8, y = height - 68, w = 112, h = 46;
            NovaButton.panel(c, x, y, w, h, 0xB0101018);
            c.fill(x + 2, y, x + 5, y + h, NovaButton.ACCENT);
            c.drawText(textRenderer, es ? "Novedades" : "What's new", x + 10, y + 6, 0xFFFFFFFF, true);
            c.drawText(textRenderer, "Nova Launcher", x + 10, y + 19, 0xFFB9B9CC, false);
            c.drawText(textRenderer, "Minecraft " + mcv, x + 10, y + 30, 0xFF8B8BA0, false);
            // tarjeta pequeña (abajo derecha)
            int rw = 104, rh = 30, rx = width - rw - 8, ry = height - 68 + 16;
            NovaButton.panel(c, rx, ry, rw, rh, 0xB0101018);
            c.fill(rx + rw - 5, ry + 2, rx + rw - 2, ry + rh - 2, NovaButton.ACCENT);
            c.drawText(textRenderer, "Astrion Studio", rx + 8, ry + 6, 0xFFFFFFFF, true);
            c.drawText(textRenderer, es ? "Hecho con amor" : "Made with care", rx + 8, ry + 17, 0xFF8B8BA0, false);
        }
        String l1 = "Nova Launcher " + mcv + (VERSION.isEmpty() ? "" : " (v" + VERSION + ")");
        c.drawText(textRenderer, l1, 8, height - 10 + (width >= 330 ? 0 : 0), 0x90FFFFFF, false);
        String r1 = "Not affiliated with Mojang or Microsoft";
        if (width >= 330) c.drawText(textRenderer, r1, width - textRenderer.getWidth(r1) - 8, height - 10, 0x70FFFFFF, false);
    }
}
