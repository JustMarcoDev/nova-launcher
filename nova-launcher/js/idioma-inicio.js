// Arranca el idioma (el archivo lang/<idioma>.js ya se ha cargado en idioma.js). Si no se pudo cargar, se queda en español y se reintenta una vez.
langStart((window.LANGS&&window.LANGS[langPick(langStored())])?langPick(langStored()):"es");
