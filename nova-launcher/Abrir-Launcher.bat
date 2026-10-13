@echo off
title Nova Launcher
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js no esta instalado. Instalando...
  winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
  echo.
  echo Node.js instalado. CIERRA esta ventana y vuelve a abrir este archivo.
  pause
  exit /b
)
if not exist node_modules (
  echo Primera vez: instalando dependencias, puede tardar unos minutos...
  call npm install
  if errorlevel 1 goto err
)
call npm start
exit /b
:err
echo.
echo Ha ocurrido un error. Copia el mensaje de arriba y pasamelo.
pause
