// Browser-tab view preferences only. Durable plan content is owned by the CRUD API.
const prefix = 'travella.canvas-view.v1:';
const fallback = new Map();
export function readCanvasView(key) {
  if (!key) return {};
  try {
    const value = JSON.parse(sessionStorage.getItem(prefix + key) || 'null');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return fallback.get(key) || {}; }
}
export function writeCanvasView(key, patch) {
  if (!key) return;
  const value = { ...readCanvasView(key), ...patch };
  fallback.set(key, value);
  if (fallback.size > 60) fallback.delete(fallback.keys().next().value);
  try {
    sessionStorage.setItem(prefix + key, JSON.stringify(value));
    const keys = Object.keys(sessionStorage).filter(item => item.startsWith(prefix));
    if (keys.length > 60) sessionStorage.removeItem(keys.find(item => item !== prefix + key));
  } catch { /* View still works with storage disabled. */ }
}
export function clearCanvasViews() {
  fallback.clear();
  try { Object.keys(sessionStorage).filter(key => key.startsWith(prefix)).forEach(key => sessionStorage.removeItem(key)); } catch { /* Storage may be disabled. */ }
}
export function validViewport(value) {
  return value && Number.isFinite(value.center?.lat) && Math.abs(value.center.lat) <= 90 &&
    Number.isFinite(value.center?.lng) && Math.abs(value.center.lng) <= 180 &&
    Number.isFinite(value.zoom) && value.zoom >= 0 && value.zoom <= 24;
}

export function forgetCanvasView(key) {
  fallback.delete(key);
  try { sessionStorage.removeItem(prefix + key); } catch { /* Storage may be disabled. */ }
}
