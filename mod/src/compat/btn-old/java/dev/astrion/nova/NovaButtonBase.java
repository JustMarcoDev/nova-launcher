package dev.astrion.nova;

import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.text.Text;

/** Base del botón de Nova hasta 1.21.10 (capa «btn-old»): un ButtonWidget normal. */
abstract class NovaButtonBase extends ButtonWidget {
    protected NovaButtonBase(int x, int y, int w, int h, Text label, PressAction action) {
        super(x, y, w, h, label, action, DEFAULT_NARRATION_SUPPLIER);
    }
}
