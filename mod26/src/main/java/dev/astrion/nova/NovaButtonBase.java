package dev.astrion.nova;

import net.minecraft.client.gui.components.AbstractWidget;
import net.minecraft.client.gui.narration.NarrationElementOutput;
import net.minecraft.client.input.KeyEvent;
import net.minecraft.client.input.MouseButtonEvent;

/** Base del botón de Nova en 1.21.11 (capa «btn-new»): ahí PressableWidget dibuja siempre el fondo de vanilla, así que se parte de ClickableWidget. */
abstract class NovaButtonBase extends AbstractWidget {
    public interface PressAction { void onPress(AbstractWidget button); }
    private final PressAction action;

    protected NovaButtonBase(int x, int y, int w, int h, net.minecraft.network.chat.Component label, PressAction action) {
        super(x, y, w, h, label);
        this.action = action;
    }

    @Override public void onClick(MouseButtonEvent click, boolean doubled) { action.onPress(this); }
    @Override protected void updateWidgetNarration(NarrationElementOutput builder) { defaultButtonNarrationText(builder); }
    @Override public boolean keyPressed(KeyEvent input) {
        if (active && visible && (input.key() == com.mojang.blaze3d.platform.InputConstants.KEY_RETURN || input.key() == com.mojang.blaze3d.platform.InputConstants.KEY_SPACE || input.key() == com.mojang.blaze3d.platform.InputConstants.KEY_NUMPADENTER)) { playDownSound(net.minecraft.client.Minecraft.getInstance().getSoundManager()); action.onPress(this); return true; }
        return false;
    }
}
