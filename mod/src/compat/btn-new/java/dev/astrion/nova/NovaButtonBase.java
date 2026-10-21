package dev.astrion.nova;

import net.minecraft.client.gui.Click;
import net.minecraft.client.gui.screen.narration.NarrationMessageBuilder;
import net.minecraft.client.gui.widget.ClickableWidget;
import net.minecraft.client.input.KeyInput;

/** Base del botón de Nova en 1.21.11 (capa «btn-new»): ahí PressableWidget dibuja siempre el fondo de vanilla, así que se parte de ClickableWidget. */
abstract class NovaButtonBase extends ClickableWidget {
    public interface PressAction { void onPress(ClickableWidget button); }
    private final PressAction action;

    protected NovaButtonBase(int x, int y, int w, int h, net.minecraft.text.Text label, PressAction action) {
        super(x, y, w, h, label);
        this.action = action;
    }

    @Override public void onClick(Click click, boolean doubled) { action.onPress(this); }
    @Override protected void appendClickableNarrations(NarrationMessageBuilder builder) { appendDefaultNarrations(builder); }
    @Override public boolean keyPressed(KeyInput input) {
        if (active && visible && (input.key() == 257 || input.key() == 32 || input.key() == 335)) { playDownSound(net.minecraft.client.MinecraftClient.getInstance().getSoundManager()); action.onPress(this); return true; }
        return false;
    }
}
