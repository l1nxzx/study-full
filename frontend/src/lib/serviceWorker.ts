import { registerSW } from "virtual:pwa-register";

// The service worker keeps the app itself on the phone, so it opens without the network.
// A new deploy downloads in the background. If it arrives while the app is still starting up
// it is applied straight away; later than that it waits for the next launch, so a reload never
// throws away something you are in the middle of (notes save explicitly).
const APPLY_WINDOW_MS = 4000;
const startedAt = performance.now();

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  const updateSW = registerSW({
    onNeedRefresh() {
      if (performance.now() - startedAt < APPLY_WINDOW_MS) void updateSW(true);
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Coming back to the app is when a phone user expects it to be current.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") void registration.update().catch(() => {});
      });
    },
  });
}
