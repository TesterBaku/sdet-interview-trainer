"use client";

import { RefObject, useEffect } from "react";

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
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (captureEscape) event.stopPropagation();
      onClose();
      focusRef?.current?.focus();
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      // Only dismiss once at least one surface is mounted (a null-ref set means
      // there's nothing to be "outside" of yet) and the tap missed all of them.
      const mounted = insideRefs.filter((ref) => ref.current);
      if (mounted.length === 0) return;
      if (!mounted.some((ref) => ref.current!.contains(target))) onClose();
    }
    document.addEventListener("keydown", onKeyDown, captureEscape);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown, captureEscape);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, onClose, insideRefs, focusRef, captureEscape]);
}
