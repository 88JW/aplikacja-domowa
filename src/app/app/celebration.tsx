"use client";

import { useEffect, useState } from "react";

type CelebrationData = {
  title: string;
  message: string;
  achievement?: boolean;
};

export function Celebration() {
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);

  useEffect(() => {
    const rawCookie = document.cookie
      .split("; ")
      .find((item) => item.startsWith("homeapp-celebration="))
      ?.split("=")
      .slice(1)
      .join("=");

    if (!rawCookie) return;

    let parsed: CelebrationData | null = null;
    try {
      parsed = JSON.parse(decodeURIComponent(rawCookie));
    } catch {}

    document.cookie =
      "homeapp-celebration=; Max-Age=0; Path=/; SameSite=Lax";
    let timeout: number | undefined;
    const frame = window.requestAnimationFrame(() => {
      setCelebration(parsed);
      timeout = window.setTimeout(() => setCelebration(null), 3200);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      if (timeout) window.clearTimeout(timeout);
    };
  }, []);

  if (!celebration) return null;

  return (
    <div className="celebration-layer" role="status" onClick={() => setCelebration(null)}>
      <div className="celebration-confetti" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => (
          <i key={index} />
        ))}
      </div>
      <article
        className={`celebration-card ${celebration.achievement ? "celebration-achievement" : ""}`}
      >
        <span aria-hidden="true">✨</span>
        <strong>{celebration.title}</strong>
        <p>{celebration.message}</p>
        <small>Dotknij, aby zamknąć</small>
      </article>
    </div>
  );
}
