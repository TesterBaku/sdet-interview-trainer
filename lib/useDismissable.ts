"use client";

import { RefObject, useEffect, useRef } from "react";

type DismissableParams = {
  // Whether the disclosure (menu, popover, …) is currently open.
  open: boolean;
  // Called to close the disclosure — on Escape or an outside pointerdown.
  onClose: () => void;
  // Elements considered "inside": a pointerdown outside all of them dismisses.
  // Pass the surface plus its trigger when they are separate elements, or a
  // single wrapper that contains both.
  insideRefs: Array<RefObject<HTMLElement | null>>;
  // Element to return focus to after Escape (usually the trigger).
  focusRef?: RefObject<HTMLElement | null>;
  // Listen for Escape in the capture phase and stop propagation so a nested
  // popover claims the key and only the topmost surface closes.
  captureEscape?: boolean;
};

// Shared disclosure-dismissal behavior for the mobile nav menu and the iOS
// install hint: close on Escape (restoring focus) or on an outside tap.
export function useDismissable({
  open,
  onClose,
  insideRefs,
  focusRef,
  captureEscape = false,
}: DismissableParams) {
  // Read callbacks/refs through a ref so the listeners don't re-subscribe on
  // every render — the effect only depends on `open` and `captureEscape`. The
  // ref is refreshed after each commit; handlers only fire on later user
  // interaction, so they always see the latest values.
  const latest = useRef({ onClose, insideRefs, focusRef });
  useEffect(() => {
    latest.current = { onClose, insideRefs, focusRef };
  });

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (captureEscape) event.stopPropagation();
      latest.current.onClose();
      latest.current.focusRef?.current?.focus();
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      const inside = latest.current.insideRefs.some((ref) => ref.current?.contains(target));
      if (!inside) latest.current.onClose();
    }
    document.addEventListener("keydown", onKeyDown, captureEscape);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown, captureEscape);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, captureEscape]);
}
