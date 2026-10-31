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

    private static final EquipmentSlot[] SLOTS = { EquipmentSlot.HEAD, EquipmentSlot.CHEST, EquipmentSlot.LEGS, EquipmentSlot.FEET };

    private static NovaXCore.Piece piece(ItemStack s) {
        boolean d = s.isDamageableItem() && s.getMaxDamage() > 0;
        int pct = NovaXCore.pct(d, s.getMaxDamage(), s.getDamageValue());
        return new NovaXCore.Piece(s, pct, d);
    }

    /** Armadura puesta (casco, peto, pantalones, botas); solo las piezas que lleva. Con sample = true, datos de ejemplo. */
    /** Si el juego aún no tiene listos los registros (pantalla de carga) o falla algo, no se dibuja nada en vez de romper el fotograma. */
    static List<NovaXCore.Piece> armor(Minecraft mc, boolean sample) {
        try { return armor0(mc, sample); } catch (Throwable t) { return new ArrayList<>(); }
    }

    private static List<NovaXCore.Piece> armor0(Minecraft mc, boolean sample) {
        List<NovaXCore.Piece> out = new ArrayList<>();
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
    static List<NovaXCore.Eff> effects(Minecraft mc, boolean sample) {
        try { return effects0(mc, sample); } catch (Throwable t) { return new ArrayList<>(); }
    }

    private static List<NovaXCore.Eff> effects0(Minecraft mc, boolean sample) {
        List<NovaXCore.Eff> out = new ArrayList<>();
        if (sample || mc.player == null) {
            out.add(new NovaXCore.Eff(tr0("Velocidad"), 2, 95, 0x7CAFC6));
            out.add(new NovaXCore.Eff(tr0("Fuerza"), 1, 7, 0xD4423C));
            return out;
        }
        for (MobEffectInstance e : mc.player.getActiveEffects()) {
            String key = e.getDescriptionId();
            out.add(new NovaXCore.Eff(I18n.get(key), e.getAmplifier() + 1, NovaXCore.secs(e.isInfiniteDuration(), e.getDuration()), NovaXCore.hue(key)));
        }
        return out;
    }

    private static String tr0(String s) { return NovaLang.tr(s); }

    /** Hora del mundo (0..23999 dentro del día) y número de día. Devuelve {tick del día, día}. */
    static long[] world(Minecraft mc, boolean sample) {
        if (sample || mc.level == null) return NovaXCore.sampleDay();
        long t = 0;
        try { t = mc.level.getOverworldClockTime(); } catch (Throwable e) { try { t = mc.level.getGameTime(); } catch (Throwable ignored) { } }
        return NovaXCore.day(t);
    }

    /** Clave del servidor en el que se está: su dirección, «singleplayer» en un mundo propio, o "" fuera de partida. */
    static String serverKey(Minecraft mc) {
        var e = mc.getCurrentServer();
        return NovaXCore.serverKey(mc.level != null, e == null ? null : e.ip, mc.hasSingleplayerServer());
    }

    static int width(Minecraft mc, String s) { return mc.font.width(s); }
    /** Texto del juego; con alto contraste siempre blanco puro. */
    static void text(GuiGraphicsExtractor c, Minecraft mc, String s, int x, int y, int col, boolean shadow) { c.text(mc.font, s, x, y, NovaAcc.fg(col), shadow); }
    static float yaw(Minecraft mc) { return mc.player == null ? 0f : mc.player.getYRot(); }
}
