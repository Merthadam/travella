// @vitest-environment jsdom
import React from 'react';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { FlightSandboxCheckout } from './FlightSandboxCheckout';
import { travelRequest } from './travelApi';
vi.mock('./travelApi', () => ({ travelRequest: vi.fn() }));
const segment = { origin:'BUD', destination:'FCO', departure_at:'2027-02-03T10:00:00', arrival_at:'2027-02-03T12:00:00', flight_number:'ND123' };
const review = { sandbox:true, mode:'flights', status:'review', token:'opaque-review', passenger_count:1, flight:{ airlines:['Nuitée Air'], price:{amount:'150',currency:'EUR'}, outbound:{segments:[segment]}, inbound:{segments:[{...segment,origin:'FCO',destination:'BUD',departure_at:'2027-02-07T10:00:00'}]} } };
beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); });
afterEach(cleanup);
it('requires consent before prebook and repriced completion, then waits for actual confirmation', async () => {
 const notify = vi.fn();
 travelRequest.mockResolvedValueOnce(review).mockResolvedValueOnce({...review,status:'ready_to_book',token:'prebook',flight:{...review.flight,price:{amount:'175',currency:'EUR'}}}).mockResolvedValueOnce({...review,status:'pending',token:'booked',booking_id:'TEST'}).mockResolvedValueOnce({...review,status:'confirmed',token:'booked',booking_id:'TEST'});
 render(<FlightSandboxCheckout planId="p" offerToken="offer" onBookingResult={notify} />);
 await screen.findByText('BUD ↔ FCO');
 expect(screen.getByRole('button',{name:'Start mock flight reservation'}).disabled).toBe(true);
 expect(travelRequest.mock.calls.map(c=>c[1])).toEqual(['sandbox/flights/verify']);
 fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Start mock flight reservation'}));
 await screen.findByText('€175.00');
 expect(screen.getByRole('button',{name:'Confirm mock flight booking'}).disabled).toBe(true);
 fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Confirm mock flight booking'}));
 await screen.findByText(/LiteAPI is still confirming/);
 expect(notify).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Check mock flight status'}));
 await screen.findByText('Mock flight booking confirmed');
 expect(notify).toHaveBeenCalledWith('p',expect.objectContaining({mode:'flights',status:'confirmed',booking_id:'TEST'}));
 expect(travelRequest.mock.calls.map(c=>c[1])).toEqual(['sandbox/flights/verify','sandbox/flights/prebook','sandbox/flights/book','sandbox/flights/status']);
 expect(sessionStorage.getItem('travella:mock-flight:p')).toBe('booked');
});
it('a lost prebook response exposes status recovery without repeating prebook', async () => {
 travelRequest.mockResolvedValueOnce(review).mockRejectedValueOnce(new Error('Unable to verify')).mockResolvedValueOnce({...review,status:'unknown'});
 const notify=vi.fn();render(<FlightSandboxCheckout planId="p" offerToken="offer" onBookingResult={notify} />);
 await screen.findByText('BUD ↔ FCO');fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Start mock flight reservation'}));
 await screen.findByRole('alert');expect(screen.queryByRole('button',{name:'Start mock flight reservation'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Check mock flight status'}));
 await screen.findByText(/We cannot verify this checkout yet/);expect(notify).not.toHaveBeenCalled();
 expect(travelRequest.mock.calls.filter(c=>c[1]==='sandbox/flights/prebook')).toHaveLength(1);
});
it('recovery reads provider status and notifies the canvas only once', async () => {
 const notify=vi.fn();travelRequest.mockResolvedValue({...review,status:'confirmed',booking_id:'TEST'});
 render(<FlightSandboxCheckout planId="p" recoveryToken="saved" onBookingResult={notify} />);
 await screen.findByText('Mock flight booking confirmed');fireEvent.click(screen.getByRole('button',{name:'Check mock flight status'}));
 await waitFor(()=>expect(travelRequest).toHaveBeenCalledTimes(2));expect(notify).toHaveBeenCalledOnce();
 expect(travelRequest.mock.calls.every(c=>c[1]==='sandbox/flights/status')).toBe(true);
});
it('automatically checks a pending reservation and updates after confirmation', async () => {
 const notify=vi.fn();travelRequest.mockResolvedValueOnce({...review,status:'pending',token:'booked',booking_id:'TEST'}).mockResolvedValueOnce({...review,status:'confirmed',token:'booked',booking_id:'TEST'});
 render(<FlightSandboxCheckout planId="p" recoveryToken="saved" onBookingResult={notify} />);
 await screen.findByText(/LiteAPI is still confirming/);
 await screen.findByText('Mock flight booking confirmed',{}, {timeout:6500});
 expect(notify).toHaveBeenCalledOnce();expect(travelRequest.mock.calls.every(c=>c[1]==='sandbox/flights/status')).toBe(true);
}, 8000);

it('delivers a submitted booking result to the Plan after the checkout dialog closes', async () => {
 const notify=vi.fn(); let finish;
 travelRequest.mockResolvedValueOnce({...review,status:'ready_to_book'}).mockReturnValueOnce(new Promise(resolve => { finish=resolve; }));
 const view=render(<FlightSandboxCheckout planId="p" recoveryToken="receipt" onBookingResult={notify} />);
 await screen.findByRole('button',{name:'Confirm mock flight booking'});
 fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Confirm mock flight booking'}));
 await waitFor(()=>expect(finish).toBeTypeOf('function'));
 view.unmount();
 finish({...review,status:'confirmed',token:'booked',booking_id:'TEST'});
 await waitFor(()=>expect(notify).toHaveBeenCalledExactlyOnceWith('p',expect.objectContaining({status:'confirmed',booking_id:'TEST'})));
 expect(sessionStorage.getItem('travella:mock-flight:p')).toBe('booked');
});
