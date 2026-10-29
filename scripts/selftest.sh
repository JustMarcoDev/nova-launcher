#!/bin/bash
# Robot de pruebas del menú de Nova: abre el cliente de una versión con xvfb y el modo -Dnova.selftest=true.
# En el CI: xvfb-run -a -s "-screen 0 1280x720x24 +extension GLX" scripts/selftest.sh …
# uso: scripts/selftest.sh <mod|mod26> <mc> "<yarn>" "<capas>" "<cargador>" <carpeta-de-salida>
# Las capturas salen de la pantalla virtual cuando el mod escribe «[NOVA-SELFTEST] SHOT <nombre>».
# Termina con 0 si el mod escribe PASS y con 1 si escribe FAIL, si el juego se cierra antes o si pasa el tiempo.
TREE=$1; MC=$2; YARN=$3; LAYERS=$4; LOADER=$5; OUT=$6
mkdir -p "$OUT" /tmp/novadir; LOG="$OUT/selftest-$MC.log"; : > "$LOG"
cd "$(dirname "$0")/../$TREE" || exit 2
export GALLIUM_DRIVER=llvmpipe LP_NUM_THREADS=${LP_NUM_THREADS:-4} LIBGL_ALWAYS_SOFTWARE=1 XDG_RUNTIME_DIR=/tmp/xdg MESA_GL_VERSION_OVERRIDE=4.6 MESA_GLSL_VERSION_OVERRIDE=460
mkdir -p "$XDG_RUNTIME_DIR"; chmod 700 "$XDG_RUNTIME_DIR"
if [ "$TREE" = mod26 ]; then export SDL_VIDEODRIVER=x11 SDL_VIDEO_FORCE_EGL=1; fi
# Sin pantalla (DISPLAY vacío) abre una virtual; en el CI lo llama «xvfb-run -a» y ya la trae
XPID=""; if [ -z "$DISPLAY" ]; then export DISPLAY=:99; Xvfb :99 -screen 0 1280x720x24 +extension GLX +render -noreset >/dev/null 2>&1 & XPID=$!; sleep 2; fi
export JAVA_TOOL_OPTIONS="$JAVA_TOOL_OPTIONS -Dnova.selftest=true -Dnova.key=selftest -Dnova.dir=/tmp/novadir -Dnova.skin=/tmp/none.png -Dnova.premium=0 -Dnova.user=Robot -Dnova.bg="
if [ "$TREE" = mod ]; then ARGS=(-Pmc="$MC" -Pyarn="$YARN" -Players="$LAYERS" -Ploader="$LOADER"); else ARGS=(-Pmc="$MC" -Players="$LAYERS"); fi
${GRADLE_BIN:-gradle} runClient $GRADLE_EXTRA --no-daemon "${ARGS[@]}" >> "$LOG" 2>&1 &
GPID=$!
RES=1; SEEN=""; LASTSZ=0; STALL=0
for i in $(seq 1 720); do   # hasta 12 minutos (la primera vez baja el juego y sus recursos)
  for S in $(grep -o 'SHOT [a-z]*' "$LOG" | awk '{print $2}' | sort -u); do
    case " $SEEN " in *" $S "*) ;; *) import -window root "$OUT/$MC-$S.png" 2>/dev/null; SEEN="$SEEN $S";; esac
  done
  if grep -q '\[NOVA-SELFTEST\] PASS' "$LOG"; then RES=0; break; fi
  if grep -q '\[NOVA-SELFTEST\] FAIL' "$LOG"; then RES=1; break; fi
  if ! kill -0 $GPID 2>/dev/null; then sleep 1; grep -q '\[NOVA-SELFTEST\] PASS' "$LOG" && RES=0 || { echo "El juego se cerró sin terminar la prueba" >> "$LOG"; RES=1; }; break; fi
  # Si el juego deja de escribir durante 3 minutos se da por colgado: se guarda un volcado de hilos para ver dónde
  SZ=$(stat -c %s "$LOG" 2>/dev/null || echo 0)
  if [ "$SZ" = "$LASTSZ" ]; then STALL=$((STALL+1)); else STALL=0; LASTSZ=$SZ; fi
  if [ $STALL -ge 180 ]; then
    JP=$(pgrep -f 'KnotClient' | head -1); echo "El juego lleva 3 min sin escribir (pid $JP): volcado de hilos" >> "$LOG"
    [ -n "$JP" ] && jstack "$JP" 2>&1 | grep -a -A12 '"Render thread"\|"main"' | head -40 >> "$LOG"
    RES=1; break
  fi
  sleep 1
done
[ -z "$SEEN" ] || true
pkill -P $GPID 2>/dev/null; kill $GPID 2>/dev/null; pkill -f 'runClient|KnotClient' 2>/dev/null; [ -z "$XPID" ] || kill $XPID 2>/dev/null
grep -a '\[NOVA-SELFTEST\]' "$LOG" | tail -12
if [ $RES = 0 ]; then echo "== $MC: BIEN"; else
  echo "== $MC: FALLÓ"; tail -60 "$LOG"
  # En el CI la causa sale como anotación de la ejecución (sin tener que bajar el registro)
  if [ -n "$GITHUB_ACTIONS" ]; then
    echo "::error title=Robot $MC::$(grep -a -E 'NOVA-SELFTEST|sin escribir|at (net\.minecraft|org\.lwjgl|com\.mojang|dev\.astrion|java\.lang)|Exception|ERROR|FATAL|FAILED|What went wrong|Could not|error:' "$LOG" | grep -v 'authlib\|OpenAL\|key providers' | head -12 | cut -c1-260 | tr '\n' '|') ULTIMAS: $(tail -c 900 "$LOG" | tr '\n' '|')"
  fi
fi
exit $RES
