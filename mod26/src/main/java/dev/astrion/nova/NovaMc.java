package dev.astrion.nova;

import java.util.UUID;
import net.minecraft.client.Minecraft;

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
}
