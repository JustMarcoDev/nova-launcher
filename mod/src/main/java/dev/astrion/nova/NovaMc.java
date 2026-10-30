package dev.astrion.nova;

import java.util.UUID;
import net.minecraft.client.MinecraftClient;

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
}
