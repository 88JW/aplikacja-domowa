"use client";

import { useMemo, useRef, useState } from "react";

export type SearchableTaskAttribute = {
  name: string;
  icon: string | null;
  kind: "space" | "activity";
};

export type SearchableTaskOption = {
  id: string;
  label: string;
  searchText: string;
  attributes: SearchableTaskAttribute[];
};

type PickerStep = "activity" | "space" | "task";

const WITHOUT_ATTRIBUTE = "__none__";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pl-PL")
    .trim();
}

function hasAttribute(
  option: SearchableTaskOption,
  kind: SearchableTaskAttribute["kind"],
  name: string,
) {
  const attributes = option.attributes.filter((attribute) => attribute.kind === kind);
  return name === WITHOUT_ATTRIBUTE
    ? attributes.length === 0
    : attributes.some((attribute) => attribute.name === name);
}

function uniqueAttributes(
  options: SearchableTaskOption[],
  kind: SearchableTaskAttribute["kind"],
) {
  const attributes = new Map<string, SearchableTaskAttribute>();

  for (const option of options) {
    for (const attribute of option.attributes) {
      if (attribute.kind === kind && !attributes.has(attribute.name)) {
        attributes.set(attribute.name, attribute);
      }
    }
  }

  return [...attributes.values()].sort((left, right) =>
    left.name.localeCompare(right.name, "pl"),
  );
}

export function SearchableTaskSelect({
  options,
  placeholder = "Wybierz zadanie",
}: {
  options: SearchableTaskOption[];
  placeholder?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [step, setStep] = useState<PickerStep>("activity");
  const [activity, setActivity] = useState("");
  const [space, setSpace] = useState("");

  const selectedOption = options.find((option) => option.id === selected);
  const normalizedQuery = normalize(query);
  const searchResults = useMemo(
    () =>
      normalizedQuery
        ? options.filter((option) => normalize(option.searchText).includes(normalizedQuery))
        : [],
    [normalizedQuery, options],
  );
  const activities = useMemo(() => uniqueAttributes(options, "activity"), [options]);
  const activityOptions = useMemo(
    () =>
      activity
        ? options.filter((option) => hasAttribute(option, "activity", activity))
        : options,
    [activity, options],
  );
  const spaces = useMemo(
    () => uniqueAttributes(activityOptions, "space"),
    [activityOptions],
  );
  const hasTasksWithoutActivity = options.some(
    (option) => !option.attributes.some((attribute) => attribute.kind === "activity"),
  );
  const hasTasksWithoutSpace = activityOptions.some(
    (option) => !option.attributes.some((attribute) => attribute.kind === "space"),
  );
  const matchingTasks = useMemo(
    () =>
      activityOptions.filter((option) =>
        space ? hasAttribute(option, "space", space) : true,
      ),
    [activityOptions, space],
  );

  function resetPicker() {
    setQuery("");
    setStep("activity");
    setActivity("");
    setSpace("");
  }

  function openPicker() {
    resetPicker();
    dialogRef.current?.showModal();
  }

  function selectActivity(value: string) {
    setActivity(value);
    setSpace("");
    setStep("space");
  }

  function selectSpace(value: string) {
    setSpace(value);
    setStep("task");
  }

  function selectTask(option: SearchableTaskOption) {
    setSelected(option.id);
    dialogRef.current?.close();
  }

  const displayedTasks = normalizedQuery ? searchResults : matchingTasks;

  return (
    <div className="task-picker">
      <select
        aria-label="Wybrane zadanie"
        className="task-picker-required"
        name="taskTemplateId"
        onChange={() => undefined}
        onInvalid={(event) => {
          event.preventDefault();
          openPicker();
        }}
        required
        tabIndex={-1}
        value={selected}
      >
        <option value="">Nie wybrano zadania</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <button className="task-picker-trigger" onClick={openPicker} type="button">
        <span>
          <small>{selectedOption ? "Wybrane zadanie" : "Kreator wyboru"}</small>
          <strong>{selectedOption?.label ?? placeholder}</strong>
        </span>
        <b aria-hidden="true">›</b>
      </button>

      <dialog
        aria-labelledby="task-picker-title"
        className="task-picker-dialog"
        onClose={resetPicker}
        ref={dialogRef}
      >
        <div className="task-picker-header">
          <div>
            <small>Wybór zadania</small>
            <h2 id="task-picker-title">
              {normalizedQuery
                ? "Wyniki wyszukiwania"
                : step === "activity"
                  ? "Co chcesz zrobić?"
                  : step === "space"
                    ? "Gdzie?"
                    : "Wybierz konkretne zadanie"}
            </h2>
          </div>
          <button
            aria-label="Zamknij wybór zadania"
            className="task-picker-close"
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            ×
          </button>
        </div>

        <input
          aria-label="Szukaj zadania"
          autoComplete="off"
          className="task-picker-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Albo wpisz nazwę, czynność lub miejsce…"
          type="search"
          value={query}
        />

        {!normalizedQuery && (
          <div className="task-picker-steps" aria-label="Etapy wyboru">
            <span data-active={step === "activity"}>1. Co?</span>
            <span data-active={step === "space"}>2. Gdzie?</span>
            <span data-active={step === "task"}>3. Zadanie</span>
          </div>
        )}

        {!normalizedQuery && step === "activity" && (
          <div className="task-picker-grid">
            {activities.map((item) => (
              <button key={item.name} onClick={() => selectActivity(item.name)} type="button">
                <span aria-hidden="true">{item.icon ?? "✓"}</span>
                <strong>{item.name}</strong>
              </button>
            ))}
            {hasTasksWithoutActivity && (
              <button onClick={() => selectActivity(WITHOUT_ATTRIBUTE)} type="button">
                <span aria-hidden="true">✨</span>
                <strong>Inne czynności</strong>
              </button>
            )}
          </div>
        )}

        {!normalizedQuery && step === "space" && (
          <>
            <button className="task-picker-back" onClick={() => setStep("activity")} type="button">
              ← Zmień czynność
            </button>
            <div className="task-picker-grid">
              {spaces.map((item) => (
                <button key={item.name} onClick={() => selectSpace(item.name)} type="button">
                  <span aria-hidden="true">{item.icon ?? "📍"}</span>
                  <strong>{item.name}</strong>
                </button>
              ))}
              {hasTasksWithoutSpace && (
                <button onClick={() => selectSpace(WITHOUT_ATTRIBUTE)} type="button">
                  <span aria-hidden="true">🏠</span>
                  <strong>Bez konkretnego miejsca</strong>
                </button>
              )}
            </div>
          </>
        )}

        {(normalizedQuery || step === "task") && (
          <>
            {!normalizedQuery && (
              <button className="task-picker-back" onClick={() => setStep("space")} type="button">
                ← Zmień miejsce
              </button>
            )}
            <div className="task-picker-results">
              {displayedTasks.map((option) => (
                <button key={option.id} onClick={() => selectTask(option)} type="button">
                  <strong>{option.label}</strong>
                </button>
              ))}
              {displayedTasks.length === 0 && (
                <p>Nie ma zadania pasującego do tego wyboru.</p>
              )}
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
