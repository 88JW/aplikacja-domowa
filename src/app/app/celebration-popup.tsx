"use client";

import { useEffect, useRef, useState } from "react";

type CelebrationData = {
  title: string;
  message: string;
  detail?: string;
  achievement?: boolean;
  achievementMessage?: string;
};

function parseCelebration(value?: string): CelebrationData | null {
  if (!value) return null;
  try {
    const data = JSON.parse(decodeURIComponent(value));
    return typeof data?.title === "string" && typeof data?.message === "string"
      ? data
      : null;
  } catch {
    return null;
  }
}

export function CelebrationPopup({ value }: { value?: string }) {
  const [celebration, setCelebration] = useState(() => parseCelebration(value));
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!celebration) return;
    document.cookie = "homeapp-celebration=; Max-Age=0; Path=/; SameSite=Lax";
    const previousFocus = document.activeElement;
    closeButton.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setCelebration(null);
      if (event.key === "Tab") {
        event.preventDefault();
        closeButton.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, [celebration]);

  if (!celebration) return null;

  return (
    <div className="celebration-layer" onClick={() => setCelebration(null)}>
      <div className="celebration-confetti" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => (
          <i key={index} />
        ))}
      </div>
      <article
        role="dialog"
        aria-modal="true"
        aria-labelledby="celebration-title"
        aria-describedby="celebration-message"
        onClick={(event) => event.stopPropagation()}
        className={`celebration-card ${celebration.achievement ? "celebration-achievement" : ""}`}
      >
        <span aria-hidden="true">🎉</span>
        <strong id="celebration-title">{celebration.title}</strong>
        <p id="celebration-message">{celebration.message}</p>
        {celebration.detail && <small>{celebration.detail}</small>}
        {celebration.achievementMessage && <p>{celebration.achievementMessage}</p>}
        <button ref={closeButton} className="primary-button" type="button" onClick={() => setCelebration(null)}>
          Super!
        </button>
      </article>
    </div>
  );
}
