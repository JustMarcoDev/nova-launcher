package dev.astrion.nova;

import java.util.function.BooleanSupplier;

/** Capa de Nova (lógica común): cuándo un jugador debe llevarla. La textura y el tipo de jugador (PlayerListEntry / PlayerInfo) los pone NovaCape de cada proyecto. */
final class NovaCapeCore {
    private NovaCapeCore() { }

    /** Solo para pruebas (-Dnova.cape.test=1): todos los jugadores llevan la capa aunque no haya servidor de presencia. */
    static final boolean TEST = System.getProperty("nova.cape.test") != null;
    static final String TEXTURE = "textures/cape/nova.png";

    /** ¿Debe llevar la capa de Nova? Se respeta el interruptor remoto «cape» y la opción del jugador; `uses` dice si ese jugador usa Nova. */
    static boolean wants(BooleanSupplier uses) {
        if (NovaOff.has("cape")) return false;
        try {
            NovaSettings.load();   // solo lee el archivo la primera vez
            if (!NovaSettings.showCape) return false;
            return TEST || uses.getAsBoolean();
        } catch (Throwable t) { return false; }
    }
}
