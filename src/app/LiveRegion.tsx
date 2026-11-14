import { useEffect, useRef, useState } from "react";
import { useTreasury } from "@/store/useTreasury";

const MIN_GAP_MS = 10_000;

/** The single polite live region. Only new high or critical findings, at most once every 10 seconds. */
export function LiveRegion() {
  const announcement = useTreasury((s) => s.announcement);
  const [text, setText] = useState("");
  const last = useRef(0);
  const timer = useRef<number>();

  useEffect(() => {
    if (!announcement) return;
    const wait = Math.max(0, last.current + MIN_GAP_MS - Date.now());
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      last.current = Date.now();
      setText(announcement.text);
    }, wait);
    return () => window.clearTimeout(timer.current);
  }, [announcement]);

  return (
    <div aria-live="polite" className="sr-only" role="status">
      {text}
    </div>
  );
}
