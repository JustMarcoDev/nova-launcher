package dev.astrion.nova;

import java.lang.reflect.Method;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.screen.Screen;

/** Solo para pruebas (-Dnova.autoworld=1): crea un mundo de prueba pulsando «Crear mundo» para poder comprobar el HUD dentro del juego. No hace nada en el uso normal. */
final class NovaTest {
    private NovaTest() { }
    private static boolean started;

    static void autoWorld(MinecraftClient c) {
        if (started) return;
        started = true;
        Thread t = new Thread(() -> {
            try {
                Thread.sleep(4000);
                c.execute(() -> {
                    try {
                        Class<?> k = Class.forName("net.minecraft.client.gui.screen.world.CreateWorldScreen");
                        for (Method m : k.getMethods()) {
                            if (!java.lang.reflect.Modifier.isStatic(m.getModifiers()) || m.getParameterCount() != 2 || m.getParameterTypes()[0] != MinecraftClient.class) continue;
                            if (!m.getName().equals("show") && !m.getName().equals("create")) continue;
                            m.invoke(null, c, null);
                            break;
                        }
                    } catch (Throwable e) { e.printStackTrace(); }
                });
                for (int i = 0; i < 90 && c.world == null; i++) {
                    Thread.sleep(1000);
                    c.execute(() -> {
                        try {
                            Screen s = c.currentScreen;
                            if (s == null || !s.getClass().getSimpleName().equals("CreateWorldScreen")) return;
                            for (Object e : s.children()) {
                                if (e instanceof net.minecraft.client.gui.widget.ButtonWidget b && b.getMessage().getString().toLowerCase().contains("create") && b.active) {
                                    b.onPress();
                                    return;
                                }
                            }
                        } catch (Throwable e) { e.printStackTrace(); }
                    });
                }
            } catch (Throwable e) { e.printStackTrace(); }
        }, "nova-test");
        t.setDaemon(true);
        t.start();
    }
}
