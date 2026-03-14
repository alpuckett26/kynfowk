"use client";

import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type StandaloneNavigator = Navigator & {
  standalone?: boolean;
};

const DISMISS_KEY = "kynfowk-install-dismissed-at";
const DISMISS_FOR_MS = 1000 * 60 * 60 * 24 * 7;

function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as StandaloneNavigator).standalone)
  );
}

export function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [installed, setInstalled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const dismissedAt = window.localStorage.getItem(DISMISS_KEY);
    const isDismissedRecently =
      dismissedAt && Date.now() - Number(dismissedAt) < DISMISS_FOR_MS;

    setDismissed(Boolean(isDismissedRecently));
    setInstalled(isStandaloneMode());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      setMessage(null);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setMessage("Kynfowk is installed. Your Family Circle is now one tap away.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const shouldShow = useMemo(
    () => Boolean(promptEvent) && !dismissed && !installed,
    [dismissed, installed, promptEvent]
  );

  async function install() {
    if (!promptEvent) {
      return;
    }

    await promptEvent.prompt();
    const result = await promptEvent.userChoice;

    if (result.outcome === "accepted") {
      setMessage("Kynfowk is heading to your home screen.");
      setPromptEvent(null);
      return;
    }

    dismiss();
  }

  function dismiss() {
    const timestamp = String(Date.now());
    window.localStorage.setItem(DISMISS_KEY, timestamp);
    setDismissed(true);
  }

  if (installed) {
    return message ? <div className="install-toast">{message}</div> : null;
  }

  if (!shouldShow) {
    return null;
  }

  return (
    <aside className="install-card" aria-live="polite">
      <div className="stack-sm">
        <p className="install-eyebrow">Install Kynfowk</p>
        <p className="install-title">Keep your Family Circle one tap away.</p>
        <p className="meta">
          Add Kynfowk to your home screen for a calmer, app-like way to catch reminders,
          join calls, and check what is next.
        </p>
      </div>
      <div className="call-actions">
        <button className="button" onClick={install} type="button">
          Add to home screen
        </button>
        <button className="button button-secondary" onClick={dismiss} type="button">
          Maybe later
        </button>
      </div>
    </aside>
  );
}
