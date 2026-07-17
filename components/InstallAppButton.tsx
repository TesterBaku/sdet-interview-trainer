"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// The `beforeinstallprompt` event isn't in the standard lib DOM types yet.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS Safari exposes navigator.standalone; everyone else uses the media query.
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const iOS = /iphone|ipad|ipod/i.test(ua) ||
    // iPadOS 13+ masquerades as desktop Safari, so fall back to touch detection.
    (/Macintosh/.test(ua) && window.navigator.maxTouchPoints > 1);
  const webkit = /WebKit/i.test(ua);
  // Chrome/Edge/Firefox on iOS all include their own token; exclude them.
  const notOtherBrowser = !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  return iOS && webkit && notOtherBrowser;
}

// useSyncExternalStore reads these browser facts without a synchronous
// setState-in-effect (which the React lint rule forbids) and without an
// SSR hydration mismatch — the server snapshot is always false.
function subscribeDisplayMode(callback: () => void): () => void {
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}
const noopSubscribe = () => () => {};
const serverSnapshotFalse = () => false;

export function InstallAppButton() {
  const standalone = useSyncExternalStore(subscribeDisplayMode, isStandalone, serverSnapshotFalse);
  const iosEligible = useSyncExternalStore(noopSubscribe, isIosSafari, serverSnapshotFalse);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [justInstalled, setJustInstalled] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const hintRef = useRef<HTMLDivElement>(null);
  const iosButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      // Stash the event so we can trigger the native prompt on a user gesture.
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setJustInstalled(true);
      setPromptEvent(null);
      setShowIosHint(false);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Dismiss the iOS hint popover on Escape or an outside tap.
  useEffect(() => {
    if (!showIosHint) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        // Capture phase + stopPropagation so a single Escape dismisses only this
        // popover, not Navigation's mobile menu when both happen to be open —
        // otherwise both handlers fire and their focus() calls race.
        event.stopPropagation();
        setShowIosHint(false);
        iosButtonRef.current?.focus();
      }
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        hintRef.current &&
        !hintRef.current.contains(target) &&
        !iosButtonRef.current?.contains(target)
      ) {
        setShowIosHint(false);
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [showIosHint]);

  async function handleNativeInstall() {
    if (!promptEvent) return;
    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      // Only drop the deferred event once the user accepts. On dismissal keep
      // the button so Chrome's next `beforeinstallprompt` can re-arm it and the
      // user can retry within the session.
      if (outcome === "accepted") {
        setPromptEvent(null);
      }
    } catch {
      // prompt() rejects if the deferred event is already stale/consumed; clear
      // it so we stop showing a button that can no longer open a dialog.
      setPromptEvent(null);
    }
  }

  if (standalone || justInstalled) return null;

  const pill =
    "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition focus-ring bg-ink text-paper hover:opacity-90";

  const downloadIcon = (
    <svg aria-hidden fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  // Chromium desktop / Android: real native install prompt.
  if (promptEvent) {
    return (
      <button className={pill} onClick={handleNativeInstall} type="button">
        {downloadIcon}
        Install app
      </button>
    );
  }

  // iOS Safari: no automatic prompt, so guide the manual Add-to-Home-Screen flow.
  if (iosEligible) {
    return (
      <div className="relative">
        <button
          aria-expanded={showIosHint}
          className={pill}
          onClick={() => setShowIosHint((value) => !value)}
          ref={iosButtonRef}
          type="button"
        >
          {downloadIcon}
          Install app
        </button>
        {showIosHint && (
          <div
            aria-label="Install on iOS"
            className="absolute right-0 top-full z-30 mt-2 w-64 rounded-2xl border border-ink/10 bg-paper p-4 text-sm text-ink shadow-lg"
            ref={hintRef}
            role="dialog"
          >
            <p className="font-semibold">Add to your Home Screen</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-ink/80">
              <li>
                Tap the <span className="font-semibold">Share</span>{" "}button in Safari&apos;s toolbar.
              </li>
              <li>
                Choose <span className="font-semibold">Add to Home Screen</span>.
              </li>
              <li>
                Tap <span className="font-semibold">Add</span> — the trainer opens like a native app.
              </li>
            </ol>
          </div>
        )}
      </div>
    );
  }

  return null;
}
