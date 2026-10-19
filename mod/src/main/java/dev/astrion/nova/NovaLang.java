package dev.astrion.nova;

import java.util.HashMap;
import java.util.Map;
import net.minecraft.client.MinecraftClient;

/**
 * Textos del mod en el idioma del juego: español, inglés, francés, alemán, italiano y portugués.
 * La clave es el texto en español; si el juego está en otro idioma se busca su traducción
 * (y si no hay, se usa el inglés). Los {0}, {1}… son partes variables.
 */
final class NovaLang {
    private static final Map<String, String[]> T = new HashMap<>();   // clave → {en, fr, de, it, pt}

    private static void p(String es, String en, String fr, String de, String it, String pt) { T.put(es, new String[] { en, fr, de, it, pt }); }

    /** Idioma elegido en el juego: 0 español · 1 inglés · 2 francés · 3 alemán · 4 italiano · 5 portugués. */
    static int lang() {
        String l = "";
        try { l = MinecraftClient.getInstance().options.language; } catch (Throwable ignored) { }
        if (l == null) l = "";
        l = l.toLowerCase(java.util.Locale.ROOT);
        if (l.startsWith("es")) return 0;
        if (l.startsWith("fr")) return 2;
        if (l.startsWith("de")) return 3;
        if (l.startsWith("it")) return 4;
        if (l.startsWith("pt")) return 5;
        return 1;
    }

    static boolean spanish() { return lang() == 0; }

    static String tr(String es, Object... args) {
        int l = lang();
        String r = es;
        if (l != 0) {
            String[] v = T.get(es);
            r = v == null ? es : v[l - 1];
        }
        for (int i = 0; i < args.length; i++) r = r.replace("{" + i + "}", String.valueOf(args[i]));
        return r;
    }

