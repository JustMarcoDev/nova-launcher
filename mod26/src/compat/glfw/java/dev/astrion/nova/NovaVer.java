package dev.astrion.nova;

import com.mojang.blaze3d.platform.InputConstants;
import com.mojang.blaze3d.textures.GpuSampler;
import net.minecraft.client.Minecraft;
import net.minecraft.client.Options;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.gui.screens.options.OptionsScreen;
import net.minecraft.client.input.KeyEvent;

/** Capa «glfw» (Minecraft 26.1 y 26.2): ventana GLFW, teclas GLFW y texturas con FilterMode de blaze3d. */
final class NovaVer {
    /** Nombre de la propiedad de menu.json con el código de una tecla: cada ventana (GLFW / SDL3) tiene sus propios códigos. */
    static final String KEY = "key";
    private NovaVer() { }

    /** Botones del ratón: GLFW ya usa 0 izquierdo, 1 derecho, 2 central (btn pasa del número del juego al de Nova y raw hace lo contrario). */
    static int btn(int raw) { return raw; }

    static int raw(int nova) { return nova; }

    static int scan(KeyEvent e) { return e.scancode(); }

    static boolean keyDown(int key) { return InputConstants.isKeyDown(Minecraft.getInstance().getWindow(), key); }

    static String keyName(int key) { return InputConstants.Type.KEYSYM.getOrCreate(key).getDisplayName().getString(); }

    static void openUrl(String url) { net.minecraft.util.Util.getPlatform().openUri(url); }

    static GpuSampler linearSampler() { return com.mojang.blaze3d.systems.RenderSystem.getSamplerCache().getClampToEdge(com.mojang.blaze3d.textures.FilterMode.LINEAR); }

    static Screen options(Screen parent, Options o, boolean inWorld) { return new OptionsScreen(parent, o, inWorld); }
}
