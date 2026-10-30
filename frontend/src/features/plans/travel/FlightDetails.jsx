import React from "react";
import { Leg, Price, refund } from "./TravelPresentation";
import { TravelDetailsDialog, offerExpired } from "./TravelDetailsDialog";

export function FlightDetails({ observation, detached, checkoutToken, booked, onClose, onRefresh, onDiscuss, onChoose, onCheckout }) {
  const { item, snapshot } = observation;
  const { sandbox } = snapshot;
  const evidenceExpired = offerExpired(snapshot.expires_at);
  const attach = () => ({ title: item.airlines.join(' / '), reference: { search_id: snapshot.search_id, option_id: item.id, room_id: null } });
  return (
    <TravelDetailsDialog observation={observation} detached={detached} evidenceExpired={evidenceExpired} onClose={onClose}>
      <Leg leg={item.outbound} label="Outbound" expanded />
      <Leg leg={item.inbound} label="Return" expanded />
      <p>All times are local to each airport.</p>
      <h3>Baggage & fare conditions</h3>
      <p>{item.baggage_summary || "Baggage allowance not supplied."}</p>
      <p>{refund(item.refundable)}</p>
      <p>
        {item.cancellation_summary ||
          "Detailed fare conditions not supplied."}
      </p>
      <Price price={item.price} />
      {!evidenceExpired && snapshot.search_id && <div className="travel-option-actions">{onDiscuss && <button type="button" onClick={() => { onClose(); onDiscuss(attach()); }}>Discuss flight</button>}{onChoose && <button type="button" onClick={() => { onClose(); onChoose(attach()); }}>Choose for trip</button>}</div>}
      {sandbox && checkoutToken && !evidenceExpired && <button className="travel-primary" disabled={booked || !onCheckout} onClick={() => onCheckout({ offerToken: checkoutToken })}>{booked ? "A flight is already booked in this Plan" : "Continue to flight checkout"}</button>}
      {!checkoutToken && <button className="travel-primary" onClick={onRefresh}>Search again to check current availability</button>}
    </TravelDetailsDialog>
  );
}
