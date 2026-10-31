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
    static void runOnRender(Runnable r) { try { MinecraftClient.getInstance().execute(r); } catch (Throwable ignored) { } }
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
}
