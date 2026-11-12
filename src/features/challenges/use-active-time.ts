"use client";

import { useCallback, useEffect, useRef } from "react";
import { ActiveTimeMeter } from "@/domain/active-time";

const attending = () => document.visibilityState === "visible" && document.hasFocus();

/**
 * Measures active time on the current challenge (see ActiveTimeMeter).
 * Returns take(): active ms since the previous take() or since the page opened.
 */
export function useActiveTime() {
  const meter = useRef<ActiveTimeMeter | null>(null);

  useEffect(() => {
    meter.current = new ActiveTimeMeter(performance.now());
    const onInput = () => meter.current?.input(performance.now(), attending());
    const onTick = () => meter.current?.tick(performance.now(), attending());
    const events = ["keydown", "pointerdown", "pointermove", "wheel", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, onInput, { passive: true, capture: true }));
    document.addEventListener("visibilitychange", onTick);
    const timer = window.setInterval(onTick, 1_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, onInput, { capture: true }));
      document.removeEventListener("visibilitychange", onTick);
      window.clearInterval(timer);
    };
  }, []);

  return useCallback(() => meter.current?.take(performance.now(), attending()) ?? 0, []);
}
