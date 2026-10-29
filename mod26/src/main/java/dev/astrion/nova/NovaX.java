package dev.astrion.nova;

import java.util.ArrayList;
import java.util.List;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.resources.language.I18n;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;

/** Lo que cambia de nombre entre versiones para los elementos nuevos del HUD (armadura, pociones, reloj) y para saber en qué servidor se está. */
final class NovaX {
    private NovaX() { }

    /** Una pieza de armadura: el objeto, el porcentaje de durabilidad que queda (100 = sin usar) y si tiene durabilidad. */
    static final class Piece {
        final Object stack; final int pct; final boolean dmg;
        Piece(Object stack, int pct, boolean dmg) { this.stack = stack; this.pct = pct; this.dmg = dmg; }
    }

    /** Un efecto: nombre, nivel (1, 2…), segundos que quedan (-1 = infinito) y un color estable para su icono. */
    static final class Eff {
        final String name; final int lvl, secs, rgb;
        Eff(String name, int lvl, int secs, int rgb) { this.name = name; this.lvl = lvl; this.secs = secs; this.rgb = rgb; }
    }

    private static final EquipmentSlot[] SLOTS = { EquipmentSlot.HEAD, EquipmentSlot.CHEST, EquipmentSlot.LEGS, EquipmentSlot.FEET };

    private static Piece piece(ItemStack s) {
        boolean d = s.isDamageableItem() && s.getMaxDamage() > 0;
        int pct = d ? Math.max(0, Math.min(100, Math.round(100f * (s.getMaxDamage() - s.getDamageValue()) / s.getMaxDamage()))) : 100;
        return new Piece(s, pct, d);
    }

    /** Armadura puesta (casco, peto, pantalones, botas); solo las piezas que lleva. Con sample = true, datos de ejemplo. */
    /** Si el juego aún no tiene listos los registros (pantalla de carga) o falla algo, no se dibuja nada en vez de romper el fotograma. */
    static List<Piece> armor(Minecraft mc, boolean sample) {
        try { return armor0(mc, sample); } catch (Throwable t) { return new ArrayList<>(); }
    }

    private static List<Piece> armor0(Minecraft mc, boolean sample) {
        List<Piece> out = new ArrayList<>();
        if (sample || mc.player == null) {
            ItemStack[] s = { new ItemStack(Items.DIAMOND_HELMET), new ItemStack(Items.DIAMOND_CHESTPLATE), new ItemStack(Items.IRON_LEGGINGS), new ItemStack(Items.IRON_BOOTS) };
            int[] used = { 0, 120, 140, 190 };
            for (int i = 0; i < 4; i++) { s[i].setDamageValue(Math.min(used[i], Math.max(0, s[i].getMaxDamage() - 1))); out.add(piece(s[i])); }
            return out;
        }
        for (EquipmentSlot sl : SLOTS) { ItemStack s = mc.player.getItemBySlot(sl); if (!s.isEmpty()) out.add(piece(s)); }
        return out;
    }

    static void drawItem(GuiGraphicsExtractor c, Object stack, int x, int y) { c.item((ItemStack) stack, x, y); }

    /** Efectos activos del jugador. */
    /** Si el juego aún no tiene listos los registros (pantalla de carga) o falla algo, no se dibuja nada en vez de romper el fotograma. */
    static List<Eff> effects(Minecraft mc, boolean sample) {
        try { return effects0(mc, sample); } catch (Throwable t) { return new ArrayList<>(); }
    }

    private static List<Eff> effects0(Minecraft mc, boolean sample) {
        List<Eff> out = new ArrayList<>();
        if (sample || mc.player == null) {
            out.add(new Eff(tr0("Velocidad"), 2, 95, 0x7CAFC6));
            out.add(new Eff(tr0("Fuerza"), 1, 7, 0xD4423C));
            return out;
        }
        for (MobEffectInstance e : mc.player.getActiveEffects()) {
            String key = e.getDescriptionId();
            out.add(new Eff(I18n.get(key), e.getAmplifier() + 1, e.isInfiniteDuration() ? -1 : (e.getDuration() + 19) / 20, hue(key)));
        }
        return out;
    }

    private static String tr0(String s) { return NovaLang.tr(s); }

    /** Color estable según el nombre del efecto (así cada efecto tiene siempre el mismo). */
    static int hue(String key) {
        int h = 0;
        for (int i = 0; i < key.length(); i++) h = h * 31 + key.charAt(i);
        float hh = ((h & 0x7fffffff) % 360) / 360f;
        return java.awt.Color.HSBtoRGB(hh, 0.55f, 0.9f) & 0xFFFFFF;
    }

    /** Hora del mundo (0..23999 dentro del día) y número de día. Devuelve {tick del día, día}. */
    static long[] world(Minecraft mc, boolean sample) {
        if (sample || mc.level == null) return new long[] { 6000, 12 };
        long t = 0;
        try { t = mc.level.getOverworldClockTime(); } catch (Throwable e) { try { t = mc.level.getGameTime(); } catch (Throwable ignored) { } }
        return new long[] { ((t % 24000L) + 24000L) % 24000L, t / 24000L + 1 };
    }

    /** Clave del servidor en el que se está: su dirección, «singleplayer» en un mundo propio, o "" fuera de partida. */
    static String serverKey(Minecraft mc) {
        if (mc.level == null) return "";
        var e = mc.getCurrentServer();
        if (e != null && e.ip != null && !e.ip.isEmpty() && !mc.hasSingleplayerServer()) return e.ip.trim().toLowerCase(java.util.Locale.ROOT);
        return mc.hasSingleplayerServer() ? "singleplayer" : "";
    }

    static int width(Minecraft mc, String s) { return mc.font.width(s); }
    /** Texto del juego; con alto contraste siempre blanco puro. */
    static void text(GuiGraphicsExtractor c, Minecraft mc, String s, int x, int y, int col, boolean shadow) { c.text(mc.font, s, x, y, NovaAcc.fg(col), shadow); }
    static float yaw(Minecraft mc) { return mc.player == null ? 0f : mc.player.getYRot(); }
}
