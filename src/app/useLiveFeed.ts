import { useEffect } from "react";
import { useTreasury } from "@/store/useTreasury";

/** Drives the simulator once a real second. Speed and pause live in the store. */
export function useLiveFeed() {
  const tick = useTreasury((s) => s.tick);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") tick();
    }, 1000);
    return () => window.clearInterval(id);
  }, [tick]);
}
