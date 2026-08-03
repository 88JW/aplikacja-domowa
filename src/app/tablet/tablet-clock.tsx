"use client";

import { useEffect, useState } from "react";

type WakeLockHandle = {
  release: () => Promise<void>;
};

export function TabletClock() {
  const [now, setNow] = useState<Date | null>(null);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  useEffect(() => {
    const firstFrame = window.requestAnimationFrame(() => setNow(new Date()));
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    let wakeLock: WakeLockHandle | null = null;

    const requestWakeLock = async () => {
      if (!("wakeLock" in navigator) || document.visibilityState !== "visible") {
        return;
      }

      try {
        const manager = navigator.wakeLock as unknown as {
          request: (type: "screen") => Promise<WakeLockHandle>;
        };
        wakeLock = await manager.request("screen");
        setWakeLockActive(true);
      } catch {
        setWakeLockActive(false);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void requestWakeLock();
    };

    void requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
      void wakeLock?.release();
    };
  }, []);

  return (
    <div className="tablet-clock">
      <strong>
        {now?.toLocaleTimeString("pl-PL", {
          hour: "2-digit",
          minute: "2-digit",
        }) ?? "--:--"}
      </strong>
      <span>
        {now?.toLocaleDateString("pl-PL", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }) ?? "Ładowanie daty…"}
      </span>
      <small>{wakeLockActive ? "Ekran pozostanie włączony" : "Tryb stałego ekranu"}</small>
    </div>
  );
}
