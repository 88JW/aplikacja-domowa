"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Countdown = { id: string; name: string; nextAt: string; previousAt: string; slot: "morning" | "evening" };
export function PetCountdowns({ items, initialTime }: { items: Countdown[]; initialTime: number }) {
  const [now, setNow] = useState(initialTime);
  const router = useRouter();
  const nextDeadline = Math.min(...items.map(item => new Date(item.nextAt).getTime()));
  useEffect(() => {
    const timer = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (currentTime >= nextDeadline) router.refresh();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [nextDeadline, router]);
  if (!items.length) return null;
  return <><div className="section-heading"><h2>Czas dla zwierzaków</h2><span>Spacer i kuweta</span></div>
    <section className="watering-grid">{items.map(item => {
      const next = new Date(item.nextAt).getTime();
      const previous = new Date(item.previousAt).getTime();
      const remaining = Math.max(0, Math.ceil((next - now) / 60_000));
      const hours = Math.floor(remaining / 60);
      const minutes = remaining % 60;
      const progress = Math.max(0, Math.min(100, (now - previous) * 100 / (next - previous)));
      return <article className={remaining === 0 ? "watering-due" : ""} key={item.id}>
        <div className="watering-title"><span aria-hidden="true">{item.name.toLocaleLowerCase("pl-PL").includes("spacer") ? "🐕" : "🐈"}</span><div><strong>{item.name}</strong><small>Najbliższa pora: {item.slot === "morning" ? "7:00" : "18:00"}</small></div></div>
        <div className="watering-progress" aria-label={`Upłynęło ${Math.round(progress)}% czasu`}><i style={{ width: `${progress}%` }} /></div>
        <div className="watering-footer"><strong>{remaining === 0 ? "Czas na zadanie" : `Pozostało ${hours} godz. ${minutes} min`}</strong></div>
      </article>;
    })}</section></>;
}
