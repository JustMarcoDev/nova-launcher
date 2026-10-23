@echo off
title Crear instalador de Nova Launcher
cd /d "%~dp0"
set CSC_IDENTITY_AUTO_DISCOVERY=false
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js no esta instalado. Instalando...
  winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
  echo.
  echo Node.js instalado. CIERRA esta ventana y vuelve a abrir este archivo.
  pause
  exit /b
)
echo [1/3] Instalando dependencias, puede tardar unos minutos...
call npm install
if errorlevel 1 goto err
echo [2/3] Descargando los recursos (fondo y menu de Nova) de GitHub...
call npm run recursos
if errorlevel 1 goto err
echo [3/3] Creando el instalador...
call npm run dist
if errorlevel 1 goto err
start "" "%~dp0dist"
echo.
echo LISTO. Abre "Nova Launcher Setup" en la carpeta dist para instalar la app.
pause
exit /b
:err
echo.
echo Ha ocurrido un error. Copia el mensaje de arriba y pasamelo.
pause
