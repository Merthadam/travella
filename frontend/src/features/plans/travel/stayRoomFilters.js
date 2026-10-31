const mealLabels = {
  room: new Set(['room only', 'roomonly', 'ro']),
  breakfast: new Set(['breakfast', 'breakfast included', 'bed and breakfast', 'bed & breakfast', 'bb', 'b&b']),
};

function matchesMeal(board, meal) {
  if (meal === 'all') return true;
  // Multi-room offers can contain several board labels. Every supplied label must match.
  const labels = String(board || '').toLowerCase().split('/').map(label => label.trim().replace(/\s+/g, ' '));
  return labels.every(label => mealLabels[meal]?.has(label));
}

function amount(value, currency) {
  if (value?.currency !== currency || value?.amount == null || String(value.amount).trim() === '') return null;
  const number = Number(value.amount);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function totalPrice(room, currency) {
  let total = amount(room.total, currency);
  if (total === null) return Infinity;
  for (const tax of room.excluded_taxes || []) {
    const extra = amount(tax, currency);
    if (extra === null) return Infinity;
    total += extra;
  }
  return Number.isFinite(total) ? total : Infinity;
}

export function filterStayRooms(rooms, { meal = 'all', cancellation = 'all', sort = 'price', currency }) {
  const filtered = rooms.filter(room => matchesMeal(room.board_name, meal) && (cancellation === 'all' || room.refundable === true));
  if (sort === 'price') filtered.sort((a, b) => totalPrice(a, currency) - totalPrice(b, currency));
  return filtered;
}
