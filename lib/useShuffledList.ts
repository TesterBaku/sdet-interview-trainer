"use client";

import { useState } from "react";
import { shuffleArray } from "@/lib/questionUtils";

export function useShuffledList<T>(source: T[]) {
  const [list, setList] = useState(() => [...source]);
  const [shuffled, setShuffled] = useState(false);

  function toggle(onReset?: () => void) {
    const next = !shuffled;
    setList(next ? shuffleArray(source) : [...source]);
    setShuffled(next);
    onReset?.();
  }

  return { list, shuffled, toggle };
}
