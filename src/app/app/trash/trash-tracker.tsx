"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { WasteCollectionDay } from "@/lib/waste";
import { removeWasteCollection, setWasteCollection, toggleWasteBag } from "./actions";

type Props = {
  month: string;
  markedBags: number[];
  collections: WasteCollectionDay[];
};

const monthFormatter = new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" });
const weekdayFormatter = new Intl.DateTimeFormat("pl-PL", { weekday: "short" });

function parseMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1);
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthHref(date: Date) {
  return `/app/trash?month=${formatDate(date).slice(0, 7)}`;
}

export function TrashTracker({ month, markedBags, collections }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const currentMonth = parseMonth(month);
  const collectionByDate = useMemo(
    () => new Map(collections.map((item) => [item.date, item.kind])),
    [collections],
  );
  const startOffset = (currentMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const previous = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  const selectedKind = selectedDate ? collectionByDate.get(selectedDate) : undefined;

  return (
    <>
      <section className="waste-bags" aria-label="Worki wystawione w tym miesiącu">
        <div className="section-heading">
          <div>
            <h2>Worki na śmieci</h2>
            <span>{markedBags.length} z 8 wystawionych</span>
          </div>
          <strong>{monthFormatter.format(currentMonth)}</strong>
        </div>
        <p className="form-hint">Dotknij worek po wystawieniu. Czerwony krzyżyk oznacza, że już czeka na odbiór.</p>
        <div className="waste-bag-grid">
          {Array.from({ length: 8 }, (_, index) => {
            const bag = index + 1;
            const isMarked = markedBags.includes(bag);
            return (
              <button
                aria-label={`Worek ${bag}: ${isMarked ? "wystawiony" : "niewystawiony"}`}
                className={`waste-bag${isMarked ? " waste-bag-out" : ""}`}
                disabled={isPending}
                key={bag}
                onClick={() => startTransition(() => toggleWasteBag(bag, `${month}-01`))}
                type="button"
              >
                <span aria-hidden="true">🗑️</span>
                <b>{isMarked ? "✕" : bag}</b>
              </button>
            );
          })}
        </div>
      </section>

      <section className="waste-calendar" aria-label="Kalendarz odbioru śmieci">
        <div className="section-heading">
          <div>
            <h2>Kalendarz odbiorów</h2>
            <span>Wybierz dzień, a następnie rodzaj odbioru</span>
          </div>
          <div className="calendar-month-switcher">
            <Link aria-label="Poprzedni miesiąc" href={monthHref(previous)}>‹</Link>
            <strong>{monthFormatter.format(currentMonth)}</strong>
            <Link aria-label="Następny miesiąc" href={monthHref(next)}>›</Link>
          </div>
        </div>
        <div className="waste-legend"><span className="waste-all">Wszystkie: segregowane, bio i niesegregowane</span><span className="waste-bio">Bio i niesegregowane</span></div>
        <div className="waste-calendar-grid">
          {Array.from({ length: 7 }, (_, index) => (
            <span className="waste-weekday" key={index}>{weekdayFormatter.format(new Date(2024, 0, index + 1))}</span>
          ))}
          {Array.from({ length: startOffset }, (_, index) => <span key={`empty-${index}`} />)}
          {Array.from({ length: daysInMonth }, (_, index) => {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), index + 1);
            const value = formatDate(date);
            const kind = collectionByDate.get(value);
            return <button className={`waste-day${kind ? ` waste-day-${kind}` : ""}${selectedDate === value ? " is-selected" : ""}`} key={value} onClick={() => setSelectedDate(value)} type="button"><time dateTime={value}>{index + 1}</time>{kind && <small>{kind === "all" ? "Wszystkie" : "Bio + zm."}</small>}</button>;
          })}
        </div>
        {selectedDate && (
          <div className="waste-day-editor">
            <strong>{new Intl.DateTimeFormat("pl-PL", { dateStyle: "full" }).format(new Date(`${selectedDate}T12:00:00`))}</strong>
            <div>
              <button className="primary-button" disabled={isPending} onClick={() => startTransition(() => setWasteCollection(selectedDate, "all"))} type="button">Wszystkie śmieci</button>
              <button className="secondary-button" disabled={isPending} onClick={() => startTransition(() => setWasteCollection(selectedDate, "bio_residual"))} type="button">Bio + niesegregowane</button>
              {selectedKind && <button className="waste-remove" disabled={isPending} onClick={() => startTransition(() => { removeWasteCollection(selectedDate); setSelectedDate(null); })} type="button">Usuń odbiór</button>}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
