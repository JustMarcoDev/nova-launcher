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
        p("Volver al juego", "Back to game", "Retour au jeu", "Zurück zum Spiel", "Torna al gioco", "Voltar ao jogo");
        p("Logros", "Advancements", "Progrès", "Fortschritte", "Progressi", "Conquistas");
        p("Estadísticas", "Statistics", "Statistiques", "Statistiken", "Statistiche", "Estatísticas");
        p("Abrir launcher", "Open launcher", "Ouvrir le launcher", "Launcher öffnen", "Apri il launcher", "Abrir o launcher");
        p("Guardar y salir", "Save and quit", "Enregistrer et quitter", "Speichern und beenden", "Salva ed esci", "Salvar e sair");
        p("Desconectar", "Disconnect", "Se déconnecter", "Trennen", "Disconnetti", "Desconectar");
        p("Juego en pausa", "Game paused", "Jeu en pause", "Spiel pausiert", "Gioco in pausa", "Jogo pausado");
        p("Nebulosa", "Nebula", "Nébuleuse", "Nebel", "Nebulosa", "Nebulosa");
        p("  (descargar)", "  (download)", "  (télécharger)", "  (laden)", "  (scarica)", "  (baixar)");
        p("Descargando el fondo…", "Downloading the background…", "Téléchargement du fond…", "Hintergrund wird heruntergeladen…", "Download dello sfondo…", "Baixando o fundo…");
        p("No se pudo descargar: pulsa para reintentar", "Download failed: click to retry", "Échec du téléchargement : clique pour réessayer", "Download fehlgeschlagen: zum Wiederholen klicken", "Download non riuscito: clicca per riprovare", "Falha no download: clique para tentar de novo");
        p("Pulsa para descargar este fondo", "Click to download this background", "Clique pour télécharger ce fond", "Klicken, um diesen Hintergrund herunterzuladen", "Clicca per scaricare questo sfondo", "Clique para baixar este fundo");
        p("Editar HUD", "Edit HUD", "Modifier le HUD", "HUD bearbeiten", "Modifica HUD", "Editar HUD");
        p("Arrastra los elementos para colocarlos", "Drag the elements to place them", "Fais glisser les éléments pour les placer", "Ziehe die Elemente an ihren Platz", "Trascina gli elementi per posizionarli", "Arraste os elementos para posicioná-los");
        p("Coordenadas", "Coordinates", "Coordonnées", "Koordinaten", "Coordinate", "Coordenadas");
        p("Teclas", "Keys", "Touches", "Tasten", "Tasti", "Teclas");
        p("Activado: pulsa para ocultarlo", "On: click to hide it", "Activé : clique pour le masquer", "An: klicken zum Ausblenden", "Attivo: clicca per nasconderlo", "Ativado: clique para ocultar");
        p("Desactivado: pulsa para mostrarlo", "Off: click to show it", "Désactivé : clique pour l'afficher", "Aus: klicken zum Anzeigen", "Disattivato: clicca per mostrarlo", "Desativado: clique para mostrar");
        p("Zoom", "Zoom", "Zoom", "Zoom", "Zoom", "Zoom");
        p("Sí", "Yes", "Oui", "Ja", "Sì", "Sim");
        p("No", "No", "Non", "Nein", "No", "Não");
        p("Mantén la tecla para acercar la vista", "Hold the key to zoom in", "Maintiens la touche pour zoomer", "Halte die Taste gedrückt, um heranzuzoomen", "Tieni premuto il tasto per ingrandire", "Segure a tecla para aproximar a visão");
        p("Pulsa una tecla…", "Press a key…", "Appuie sur une touche…", "Drücke eine Taste…", "Premi un tasto…", "Pressione uma tecla…");
        p("Tecla de zoom", "Zoom key", "Touche de zoom", "Zoom-Taste", "Tasto zoom", "Tecla de zoom");
        p("Pulsa y luego la tecla que quieras (Esc cancela)", "Click, then press the key you want (Esc cancels)", "Clique, puis appuie sur la touche voulue (Échap annule)", "Klicken, dann die gewünschte Taste drücken (Esc bricht ab)", "Clicca, poi premi il tasto che vuoi (Esc annulla)", "Clique e depois pressione a tecla que quiser (Esc cancela)");
        p("Servidores", "Servers", "Serveurs", "Server", "Server", "Servidores");
        p("Entra a tu último servidor o a tus favoritos", "Join your last server or your favorites", "Rejoins ton dernier serveur ou tes favoris", "Tritt deinem letzten Server oder deinen Favoriten bei", "Entra nel tuo ultimo server o nei preferiti", "Entre no seu último servidor ou nos favoritos");
        p("ÚLTIMO SERVIDOR", "LAST SERVER", "DERNIER SERVEUR", "ZULETZT BESUCHTER SERVER", "ULTIMO SERVER", "ÚLTIMO SERVIDOR");
        p("FAVORITOS DEL LAUNCHER", "LAUNCHER FAVORITES", "FAVORIS DU LAUNCHER", "FAVORITEN DES LAUNCHERS", "PREFERITI DEL LAUNCHER", "FAVORITOS DO LAUNCHER");
        p("Aún no has entrado en ningún servidor", "You haven't joined any server yet", "Tu n'as encore rejoint aucun serveur", "Du bist noch keinem Server beigetreten", "Non sei ancora entrato in nessun server", "Você ainda não entrou em nenhum servidor");
        p("Añade servidores en la pestaña Servidores del launcher", "Add servers in the launcher's Servers tab", "Ajoute des serveurs dans l'onglet Serveurs du launcher", "Füge Server im Reiter Server des Launchers hinzu", "Aggiungi server nella scheda Server del launcher", "Adicione servidores na aba Servidores do launcher");
        p("Entrar", "Join", "Rejoindre", "Beitreten", "Entra", "Entrar");
        p("Conecta directamente a este servidor", "Connects straight to this server", "Se connecte directement à ce serveur", "Verbindet direkt mit diesem Server", "Si connette direttamente a questo server", "Conecta direto a este servidor");
        p("Entrar a {0}", "Join {0}", "Rejoindre {0}", "{0} beitreten", "Entra in {0}", "Entrar em {0}");
        p("Sin respuesta", "No response", "Pas de réponse", "Keine Antwort", "Nessuna risposta", "Sem resposta");
        p("Capa de Nova", "Nova cape", "Cape Nova", "Nova-Umhang", "Mantello di Nova", "Capa do Nova");
        p("Los jugadores con Nova llevan una capa de Nova (la ves en ellos y ellos en ti)", "Players using Nova wear a Nova cape (you see theirs and they see yours)", "Les joueurs Nova portent une cape Nova (tu vois la leur, ils voient la tienne)", "Nova-Spieler tragen einen Nova-Umhang (du siehst ihren, sie deinen)", "I giocatori con Nova indossano un mantello di Nova (tu vedi il loro, loro il tuo)", "Jogadores com Nova usam uma capa do Nova (você vê a deles e eles a sua)");
        p("Modo FPS", "FPS mode", "Mode FPS", "FPS-Modus", "Modalità FPS", "Modo FPS");
        p("Partículas mínimas, sin nubes ni sombras, distancia 8: más rendimiento", "Minimal particles, no clouds or shadows, distance 8: more performance", "Particules minimales, sans nuages ni ombres, distance 8 : plus de performances", "Minimale Partikel, keine Wolken oder Schatten, Distanz 8: mehr Leistung", "Particelle minime, niente nuvole né ombre, distanza 8: più prestazioni", "Partículas mínimas, sem nuvens nem sombras, distância 8: mais desempenho");
        p("Modo FPS activo", "FPS mode on", "Mode FPS activé", "FPS-Modus aktiv", "Modalità FPS attiva", "Modo FPS ativo");
        p("Tus opciones de vídeo de antes están guardadas", "Your previous video options are saved", "Tes anciennes options vidéo sont enregistrées", "Deine bisherigen Videooptionen sind gespeichert", "Le tue opzioni video precedenti sono salvate", "Suas opções de vídeo anteriores estão salvas");
        p("Restaurar", "Restore", "Restaurer", "Wiederherstellen", "Ripristina", "Restaurar");
        p("Vuelve a tus opciones de vídeo de antes", "Goes back to your previous video options", "Revient à tes anciennes options vidéo", "Stellt deine bisherigen Videooptionen wieder her", "Torna alle tue opzioni video precedenti", "Volta às suas opções de vídeo anteriores");
        p(" · Aún no hay servidor de presencia: de momento solo lo ves tú", " · There is no presence server yet: for now only you can see it", " · Pas encore de serveur de présence : pour l'instant, toi seul le vois", " · Es gibt noch keinen Präsenzserver: vorerst siehst nur du es", " · Non c'è ancora un server di presenza: per ora lo vedi solo tu", " · Ainda não há servidor de presença: por agora só tu vês");
        p(" · Con cuenta sin conexión solo lo ves tú", " · With an offline account only you can see it", " · Avec un compte hors ligne, toi seul le vois", " · Mit einem Offline-Konto siehst nur du es", " · Con un account offline lo vedi solo tu", " · Com conta offline só tu vês");
        p("Mods", "Mods", "Mods", "Mods", "Mod", "Mods");
        p("Los mods que tienes instalados", "The mods you have installed", "Les mods que tu as installés", "Die Mods, die du installiert hast", "I mod che hai installato", "Os mods que tens instalados");
        p("Mods instalados", "Installed mods", "Mods installés", "Installierte Mods", "Mod installati", "Mods instalados");
        p("No hay mods instalados", "No mods installed", "Aucun mod installé", "Keine Mods installiert", "Nessun mod installato", "Nenhum mod instalado");
        p("Novedades de Nova", "What's new in Nova", "Nouveautés de Nova", "Neues in Nova", "Novità di Nova", "Novidades do Nova");
        p("Captura guardada", "Screenshot saved", "Capture enregistrée", "Screenshot gespeichert", "Screenshot salvato", "Captura salva");
        p("5 s", "5 s", "5 s", "5 s", "5 s", "5 s");
        p("Copiar", "Copy", "Copier", "Kopieren", "Copia", "Copiar");
        p("Abrir carpeta", "Open folder", "Ouvrir le dossier", "Ordner öffnen", "Apri cartella", "Abrir pasta");
        p("Mostrar que uso Nova", "Show that I use Nova", "Montrer que j'utilise Nova", "Zeigen, dass ich Nova nutze", "Mostra che uso Nova", "Mostrar que uso o Nova");
        p("Los demás jugadores con Nova ven el logo junto a tu nombre", "Other Nova players see the logo next to your name", "Les autres joueurs Nova voient le logo à côté de ton nom", "Andere Nova-Spieler sehen das Logo neben deinem Namen", "Gli altri giocatori Nova vedono il logo accanto al tuo nome", "Outros jogadores com Nova veem o logo ao lado do seu nome");
        p("Restablecer", "Reset", "Réinitialiser", "Zurücksetzen", "Ripristina", "Restaurar");
        p("Vuelve a las posiciones de fábrica", "Back to the default positions", "Retour aux positions d'origine", "Zurück zu den Standardpositionen", "Torna alle posizioni di fabbrica", "Volta às posições de fábrica");
        p("Listo", "Done", "Terminé", "Fertig", "Fatto", "Pronto");
        p("Mueve FPS, CPS, coordenadas y teclas", "Move FPS, CPS, coordinates and keys", "Déplace FPS, CPS, coordonnées et touches", "Verschiebe FPS, CPS, Koordinaten und Tasten", "Sposta FPS, CPS, coordinate e tasti", "Mova FPS, CPS, coordenadas e teclas");
        p("Espacio", "Space", "Espace", "Leertaste", "Spazio", "Espaço");
        p("Sur", "South", "Sud", "Süden", "Sud", "Sul");
        p("Suroeste", "Southwest", "Sud-ouest", "Südwesten", "Sud-ovest", "Sudoeste");
        p("Oeste", "West", "Ouest", "Westen", "Ovest", "Oeste");
        p("Noroeste", "Northwest", "Nord-ouest", "Nordwesten", "Nord-ovest", "Noroeste");
        p("Norte", "North", "Nord", "Norden", "Nord", "Norte");
        p("Noreste", "Northeast", "Nord-est", "Nordosten", "Nord-est", "Nordeste");
        p("Este", "East", "Est", "Osten", "Est", "Leste");
        p("Sureste", "Southeast", "Sud-est", "Südosten", "Sud-est", "Sudeste");
        p("Arrastra: mover · Esquina: tamaño · X: quitar", "Drag: move · Corner: resize · X: remove", "Glisser : déplacer · Coin : taille · X : retirer", "Ziehen: bewegen · Ecke: Größe · X: entfernen", "Trascina: sposta · Angolo: dimensione · X: rimuovi", "Arrastar: mover · Canto: tamanho · X: remover");
        p("Skins", "Skins", "Skins", "Skins", "Skin", "Skins");
        p("Cambia, guarda y elimina tus skins", "Change, save and delete your skins", "Change, enregistre et supprime tes skins", "Ändere, speichere und lösche deine Skins", "Cambia, salva ed elimina le tue skin", "Troque, salve e exclua suas skins");
        p("TUS SKINS", "YOUR SKINS", "TES SKINS", "DEINE SKINS", "LE TUE SKIN", "SUAS SKINS");
        p("Aún no tienes skins: sube una desde el launcher", "You have no skins yet: upload one from the launcher", "Tu n'as pas encore de skin : importes-en une depuis le launcher", "Du hast noch keine Skins: lade eine im Launcher hoch", "Non hai ancora skin: caricane una dal launcher", "Você ainda não tem skins: envie uma pelo launcher");
        p("Skin eliminada", "Skin deleted", "Skin supprimée", "Skin gelöscht", "Skin eliminata", "Skin excluída");
        p("No se pudo eliminar", "Could not delete it", "Impossible de la supprimer", "Konnte nicht gelöscht werden", "Impossibile eliminarla", "Não foi possível excluir");
        p("Borra la skin de tu lista", "Removes the skin from your list", "Retire la skin de ta liste", "Entfernt die Skin aus deiner Liste", "Rimuove la skin dalla tua lista", "Remove a skin da sua lista");
        p("Skin puesta: la ves en un momento", "Skin applied: you will see it in a moment", "Skin appliquée : tu la verras dans un instant", "Skin angewendet: gleich siehst du sie", "Skin applicata: la vedrai tra un attimo", "Skin aplicada: você a verá em instantes");
        p("No se pudo poner la skin", "Could not apply the skin", "Impossible d'appliquer la skin", "Skin konnte nicht angewendet werden", "Impossibile applicare la skin", "Não foi possível aplicar a skin");
        p("En uso", "In use", "En cours d'utilisation", "In Verwendung", "In uso", "Em uso");
        p("Usar esta skin", "Use this skin", "Utiliser cette skin", "Diese Skin verwenden", "Usa questa skin", "Usar esta skin");
        p("Fina", "Slim", "Fin", "Schlank", "Sottile", "Fina");
        p("Clásica", "Classic", "Classique", "Klassisch", "Classica", "Clássica");
        p("Modelo", "Model", "Modèle", "Modell", "Modello", "Modelo");
        p("Brazos finos (3 px) o clásicos (4 px)", "Slim (3 px) or classic (4 px) arms", "Bras fins (3 px) ou classiques (4 px)", "Schlanke (3 px) oder klassische (4 px) Arme", "Braccia sottili (3 px) o classiche (4 px)", "Braços finos (3 px) ou clássicos (4 px)");
        p("No se pudo cambiar", "Could not change it", "Impossible de la modifier", "Konnte nicht geändert werden", "Impossibile modificarla", "Não foi possível alterar");
        p("Guardar la actual", "Save current", "Enregistrer l'actuelle", "Aktuelle speichern", "Salva l'attuale", "Salvar a atual");
        p("Guarda la skin que llevas ahora en tu lista", "Saves the skin you are wearing to your list", "Enregistre la skin que tu portes dans ta liste", "Speichert deine aktuelle Skin in deiner Liste", "Salva la skin che indossi nella tua lista", "Salva a skin que você está usando na sua lista");
        p("No hay ninguna skin que guardar", "There is no skin to save", "Il n'y a aucune skin à enregistrer", "Es gibt keine Skin zum Speichern", "Non c'è nessuna skin da salvare", "Não há nenhuma skin para salvar");
        p("Ya la tenías guardada", "You already had it saved", "Tu l'avais déjà enregistrée", "Du hattest sie schon gespeichert", "L'avevi già salvata", "Você já a tinha salva");
        p("Skin guardada", "Skin saved", "Skin enregistrée", "Skin gespeichert", "Skin salvata", "Skin salva");
        p("No se pudo guardar", "Could not save it", "Impossible de l'enregistrer", "Konnte nicht gespeichert werden", "Impossibile salvarla", "Não foi possível salvar");
        p("Carpeta de skins", "Skins folder", "Dossier des skins", "Skin-Ordner", "Cartella delle skin", "Pasta de skins");
        p("Suelta aquí archivos .png de 64×64 y aparecen en la lista", "Drop 64×64 .png files here and they show up in the list", "Dépose ici des fichiers .png de 64×64 et ils apparaissent dans la liste", "Lege hier 64×64-.png-Dateien ab, sie erscheinen in der Liste", "Metti qui file .png da 64×64 e compaiono nell'elenco", "Solte aqui arquivos .png de 64×64 e eles aparecem na lista");
        p("Quitar skin", "Remove skin", "Retirer la skin", "Skin entfernen", "Rimuovi skin", "Remover skin");
        p("Vuelves a tu skin de siempre", "Back to your usual skin", "Retour à ta skin habituelle", "Zurück zu deiner üblichen Skin", "Torni alla tua skin di sempre", "De volta à sua skin de sempre");
        p("No se pudo quitar", "Could not remove it", "Impossible de la retirer", "Konnte nicht entfernt werden", "Impossibile rimuoverla", "Não foi possível remover");
        p("Vuelves a la skin de tu cuenta", "Back to your account's skin", "Retour à la skin de ton compte", "Zurück zur Skin deines Kontos", "Torni alla skin del tuo account", "De volta à skin da sua conta");
        p("Solo la ves tú; para que todos la vean, aplícala desde el launcher", "Only you see it; to show it to everyone, apply it from the launcher", "Toi seul la vois ; pour que tous la voient, applique-la depuis le launcher", "Nur du siehst sie; damit alle sie sehen, wende sie im Launcher an", "Solo tu la vedi; perché la vedano tutti, applicala dal launcher", "Só você a vê; para todos verem, aplique-a pelo launcher");
        p("Solo la ves tú", "Only you see it", "Toi seul la vois", "Nur du siehst sie", "Solo tu la vedi", "Só você a vê");
    }
}
