"use client";

import { useEffect, useState } from "react";

type ReminderTask = {
  id: string;
  icon: string | null;
  name: string;
};

type ReminderSlot = {
  date: string;
  id: "morning" | "afternoon" | "evening";
  label: string;
};

function getWarsawReminderSlot(): ReminderSlot | null {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    month: "2-digit",
    timeZone: "Europe/Warsaw",
    year: "numeric",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const hour = Number(values.hour);
  const date = `${values.year}-${values.month}-${values.day}`;

  if (hour >= 6 && hour < 12) {
    return { date, id: "morning", label: "Dzień dobry!" };
  }

  if (hour >= 12 && hour < 18) {
    return { date, id: "afternoon", label: "Mała przypominajka" };
  }

  if (hour >= 18 && hour <= 23) {
    return { date, id: "evening", label: "Zanim skończy się dzień…" };
  }

  return null;
}

export function DailyReminder({
  profileId,
  profileName,
  tasks,
}: {
  profileId: string;
  profileName: string;
  tasks: ReminderTask[];
}) {
  const [slot, setSlot] = useState<ReminderSlot | null>(null);

  useEffect(() => {
    const refresh = () => {
      const currentSlot = getWarsawReminderSlot();

      if (!currentSlot) {
        return;
      }

      const storageKey = `homeapp-reminder:${profileId}:${currentSlot.date}:${currentSlot.id}`;
      if (localStorage.getItem(storageKey) !== "dismissed") {
        setSlot((visibleSlot) => visibleSlot ?? currentSlot);
      }
    };

    refresh();
    const intervalId = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(intervalId);
  }, [profileId]);

  if (!slot) {
    return null;
  }

  const storageKey = `homeapp-reminder:${profileId}:${slot.date}:${slot.id}`;
  const dismiss = () => {
    localStorage.setItem(storageKey, "dismissed");
    setSlot(null);
  };
  const firstTask = tasks[0];

  return (
    <aside className="daily-reminder" aria-live="polite">
      <button
        aria-label="Zamknij przypomnienie"
        className="daily-reminder-close"
        onClick={dismiss}
        type="button"
      >
        ×
      </button>
      <span className="daily-reminder-icon" aria-hidden="true">
        {firstTask?.icon ?? (tasks.length > 0 ? "✓" : "✨")}
      </span>
      <div>
        <small>{slot.label}</small>
        <strong>
          {tasks.length > 0
            ? `${profileName}, ${tasks.length === 1 ? "czeka 1 zadanie" : `czekają ${tasks.length} zadania`}`
            : "Na dziś wszystko gotowe!"}
        </strong>
        <p>
          {firstTask
            ? `Na początek: ${firstTask.name}`
            : "Możesz zerknąć na plan kolejnych dni."}
        </p>
      </div>
      <a
        className="daily-reminder-action"
        href={tasks.length > 0 ? "#today-tasks" : "/app/plan"}
        onClick={dismiss}
      >
        {tasks.length > 0 ? "Pokaż" : "Plan"}
      </a>
    </aside>
  );
}
