import { registerSW } from "virtual:pwa-register";

// The service worker keeps the app itself on the phone, so it opens without the network.
// A new deploy downloads in the background. If it arrives while the app is still starting up
// it is applied straight away; later than that it waits for the next launch or a pull to
// refresh, so a reload never throws away something you are in the middle of.
const APPLY_WINDOW_MS = 4000;
const startedAt = performance.now();
let current: ServiceWorkerRegistration | undefined;
let applyUpdate: ((reload?: boolean) => Promise<void>) | undefined;
let updateWaiting = false;

/** Asks for a newer deploy now (pull to refresh, coming back to the app). */
export function checkForUpdate(): Promise<void> {
  return current?.update().then(() => {}, () => {}) ?? Promise.resolve();
}

/** Reloads into a downloaded new version, if there is one. */
export function applyWaitingUpdate(): boolean {
  if (!updateWaiting || !applyUpdate) return false;
  void applyUpdate(true);
  return true;
}

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  applyUpdate = registerSW({
    onNeedRefresh() {
      updateWaiting = true;
      if (performance.now() - startedAt < APPLY_WINDOW_MS) applyWaitingUpdate();
    },
    onRegisteredSW(_url, registration) {
      current = registration;
      // Coming back to the app is when a phone user expects it to be current.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") void checkForUpdate();
      });
    },
  });
}
