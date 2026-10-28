package dev.astrion.nova;

import com.mojang.blaze3d.platform.InputConstants;
import net.minecraft.client.Minecraft;
import net.minecraft.client.Options;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.gui.screens.options.OptionsScreen;
import net.minecraft.client.input.KeyEvent;

/** Capa «sdl» (Minecraft 26.3): ventana SDL3, teclas propias de Minecraft y texturas con la biblioteca renderpearl. */
final class NovaVer {
    static final String KEY = "keySdl";
    private NovaVer() { }

    static int scan(KeyEvent e) { return e.keycode(); }

    static boolean keyDown(int key) { return InputConstants.isKeyDown(key); }

    static String keyName(int key) { return InputConstants.Type.KEYBOARD.getOrCreate(key).getDisplayName().getString(); }

    static void openUrl(String url) { org.lwjgl.sdl.SDLMisc.SDL_OpenURL(url); }

    static com.mojang.renderpearl.api.textures.GpuSampler linearSampler() { return com.mojang.blaze3d.systems.RenderSystem.getSamplerCache().getClampToEdge(com.mojang.renderpearl.api.textures.FilterMode.LINEAR); }

    static Screen options(Screen parent, Options o, boolean inWorld) { return new OptionsScreen(parent, o); }
}
