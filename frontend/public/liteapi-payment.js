// The HTML removes provider query parameters before loading this callback.
// Only a locally recorded, short-lived checkout route can be resumed.
(() => {
  let route = '/plans';
  try {
    const saved = JSON.parse(sessionStorage.getItem('travella:payment-return'));
    if (saved?.expires > Date.now() && /^\/plans\/[0-9a-f-]{36}\?checkout=(flights|stays)$/.test(saved.route)) route = saved.route;
    sessionStorage.removeItem('travella:payment-return');
  } catch { /* Fall back to the Plans list. */ }
  location.replace(route);
})();
