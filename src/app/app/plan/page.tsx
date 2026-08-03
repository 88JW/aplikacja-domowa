import { ensureHomeContext } from "@/lib/home";
import {
  getPlannedTasksForDate,
  getPlanningOptions,
} from "@/lib/planning";
import { requireSsoUser } from "@/lib/sso";
import { materializeRecurringTasks } from "@/lib/recurring";
import Link from "next/link";
import { scheduleTask } from "./actions";
import { formatTaskAttributes } from "@/lib/task-meta";
import { SearchableTaskSelect } from "@/app/components/searchable-task-select";

function getToday() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
  }).format(new Date());
}

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const selectedDate =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
      ? params.date
      : getToday();
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  await materializeRecurringTasks(context, selectedDate);
  const [options, plannedTasks] = await Promise.all([
    getPlanningOptions(context),
    getPlannedTasksForDate(context, selectedDate),
  ]);

  return (
    <main className="shell">
      <p className="eyebrow">{context.householdName}</p>
      <h1>Plan obowiązków</h1>
      <p className="lead">
        Dodaj zadanie na wybrany dzień i przypisz je domownikowi albo zostaw
        dla każdego.
      </p>

      <form className="planner-card" action={scheduleTask}>
        <label>
          Dzień
          <input
            defaultValue={selectedDate}
            min={getToday()}
            name="scheduledFor"
            required
            type="date"
          />
        </label>

        <div className="form-field">
          <span>Zadanie</span>
          <SearchableTaskSelect
            options={options.templates.map((task) => {
              const attributes = formatTaskAttributes(task.attributes);
              const label = `${task.icon ?? "✓"} ${task.name}${attributes ? ` — ${attributes}` : ""}`;
              return {
                id: task.id,
                label,
                searchText: `${task.name} ${attributes}`,
                attributes: task.attributes,
              };
            })}
          />
        </div>

        <label>
          Przypisanie
          <select name="assignedTo" defaultValue="">
            <option value="">Dla każdego</option>
            {options.members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName}
              </option>
            ))}
          </select>
        </label>

        <label>
          Powtarzanie
          <select name="frequency" defaultValue="once">
            <option value="once">Tylko raz</option>
            <option value="daily">Codziennie</option>
            <option value="weekly">Co tydzień w ten dzień</option>
            <option value="every_four_days">Co 4 dni od wykonania</option>
          </select>
        </label>

        <button className="primary-button" type="submit">
          Dodaj do planu
        </button>
        <Link className="text-link" href="/app/catalog">
          Nie ma zadania na liście? Dodaj własne
        </Link>
      </form>

      <div className="section-heading">
        <h2>Zaplanowane</h2>
        <span>{selectedDate}</span>
      </div>

      <section className="tasks">
        {plannedTasks.length === 0 ? (
          <article className="empty-state">
            <span aria-hidden="true">📅</span>
            <strong>Brak zadań na ten dzień</strong>
            <p>Skorzystaj z formularza, aby utworzyć pierwszy wpis.</p>
          </article>
        ) : (
          plannedTasks.map((task) => (
            <article className="task planned-task" key={task.id}>
              <div className="task-icon" aria-hidden="true">
                {task.icon ?? "✓"}
              </div>
              <div>
                <strong>{task.name}</strong>
                <small>
                  {formatTaskAttributes(task.attributes) || "Bez cech"} ·{" "}
                  {task.assignedToName ?? "dla każdego"}
                </small>
              </div>
              <span className={`status-pill status-${task.status}`}>
                {task.status === "completed" ? "Gotowe" : "Do zrobienia"}
              </span>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
