import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResearchDraftOffer } from './ResearchDraftOffer';
import { researchOfferProjection } from '../../../plansApi';

afterEach(cleanup);
const offer = { id: 'offer', status: 'available', revision: 4, message_id: 'assistant' };

test('only typed current metadata exposes review and durable deferral actions', async () => {
  const user = userEvent.setup(), review = vi.fn(), defer = vi.fn();
  render(<ResearchDraftOffer offer={offer} current={offer} revision={4} onReview={review} onDefer={defer}/>);
  expect(review).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Review & create draft' }));
  expect(review).toHaveBeenCalledExactlyOnceWith(offer);
  await user.click(screen.getByRole('button', { name: 'Keep researching' }));
  expect(defer).toHaveBeenCalledExactlyOnceWith(offer);
});

test.each(['deferred', 'superseded', 'consumed'])('%s metadata cannot launch an old offer', status => {
  render(<ResearchDraftOffer offer={offer} current={{ ...offer, status }} revision={4}/>);
  expect(screen.queryByRole('button')).toBeNull();
});

test('a changed revision disables historical actions and tells the traveler to review latest details', () => {
  render(<ResearchDraftOffer offer={offer} current={offer} revision={5}/>);
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.getByText(/Your trip details changed/)).toBeTruthy();
});

test('public projection strips model-controlled labels and rejects malformed action types', () => {
  expect(researchOfferProjection({ ...offer, html: '<button>Generate</button>', private_rationale: 'private' })).toEqual(offer);
  expect(researchOfferProjection({ ...offer, status: 'generate' })).toBeNull();
  expect(researchOfferProjection({ ...offer, revision: '4' })).toBeNull();
});
