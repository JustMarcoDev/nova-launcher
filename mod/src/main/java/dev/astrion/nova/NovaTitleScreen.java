package dev.astrion.nova;

import static dev.astrion.nova.NovaLang.tr;
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
public class NovaTitleScreen extends NovaScreen {
    static final Identifier MARK = Identifier.tryParse("nova:textures/gui/mark.png");
    static boolean loaded, tested;

    static final String LOADER = System.getProperty("nova.loader", "Nova");
    static final String VERSION = System.getProperty("nova.version", FabricLoader.getInstance()
            .getModContainer("nova-menu").map(m -> m.getMetadata().getVersion().getFriendlyString()).orElse(""));

    private final long born = Util.getMeasuringTimeMs();

    // «Novedades de Nova»: el launcher pasa las notas de la versión con -Dnova.news=<archivo>
    private static String newsText, newsVer = "";
    private java.util.List<String> newsLines;
    private int nx, ny, nw, nh;

    private static String news() {
        if (newsText == null) {
            newsText = "";
            try {
                String f = System.getProperty("nova.news", "");
                if (!f.isEmpty() && java.nio.file.Files.isRegularFile(java.nio.file.Path.of(f)))
                    newsText = new String(java.nio.file.Files.readAllBytes(java.nio.file.Path.of(f)), java.nio.charset.StandardCharsets.UTF_8).trim();
                if (newsText.startsWith("ver:")) {   // primera línea: versión del jar al que pertenecen las notas
                    int nl = newsText.indexOf('\n');
                    newsVer = (nl < 0 ? newsText.substring(4) : newsText.substring(4, nl)).trim();
                    newsText = nl < 0 ? "" : newsText.substring(nl + 1).trim();
                }
            } catch (Throwable ignored) { }
        }
        return newsText;
    }

    private boolean newsOpen() { return !modal() && !news().isEmpty() && !newsVer.isEmpty() && !newsVer.equals(NovaSettings.newsSeen); }

    private int tw(String s, float px) {
        if (NovaGfx.ok) { try { return NovaGfx.text(client, s, px, 0xFFFFFFFF, false).w(); } catch (Throwable e) { NovaGfx.ok = false; } }
        return textRenderer.getWidth(s) * 3 / 4;
    }

    private void layoutNews() {
        nw = Math.min(170, width / 2 - 20);
        newsLines = new java.util.ArrayList<>();
        for (String para : news().split("\\R")) {
            String cur = "";
            for (String word : para.trim().split("\\s+")) {
                String nx2 = cur.isEmpty() ? word : cur + " " + word;
                if (!cur.isEmpty() && tw(nx2, 5.8f) > nw - 14) { newsLines.add(cur); cur = word; } else cur = nx2;
            }
            if (!cur.isEmpty()) newsLines.add(cur);
            if (newsLines.size() >= 9) break;
        }
        if (newsLines.size() > 9) newsLines = newsLines.subList(0, 9);
        nh = 26 + newsLines.size() * 9 + 6;
        nx = 8; ny = height - nh - 22;
    }

    private void drawNews(DrawContext c, int mx, int my) {
        if (!newsOpen()) return;
        if (newsLines == null) layoutNews();
        NovaButton.panel(c, nx, ny, nw, nh, 4, 0xE6141428, 0xFF6C5CE7);
        txt(c, tr("Novedades de Nova") + " " + newsVer, nx + 7, ny + 7, 6.8f, 0xFFFFFFFF, true, 0);
        boolean hot = mx >= nx + nw - 16 && mx <= nx + nw - 4 && my >= ny + 3 && my <= ny + 15;
        txt(c, "×", nx + nw - 10, ny + 5, 9f, hot ? 0xFFFFFFFF : 0xFF9A9AC0, true, 2);
        for (int i = 0; i < newsLines.size(); i++) txt(c, newsLines.get(i), nx + 7, ny + 23 + i * 9, 5.8f, 0xFFC8C8E6, false, 0);
    }

    private boolean newsClick(double mx, double my) {
        if (!newsOpen() || newsLines == null) return false;
        if (mx < nx || mx > nx + nw || my < ny || my > ny + nh) return false;
        if (mx >= nx + nw - 16 && my <= ny + 15) { NovaSettings.newsSeen = newsVer; NovaSettings.save(); }
        return true;
    }
    private final LogoDrawer logo = new LogoDrawer(false);
    private int top;
    /** Panel abierto: 0 ninguno · 1 perfil · 2 menú de Nova */
    private static int panel;
    private int px, py, pw, ph;
    private final java.util.List<Object[]> labels = new java.util.ArrayList<>();   // {texto, x, y, px, argb, negrita, ancla}
    private NovaButton hoverBtn;
    private long hoverSince, lastPoll;

