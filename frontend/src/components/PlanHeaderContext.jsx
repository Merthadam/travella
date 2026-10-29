import React, { createContext, useContext, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

export const PlanHeaderContext = createContext(null);

// Only the active canvas claims the shell. Domain state stays in its workspace.
export function useFocusedPlanHeader(owner, active) {
  const shell = useContext(PlanHeaderContext);
  const setOwner = shell?.setOwner;
  useLayoutEffect(() => {
    if (!active || !setOwner) return;
    setOwner(owner);
    return () => setOwner(current => current === owner ? null : current);
  }, [owner, active, setOwner]);
}

export function PlanHeaderSlot({ slot, children }) {
  const shell = useContext(PlanHeaderContext);
  if (!shell) return children;
  return shell[slot] ? createPortal(children, shell[slot]) : null;
}
