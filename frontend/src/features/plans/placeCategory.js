// Google returns these types with place suggestions. Use provider facts rather
// than the search wording or the model's description when creating a new pin.
const foodTypes = new Set([
  'food', 'restaurant', 'cafe', 'bakery', 'bar', 'pub', 'coffee_shop',
  'food_court', 'meal_delivery', 'meal_takeaway',
]);

export function suggestedPlaceCategory(place) {
  return place.types?.some(type => foodTypes.has(type)) ? 'food' : 'activity';
}
