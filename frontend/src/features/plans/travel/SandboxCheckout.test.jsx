// @vitest-environment jsdom
import React from 'react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { SandboxCheckout } from './SandboxCheckout';
import { travelRequest } from './travelApi';
vi.mock('./travelApi', () => ({ travelRequest: vi.fn() }));
const review = { sandbox: true, status: 'review', token: 'opaque', hotel_name: 'Ski stay', check_in: '2027-02-03', check_out: '2027-02-07', room_count: 1, total: {amount:'150',currency:'EUR'}, room: {name:'Double',board_name:'Breakfast',excluded_taxes:[],cancellation_summary:'Non-refundable'} };
beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); });
afterEach(cleanup);
describe('sandbox checkout', () => {
 it('requires explicit consent, shows refreshed terms and only confirms from provider', async () => {
  const onBookingResult = vi.fn();
  travelRequest.mockResolvedValueOnce(review).mockResolvedValueOnce({...review,status:'confirmed',booking_id:'TEST123'});
  render(<SandboxCheckout planId="p1" offerToken="offer" onClose={() => {}} onBookingResult={onBookingResult} />);
  await screen.findByText('Ski stay');
  expect(screen.getByText('Non-refundable')).toBeTruthy();
  expect(screen.getByRole('button',{name:'Confirm mock booking'}).disabled).toBe(true);
  expect(onBookingResult).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button',{name:'Confirm mock booking'}));
  await screen.findByText('Mock booking confirmed');
  expect(onBookingResult).toHaveBeenCalledWith('p1', expect.objectContaining({ status: 'confirmed', booking_id: 'TEST123' }));
  expect(travelRequest.mock.calls[1][1]).toBe('sandbox/book');
  expect(travelRequest.mock.calls[1][2].confirm_mock).toBe(true);
  expect(sessionStorage.getItem('travella:mock-checkout:p1')).toBe('opaque');
  expect(sessionStorage.getItem('travella:mock-checkout:p1')).not.toContain('Alex');
 });
 it('lost response never shows success, status recovery does not resubmit', async () => {
  const onBookingResult = vi.fn();
  travelRequest.mockResolvedValueOnce(review).mockRejectedValueOnce(new Error('Could not verify')).mockResolvedValueOnce({...review,status:'confirmed',booking_id:'TEST123'});
  render(<SandboxCheckout planId="p1" offerToken="offer" onClose={() => {}} onBookingResult={onBookingResult} />);
  await screen.findByText('Ski stay'); fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button',{name:'Confirm mock booking'}));
  await screen.findByRole('alert');
  expect(screen.queryByText('Mock booking confirmed')).toBeNull();
  expect(onBookingResult).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Check mock booking status'}));
  await screen.findByText('Mock booking confirmed');
  expect(onBookingResult).toHaveBeenCalledOnce();
  expect(travelRequest.mock.calls.map(c => c[1])).toEqual(['sandbox/prebook','sandbox/book','sandbox/status']);
 });
 it('recovered confirmation notifies the canvas once, even after repeated status checks', async () => {
  const onBookingResult = vi.fn();
  travelRequest.mockResolvedValue({...review,status:'confirmed',booking_id:'TEST123'});
  render(<SandboxCheckout planId="p1" recoveryToken="saved" onClose={() => {}} onBookingResult={onBookingResult} />);
  await screen.findByText('Mock booking confirmed');
  expect(onBookingResult).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button',{name:'Check mock booking status'}));
  await waitFor(() => expect(travelRequest).toHaveBeenCalledTimes(2));
  expect(onBookingResult).toHaveBeenCalledOnce();
  expect(travelRequest.mock.calls.every(c => c[1] === 'sandbox/status')).toBe(true);
 });
 it('reopens via read-only status and displays expired offer failure', async () => {
  travelRequest.mockRejectedValueOnce(new Error('This offer expired.'));
  render(<SandboxCheckout planId="p1" recoveryToken="saved" onClose={() => {}} />);
  await screen.findByRole('alert');
  expect(travelRequest).toHaveBeenCalledWith('p1','sandbox/status',{token:'saved'});
  expect(screen.queryByRole('button',{name:'Confirm mock booking'})).toBeNull();
 });
});
