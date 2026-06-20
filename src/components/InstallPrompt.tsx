"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

/**
 * iOS Safari has no `beforeinstallprompt` and no programmatic install, so the
 * only way users can install is the manual "Share -> Add to Home Screen" flow.
 * This component surfaces that hint on iOS when the app is not already installed
 * (display-mode: standalone). On Android/Chromium it captures
 * `beforeinstallprompt` and offers a one-tap install instead.
 */
export function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(window.navigator.userAgent));
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches,
    );

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Already installed: nothing to prompt.
  if (isStandalone) return null;

  if (isIOS) {
    return (
      <aside role="note" aria-label="Install instructions">
        Install Famealy: tap Share, then “Add to Home Screen”.
      </aside>
    );
  }

  if (deferredPrompt) {
    return (
      <button
        type="button"
        onClick={() => {
          void deferredPrompt.prompt();
          setDeferredPrompt(null);
        }}
      >
        Install Famealy
      </button>
    );
  }

  return null;
}
