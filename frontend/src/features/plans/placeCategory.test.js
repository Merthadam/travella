import { expect, test } from 'vitest';
import { suggestedPlaceCategory } from './placeCategory';

test.each(['food', 'restaurant', 'cafe', 'bakery', 'bar', 'pub', 'coffee_shop', 'food_court', 'meal_delivery', 'meal_takeaway'])('recognizes provider food type %s even after generic types', type => {
  expect(suggestedPlaceCategory({ types: ['point_of_interest', 'establishment', type] })).toBe('food');
});

test.each([['museum'], ['park', 'tourist_attraction'], [], undefined])('keeps non-food or missing types as activities: %s', types => {
  expect(suggestedPlaceCategory({ types, name: 'Cafe Museum', reason: 'Near a restaurant' })).toBe('activity');
});
