// @vitest-environment jsdom
import React from 'react';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { StayCheckout } from './StayCheckout';
import { travelRequest } from './travelApi';
import { stayBookingSummary, stayConfirmationDocument } from './stayReservation';
vi.mock('./travelApi', () => ({ travelRequest: vi.fn() }));
const room = {room:1,name:'Double',board:'Breakfast',occupancy:'2 adults',refundable:false,cancellation:'Non-refundable',cancellationDeadline:null,excludedTaxes:[{name:'City tax',amount:'10',currency:'EUR'}]};
const reservation = {provider:'LiteAPI',sandbox:true,hotelId:'lp1',address:'Test street',confirmationCode:null,roomCount:2,rooms:[room,{...room,room:2,name:'Twin'}],guests:[],total:{amount:'450.50',currency:'EUR'},priceSource:'prebook',roomSource:'prebook',paymentStatus:null,terms:'Exact terms'};
const review = {sandbox:true,status:'review',token:'PRIVATE',hotel_name:'Lisbon stay',check_in:'2027-05-12',check_out:'2027-05-17',room_count:2,total:reservation.total,reservation};
const confirmed = {...review,status:'confirmed',booking_id:'TEST-123',reservation:{...reservation,confirmationCode:'HOTEL-123',guests:[{room:1,firstName:'Alex',lastName:'Tester'},{room:2,firstName:'Sam',lastName:'Tester'}],priceSource:'booking'}};
beforeEach(() => { vi.clearAllMocks(); travelRequest.mockReset(); sessionStorage.clear(); }); afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
async function payment() { fireEvent.click(await screen.findByRole('button',{name:'Continue to guests →'})); fireEvent.click(screen.getByRole('button',{name:'Continue to review & pay →'})); }
it('reviews multiple rooms, requires exact consent and saves only after provider confirmation', async () => {
 const notify=vi.fn(); travelRequest.mockResolvedValueOnce(review).mockResolvedValueOnce({...confirmed,status:'pending'}).mockResolvedValueOnce(confirmed);
 render(<StayCheckout planId="p" offerToken="offer" onBookingResult={notify}/>); await payment();
 const book=screen.getByRole('button',{name:'Confirm test booking · €450.50'}); expect(book.disabled).toBe(true);
 fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(book);
 await screen.findByText('Awaiting reservation confirmation.'); expect(notify).not.toHaveBeenCalled();
 expect(travelRequest.mock.calls[1][2]).toEqual({token:'PRIVATE',confirm_mock:true,guests:[{first_name:'Alex',last_name:'Tester'},{first_name:'Sam',last_name:'Tester'}]});
 fireEvent.click(screen.getByRole('button',{name:'Check reservation status'})); await screen.findByText('Your test stay is confirmed.');
 expect(notify).toHaveBeenCalledOnce(); expect(screen.getByText('Room 2: Sam Tester')).toBeTruthy();
 expect(JSON.stringify(sessionStorage)).not.toMatch(/Alex|Tester|email/);
});
it('does not resubmit after timeout; status recovery is the only action', async () => {
 travelRequest.mockResolvedValueOnce(review).mockRejectedValueOnce(new Error('Interrupted')).mockResolvedValueOnce(confirmed);
 render(<StayCheckout planId="p" offerToken="offer"/>); await payment(); fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByRole('button',{name:/Confirm test booking/}));
 await screen.findByText('Interrupted'); expect(screen.queryByRole('button',{name:/Confirm test booking/})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Check reservation status'})); await screen.findByText('Your test stay is confirmed.');
 expect(travelRequest.mock.calls.filter(c=>c[1]==='sandbox/book')).toHaveLength(1);
});
it('clears a timeout error when automatic polling confirms the reservation', async () => {
 travelRequest.mockResolvedValueOnce(review).mockRejectedValueOnce(new Error('Interrupted')).mockResolvedValueOnce(confirmed);
 render(<StayCheckout planId="p" offerToken="offer"/>); await payment();
 vi.useFakeTimers();
 fireEvent.click(screen.getByRole('checkbox'));
 await act(async () => { fireEvent.click(screen.getByRole('button',{name:/Confirm test booking/})); });
 expect(screen.getByRole('alert').textContent).toBe('Interrupted');
 await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
 expect(screen.getByText('Your test stay is confirmed.')).toBeTruthy();
 expect(screen.queryByRole('alert')).toBeNull();
 expect(travelRequest.mock.calls.filter(c=>c[1]==='sandbox/book')).toHaveLength(1);
});
it('keeps an unresolved submission locked and explains the provider support path', async () => {
 travelRequest.mockResolvedValueOnce({...review,status:'not_found'});
 render(<StayCheckout planId="p" recoveryToken="PRIVATE"/>);
 await screen.findByText('Reservation status is unresolved.');
 expect(screen.getByText(/provider support may be needed/)).toBeTruthy();
 expect(screen.queryByText(/provider may still be processing/)).toBeNull();
 expect(screen.queryByRole('button',{name:/Confirm test booking/})).toBeNull();
 expect(screen.getByRole('button',{name:'Check reservation status'})).toBeTruthy();
});
it('delivers a submitted confirmation even after leaving checkout', async () => {
 const notify=vi.fn(); let finish; travelRequest.mockResolvedValueOnce(review).mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));
 const view=render(<StayCheckout planId="p" offerToken="offer" onBookingResult={notify}/>); await payment(); fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByRole('button',{name:/Confirm test booking/}));
 await waitFor(()=>expect(finish).toBeTypeOf('function')); view.unmount(); finish(confirmed);
 await waitFor(()=>expect(notify).toHaveBeenCalledExactlyOnceWith('p',expect.objectContaining({status:'confirmed'})));
});
it('reopens without a token and downloads escaped provider facts and guest names only', async () => {
 const summary=stayBookingSummary({...confirmed,token:'PRIVATE',email:'PRIVATE'});
 render(<StayCheckout planId="p" savedBooking={summary}/>); await screen.findByText('Your test stay is confirmed.'); expect(travelRequest).not.toHaveBeenCalled();
 const html=stayConfirmationDocument({...summary,hotelName:'<script>bad()</script>'}); expect(html).toContain('Alex'); expect(html).toContain('HOTEL-123'); expect(html).toContain('NOT VALID FOR CHECK-IN'); expect(html).not.toContain('PRIVATE'); expect(html).not.toContain('<script>');
});
it('prints all provider terms and restores their previous disclosure state after printing', () => {
 render(<StayCheckout planId="p" savedBooking={stayBookingSummary(confirmed)}/>);
 const details=screen.getByText('Provider terms').closest('details');
 expect(details.open).toBe(false);
 const print=vi.spyOn(window,'print').mockImplementation(() => {
   expect(details.open).toBe(true);
   window.dispatchEvent(new Event('beforeprint'));
   expect(details.open).toBe(true);
 });
 fireEvent.click(screen.getByRole('button',{name:'Print / save as PDF'}));
 expect(print).toHaveBeenCalledOnce();
 expect(details.open).toBe(true);
 window.dispatchEvent(new Event('afterprint'));
 expect(details.open).toBe(false);
 // Browser menu/keyboard printing also preserves an already expanded section.
 details.open=true;
 window.dispatchEvent(new Event('beforeprint'));
 window.dispatchEvent(new Event('afterprint'));
 expect(details.open).toBe(true);
});
it('preserves confirmed names without inventing inconsistent room assignments in the UI or download', () => {
 const summary=stayBookingSummary({...confirmed,reservation:{...confirmed.reservation,guests:[
   {room:null,firstName:'Alex',lastName:'Tester'},
   {room:null,firstName:'Sam',lastName:'Tester'},
 ]}});
 render(<StayCheckout planId="p" savedBooking={summary}/>);
 expect(screen.getByText('Alex Tester · Room assignment not verified')).toBeTruthy();
 expect(screen.getByText('Sam Tester · Room assignment not verified')).toBeTruthy();
 expect(screen.getByText(/LiteAPI returned inconsistent room assignments/)).toBeTruthy();
 expect(screen.queryByText(/Room (null|1|2):/)).toBeNull();
 const html=stayConfirmationDocument(summary);
 expect(html).toContain('Alex Tester · Room assignment not verified');
 expect(html).toContain('Sam Tester · Room assignment not verified');
 expect(html).toContain('LiteAPI returned inconsistent room assignments');
 expect(html).not.toMatch(/Room (null|1|2):/);
});
it('shows legacy records without inventing missing prices or guests', async () => {
 render(<StayCheckout planId="p" savedBooking={{reference:'OLD',hotelName:'Old stay',checkIn:'2027-05-12',checkOut:'2027-05-17'}}/>);
 await screen.findByText('Your test stay is confirmed.'); expect(screen.getByText('Guest names were not returned or saved.')).toBeTruthy(); expect(travelRequest).not.toHaveBeenCalled();
});
it('does not treat prebook failure as a reservation and keeps saved state unchanged', async () => {
 const notify=vi.fn();travelRequest.mockRejectedValue(new Error('This room is unavailable'));
 render(<StayCheckout planId="p" offerToken="offer" onBookingResult={notify}/>);
 await screen.findByText('This stay could not be verified.');expect(notify).not.toHaveBeenCalled();expect(sessionStorage.length).toBe(0);
});