    public NovaTitleScreen() {
        super(Text.literal("Nova"));
        panel = 0;
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
            net.minecraft.client.texture.NativeImageBackedTexture tex = NovaCompat.newTex(img);
            if (path.contains("mark")) { try { NovaCompat.smooth(tex); } catch (Throwable ignored) { } }
            mc.getTextureManager().registerTexture(Identifier.tryParse("nova:" + path), tex);
        } catch (Exception e) {
            // se queda con la textura de «no encontrada»
        }
    }

    static String mcVersion() {
        return NovaCompat.gameVersion();
    }

    @Override public boolean shouldCloseOnEsc() { return false; }
    @Override public boolean shouldPause() { return false; }

    @Override
    protected void init() {
        newsLines = null;
        ensure(client);
        NovaBg.start(client);
        if (System.getProperty("nova.selftest") != null && !tested) {
            tested = true;
            client.execute(() -> { client.setScreen(null); System.out.println("[NOVA-TEST] " + client.currentScreen.getClass().getName()); });
        }
        if (System.getProperty("nova.pause") != null && !tested3) { tested3 = true; client.execute(() -> client.setScreen(new NovaPauseScreen())); }   // solo para pruebas
        String forced = System.getProperty("nova.panel", "");
        if (!forced.isEmpty() && !tested2) { tested2 = true; panel = forced.equals("nova") ? 2 : forced.equals("profile") ? 1 : forced.equals("skins") ? 3 : forced.equals("servers") ? 4 : 0; }
        labels.clear();
        int cx = width / 2;
        int bw = Math.min(124, width - 20), bh = 16, gap = 3;
        int ly = ly();
        top = ly + 38;
        int y = top;
        String name = client.getSession().getUsername();
        if (!modal()) {   // con el menú de Nova abierto (modal) los botones de debajo ni existen: no pueden recibir clics
        addDrawableChild(new NovaButton(cx - bw / 2, y, bw, bh, Text.translatable("menu.singleplayer"), NovaGfx.I_USER, NovaButton.PRIMARY,
                b -> client.setScreen(new SelectWorldScreen(this))).tip(tr("Un jugador"), tr("Crea o abre tus mundos")));
        y += bh + gap;
        addDrawableChild(new NovaButton(cx - bw / 2, y, bw, bh, Text.translatable("menu.multiplayer"), NovaGfx.I_USERS, NovaButton.PRIMARY, b -> {
            if (client.options.skipMultiplayerWarning) client.setScreen(new MultiplayerScreen(this));
            else client.setScreen(new MultiplayerWarningScreen(this));
        }).tip(tr("Multijugador"), tr("Únete a servidores")));
        y += bh + gap + 3;
        // fila de 6 botones: ajustes · idioma · skins · servidores · realms · menú de Nova
        int s = 16, g = 3, bx = cx - (6 * s + 5 * g) / 2;
        addDrawableChild(new NovaButton(bx, y, s, s, Text.empty(), NovaGfx.I_GEAR, NovaButton.NORMAL,
                b -> client.setScreen(new OptionsScreen(this, client.options))).tip(tr("Ajustes"), tr("Opciones del juego")));
        addDrawableChild(new NovaButton(bx + (s + g), y, s, s, Text.empty(), NovaGfx.I_EARTH, NovaButton.NORMAL,
                b -> client.setScreen(new LanguageOptionsScreen(this, client.options, client.getLanguageManager()))).tip(tr("Idioma"), tr("Cambia el idioma del juego")));
        NovaButton skins = new NovaButton(bx + 2 * (s + g), y, s, s, Text.empty(), NovaGfx.I_HEAD, panel == 3 ? NovaButton.SELECTED : NovaButton.NORMAL, b -> {
            panel = 3; skScroll = 0; skMsg = ""; skView = NovaSkins.current(); confirmDel = null;
            clearAndInit();
        });
        skins.tip(tr("Skins"), tr("Cambia, guarda y elimina tus skins"));
        addDrawableChild(skins);
        addDrawableChild(new NovaButton(bx + 3 * (s + g), y, s, s, Text.empty(), NovaGfx.I_SERVER, panel == 4 ? NovaButton.SELECTED : NovaButton.NORMAL, b -> {
            panel = 4; svScroll = 0; clearAndInit();
        }).tip(tr("Servidores"), tr("Entra a tu último servidor o a tus favoritos")));
        addDrawableChild(new NovaButton(bx + 4 * (s + g), y, s, s, Text.empty(), NovaGfx.I_REALMS, NovaButton.NORMAL,
                b -> client.setScreen(new RealmsMainScreen(this))).tip("Realms", tr("Mundos online de Minecraft")));
        addDrawableChild(new NovaButton(bx + 5 * (s + g), y, s, s, Text.empty(), NovaGfx.I_NOVA, panel == 2 ? NovaButton.SELECTED : NovaButton.NORMAL, b -> {
            panel = 2;
            clearAndInit();
        }).tip(tr("Menú de Nova"), tr("Fondo, colores y más")));
        // Modo FPS: una barra debajo de la fila; con el modo activo se parte en «Modo FPS ✓» y «Restaurar»
        y += s + g;
        if (!NovaFps.on()) {
            addDrawableChild(new NovaButton(cx - bw / 2, y, bw, 14, Text.literal(tr("Modo FPS")), NovaGfx.I_BOLT, NovaButton.NORMAL, b -> { NovaFps.enable(client); clearAndInit(); })
                    .tip(tr("Modo FPS"), tr("Partículas mínimas, sin nubes ni sombras, distancia 8: más rendimiento")));
        } else {
            int hw = (bw - g) / 2;
            addDrawableChild(new NovaButton(cx - bw / 2, y, hw, 14, Text.literal(tr("Modo FPS")), NovaGfx.I_CHECK, NovaButton.SELECTED, b -> { })
                    .tip(tr("Modo FPS activo"), tr("Tus opciones de vídeo de antes están guardadas")));
            addDrawableChild(new NovaButton(cx - bw / 2 + hw + g, y, bw - hw - g, 14, Text.literal(tr("Restaurar")), NovaGfx.I_SWAP, NovaButton.NORMAL, b -> { NovaFps.restore(client); clearAndInit(); })
                    .tip(tr("Restaurar"), tr("Vuelve a tus opciones de vídeo de antes")));
        }
        // perfil (arriba izquierda)
        int nw = Math.max(40, Math.min(120, (int) (name.length() * 3.9) + 20));
        addDrawableChild(new NovaButton(6, 6, nw, 12, Text.literal(name), NovaGfx.I_HEAD, panel == 1 ? NovaButton.SELECTED : NovaButton.NORMAL, b -> {
            panel = panel == 1 ? 0 : 1;
            clearAndInit();
        }).tip(tr("Perfil"), tr("Tu skin y tu cuenta")));
        // cerrar el juego (arriba derecha)
        addDrawableChild(new NovaButton(width - 18, 6, 12, 12, Text.empty(), NovaGfx.I_CLOSE, NovaButton.DANGER, b -> client.scheduleStop())
                .tip(tr("Salir del juego"), tr("Cierra Minecraft")));
        }
        if (panel == 1) buildProfile(name);
        else if (panel == 2) { snapshot(); buildNova(); }
        else if (panel == 3) buildSkins();
        else if (panel == 4) buildServers();
    }

    static boolean tested2, tested3;

    // ---------------------------------------------------------------- cambios pendientes del menú de Nova
    // El fondo y el color se ven al instante, pero solo se guardan al pulsar «Confirmar cambios»; si se cierra sin confirmar, vuelven a como estaban.
    private static String savedBg;
    private static int savedAccent;
    private static boolean snap;

    private void snapshot() {
        if (snap) return;
        snap = true; savedBg = NovaSettings.bg; savedAccent = NovaSettings.accent;
    }

    private boolean dirty() { return snap && (!NovaSettings.bg.equals(savedBg) || NovaSettings.accent != savedAccent); }

    /** Cierra el menú de Nova. Con keep=true guarda lo elegido; si no, deshace lo que no se confirmó. */
    void closeNova(boolean keep) {
        if (keep) NovaSettings.save();
        else if (snap) {
            if (NovaSettings.accent != savedAccent) { NovaSettings.accent = savedAccent; NovaGfx.setAccent(savedAccent); }
            if (!NovaSettings.bg.equals(savedBg)) {
                NovaSettings.bg = NovaBgs.find(savedBg) == null ? "hole" : savedBg;
                NovaBg.switchTo(client, NovaSettings.bgPath());
            }
        }
        snap = false; panel = 0; editing = null; confirmDel = null;
        clearAndInit();
    }

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
                    NovaGfx.Tex t = NovaGfx.skin(client, NovaSkin.body, "skin|body|" + NovaSkin.ver);
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
            txt(c, NovaSettings.PREMIUM ? (tr("Cuenta de Microsoft")) : (tr("Cuenta sin conexión")), cx, y, 5.8f, 0xFF9A9AC0, false, 2);
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

    // ---------------------------------------------------------------- panel de Nova (centrado, sobre todo lo demás)
    private String editing;            // archivo cuyo nombre se está editando
    private final StringBuilder buf = new StringBuilder();
    private String confirmDel;         // archivo pendiente de confirmar el borrado
    private int scroll;
    private String sig = "";
    private final java.util.Set<String> known = new java.util.HashSet<>();

    void buildNova() {
        java.util.List<NovaBgs.Entry> L = NovaBgs.list();
        int fixed = 8 + 12 + 10 + 18 + 10 + 11 + 20 + 15 + 8 + 17;
        int maxRows = Math.max(2, Math.min(6, (height - 20 - fixed) / 17));
        scroll = Math.max(0, Math.min(scroll, Math.max(0, L.size() - maxRows)));
        int rows = Math.min(maxRows, L.size());
        pw = Math.min(262, width - 16);
        ph = fixed + rows * 17 + (L.size() > rows ? 0 : 0);
        px = (width - pw) / 2; py = Math.max(6, (height - ph) / 2);
        final int phF = ph;
        addDrawable((c, mx, my, d) -> {
            c.fill(0, 0, width, height, 0xA0020208);   // atenúa lo de detrás: el panel va por encima de todo
            drawPanelBg(c);
            for (Object[] l : labels) txt(c, (String) l[0], (int) l[1], (int) l[2], (float) l[3], (int) l[4], (boolean) l[5], (int) l[6]);
        });
        int x = px + 8, w = pw - 16, y = py + 8;
        labels.add(new Object[] { tr("Menú de Nova"), x, y, 8.6f, 0xFFFFFFFF, true, 0 });
        labels.add(new Object[] { tr("Pulsa Esc para cerrar"), px + pw - 8, y + 2, 5.6f, 0xFF7C7CA0, false, 1 });
        y += 12;
        labels.add(new Object[] { tr("FONDO"), x, y, 5.6f, 0xFF9A9AC0, true, 0 });
        if (L.size() > rows) labels.add(new Object[] { (scroll + 1) + "–" + (scroll + rows) + " / " + L.size() + (tr("  ·  rueda del ratón")), px + pw - 8, y, 5.6f, 0xFF7C7CA0, false, 1 });
        y += 10;
        int ib = 15, gap = 2;
        for (int i = scroll; i < scroll + rows; i++) {
            NovaBgs.Entry e = L.get(i);
            boolean sel = e.id.equals(NovaSettings.bg);
            boolean mine = e.file != null;
            if (mine && e.file.equals(confirmDel)) {
                labels.add(new Object[] { tr("¿Eliminar «{0}»?", shorten(e.name, 24)), x + 2, y + 4, 6.4f, 0xFFFF9AA4, false, 0 });
                final String f = e.file;
                addDrawableChild(new NovaButton(x + w - 2 * ib - gap - 36, y, 36 + ib, ib, Text.literal(tr("Sí, eliminar")), NovaGfx.I_TRASH, NovaButton.DANGER, b -> {
                    boolean wasSel = NovaSettings.bg.equals("f:" + f);
                    NovaBgs.delete(f); confirmDel = null;
                    if (wasSel) { NovaSettings.bg = "hole"; NovaBg.switchTo(client, NovaSettings.bgPath()); }
                    if (("f:" + f).equals(savedBg)) savedBg = "hole";   // el fondo guardado ya no existe
                    clearAndInit();
                }).tip(tr("Eliminar"), tr("Borra la foto o el vídeo")));
                addDrawableChild(new NovaButton(x + w - ib, y, ib, ib, Text.empty(), NovaGfx.I_CLOSE, NovaButton.NORMAL, b -> { confirmDel = null; clearAndInit(); })
                        .tip(tr("Cancelar"), tr("No borrar nada")));
                y += 17; continue;
            }
            int reserve = mine ? 3 * (ib + gap) : 0;
            if (mine && e.file.equals(editing)) {
                addDrawableChild(new NovaButton(x, y, w - ib - gap, ib, Text.literal(buf + "|"), -1, NovaButton.SELECTED, b -> {})
                        .tip(tr("Nuevo nombre"), tr("Escribe y pulsa Intro")));
                final String f = e.file;
                addDrawableChild(new NovaButton(x + w - ib, y, ib, ib, Text.empty(), NovaGfx.I_CHECK, NovaButton.PRIMARY, b -> commitName(f))
                        .tip(tr("Guardar nombre"), tr("Confirma el nombre")));
                y += 17; continue;
            }
            String label = e.name;
            if (!e.ready) label += e.error ? tr("  (error)") : e.remote && !e.working ? tr("  (descargar)") : "  " + Math.round(e.progress * 100) + "%";
            NovaButton b = new NovaButton(x, y, w - reserve, ib, Text.literal(label), sel ? NovaGfx.I_CHECK : -1, sel ? NovaButton.SELECTED : NovaButton.NORMAL, bb -> {
                if (e.remote && !e.ready) { NovaBgs.request(e); clearAndInit(); return; }   // por descargar: se lo pide al launcher
                NovaSettings.bg = e.id;
                NovaBg.switchTo(client, NovaSettings.bgPath());
                clearAndInit();
            });
            b.active = e.ready || (e.remote && !e.working);
            b.tip(shorten(e.name, 26), e.ready ? (tr("Usar este fondo")) : e.remote ? (e.working ? tr("Descargando el fondo…") : e.error ? tr("No se pudo descargar: pulsa para reintentar") : tr("Pulsa para descargar este fondo")) : e.error ? (tr("No se pudo convertir")) : (tr("Preparando el fondo…")));
            addDrawableChild(b);
            if (mine) {
                final String f = e.file; final String nm = e.name;
                int bx = x + w - 3 * ib - 2 * gap;
                addDrawableChild(new NovaButton(bx, y, ib, ib, Text.empty(), NovaGfx.I_EDIT, NovaButton.NORMAL, bb -> { editing = f; buf.setLength(0); buf.append(nm); confirmDel = null; clearAndInit(); })
                        .tip(tr("Cambiar nombre"), tr("Ponle el nombre que quieras")));
                addDrawableChild(new NovaButton(bx + ib + gap, y, ib, ib, Text.empty(), NovaGfx.I_SWAP, NovaButton.NORMAL, bb -> System.out.println("[NOVA:PICKBG:" + f + "]"))
                        .tip(tr("Cambiar archivo"), tr("Elige otra foto o vídeo")));
                addDrawableChild(new NovaButton(bx + 2 * (ib + gap), y, ib, ib, Text.empty(), NovaGfx.I_TRASH, NovaButton.NORMAL, bb -> { confirmDel = f; editing = null; clearAndInit(); })
                        .tip(tr("Eliminar"), tr("Borra la foto o el vídeo")));
            }
            y += 17;
        }
        int half = (w - gap) / 2;
        NovaButton add = new NovaButton(x, y, half, ib, Text.literal(tr("Añadir")), NovaGfx.I_PLUS, NovaButton.NORMAL, b -> System.out.println("[NOVA:PICKBG]"));
        add.active = !NovaSettings.DIR.isEmpty();
        add.tip(tr("Añadir foto o vídeo"), tr("Elige un archivo de tu PC"));
        addDrawableChild(add);
        NovaButton open = new NovaButton(x + half + gap, y, w - half - gap, ib, Text.literal(tr("Abrir carpeta")), NovaGfx.I_FOLDER, NovaButton.NORMAL, b -> System.out.println("[NOVA:OPENDIR]"));
        open.active = !NovaSettings.DIR.isEmpty();
        open.tip(tr("Carpeta de fondos"), tr("Arrastra aquí tus fotos"));
        addDrawableChild(open);
        y += ib + 3;
        labels.add(new Object[] { tr("Arrastra fotos o vídeos a la carpeta y aparecen aquí"), x, y, 5.4f, 0xFF7C7CA0, false, 0 });
        y += 11;
        labels.add(new Object[] { tr("COLOR DE LOS BOTONES"), x, y, 5.6f, 0xFF9A9AC0, true, 0 });
        y += 9;
        int n = NovaSettings.COLORS.length, d = 14, sp = (w - n * d) / (n - 1);
        for (int i = 0; i < n; i++) {
            final int col = NovaSettings.COLORS[i];
            NovaButton sw = new NovaButton(x + i * (d + sp), y, d, d, Text.empty(), -1, NovaButton.NORMAL, b -> {
                NovaSettings.accent = col;
                NovaGfx.setAccent(col);
                clearAndInit();
            });
            sw.swatch(col & 0xFFFFFF, col == NovaSettings.accent);
            sw.tip(tr("Color de acento"), tr("Cambia el color de los botones"));
            addDrawableChild(sw);
        }
        y += d + 5;
        addDrawableChild(new NovaButton(x, y, w, ib, Text.literal(tr("Ajustes del launcher")), NovaGfx.I_GEAR, NovaButton.NORMAL, b -> System.out.println("[NOVA:SETTINGS]"))
                .tip(tr("Ajustes del launcher"), tr("Abre Nova Launcher")));
        y += ib + gap;
        addDrawableChild(new NovaButton(x, y, w, ib, Text.literal(tr("Editar HUD")), NovaGfx.I_EDIT, NovaButton.NORMAL, b -> client.setScreen(new NovaHudScreen(this)))
                .tip(tr("Editar HUD"), tr("Mueve FPS, CPS, coordenadas y teclas")));
        y += ib + gap + 1;
        NovaButton ok = new NovaButton(x, y, w, ib, Text.literal(tr("Confirmar cambios")), NovaGfx.I_CHECK, dirty() ? NovaButton.PRIMARY : NovaButton.NORMAL, b -> closeNova(true));
        ok.tip(tr("Confirmar cambios"), dirty() ? (tr("Guarda el fondo y el color elegidos")) : (tr("Sin cambios por guardar")));
        addDrawableChild(ok);
        ph = (y + ib + 8) - py;
        sig = NovaBgs.signature();
        known.clear();
        for (NovaBgs.Entry e : L) if (e.ready) known.add(e.id);
    }

    // ---------------------------------------------------------------- panel de skins (el botón de la cabeza)
    private static int skScroll;
    private static String skView = "", skMsg = "";

    void closeSkins() { panel = 0; confirmDel = null; clearAndInit(); }

    void buildSkins() {
        java.util.List<NovaSkins.E> L = NovaSkins.list();
        String cur = NovaSkins.current();
        if (skView.isEmpty() || L.stream().noneMatch(e -> e.id.equals(skView))) skView = L.stream().anyMatch(e -> e.id.equals(cur)) ? cur : (L.isEmpty() ? "" : L.get(0).id);
        int fixed = 8 + 12 + 12 + 17 + 17 + 12 + 17 + 8;
        int maxRows = Math.max(4, Math.min(6, (height - 20 - fixed) / 17));
        skScroll = Math.max(0, Math.min(skScroll, Math.max(0, L.size() - maxRows)));
        int rows = Math.max(4, Math.min(maxRows, L.size()));   // 4 filas como mínimo: la vista previa es alta
        pw = Math.min(268, width - 16);
        ph = fixed + rows * 17;
        px = (width - pw) / 2; py = Math.max(6, (height - ph) / 2);
        final NovaSkins.E view = L.stream().filter(e -> e.id.equals(skView)).findFirst().orElse(null);
        final int pvw = 48;
        int x = px + 8, w = pw - 16, y = py + 8;
        final int figX = x + pvw / 2, figY = y + 24;
        addDrawable((c, mx, my, d) -> {
            c.fill(0, 0, width, height, 0xA0020208);
            drawPanelBg(c);
            for (Object[] l : labels) txt(c, (String) l[0], (int) l[1], (int) l[2], (float) l[3], (int) l[4], (boolean) l[5], (int) l[6]);
            if (view != null && NovaGfx.ok) {
                try {
                    java.awt.image.BufferedImage im = NovaSkins.read(view.png());
                    if (im != null) {
                        NovaGfx.Tex t = NovaGfx.skin(client, NovaSkin.figureOf(im), "skin|prev|" + view.id + "|" + view.png().lastModified());
                        int k = height >= 200 ? 2 : 1;
                        t.drawSized(c, figX - 8 * k, figY, 16 * k, 32 * k, 1f);
                    }
                } catch (Throwable e) { NovaGfx.ok = false; }
            }
        });
        labels.add(new Object[] { tr("Skins"), x, y, 8.6f, 0xFFFFFFFF, true, 0 });
        labels.add(new Object[] { tr("Pulsa Esc para cerrar"), px + pw - 8, y + 2, 5.6f, 0xFF7C7CA0, false, 1 });
        y += 12;
        labels.add(new Object[] { tr("TUS SKINS"), x, y, 5.6f, 0xFF9A9AC0, true, 0 });
        if (L.size() > rows) labels.add(new Object[] { (skScroll + 1) + "–" + Math.min(L.size(), skScroll + rows) + " / " + L.size() + tr("  ·  rueda del ratón"), px + pw - 8, y, 5.6f, 0xFF7C7CA0, false, 1 });
        y += 12;
        int ib = 15, gap = 2, lx = x + pvw + 4, lw = w - pvw - 4, mw = 30, listTop = y;
        if (L.isEmpty()) labels.add(new Object[] { tr("Aún no tienes skins: sube una desde el launcher"), lx, y + 4, 5.8f, 0xFF9A9AC0, false, 0 });
        for (int i = skScroll; i < Math.min(L.size(), skScroll + rows); i++) {
            final NovaSkins.E e = L.get(i);
            boolean using = e.id.equals(cur), shown = e.id.equals(skView);
            if (e.id.equals(confirmDel)) {
                labels.add(new Object[] { tr("¿Eliminar «{0}»?", shorten(e.name, 20)), lx + 2, y + 4, 6.2f, 0xFFFF9AA4, false, 0 });
                addDrawableChild(new NovaButton(lx + lw - ib - gap - 36 - ib, y, 36 + ib, ib, Text.literal(tr("Sí, eliminar")), NovaGfx.I_TRASH, NovaButton.DANGER, b -> {
                    try { NovaSkins.delete(e); skMsg = tr("Skin eliminada"); } catch (Throwable ex) { skMsg = tr("No se pudo eliminar"); }
                    confirmDel = null; clearAndInit();
                }).tip(tr("Eliminar"), tr("Borra la skin de tu lista")));
                addDrawableChild(new NovaButton(lx + lw - ib, y, ib, ib, Text.empty(), NovaGfx.I_CLOSE, NovaButton.NORMAL, b -> { confirmDel = null; clearAndInit(); }).tip(tr("Cancelar"), tr("No borrar nada")));
                y += 17; continue;
            }
            addDrawableChild(new NovaButton(lx, y, lw - mw - ib - 2 * gap, ib, Text.literal(shorten(e.name, 18)), using ? NovaGfx.I_CHECK : -1, using ? NovaButton.SELECTED : shown ? NovaButton.PRIMARY : NovaButton.NORMAL, b -> {
                try { NovaSkins.use(e); skView = e.id; skMsg = tr("Skin puesta: la ves en un momento"); } catch (Throwable ex) { skMsg = tr("No se pudo poner la skin"); }
                clearAndInit();
            }).tip(shorten(e.name, 26), using ? tr("En uso") : tr("Usar esta skin")));
            addDrawableChild(new NovaButton(lx + lw - mw - ib - gap, y, mw, ib, Text.literal(e.slim ? tr("Fina") : tr("Clásica")), -1, NovaButton.NORMAL, b -> {
                try { NovaSkins.setSlim(e, !e.slim); skView = e.id; } catch (Throwable ex) { skMsg = tr("No se pudo cambiar"); }
                clearAndInit();
            }).tip(tr("Modelo"), tr("Brazos finos (3 px) o clásicos (4 px)")));
            addDrawableChild(new NovaButton(lx + lw - ib, y, ib, ib, Text.empty(), NovaGfx.I_TRASH, NovaButton.NORMAL, b -> { confirmDel = e.id; clearAndInit(); })
                    .tip(tr("Eliminar"), tr("Borra la skin de tu lista")));
            y += 17;
        }
        y = Math.max(y, listTop + rows * 17);
        int half = (w - gap) / 2;
        NovaButton save = new NovaButton(x, y, half, ib, Text.literal(tr("Guardar la actual")), NovaGfx.I_PLUS, NovaButton.NORMAL, b -> {
            try {
                Object[] r = NovaSkins.saveCurrent();
                if (r == null) skMsg = tr("No hay ninguna skin que guardar");
                else { skView = ((NovaSkins.E) r[0]).id; skMsg = (Boolean) r[1] ? tr("Ya la tenías guardada") : tr("Skin guardada"); }
            } catch (Throwable ex) { skMsg = tr("No se pudo guardar"); }
            clearAndInit();
        });
        save.active = NovaSkins.available();
        save.tip(tr("Guardar la actual"), tr("Guarda la skin que llevas ahora en tu lista"));
        addDrawableChild(save);
        NovaButton open = new NovaButton(x + half + gap, y, w - half - gap, ib, Text.literal(tr("Abrir carpeta")), NovaGfx.I_FOLDER, NovaButton.NORMAL, b -> NovaSkins.openFolder());
        open.active = NovaSkins.available();
        open.tip(tr("Carpeta de skins"), tr("Suelta aquí archivos .png de 64×64 y aparecen en la lista"));
        addDrawableChild(open);
        y += ib + gap;
        NovaButton none = new NovaButton(x, y, half, ib, Text.literal(tr("Quitar skin")), NovaGfx.I_CLOSE, NovaButton.NORMAL, b -> {
            try { NovaSkins.unset(); skMsg = tr("Vuelves a tu skin de siempre"); } catch (Throwable ex) { skMsg = tr("No se pudo quitar"); }
            clearAndInit();
        });
        none.active = !cur.isEmpty();
        none.tip(tr("Quitar skin"), tr("Vuelves a la skin de tu cuenta"));
        addDrawableChild(none);
        addDrawableChild(new NovaButton(x + half + gap, y, w - half - gap, ib, Text.literal(tr("Listo")), NovaGfx.I_CHECK, NovaButton.PRIMARY, b -> closeSkins()));
        y += ib + 4;
        labels.add(new Object[] { skMsg.isEmpty() ? (NovaSettings.PREMIUM ? tr("Solo la ves tú; para que todos la vean, aplícala desde el launcher") : tr("Solo la ves tú")) : skMsg, x, y, 5.4f, skMsg.isEmpty() ? 0xFF7C7CA0 : 0xFFB8B8E8, false, 0 });
        ph = (y + 12 + 6) - py;
    }

    // ---------------------------------------------------------------- panel de servidores (el botón del servidor)
    private static int svScroll, svRows = 4;

    void buildServers() {
        java.util.List<NovaServers.Srv> F = NovaServers.favs();
        NovaServers.Srv last = NovaServers.last();
        int ib = 15, gap = 2;
        int fixed = 8 + 12 + 10 + 20 + 6 + 10 + 8;
        int maxRows = Math.max(2, Math.min(6, (height - 20 - fixed) / 17));
        svScroll = Math.max(0, Math.min(svScroll, Math.max(0, F.size() - maxRows)));
        int rows = Math.max(1, Math.min(maxRows, F.size()));
        svRows = rows;
        pw = Math.min(250, width - 16);
        ph = fixed + rows * 17;
        px = (width - pw) / 2; py = Math.max(6, (height - ph) / 2);
        int x = px + 8, w = pw - 16, y = py + 8;
        java.util.List<String> want = new java.util.ArrayList<>();
        if (last != null) want.add(last.addr);
        for (int i = svScroll; i < Math.min(F.size(), svScroll + rows); i++) want.add(F.get(i).addr);
        final java.util.List<Object[]> pings = new java.util.ArrayList<>();   // {dirección, x derecha, y}
        addDrawable((c, mx, my, d) -> {
            c.fill(0, 0, width, height, 0xA0020208);
            drawPanelBg(c);
            for (Object[] l : labels) txt(c, (String) l[0], (int) l[1], (int) l[2], (float) l[3], (int) l[4], (boolean) l[5], (int) l[6]);
            NovaServers.refresh(want);
            for (Object[] pg : pings) {
                NovaServers.Res r = NovaServers.result((String) pg[0]);
                String t; int col;
                if (r == null || !r.done) { t = "…"; col = 0xFF9A9AC0; }
                else if (!r.ok) { t = tr("Sin respuesta"); col = 0xFFFF7A86; }
                else {
                    t = r.ms + " ms" + (r.max > 0 ? "  ·  " + r.online + "/" + r.max : "");
                    col = r.ms < 80 ? 0xFF3DDC84 : r.ms < 200 ? 0xFFFFC857 : 0xFFFF9A5A;
                }
                txt(c, t, (int) pg[1], (int) pg[2], 5.6f, col, false, 1);
            }
        });
        labels.add(new Object[] { tr("Servidores"), x, y, 8.6f, 0xFFFFFFFF, true, 0 });
        labels.add(new Object[] { tr("Pulsa Esc para cerrar"), px + pw - 8, y + 2, 5.6f, 0xFF7C7CA0, false, 1 });
        y += 12;
        labels.add(new Object[] { tr("ÚLTIMO SERVIDOR"), x, y, 5.6f, 0xFF9A9AC0, true, 0 });
        y += 10;
        int jw = 40;
        if (last == null) {
            labels.add(new Object[] { tr("Aún no has entrado en ningún servidor"), x + 2, y + 6, 5.8f, 0xFF9A9AC0, false, 0 });
        } else {
            labels.add(new Object[] { shorten(last.name, 24), x + 4, y + 3, 7f, 0xFFFFFFFF, true, 0 });
            labels.add(new Object[] { shorten(last.addr, 34), x + 4, y + 13, 5.4f, 0xFF7C7CA0, false, 0 });
            pings.add(new Object[] { last.addr, x + w - jw - 8, y + 6 });
            final NovaServers.Srv ls = last;
            addDrawableChild(new NovaButton(x + w - jw - 2, y + 2, jw, 16, Text.literal(tr("Entrar")), NovaGfx.I_PLAY, NovaButton.PRIMARY,
                    b -> NovaServers.join(client, this, ls)).tip(tr("Entrar"), tr("Conecta directamente a este servidor")));
        }
        y += 20 + 6;
        labels.add(new Object[] { tr("FAVORITOS DEL LAUNCHER"), x, y, 5.6f, 0xFF9A9AC0, true, 0 });
        if (F.size() > rows) labels.add(new Object[] { (svScroll + 1) + "–" + Math.min(F.size(), svScroll + rows) + " / " + F.size() + tr("  ·  rueda del ratón"), px + pw - 8, y, 5.6f, 0xFF7C7CA0, false, 1 });
        y += 10;
        if (F.isEmpty()) labels.add(new Object[] { tr("Añade servidores en la pestaña Servidores del launcher"), x + 2, y + 4, 5.8f, 0xFF9A9AC0, false, 0 });
        for (int i = svScroll; i < Math.min(F.size(), svScroll + rows); i++) {
            final NovaServers.Srv f = F.get(i);
            addDrawableChild(new NovaButton(x, y, w - jw - 2 - 78, ib, Text.literal(shorten(f.name, 18)), NovaGfx.I_SERVER, NovaButton.NORMAL,
                    b -> NovaServers.join(client, this, f)).tip(shorten(f.name, 26), tr("Entrar a {0}", f.addr)));
            pings.add(new Object[] { f.addr, x + w - jw - 6, y + 4 });
            addDrawableChild(new NovaButton(x + w - jw, y, jw, ib, Text.literal(tr("Entrar")), NovaGfx.I_PLAY, NovaButton.PRIMARY,
                    b -> NovaServers.join(client, this, f)).tip(tr("Entrar"), tr("Conecta directamente a este servidor")));
            y += 17;
        }
    }

    static String shorten(String s, int n) { return s.length() <= n ? s : s.substring(0, n - 1) + "…"; }

    void commitName(String file) {
        NovaBgs.rename(file, buf.toString());
        editing = null; buf.setLength(0);
        clearAndInit();
    }

    /** Mientras el panel está abierto, sigue la carpeta de fondos y la conversión que hace el launcher. */
    void poll() {
        long now = Util.getMeasuringTimeMs();
        if (panel != 2 || editing != null || now - lastPoll < 700) return;
        lastPoll = now;
        String s = NovaBgs.signature();
        if (s.equals(sig)) return;
        // un fondo nuevo que acaba de quedar listo se activa solo
        for (NovaBgs.Entry e : NovaBgs.list()) {
            if (e.ready && (!e.builtin || NovaBgs.awaiting.remove(e.id)) && !known.contains(e.id) && !known.isEmpty()) {
                NovaSettings.bg = e.id; NovaBg.switchTo(client, NovaSettings.bgPath());
                break;
            }
        }
        clearAndInit();
    }

    boolean modal() { return panel == 2 || panel == 3 || panel == 4; }

    boolean inPanel(double mx, double my) { return mx >= px - 2 && mx <= px + pw + 2 && my >= py - 2 && my <= py + ph + 2; }

    @Override
    protected boolean nClick(double mx, double my, int button) {
        if (button == 0 && newsClick(mx, my)) return true;
        if (modal()) {   // los paneles de Nova y de skins son modales: un clic fuera los cierra (el de Nova, sin guardar)
            if (inPanel(mx, my)) { clickTopmost(mx, my, button); return true; }
            if (panel == 3) closeSkins(); else if (panel == 4) closeSkins(); else closeNova(false);
            return true;
        }
        if (clickTopmost(mx, my, button)) return true;
        if (panel != 0 && !(mx >= px && mx <= px + pw && my >= py && my <= py + ph)) { panel = 0; clearAndInit(); return true; }
        return false;
    }

    /** Entrega el clic al botón que está DEBAJO del cursor a la vista (el último que se dibujó), no al primero de la lista. */
    private boolean clickTopmost(double mx, double my, int button) {
        java.util.List<? extends net.minecraft.client.gui.Element> ch = children();
        for (int i = ch.size() - 1; i >= 0; i--) {
            if (NovaScreen.childClick(ch.get(i), mx, my, button)) return true;
        }
        return false;
    }

    @Override
    protected boolean nKey(int key, int scan, int mods) {
        if (editing != null) {
            if (key == 257 || key == 335) { commitName(editing); return true; }
            if (key == 256) { editing = null; clearAndInit(); return true; }
            if (key == 259) { if (buf.length() > 0) buf.setLength(buf.length() - 1); clearAndInit(); return true; }
            return true;
        }
        if (key == 256 && panel == 2) { closeNova(false); return true; }
        if (key == 256 && (panel == 3 || panel == 4)) { closeSkins(); return true; }
        if (key == 256 && panel != 0) { panel = 0; confirmDel = null; clearAndInit(); return true; }
        return superKey(key, scan, mods);
    }

    @Override
    protected boolean nChar(char chr, int mods) {
        if (editing != null) {
            if (chr >= 32 && chr != 127 && buf.length() < 28) { buf.append(chr); clearAndInit(); }
            return true;
        }
        return superChar(chr, mods);
    }

    // 1.20.1 usa (x, y, delta) y 1.21 (x, y, horizontal, vertical): se declaran las dos sin @Override
    public boolean mouseScrolled(double mx, double my, double amount) { return wheel(mx, my, amount); }
    public boolean mouseScrolled(double mx, double my, double h, double v) { return wheel(mx, my, v); }

    private boolean wheel(double mx, double my, double amount) {
        if (panel == 3 && inPanel(mx, my)) {
            int ns = skScroll + (amount < 0 ? 1 : -1);
            if (ns < 0 || ns > Math.max(0, NovaSkins.list().size() - 1)) return true;
            skScroll = ns; clearAndInit(); return true;
        }
        if (panel == 4 && inPanel(mx, my)) {
            int ns = svScroll + (amount < 0 ? 1 : -1);
            if (ns < 0 || ns > Math.max(0, NovaServers.favs().size() - svRows)) return true;
            svScroll = ns; clearAndInit(); return true;
        }
        if (panel != 2 || !inPanel(mx, my)) return false;
        int total = NovaBgs.list().size();
        int ns = scroll + (amount < 0 ? 1 : -1);
        if (ns < 0 || ns > Math.max(0, total - 1)) return true;
        scroll = ns;
        clearAndInit();
        return true;
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
        if (snap) {   // se sale de la pantalla con cambios sin confirmar: se deshacen
            if (NovaSettings.accent != savedAccent) { NovaSettings.accent = savedAccent; NovaGfx.setAccent(savedAccent); }
            if (!NovaSettings.bg.equals(savedBg)) NovaSettings.bg = NovaBgs.find(savedBg) == null ? "hole" : savedBg;
        }
        snap = false;
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
        NovaCompat.pushScale(c, k);
        if (!modal()) logo.draw(c, (int) (width / k), fade, (int) (ly() / k));   // el panel de Nova va por encima de todo
        NovaCompat.popScale(c);

        // abajo izquierda: versión
        txt(c, (tr("Versión: ")) + mcVersion() + "/" + LOADER, 7, height - 14, 6.5f, 0xB8FFFFFF, false, 0);
        // abajo derecha: logo de Nova Launcher, blanco y translúcido
        String n = "NOVA LAUNCHER";
        int tw = textRenderer.getWidth(n) * 3 / 4 + 2;
        if (NovaGfx.ok) { try { tw = NovaGfx.text(client, n, 6.5f, 0xB8FFFFFF, true).w(); } catch (Throwable e) { NovaGfx.ok = false; } }
        int mx0 = width - 7 - tw - 3 - 9;
        NovaCompat.blit(c, MARK, mx0, height - 14, 9, 9, 0, 0, 64, 64, 64, 64, 0.7f);
        txt(c, n, width - 7, height - 14, 6.5f, 0xB8FFFFFF, true, 1);
        if (!modal()) txt(c, tr("Sin afiliación, respaldo ni distribución de Mojang o Microsoft"), width / 2, height - 10, 5.5f, 0x58FFFFFF, false, 2);
        drawNews(c, mx, my);
        tooltip(c);
    }

    void tooltip(DrawContext c) {
        NovaButton h = null;
        for (net.minecraft.client.gui.Element e : children()) {
            if (e instanceof NovaButton nb && !nb.tipTitle.isEmpty() && nb.isHovered() && (!modal() || inPanel(nb.getX() + 1, nb.getY() + 1))) { h = nb; break; }
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
