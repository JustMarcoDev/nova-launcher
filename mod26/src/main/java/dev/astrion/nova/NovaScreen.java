package dev.astrion.nova;

import net.minecraft.client.gui.components.events.GuiEventListener;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.input.CharacterEvent;
import net.minecraft.client.input.KeyEvent;
import net.minecraft.client.input.MouseButtonEvent;
import net.minecraft.client.input.MouseButtonInfo;
import net.minecraft.network.chat.Component;

/** Pantalla base con la entrada de ratón y teclado de 1.21.9 en adelante (objetos Click, KeyInput y CharInput; capa «in-new»). */
abstract class NovaScreen extends Screen {
    protected NovaScreen(Component title) { super(title); }

    protected abstract boolean nClick(double mx, double my, int button);
    protected abstract boolean nKey(int key, int scan, int mods);
    protected abstract boolean nChar(char chr, int mods);

    protected boolean superKey(int key, int scan, int mods) { return super.keyPressed(new KeyEvent(key, scan, mods)); }
    protected boolean superChar(char chr, int mods) { return super.charTyped(new CharacterEvent(chr)); }
    static boolean childClick(GuiEventListener e, double mx, double my, int button) { return e.mouseClicked(new MouseButtonEvent(mx, my, new MouseButtonInfo(button, 0)), false); }

    @Override public boolean mouseClicked(MouseButtonEvent click, boolean doubled) { return nClick(click.x(), click.y(), click.button()); }
    @Override public boolean keyPressed(KeyEvent input) { return nKey(input.key(), NovaVer.scan(input), input.modifiers()); }
    @Override public boolean charTyped(CharacterEvent input) { return nChar((char) input.codepoint(), 0); }
}
