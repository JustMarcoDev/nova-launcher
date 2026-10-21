package dev.astrion.nova;

import net.minecraft.client.gui.Click;
import net.minecraft.client.gui.Element;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.input.CharInput;
import net.minecraft.client.input.KeyInput;
import net.minecraft.client.input.MouseInput;
import net.minecraft.text.Text;

/** Pantalla base con la entrada de ratón y teclado de 1.21.9 en adelante (objetos Click, KeyInput y CharInput; capa «in-new»). */
abstract class NovaScreen extends Screen {
    protected NovaScreen(Text title) { super(title); }

    protected abstract boolean nClick(double mx, double my, int button);
    protected abstract boolean nKey(int key, int scan, int mods);
    protected abstract boolean nChar(char chr, int mods);

    protected boolean superKey(int key, int scan, int mods) { return super.keyPressed(new KeyInput(key, scan, mods)); }
    protected boolean superChar(char chr, int mods) { return super.charTyped(new CharInput(chr, mods)); }
    static boolean childClick(Element e, double mx, double my, int button) { return e.mouseClicked(new Click(mx, my, new MouseInput(button, 0)), false); }

    @Override public boolean mouseClicked(Click click, boolean doubled) { return nClick(click.x(), click.y(), click.button()); }
    @Override public boolean keyPressed(KeyInput input) { return nKey(input.key(), input.scancode(), input.modifiers()); }
    @Override public boolean charTyped(CharInput input) { return nChar((char) input.codepoint(), input.modifiers()); }
}
