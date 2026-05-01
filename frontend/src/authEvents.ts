/** Fired after local auth is cleared due to 401 so React state can sync. */
export const UNAUTHORIZED_EVENT = "tm:unauthorized";

export function notifyUnauthorized() {
  window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
}
