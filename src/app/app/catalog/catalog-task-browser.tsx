"use client";

import type {
  TaskAttributeOption,
  TaskTemplateOption,
} from "@/lib/planning";
import Link from "next/link";
import { useMemo, useState } from "react";
import { archiveTaskTemplate } from "./actions";

type CatalogTaskBrowserProps = {
  tasks: TaskTemplateOption[];
  activities: TaskAttributeOption[];
  spaces: TaskAttributeOption[];
};

export function CatalogTaskBrowser({
  tasks,
  activities,
  spaces,
}: CatalogTaskBrowserProps) {
  const [query, setQuery] = useState("");
  const [activityId, setActivityId] = useState("");
  const [spaceId, setSpaceId] = useState("");

  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pl");

    return tasks.filter((task) => {
      const matchesQuery =
        !normalizedQuery ||
        task.name.toLocaleLowerCase("pl").includes(normalizedQuery) ||
        task.attributes.some((attribute) =>
          attribute.name.toLocaleLowerCase("pl").includes(normalizedQuery),
        );
      const matchesActivity =
        !activityId ||
        task.attributes.some((attribute) => attribute.id === activityId);
      const matchesSpace =
        !spaceId ||
        task.attributes.some((attribute) => attribute.id === spaceId);

      return matchesQuery && matchesActivity && matchesSpace;
    });
  }, [activityId, query, spaceId, tasks]);

  const filtersActive = Boolean(query || activityId || spaceId);

  return (
    <section className="catalog-browser">
      <div className="catalog-filter-bar">
        <label className="catalog-search">
          <span>Znajdź zadanie</span>
          <div>
            <span aria-hidden="true">⌕</span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Wpisz nazwę zadania…"
              type="search"
              value={query}
            />
          </div>
        </label>
        <label>
          <span>1. Co chcesz zrobić?</span>
          <select
            onChange={(event) => setActivityId(event.target.value)}
            value={activityId}
          >
            <option value="">Wszystkie czynności</option>
            {activities.map((activity) => (
              <option key={activity.id} value={activity.id}>
                {activity.icon ?? "✓"} {activity.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>2. Gdzie?</span>
          <select
            onChange={(event) => setSpaceId(event.target.value)}
            value={spaceId}
          >
            <option value="">Wszystkie miejsca</option>
            {spaces.map((space) => (
              <option key={space.id} value={space.id}>
                {space.icon ?? "📍"} {space.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="catalog-results-heading">
        <p>
          <strong>{filteredTasks.length}</strong>{" "}
          {filteredTasks.length === 1 ? "zadanie" : "zadań"}
        </p>
        {filtersActive && (
          <button
            className="catalog-clear-filters"
            onClick={() => {
              setQuery("");
              setActivityId("");
              setSpaceId("");
            }}
            type="button"
          >
            Wyczyść filtry
          </button>
        )}
      </div>

      {filteredTasks.length > 0 ? (
        <div className="catalog-task-grid">
          {filteredTasks.map((task) => {
            const taskActivities = task.attributes.filter(
              (attribute) => attribute.kind === "activity",
            );
            const taskSpaces = task.attributes.filter(
              (attribute) => attribute.kind === "space",
            );

            return (
              <article className="catalog-task-card" key={task.id}>
                <div className="catalog-task-icon" aria-hidden="true">
                  {task.icon ?? "✓"}
                </div>
                <div className="catalog-task-content">
                  <h3>{task.name}</h3>
                  <div className="catalog-task-meta">
                    {taskActivities.map((attribute) => (
                      <span className="activity" key={attribute.id}>
                        {attribute.icon ?? "✓"} {attribute.name}
                      </span>
                    ))}
                    {taskSpaces.map((attribute) => (
                      <span className="space" key={attribute.id}>
                        {attribute.icon ?? "📍"} {attribute.name}
                      </span>
                    ))}
                    {task.attributes.length === 0 && (
                      <span>Bez przypisanej czynności i miejsca</span>
                    )}
                  </div>
                </div>
                <div className="catalog-task-actions">
                  <Link href={`/app/catalog/${task.id}`}>Edytuj</Link>
                  <form action={archiveTaskTemplate}>
                    <input
                      name="taskTemplateId"
                      type="hidden"
                      value={task.id}
                    />
                    <button type="submit">Ukryj</button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state catalog-empty-state">
          <span aria-hidden="true">🔎</span>
          <strong>Nie znaleziono zadania</strong>
          <p>Zmień czynność, miejsce albo wpisaną nazwę.</p>
          <button
            className="secondary-button"
            onClick={() => {
              setQuery("");
              setActivityId("");
              setSpaceId("");
            }}
            type="button"
          >
            Pokaż wszystkie zadania
          </button>
        </div>
      )}
    </section>
  );
}
