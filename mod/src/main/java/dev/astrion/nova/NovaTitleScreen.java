package dev.astrion.nova;

import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.Drawable;
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
    /** Panel abierto: 0 ninguno · 1 perfil · 2 menú de Nova */
    private static int panel;
    private int px, py, pw, ph;
    private final java.util.List<Object[]> labels = new java.util.ArrayList<>();   // {texto, x, y, px, argb, negrita, ancla}
    private NovaButton hoverBtn;
    private long hoverSince, lastPoll;
    private String lastState = "";
    private boolean lastHas;

    public NovaTitleScreen() {
        super(Text.literal("Nova"));
        panel = 0;
        String l = MinecraftClient.getInstance().options.language;
        es = l != null && l.startsWith("es");
    }

    static void ensure(MinecraftClient mc) {
        if (!loaded) {
            loaded = true;
            // Sin Fabric API los recursos del mod no entran en el gestor de recursos: los registramos a mano.
            NovaGfx.ok = true;
            reg(mc, "textures/gui/mark.png");
            NovaSettings.load();
            NovaGfx.setAccent(NovaSettings.accent);
            NovaSkin.load();
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
        String forced = System.getProperty("nova.panel", "");
        if (!forced.isEmpty() && !tested2) { tested2 = true; panel = forced.equals("nova") ? 2 : forced.equals("profile") ? 1 : 0; }
        labels.clear();
        int cx = width / 2;
        int bw = Math.min(124, width - 20), bh = 16, gap = 3;
        int ly = ly();
        top = ly + 38;
        int y = top;
        addDrawableChild(new NovaButton(cx - bw / 2, y, bw, bh, Text.translatable("menu.singleplayer"), NovaGfx.I_USER, NovaButton.PRIMARY,
                b -> client.setScreen(new SelectWorldScreen(this))).tip(es ? "Un jugador" : "Singleplayer", es ? "Crea o abre tus mundos" : "Create or open worlds"));
        y += bh + gap;
        addDrawableChild(new NovaButton(cx - bw / 2, y, bw, bh, Text.translatable("menu.multiplayer"), NovaGfx.I_USERS, NovaButton.PRIMARY, b -> {
            if (client.options.skipMultiplayerWarning) client.setScreen(new MultiplayerScreen(this));
            else client.setScreen(new MultiplayerWarningScreen(this));
        }).tip(es ? "Multijugador" : "Multiplayer", es ? "Únete a servidores" : "Join servers"));
        y += bh + gap + 3;
        // fila de 5 botones: ajustes · idioma · (reservado) · realms · menú de Nova
        int s = 16, g = 3, bx = cx - (5 * s + 4 * g) / 2;
        addDrawableChild(new NovaButton(bx, y, s, s, Text.empty(), NovaGfx.I_GEAR, NovaButton.NORMAL,
                b -> client.setScreen(new OptionsScreen(this, client.options))).tip(es ? "Ajustes" : "Settings", es ? "Opciones del juego" : "Game options"));
        addDrawableChild(new NovaButton(bx + (s + g), y, s, s, Text.empty(), NovaGfx.I_EARTH, NovaButton.NORMAL,
                b -> client.setScreen(new LanguageOptionsScreen(this, client.options, client.getLanguageManager()))).tip(es ? "Idioma" : "Language", es ? "Cambia el idioma del juego" : "Change the game language"));
        NovaButton lock = new NovaButton(bx + 2 * (s + g), y, s, s, Text.empty(), NovaGfx.I_LOCK, NovaButton.NORMAL, b -> {});
        lock.active = false;
        lock.tip(es ? "Próximamente" : "Coming soon", es ? "Aún no disponible" : "Not available yet");
        addDrawableChild(lock);
        addDrawableChild(new NovaButton(bx + 3 * (s + g), y, s, s, Text.empty(), NovaGfx.I_REALMS, NovaButton.NORMAL,
                b -> client.setScreen(new RealmsMainScreen(this))).tip("Realms", es ? "Mundos online de Minecraft" : "Minecraft online worlds"));
        addDrawableChild(new NovaButton(bx + 4 * (s + g), y, s, s, Text.empty(), NovaGfx.I_NOVA, panel == 2 ? NovaButton.SELECTED : NovaButton.NORMAL, b -> {
            panel = panel == 2 ? 0 : 2;
            clearAndInit();
        }).tip(es ? "Menú de Nova" : "Nova menu", es ? "Fondo, colores y más" : "Background, colors and more"));
        // perfil (arriba izquierda)
        String name = client.getSession().getUsername();
        int nw = Math.max(46, Math.min(130, (int) (name.length() * 4.3) + 26));
        addDrawableChild(new NovaButton(6, 6, nw, 14, Text.literal(name), NovaGfx.I_HEAD, panel == 1 ? NovaButton.SELECTED : NovaButton.NORMAL, b -> {
            panel = panel == 1 ? 0 : 1;
            clearAndInit();
        }).tip(es ? "Perfil" : "Profile", es ? "Tu skin y tu cuenta" : "Your skin and account"));
        // cerrar el juego (arriba derecha)
        addDrawableChild(new NovaButton(width - 18, 6, 12, 12, Text.empty(), NovaGfx.I_CLOSE, NovaButton.DANGER, b -> client.scheduleStop())
                .tip(es ? "Salir del juego" : "Quit game", es ? "Cierra Minecraft" : "Closes Minecraft"));
        if (panel == 1) buildProfile(name);
        else if (panel == 2) buildNova();
    }

    static boolean tested2;

    // ---------------------------------------------------------------- panel de perfil
    void buildProfile(String name) {
        int fs = height >= 220 ? 3 : 2;
        pw = 118;
        ph = 10 + 32 * fs + 8 + 11 + 5 + 12 + 5 + 8 + 10;
        px = 6; py = 24;
        final int fsz = fs;
        addDrawable((c, mx, my, d) -> {
            drawPanelBg(c);
            int cx = px + pw / 2, y = py + 10;
            NovaSkin.load();
            boolean drawn = false;
            if (NovaGfx.ok && NovaSkin.body != null) {
                try {
                    NovaGfx.Tex t = NovaGfx.skin(client, NovaSkin.body, "skin|body");
                    t.drawSized(c, cx - 8 * fsz, y, 16 * fsz, 32 * fsz, 1f);
                    drawn = true;
                } catch (Throwable e) { NovaGfx.ok = false; }
            }
            if (!drawn) silhouette(c, cx, y, 32 * fsz);
            y += 32 * fsz + 8;
            txt(c, name, cx, y, 8.4f, 0xFFFFFFFF, true, 2);
            y += 11 + 5;
            int pc = NovaSettings.PREMIUM ? 0x3DDC84 : 0xFFB347;
            try {
                NovaGfx.Tex p = NovaGfx.pill(client, NovaSettings.PREMIUM ? "Premium" : "No premium", pc, NovaSettings.PREMIUM ? NovaGfx.I_CHECK : -1);
                p.draw(c, cx - p.w() / 2, y, 1f);
            } catch (Throwable e) { NovaGfx.ok = false; }
            y += 12 + 5;
            txt(c, NovaSettings.PREMIUM ? (es ? "Cuenta de Microsoft" : "Microsoft account") : (es ? "Cuenta sin conexión" : "Offline account"), cx, y, 5.8f, 0xFF9A9AC0, false, 2);
        });
    }

    void silhouette(DrawContext c, int cx, int y, int size) {
        try {
            int s = Math.max(1, (int) Math.round(client.getWindow().getScaleFactor()));
            NovaGfx.Tex t = NovaGfx.button(client, size / 2, size / 2, "", NovaGfx.I_USER, NovaButton.NORMAL, false, false);
            t.draw(c, cx - size / 4 - 5, y + size / 4 - 5, 0.9f);
        } catch (Throwable e) { NovaGfx.ok = false; }
    }

    void drawPanelBg(DrawContext c) {
        if (NovaGfx.ok) {
            try { NovaGfx.panel(client, pw, ph).draw(c, px - 8, py - 8, 1f); return; }
            catch (Throwable e) { NovaGfx.ok = false; }
        }
        NovaButton.panel(c, px, py, pw, ph, 6, 0xF010102A, 0xFF4A3C8C);
    }

    // ---------------------------------------------------------------- panel de Nova
    void buildNova() {
        pw = 150;
        px = Math.min(width - pw - 6, Math.max(width / 2 + 62 + 8, 0)); px = Math.min(px, width - pw - 2); py = 24;
        ph = 119 + 18 * NovaSettings.BGS.length;
        addDrawable((c, mx, my, d) -> {
            drawPanelBg(c);
            for (Object[] l : labels) {
                if ((int) l[6] == 3) {
                    String st = statusText();
                    if (!st.isEmpty()) txt(c, st, (int) l[1], (int) l[2], 5.8f, "error".equals(NovaSettings.customState) ? 0xFFFF8A96 : 0xFFB8B8D8, false, 0);
                } else txt(c, (String) l[0], (int) l[1], (int) l[2], (float) l[3], (int) l[4], (boolean) l[5], 0);
            }
        });
        int x = px + 8, w = pw - 16, y = py + 9;
        labels.add(new Object[] { es ? "Menú de Nova" : "Nova menu", x, y, 8.6f, 0xFFFFFFFF, true, 0 });
        y += 15;
        labels.add(new Object[] { es ? "FONDO" : "BACKGROUND", x, y, 5.6f, 0xFF9A9AC0, true, 0 });
        y += 9;
        for (NovaSettings.Bg bg : NovaSettings.BGS) {
            boolean sel = bg.id.equals(NovaSettings.bg);
            boolean avail = bg.file == null || bg.file.isEmpty() || (bg.id.equals("custom") ? NovaSettings.hasCustom() : new java.io.File(NovaSettings.DIR, bg.file).isFile());
            NovaButton b = new NovaButton(x, y, w, 15, Text.literal(es ? bg.es : bg.en), sel ? NovaGfx.I_CHECK : -1, sel ? NovaButton.SELECTED : NovaButton.NORMAL, bb -> {
                NovaSettings.bg = bg.id;
                NovaSettings.save();
                NovaBg.switchTo(client, NovaSettings.bgPath());
                clearAndInit();
            });
            b.active = avail;
            b.tip(es ? bg.es : bg.en, avail ? (es ? "Usar este fondo" : "Use this background") : (es ? "Añade una foto o vídeo" : "Add a photo or video"));
            addDrawableChild(b);
            y += 18;
        }
        NovaButton add = new NovaButton(x, y, w, 15, Text.literal(es ? "Añadir foto o vídeo" : "Add photo or video"), NovaGfx.I_PLUS, NovaButton.NORMAL, b -> {
            NovaSettings.customState = "working";
            NovaSettings.customProgress = 0f;
            System.out.println("[NOVA:PICKBG]");
        });
        add.active = !NovaSettings.DIR.isEmpty() && !"working".equals(NovaSettings.customState);
        add.tip(es ? "Fondo personalizado" : "Custom background", es ? "Elige una imagen o vídeo" : "Pick an image or video");
        addDrawableChild(add);
        y += 18;
        labels.add(new Object[] { "", x, y, 5.6f, 0xFFB8B8D8, false, 3 });   // estado de la conversión (se dibuja aparte)
        y += 12;
        labels.add(new Object[] { es ? "COLOR DE LOS BOTONES" : "BUTTON COLOR", x, y, 5.6f, 0xFF9A9AC0, true, 0 });
        y += 10;
        int n = NovaSettings.COLORS.length, d = 14, sp = (w - n * d) / (n - 1);
        for (int i = 0; i < n; i++) {
            final int col = NovaSettings.COLORS[i];
            NovaButton sw = new NovaButton(x + i * (d + sp), y, d, d, Text.empty(), -1, NovaButton.NORMAL, b -> {
                NovaSettings.accent = col;
                NovaSettings.save();
                NovaGfx.setAccent(col);
                clearAndInit();
            });
            sw.swatch(col & 0xFFFFFF, col == NovaSettings.accent);
            sw.tip(es ? "Color de acento" : "Accent color", es ? "Cambia el color de los botones" : "Changes the button color");
            addDrawableChild(sw);
        }
        y += d + 8;
        addDrawableChild(new NovaButton(x, y, w, 15, Text.literal(es ? "Ajustes del launcher" : "Launcher settings"), NovaGfx.I_GEAR, NovaButton.NORMAL, b -> System.out.println("[NOVA:SETTINGS]"))
                .tip(es ? "Ajustes del launcher" : "Launcher settings", es ? "Abre Nova Launcher" : "Opens Nova Launcher"));
        lastState = NovaSettings.customState;
        lastHas = NovaSettings.hasCustom();
    }

    String statusText() {
        String st = NovaSettings.customState;
        if ("working".equals(st)) return (es ? "Convirtiendo… " : "Converting… ") + Math.round(NovaSettings.customProgress * 100) + "%";
        if ("error".equals(st)) { String e = NovaSettings.customError; return e.length() > 44 ? e.substring(0, 43) + "…" : e; }
        if ("ready".equals(st) && NovaSettings.hasCustom()) return es ? "Tu fondo está listo" : "Your background is ready";
        return "";
    }

    /** Mientras el panel está abierto, sigue el estado de la conversión que hace el launcher. */
    void poll() {
        long now = Util.getMeasuringTimeMs();
        if (panel != 2 || now - lastPoll < 400) return;
        lastPoll = now;
        String before = NovaSettings.customState;
        long at = NovaSettings.customAt;
        NovaSettings.pollCustom();
        if ("ready".equals(NovaSettings.customState) && (!"ready".equals(before) || NovaSettings.customAt != at)) {
            NovaSettings.bg = "custom";
            NovaSettings.save();
            NovaBg.switchTo(client, NovaSettings.bgPath());
            clearAndInit();
        } else if (!NovaSettings.customState.equals(lastState) || NovaSettings.hasCustom() != lastHas) clearAndInit();
    }

    @Override
    public boolean mouseClicked(double mx, double my, int button) {
        if (super.mouseClicked(mx, my, button)) return true;
        if (panel != 0 && !(mx >= px && mx <= px + pw && my >= py && my <= py + ph)) { panel = 0; clearAndInit(); return true; }
        return false;
    }

    @Override
    public boolean keyPressed(int key, int scan, int mods) {
        if (key == 256 && panel != 0) { panel = 0; clearAndInit(); return true; }
        return super.keyPressed(key, scan, mods);
    }

    int ly() { return Math.max(26, (height - 104) / 2 - 2); }

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
        if (!NovaBg.draw(c, width, height, Math.min(1f, t / 0.9f))) c.fillGradient(0, 0, width, height, NovaGfx.shade(NovaGfx.accent, 0.16f, 255), 0xFF020208);
        c.fillGradient(0, 0, width, height, 0x10000000, 0x90000008);   // oscurece un poco abajo para leer los textos
    }

    @Override
    public void removed() {
        NovaBg.stop(client);
        super.removed();
    }

    @Override
    public void render(DrawContext c, int mx, int my, float delta) {
        poll();
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
        txt(c, es ? "Sin afiliación, respaldo ni distribución de Mojang o Microsoft" : "Not affiliated with, endorsed or distributed by Mojang or Microsoft", width / 2, height - 10, 5.5f, 0x58FFFFFF, false, 2);
        tooltip(c);
    }

    void tooltip(DrawContext c) {
        NovaButton h = null;
        for (net.minecraft.client.gui.Element e : children()) {
            if (e instanceof NovaButton nb && !nb.tipTitle.isEmpty() && nb.isHovered()) { h = nb; break; }
        }
        String demo = System.getProperty("nova.tipdemo", "");   // solo para pruebas: fuerza un tooltip sin ratón
        if (!demo.isEmpty()) { int k = 0; for (net.minecraft.client.gui.Element e : children()) if (e instanceof NovaButton nb && !nb.tipTitle.isEmpty() && k++ == Integer.parseInt(demo)) h = nb; }
        long now = Util.getMeasuringTimeMs();
        if (h != hoverBtn) { hoverBtn = h; hoverSince = now; }
        if (h == null || !NovaGfx.ok) return;
        float a = Math.min(1f, (now - hoverSince - 350) / 160f);
        if (a <= 0f) return;
        try {
            NovaGfx.Tex t = NovaGfx.tooltip(client, h.tipTitle, h.tipDesc);
            int bw = t.w() - 10, bh = t.h() - 10;
            int tx = h.getX() + h.getWidth() / 2 - bw / 2, ty = h.getY() + h.getHeight() + 3;
            if (ty + bh > height - 2) ty = h.getY() - bh - 3;
            tx = Math.max(2, Math.min(width - bw - 2, tx));
            t.draw(c, tx - 5, ty - 5, a);
        } catch (Throwable e) { NovaGfx.ok = false; }
    }
}
