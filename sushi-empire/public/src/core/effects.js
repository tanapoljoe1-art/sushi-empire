// ── Generic event-effect engine ───────────────────────────────────────────────
// Looks up the currently-active event's declarative data (see the field
// documentation on EVENTS in data.js). Callers read whatever field they need and
// treat a missing field as "no effect" — nothing needs a hardcoded id check.
export function activeEvent(G, EVENTS) {
  return EVENTS.find(e => e.id === G.activeEvent) || null;
}
