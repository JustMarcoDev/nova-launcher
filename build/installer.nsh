; Instalación siempre «solo para este usuario» (%LOCALAPPDATA%\Programs\Nova Launcher):
; así el instalador no pide permisos de administrador y las actualizaciones automáticas no muestran el aviso UAC.
!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend
