const SCRIPT_ID = 'travella-google-maps';
const CALLBACK_NAME = '__travellaGoogleMapsLoaded';
let loadPromise;

export function getGoogleMapsApiKey() {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  if (!key || key === 'VITE_GOOGLE_MAPS_API_KEY' || key.includes('replace-with')) return '';
  return key;
}

function loadScript(apiKey) {
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google.maps);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);
    const script = existing || document.createElement('script');
    const insertedByLoader = !existing;
    let settled = false;
    const finish = (error, maps) => {
      if (settled) return;
      settled = true;
      delete window[CALLBACK_NAME];
      if (error) reject(error);
      else resolve(maps);
    };
    window[CALLBACK_NAME] = () => {
      const maps = window.google?.maps;
      if (maps?.importLibrary) finish(null, maps);
      else finish(new Error('Google Maps loaded without its importLibrary API.'));
    };
    const onLoad = () => {
      const maps = window.google?.maps;
      if (!insertedByLoader && maps?.importLibrary) finish(null, maps);
    };
    const onError = () => finish(new Error('Google Maps could not be loaded.'));

    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });
    if (!existing) {
      script.id = SCRIPT_ID;
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async&callback=${CALLBACK_NAME}`;
      document.head.appendChild(script);
    }
  }).catch(error => {
    const failedScript = document.getElementById(SCRIPT_ID);
    if (failedScript && !window.google?.maps?.importLibrary) failedScript.remove();
    loadPromise = undefined;
    throw error;
  });

  return loadPromise;
}

export async function loadGoogleMaps({ libraries = [], apiKey = getGoogleMapsApiKey() } = {}) {
  if (!apiKey) throw new Error('Google Maps is not configured.');
  const maps = await loadScript(apiKey);
  const loaded = {};
  for (const library of new Set(libraries)) {
    loaded[library] = await maps.importLibrary(library);
  }
  return { maps, libraries: loaded };
}
