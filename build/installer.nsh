; Nova Launcher · ajustes del instalador (NSIS)
; 1) «Solo para mí» sale marcado de forma predeterminada. Las actualizaciones automáticas del launcher se instalan
;    sin pedir permisos de administrador (sin la ventana UAC) solo si el launcher está instalado para el usuario.
; 2) La opción «todos los usuarios» avisa de que cada actualización pedirá permisos de administrador.
; Si ya hay una instalación para todos los usuarios y el instalador se ejecuta en silencio (actualización automática), se respeta.
!macro customInit
  ${IfNot} ${Silent}
    ${GetParameters} $R0
    ${GetOptions} $R0 "/allusers" $R1
    ${If} ${Errors}
      !insertmacro setInstallModePerUser
    ${EndIf}
  ${EndIf}
!macroend

!macro customHeader
  !pragma warning disable 6030
LangString freshInstallForAll 3082 "Instalación para todos los usuarios. Pedirá permisos de administrador ahora y también en cada actualización del launcher."
LangString perMachineInstallExists 3082 "Ya está instalado para todos los usuarios. Cada actualización pedirá permisos de administrador. Para evitarlo, elige «Solo para mí»: "
  !pragma warning enable 6030
!macroend
