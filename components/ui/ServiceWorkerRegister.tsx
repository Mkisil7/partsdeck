"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }

    let refreshing = false;
    // When the active worker changes (a new deploy took over), reload once so
    // the user immediately sees the latest version instead of stale cache.
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    let registration: ServiceWorkerRegistration | undefined;

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          registration = reg;

          // A new worker was found — once it's installed and there's already
          // a controller, a redeploy is waiting. Tell it to activate now.
          reg.addEventListener("updatefound", () => {
            const installing = reg.installing;
            if (!installing) return;
            installing.addEventListener("statechange", () => {
              if (
                installing.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                installing.postMessage("SKIP_WAITING");
              }
            });
          });
        })
        .catch(() => {
          /* registration failures are non-fatal */
        });
    };
    window.addEventListener("load", onLoad);

    // Check for a new deploy whenever the app regains focus (e.g. you reopen
    // the PWA in the field), not just on a cold start.
    const onFocus = () => registration?.update().catch(() => {});
    window.addEventListener("focus", onFocus);

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
      window.removeEventListener("load", onLoad);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return null;
}
