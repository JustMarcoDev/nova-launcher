package dev.astrion.nova;

import com.mojang.blaze3d.platform.InputConstants;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import net.minecraft.client.Minecraft;
import net.minecraft.client.multiplayer.PlayerInfo;

/** Lo mínimo de Minecraft que necesita el código común (mod-common), con los nombres de Mojang. En mod/ está la misma clase con los de Yarn. */
final class NovaMc {
    private NovaMc() { }

    static String lang() { try { return Minecraft.getInstance().options.languageCode; } catch (Throwable t) { return null; } }
    static String userName() { try { var s = Minecraft.getInstance().getUser(); return s == null ? "" : s.getName(); } catch (Throwable t) { return ""; } }
    static UUID userUuid() { try { return Minecraft.getInstance().getUser().getProfileId(); } catch (Throwable t) { return null; } }
    static String accessToken() { try { return Minecraft.getInstance().getUser().getAccessToken(); } catch (Throwable t) { return ""; } }
    /** ¿Se está llamando desde el hilo de render? */
    static boolean onRenderThread() { try { Minecraft mc = Minecraft.getInstance(); return mc != null && mc.isSameThread(); } catch (Throwable t) { return false; } }
    /** Ejecuta algo en el hilo de render. */
    static void runOnRender(Runnable r) { try { Minecraft.getInstance().execute(r); } catch (Throwable ignored) { } }
    /** ¿Hay conexión a un servidor (y no es un mundo de un jugador)? */
    static boolean online() { try { Minecraft mc = Minecraft.getInstance(); return mc.getConnection() != null && !mc.isLocalServer(); } catch (Throwable t) { return false; } }
    /** UUID de cada jugador de la lista (TAB). */
    static List<UUID> tabUuids() {
        List<UUID> out = new ArrayList<>();
        try { for (PlayerInfo e : Minecraft.getInstance().getConnection().getOnlinePlayers()) { try { out.add(NovaPresence.uuid(e)); } catch (Throwable ignored) { } } } catch (Throwable ignored) { }
        return out;
    }
    /** Nombre y dirección del servidor al que se está conectado ({nombre, dirección}) o null. */
    static String[] currentServer() { try { var e = Minecraft.getInstance().getCurrentServer(); return e == null ? null : new String[] { e.name, e.ip }; } catch (Throwable t) { return null; } }

    // ---- jugador, teclas y opciones que necesita NovaMove ----
    static boolean hasPlayer() { try { return Minecraft.getInstance().player != null; } catch (Throwable t) { return false; } }
    static boolean isPlayer(Object e) { try { return e != null && e == Minecraft.getInstance().player; } catch (Throwable t) { return false; } }
    /** ¿Hay un jugador en partida sin ninguna pantalla abierta? */
    static boolean playing() { try { Minecraft mc = Minecraft.getInstance(); return mc.player != null && NovaGui.screen(mc) == null; } catch (Throwable t) { return false; } }
    static boolean hudEditorOpen() { try { return NovaGui.screen(Minecraft.getInstance()) instanceof NovaHudScreen; } catch (Throwable t) { return false; } }
    static boolean keyDown(int key) { return key > 0 && NovaInput.key(key); }
    static float playerYaw() { return Minecraft.getInstance().player.getYRot(); }
    static float playerPitch() { return Minecraft.getInstance().player.getXRot(); }
    static void turnPlayer(double dx, double dy) { Minecraft.getInstance().player.turn(dx, dy); }
    static boolean playerSprinting() { return Minecraft.getInstance().player.isSprinting(); }
    static boolean playerSneaking() { return Minecraft.getInstance().player.isShiftKeyDown(); }
    /** Opciones «alternar sprint / agacharse» de Minecraft. */
    static boolean optionsReady() { try { return Minecraft.getInstance().options != null; } catch (Throwable t) { return false; } }
    static boolean toggleSprint() { return Minecraft.getInstance().options.toggleSprint().get(); }
    static void toggleSprint(boolean v) { Minecraft.getInstance().options.toggleSprint().set(v); }
    static boolean toggleCrouch() { return Minecraft.getInstance().options.toggleCrouch().get(); }
    static void toggleCrouch(boolean v) { Minecraft.getInstance().options.toggleCrouch().set(v); }

    /** Tecla de zoom de fábrica (C) y nombre con que se guarda en menu.json (las versiones con SDL usan otro código de teclas). */
    static int defaultZoomKey() { return InputConstants.KEY_C; }
    static String keyProp() { return NovaVer.KEY; }
}
