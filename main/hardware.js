// =====================================================================================
// Nova Launcher · main/hardware.js
// Cálculos puros sobre el PC (sin Electron): gráficas, ajustes de vídeo para el primer arranque y RAM recomendada.
// =====================================================================================

const VENDOR = { 0x8086: 'Intel', 0x10de: 'NVIDIA', 0x1002: 'AMD', 0x1022: 'AMD', 0x106b: 'Apple' };
const hexId = v => { const n = typeof v === 'string' ? parseInt(v, 16) || parseInt(v, 10) : +v; return Number.isFinite(n) ? n : 0; };

/** Clasifica las gráficas de app.getGPUInfo('complete').gpuDevice → { gpus:[{name,vendor,integrated,active}], dual, usingIntegrated, hasDedicated }. */
function classifyGpus(devs) {
  const gpus = (Array.isArray(devs) ? devs : []).filter(d => d && (d.vendorId || d.deviceId)).map(d => {
    const v = hexId(d.vendorId), name = String(d.deviceString || d.driverVendor || VENDOR[v] || 'Gráfica').replace(/\s+/g, ' ').trim().slice(0, 80);
    const integrated = v === 0x8086 || /\b(intel|uhd|iris|vega\s*\d+\b|radeon\(tm\)\s*graphics|radeon graphics|apple)\b/i.test(name) && !/\b(rtx|gtx|rx\s*\d{3,4}|arc\s*a\d)/i.test(name);
    return { name, vendor: VENDOR[v] || '', integrated, active: !!d.active };
  });
  const dedicated = gpus.filter(g => !g.integrated), integ = gpus.filter(g => g.integrated);
  const act = gpus.find(g => g.active);
  return { gpus, dual: !!dedicated.length && !!integ.length, hasDedicated: !!dedicated.length, usingIntegrated: !!(act ? act.integrated : integ.length && !dedicated.length) };
}

/** Nivel del PC: 'low' | 'mid' | 'high'. Con prueba de rendimiento (FPS medio) manda la prueba; si no, la gráfica y la RAM. */
function tier({ ramGb, gpu, benchAvg }) {
  if (benchAvg > 0) return benchAvg < 50 ? 'low' : benchAvg < 110 ? 'mid' : 'high';
  const g = gpu || {};
  if (!g.hasDedicated || ramGb <= 4) return 'low';
  if (ramGb >= 16) return 'high';
  return 'mid';
}
const VIDEO = {
  low: { renderDistance: 8, simulationDistance: 6, graphicsMode: 0, ao: 'false', biomeBlendRadius: 1 },
  mid: { renderDistance: 12, simulationDistance: 10, graphicsMode: 1, ao: 'true', biomeBlendRadius: 3 },
  high: { renderDistance: 16, simulationDistance: 12, graphicsMode: 1, ao: 'true', biomeBlendRadius: 5 },
};
/** Líneas de options.txt para el primer arranque (distancia de renderizado, calidad gráfica y suavizado de luz/biomas). */
const videoFor = t => ({ ...(VIDEO[t] || VIDEO.mid) });

/** RAM recomendada (GB) por número de mods: <30 → 3; 30–100 → 4–6; >100 → 6–8; nunca más de la mitad de la RAM del PC. */
function recommendRam(mods, totalGb) {
  const n = Math.max(0, +mods || 0);
  let r = n < 30 ? 3 : n <= 100 ? 4 + Math.round((n - 30) / 70 * 2) : 6 + Math.min(2, Math.round((n - 100) / 50));
  const cap = Math.max(2, Math.floor((+totalGb || 8) * 0.5));
  return Math.max(2, Math.min(r, cap));
}
/** Compara la RAM asignada con la recomendada: 'high' (muy por encima), 'low' (muy por debajo) o ''. */
function ramVerdict(assigned, rec) {
  if (!(assigned > 0) || !(rec > 0)) return '';
  if (assigned >= rec + 3 && assigned >= rec * 1.6) return 'high';
  if (assigned <= rec - 2) return 'low';
  return '';
}
/** Modo batería: 'auto' (de fábrica) usa el estado real, 'always' siempre, 'never' nunca. */
function batteryOn(mode, onBattery) { return mode === 'always' ? true : mode === 'never' ? false : !!onBattery; }

module.exports = { classifyGpus, tier, videoFor, recommendRam, ramVerdict, batteryOn };