    static {
        p("Un jugador", "Singleplayer", "Solo", "Einzelspieler", "Giocatore singolo", "Um jogador");
        p("Crea o abre tus mundos", "Create or open worlds", "Crée ou ouvre tes mondes", "Erstelle oder öffne Welten", "Crea o apri i tuoi mondi", "Crie ou abra seus mundos");
        p("Multijugador", "Multiplayer", "Multijoueur", "Mehrspieler", "Multigiocatore", "Multijogador");
        p("Únete a servidores", "Join servers", "Rejoins des serveurs", "Tritt Servern bei", "Unisciti ai server", "Entre em servidores");
        p("Ajustes", "Settings", "Options", "Einstellungen", "Impostazioni", "Configurações");
        p("Opciones del juego", "Game options", "Options du jeu", "Spieloptionen", "Opzioni di gioco", "Opções do jogo");
        p("Idioma", "Language", "Langue", "Sprache", "Lingua", "Idioma");
        p("Cambia el idioma del juego", "Change the game language", "Change la langue du jeu", "Ändere die Spielsprache", "Cambia la lingua del gioco", "Mude o idioma do jogo");
        p("Próximamente", "Coming soon", "Bientôt", "Demnächst", "Prossimamente", "Em breve");
        p("Aún no disponible", "Not available yet", "Pas encore disponible", "Noch nicht verfügbar", "Non ancora disponibile", "Ainda não disponível");
        p("Mundos online de Minecraft", "Minecraft online worlds", "Mondes en ligne de Minecraft", "Online-Welten von Minecraft", "Mondi online di Minecraft", "Mundos online do Minecraft");
        p("Menú de Nova", "Nova menu", "Menu Nova", "Nova-Menü", "Menu di Nova", "Menu do Nova");
        p("Fondo, colores y más", "Background, colors and more", "Fond, couleurs et plus", "Hintergrund, Farben und mehr", "Sfondo, colori e altro", "Fundo, cores e mais");
        p("Perfil", "Profile", "Profil", "Profil", "Profilo", "Perfil");
        p("Tu skin y tu cuenta", "Your skin and account", "Ton skin et ton compte", "Dein Skin und dein Konto", "La tua skin e il tuo account", "Sua skin e sua conta");
        p("Salir del juego", "Quit game", "Quitter le jeu", "Spiel beenden", "Esci dal gioco", "Sair do jogo");
        p("Cierra Minecraft", "Closes Minecraft", "Ferme Minecraft", "Schließt Minecraft", "Chiude Minecraft", "Fecha o Minecraft");
        p("Cuenta de Microsoft", "Microsoft account", "Compte Microsoft", "Microsoft-Konto", "Account Microsoft", "Conta Microsoft");
        p("Cuenta sin conexión", "Offline account", "Compte hors ligne", "Offline-Konto", "Account offline", "Conta offline");
        p("Pulsa Esc para cerrar", "Press Esc to close", "Appuie sur Échap pour fermer", "Zum Schließen Esc drücken", "Premi Esc per chiudere", "Pressione Esc para fechar");
        p("FONDO", "BACKGROUND", "FOND", "HINTERGRUND", "SFONDO", "FUNDO");
        p("  ·  rueda del ratón", "  ·  mouse wheel", "  ·  molette", "  ·  Mausrad", "  ·  rotellina", "  ·  roda do mouse");
        p("¿Eliminar «{0}»?", "Delete \"{0}\"?", "Supprimer « {0} » ?", "„{0}“ löschen?", "Eliminare «{0}»?", "Excluir «{0}»?");
        p("Sí, eliminar", "Yes, delete", "Oui, supprimer", "Ja, löschen", "Sì, elimina", "Sim, excluir");
        p("Eliminar", "Delete", "Supprimer", "Löschen", "Elimina", "Excluir");
        p("Borra la foto o el vídeo", "Deletes the photo or video", "Supprime la photo ou la vidéo", "Löscht das Foto oder Video", "Elimina la foto o il video", "Exclui a foto ou o vídeo");
        p("Cancelar", "Cancel", "Annuler", "Abbrechen", "Annulla", "Cancelar");
        p("No borrar nada", "Keep it", "Ne rien supprimer", "Nichts löschen", "Non eliminare nulla", "Não excluir nada");
        p("Nuevo nombre", "New name", "Nouveau nom", "Neuer Name", "Nuovo nome", "Novo nome");
        p("Escribe y pulsa Intro", "Type and press Enter", "Écris et appuie sur Entrée", "Tippen und Enter drücken", "Scrivi e premi Invio", "Digite e pressione Enter");
        p("Guardar nombre", "Save name", "Enregistrer le nom", "Namen speichern", "Salva il nome", "Salvar nome");
        p("Confirma el nombre", "Confirms the name", "Confirme le nom", "Bestätigt den Namen", "Conferma il nome", "Confirma o nome");
        p("Usar este fondo", "Use this background", "Utiliser ce fond", "Diesen Hintergrund verwenden", "Usa questo sfondo", "Usar este fundo");
        p("No se pudo convertir", "Could not convert", "Conversion impossible", "Umwandlung fehlgeschlagen", "Conversione non riuscita", "Não foi possível converter");
        p("Preparando el fondo…", "Preparing…", "Préparation…", "Wird vorbereitet…", "Preparazione…", "Preparando…");
        p("  (error)", "  (error)", "  (erreur)", "  (Fehler)", "  (errore)", "  (erro)");
        p("Cambiar nombre", "Rename", "Renommer", "Umbenennen", "Rinomina", "Renomear");
        p("Ponle el nombre que quieras", "Give it any name", "Donne-lui le nom que tu veux", "Gib ihm einen beliebigen Namen", "Dagli il nome che vuoi", "Dê o nome que quiser");
        p("Cambiar archivo", "Replace file", "Remplacer le fichier", "Datei ersetzen", "Sostituisci il file", "Trocar arquivo");
        p("Elige otra foto o vídeo", "Pick another photo or video", "Choisis une autre photo ou vidéo", "Wähle ein anderes Foto oder Video", "Scegli un'altra foto o video", "Escolha outra foto ou vídeo");
        p("Añadir", "Add", "Ajouter", "Hinzufügen", "Aggiungi", "Adicionar");
        p("Añadir foto o vídeo", "Add photo or video", "Ajouter une photo ou une vidéo", "Foto oder Video hinzufügen", "Aggiungi foto o video", "Adicionar foto ou vídeo");
        p("Elige un archivo de tu PC", "Pick a file from your PC", "Choisis un fichier de ton PC", "Wähle eine Datei von deinem PC", "Scegli un file dal tuo PC", "Escolha um arquivo do seu PC");
        p("Abrir carpeta", "Open folder", "Ouvrir le dossier", "Ordner öffnen", "Apri cartella", "Abrir pasta");
        p("Carpeta de fondos", "Backgrounds folder", "Dossier des fonds", "Hintergrund-Ordner", "Cartella degli sfondi", "Pasta de fundos");
        p("Arrastra aquí tus fotos", "Drop your photos here", "Glisse tes photos ici", "Zieh deine Fotos hierher", "Trascina qui le tue foto", "Arraste suas fotos aqui");
        p("Arrastra fotos o vídeos a la carpeta y aparecen aquí", "Drop photos or videos in the folder and they show up here", "Glisse des photos ou vidéos dans le dossier : elles apparaissent ici", "Zieh Fotos oder Videos in den Ordner, dann erscheinen sie hier", "Trascina foto o video nella cartella e appaiono qui", "Arraste fotos ou vídeos para a pasta e eles aparecem aqui");
        p("COLOR DE LOS BOTONES", "BUTTON COLOR", "COULEUR DES BOUTONS", "FARBE DER SCHALTFLÄCHEN", "COLORE DEI PULSANTI", "COR DOS BOTÕES");
        p("Color de acento", "Accent color", "Couleur d'accent", "Akzentfarbe", "Colore di accento", "Cor de destaque");
        p("Cambia el color de los botones", "Changes the button color", "Change la couleur des boutons", "Ändert die Farbe der Schaltflächen", "Cambia il colore dei pulsanti", "Muda a cor dos botões");
        p("Ajustes del launcher", "Launcher settings", "Paramètres du launcher", "Launcher-Einstellungen", "Impostazioni del launcher", "Configurações do launcher");
        p("Abre Nova Launcher", "Opens Nova Launcher", "Ouvre Nova Launcher", "Öffnet Nova Launcher", "Apre Nova Launcher", "Abre o Nova Launcher");
        p("Confirmar cambios", "Confirm changes", "Confirmer les changements", "Änderungen bestätigen", "Conferma le modifiche", "Confirmar alterações");
        p("Guarda el fondo y el color elegidos", "Saves the chosen background and color", "Enregistre le fond et la couleur choisis", "Speichert den gewählten Hintergrund und die Farbe", "Salva lo sfondo e il colore scelti", "Salva o fundo e a cor escolhidos");
        p("Sin cambios por guardar", "Nothing to save", "Rien à enregistrer", "Nichts zu speichern", "Nessuna modifica da salvare", "Nada para salvar");
        p("Versión: ", "Version: ", "Version : ", "Version: ", "Versione: ", "Versão: ");
        p("Sin afiliación, respaldo ni distribución de Mojang o Microsoft", "Not affiliated with, endorsed or distributed by Mojang or Microsoft", "Non affilié à Mojang ou Microsoft, ni approuvé ou distribué par eux", "Nicht mit Mojang oder Microsoft verbunden und nicht von ihnen unterstützt oder vertrieben", "Non affiliato a Mojang o Microsoft, né approvato o distribuito da loro", "Sem afiliação, aprovação ou distribuição da Mojang ou da Microsoft");
        p("Agujero negro", "Black hole", "Trou noir", "Schwarzes Loch", "Buco nero", "Buraco negro");
        p("Nebulosa", "Nebula", "Nébuleuse", "Nebel", "Nebulosa", "Nebulosa");
        p("Espacio oscuro", "Dark space", "Espace sombre", "Dunkler Weltraum", "Spazio oscuro", "Espaço escuro");
    }
}
