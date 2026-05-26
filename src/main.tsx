import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onRegisteredSW(_, registration) {
      if (!registration) {
        return;
      }

      const checkForUpdate = () => {
        if (!registration.installing) {
          registration.update();
        }
      };

      checkForUpdate();
      window.addEventListener("focus", checkForUpdate);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          checkForUpdate();
        }
      });

      window.setInterval(checkForUpdate, 5 * 60 * 1000);
    },
  });
} else if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister();
      });
    })
    .catch(() => undefined);
}

createRoot(document.getElementById("root")!).render(<App />);
