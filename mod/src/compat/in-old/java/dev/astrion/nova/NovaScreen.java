package dev.astrion.nova;

import net.minecraft.client.gui.Element;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.text.Text;

/** Pantalla base con la entrada de ratón y teclado de 1.20 a 1.21.8 (capa «in-old»). */
abstract class NovaScreen extends Screen {
    protected NovaScreen(Text title) { super(title); }

    protected abstract boolean nClick(double mx, double my, int button);
    protected abstract boolean nKey(int key, int scan, int mods);
    protected abstract boolean nChar(char chr, int mods);

    protected boolean superKey(int key, int scan, int mods) { return super.keyPressed(key, scan, mods); }
    protected boolean superChar(char chr, int mods) { return super.charTyped(chr, mods); }
    static boolean childClick(Element e, double mx, double my, int button) { return e.mouseClicked(mx, my, button); }

    @Override public boolean mouseClicked(double mx, double my, int button) { return nClick(mx, my, button); }
    @Override public boolean keyPressed(int key, int scan, int mods) { return nKey(key, scan, mods); }
    @Override public boolean charTyped(char chr, int mods) { return nChar(chr, mods); }
}
