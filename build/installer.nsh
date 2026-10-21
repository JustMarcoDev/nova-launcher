; Instalación siempre «solo para este usuario» (%LOCALAPPDATA%\Programs\Nova Launcher):
; así el instalador no pide permisos de administrador y las actualizaciones automáticas no muestran el aviso UAC.

; Instalación normal (con asistente): no ofrecer «para todos los usuarios».
!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend

; Actualización silenciosa: electron-builder mira el registro de la máquina (HKLM) y, si encuentra una
; instalación antigua «para todos», pide elevar a administrador aunque la nueva sea de usuario.
; Aquí se ignora esa instalación antigua y se instala siempre en modo usuario.
!macro customInit
  StrCpy $hasPerMachineInstallation "0"
  StrCpy $hasPerUserInstallation "1"
  !insertmacro setInstallModePerUser
!macroend
