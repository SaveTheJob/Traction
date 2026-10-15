/** Product-wide constants. Project-specific values come from .env.local so moving to a new
 * Firebase project is a config change (see docs/owner-checklist.md). */
export const APP_NAME = "Offerward";
export const APP_URL: string = import.meta.env.VITE_APP_URL ?? "https://traction-37.web.app";
export const CONTACT_EMAIL: string = import.meta.env.VITE_CONTACT_EMAIL ?? "contact@yugthapar.com";
/** Chrome Web Store listing; empty until published under the new name. */
export const EXTENSION_URL: string = import.meta.env.VITE_EXTENSION_URL ?? "";
