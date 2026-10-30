import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { registerServiceWorker } from "./lib/serviceWorker";
import { watchThemeColor } from "./lib/themeColor";
import { preloadPages } from "./router";
import "./index.css";

registerServiceWorker();
watchThemeColor();

// Load the remaining pages once the app has settled (Safari has no requestIdleCallback).
const whenIdle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
whenIdle(() => preloadPages());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
