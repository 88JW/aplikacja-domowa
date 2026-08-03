"use client";

import { useMemo, useState } from "react";

type TaskOption = {
  id: string;
  label: string;
  searchText: string;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pl-PL")
    .trim();
}

export function QuickTaskCompletion({ options }: { options: TaskOption[] }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const normalizedQuery = normalize(query);
  const suggestions = useMemo(
    () =>
      normalizedQuery
        ? options
            .filter((option) => normalize(option.searchText).includes(normalizedQuery))
            .slice(0, 6)
        : [],
    [normalizedQuery, options],
  );

  function selectTask(task: TaskOption) {
    setSelectedId(task.id);
    setQuery(task.label);
  }

  return (
    <div className="quick-task-picker">
      <input name="taskTemplateId" type="hidden" value={selectedId} />
      <label htmlFor="quick-task-input">Co zrobiłeś?</label>
      <div className="quick-task-entry">
        <input
          autoComplete="off"
          id="quick-task-input"
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedId("");
          }}
          placeholder="Np. podlałem kwiaty…"
          type="search"
          value={query}
        />
        <button className="primary-button" disabled={!selectedId} type="submit">
          Zapisz ✓
        </button>
      </div>
      {normalizedQuery && !selectedId && (
        <div className="quick-task-suggestions" role="listbox" aria-label="Podpowiedzi zadań">
          {suggestions.length > 0 ? (
            suggestions.map((task) => (
              <button key={task.id} onClick={() => selectTask(task)} type="button">
                {task.label}
              </button>
            ))
          ) : (
            <p>Nie znaleźliśmy pasującego zadania w katalogu.</p>
          )}
        </div>
      )}
    </div>
  );
}
