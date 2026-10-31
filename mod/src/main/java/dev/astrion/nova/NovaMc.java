package dev.astrion.nova;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.PlayerListEntry;

/** Lo mínimo de Minecraft que necesita el código común (mod-common), con los nombres de Yarn. En mod26/ está la misma clase con los de Mojang. */
final class NovaMc {
    private NovaMc() { }

    static String lang() { try { return MinecraftClient.getInstance().options.language; } catch (Throwable t) { return null; } }
    static String userName() { try { var s = MinecraftClient.getInstance().getSession(); return s == null ? "" : s.getUsername(); } catch (Throwable t) { return ""; } }
    static UUID userUuid() { try { return MinecraftClient.getInstance().getSession().getUuidOrNull(); } catch (Throwable t) { return null; } }
    static String accessToken() { try { return MinecraftClient.getInstance().getSession().getAccessToken(); } catch (Throwable t) { return ""; } }
    /** ¿Se está llamando desde el hilo de render? */
    static boolean onRenderThread() { try { MinecraftClient mc = MinecraftClient.getInstance(); return mc != null && mc.isOnThread(); } catch (Throwable t) { return false; } }
    /** Ejecuta algo en el hilo de render. */
    /** ¿Hay conexión a un servidor (y no es un mundo de un jugador)? */
    static boolean online() { try { MinecraftClient mc = MinecraftClient.getInstance(); return mc.getNetworkHandler() != null && !mc.isInSingleplayer(); } catch (Throwable t) { return false; } }
    /** UUID de cada jugador de la lista (TAB). */
    static List<UUID> tabUuids() {
        List<UUID> out = new ArrayList<>();
        try { for (PlayerListEntry e : MinecraftClient.getInstance().getNetworkHandler().getPlayerList()) { try { out.add(NovaPresence.uuid(e)); } catch (Throwable ignored) { } } } catch (Throwable ignored) { }
        return out;
    }
    /** Nombre y dirección del servidor al que se está conectado ({nombre, dirección}) o null. */
    static String[] currentServer() { try { var e = MinecraftClient.getInstance().getCurrentServerEntry(); return e == null ? null : new String[] { e.name, e.address }; } catch (Throwable t) { return null; } }

    // ---- jugador, teclas y opciones que necesita NovaMove ----
    static boolean hasPlayer() { try { return MinecraftClient.getInstance().player != null; } catch (Throwable t) { return false; } }
    static boolean isPlayer(Object e) { try { return e != null && e == MinecraftClient.getInstance().player; } catch (Throwable t) { return false; } }
    /** ¿Hay un jugador en partida sin ninguna pantalla abierta? */
    static boolean playing() { try { MinecraftClient mc = MinecraftClient.getInstance(); return mc.player != null && mc.currentScreen == null; } catch (Throwable t) { return false; } }
    static boolean hudEditorOpen() { try { return MinecraftClient.getInstance().currentScreen instanceof NovaHudScreen; } catch (Throwable t) { return false; } }
    static boolean keyDown(int key) { try { return key > 0 && org.lwjgl.glfw.GLFW.glfwGetKey(MinecraftClient.getInstance().getWindow().getHandle(), key) == org.lwjgl.glfw.GLFW.GLFW_PRESS; } catch (Throwable t) { return false; } }
    static float playerYaw() { return MinecraftClient.getInstance().player.getYaw(); }
    static float playerPitch() { return MinecraftClient.getInstance().player.getPitch(); }
    static void turnPlayer(double dx, double dy) { MinecraftClient.getInstance().player.changeLookDirection(dx, dy); }
    static boolean playerSprinting() { return MinecraftClient.getInstance().player.isSprinting(); }
    static boolean playerSneaking() { return MinecraftClient.getInstance().player.isSneaking(); }
    /** Opciones «alternar sprint / agacharse» de Minecraft. */
    static boolean optionsReady() { try { return MinecraftClient.getInstance().options != null; } catch (Throwable t) { return false; } }
    static boolean toggleSprint() { return MinecraftClient.getInstance().options.getSprintToggled().getValue(); }
    static void toggleSprint(boolean v) { MinecraftClient.getInstance().options.getSprintToggled().setValue(v); }
    static boolean toggleCrouch() { return MinecraftClient.getInstance().options.getSneakToggled().getValue(); }
    static void toggleCrouch(boolean v) { MinecraftClient.getInstance().options.getSneakToggled().setValue(v); }

    /** Tecla de zoom de fábrica (C) y nombre con que se guarda en menu.json (las versiones con SDL usan otro código de teclas). */
    static int defaultZoomKey() { return 67; }
    static String keyProp() { return "key"; }
}
