"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

type TurnstileApi = {
  render: (container: HTMLElement, options: { sitekey: string; action: string; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void }) => string;
  reset: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

type TurnstileWidgetProps = {
  action: string;
  onToken: (token: string) => void;
  resetKey: number;
};

export function TurnstileWidget({ action, onToken, resetKey }: TurnstileWidgetProps) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY;

  const render = useCallback(() => {
    if (!sitekey || !container.current || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(container.current, {
      sitekey,
      action,
      callback: onToken,
      "expired-callback": () => onToken(""),
      "error-callback": () => onToken(""),
    });
  }, [action, onToken, sitekey]);

  useEffect(() => {
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
  }, [resetKey]);

  if (!sitekey) return null;

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={render} />
      <div ref={container} />
    </>
  );
}
