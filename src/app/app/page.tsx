import { getDashboardData } from "@/lib/home";
import { requireSsoUser } from "@/lib/sso";
import Link from "next/link";
import { getMonthlyCompletionMatrix } from "@/lib/reports";
import { getTaskShortcuts } from "@/lib/shortcuts";
import {
  addTaskShortcut,
  completeTaskShortcut,
  removeTaskShortcut,
} from "./shortcuts/actions";
import { completeTask, completeUnplannedTask } from "./actions";
import { formatTaskAttributes } from "@/lib/task-meta";
import { getStreakStats } from "@/lib/streaks";
import { getPlantWateringStatuses } from "@/lib/plant-watering";
import { SearchableTaskSelect } from "@/app/components/searchable-task-select";
import { DailyReminder } from "./daily-reminder";
import { QuickTaskCompletion } from "@/app/components/quick-task-completion";
import { RepeatTaskButton } from "./repeat-task-button";

function getTaskMeta(
  attributes: Parameters<typeof formatTaskAttributes>[0],
  assignedToName: string | null,
) {
  const taskMeta = formatTaskAttributes(attributes);
  const assignment = assignedToName
    ? `przypisane: ${assignedToName}`
    : "dla każdego";
  return [taskMeta, assignment].filter(Boolean).join(" · ");
}

export default async function AppPage() {
  const user = await requireSsoUser();
  const data = await getDashboardData(user);
  const [matrix, shortcutData, streaks, watering] = await Promise.all([
    getMonthlyCompletionMatrix(data.context),
    getTaskShortcuts(data.context),
    getStreakStats(data.context),
    getPlantWateringStatuses(data.context),
  ]);
  const greetingName = data.context.profileDisplayName.trim();

  return (
    <main className="shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">{data.context.householdName}</p>
          <h1>
            Dzień dobry{greetingName ? `, ${greetingName}` : ""}!
          </h1>
        </div>
        <span className="user-email">{data.context.profileEmail}</span>
      </header>

      <p className="lead">
        Małe zadania, wspólny wynik. Każda wykonana czynność daje jeden
        punkt.
      </p>

      <DailyReminder
        profileId={data.context.profileId}
        profileName={data.context.profileDisplayName}
        tasks={data.todayTasks.map((task) => ({
          id: task.id,
          icon: task.icon,
          name: task.name,
        }))}
      />

      <section className="summary" aria-label="Podsumowanie">
        <article className="metric">
          <strong>{data.userMonthlyPoints}</strong>
          <span>Twoje punkty w tym miesiącu</span>
        </article>
        <article className="metric">
          <strong>{data.householdMonthlyPoints}</strong>
          <span>Punkty całego domu w tym miesiącu</span>
        </article>
        <article className="metric">
          <strong>{data.todayTasks.length}</strong>
          <span>Zadania na dzisiaj</span>
        </article>
      </section>

      <div className="section-heading">
        <h2>Kwiatki w domu</h2>
        <span>Podlewanie co 4 dni</span>
      </div>
      <section className="watering-grid">
        {watering.map((plant) => (
          <article className={plant.daysRemaining <= 0 ? "watering-due" : ""} key={plant.templateId}>
            <div className="watering-title">
              <span aria-hidden="true">{plant.icon ?? "🪴"}</span>
              <div>
                <strong>{plant.spaceName}</strong>
                <small>
                  {plant.daysSince === null
                    ? "Jeszcze nie zapisano podlewania"
                    : plant.daysSince === 0
                      ? "Podlano dzisiaj"
                      : `Podlano ${plant.daysSince} dni temu`}
                </small>
              </div>
            </div>
            <div className="watering-progress" aria-label={`Upłynęło ${plant.progressPercent}% cyklu`}>
              <i style={{ width: `${plant.progressPercent}%` }} />
            </div>
            <div className="watering-footer">
              <strong>
                {plant.daysRemaining > 1
                  ? `Następne za ${plant.daysRemaining} dni`
                  : plant.daysRemaining === 1
                    ? "Następne jutro"
                    : plant.daysRemaining === 0
                      ? "Czas podlać dzisiaj"
                      : `Termin minął ${Math.abs(plant.daysRemaining)} dni temu`}
              </strong>
              {plant.plannedTaskId && (
                <form action={completeTask}>
                  <input name="plannedTaskId" type="hidden" value={plant.plannedTaskId} />
                  <button className="primary-button" type="submit">Podlane ✓</button>
                </form>
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="streak-strip" aria-label="Serie aktywności">
        <article>
          <span aria-hidden="true">🔥</span>
          <div>
            <strong>{streaks.profileCurrent} dni</strong>
            <small>Seria: {data.context.profileDisplayName}</small>
          </div>
          <small>Rekord miesiąca: {streaks.profileBestThisMonth}</small>
        </article>
        <article>
          <span aria-hidden="true">🏠</span>
          <div>
            <strong>{streaks.householdCurrent} dni</strong>
            <small>Wspólna seria domu</small>
          </div>
          <small>Rekord miesiąca: {streaks.householdBestThisMonth}</small>
        </article>
      </section>

      <div className="section-heading">
        <h2>Szybkie zadania</h2>
        <span>Tylko Twoje</span>
      </div>

      <section className="shortcut-panel">
        <form action={completeUnplannedTask} className="quick-task-form">
          <QuickTaskCompletion
            options={shortcutData.tasks.map((task) => {
              const attributes = formatTaskAttributes(task.attributes);
              const label = `${task.icon ?? "✓"} ${task.name}${attributes ? ` — ${attributes}` : ""}`;
              return {
                id: task.taskTemplateId,
                label,
                searchText: `${task.name} ${attributes}`,
              };
            })}
          />
        </form>
        {shortcutData.shortcuts.length === 0 ? (
          <p className="shortcut-empty">
            Dodaj często wykonywane zadania, aby zapisywać je jednym
            kliknięciem bez planowania.
          </p>
        ) : (
          <div className="shortcut-grid">
            {shortcutData.shortcuts.map((shortcut) => (
              <article className="shortcut-card" key={shortcut.taskTemplateId}>
                <form action={completeTaskShortcut}>
                  <input
                    name="taskTemplateId"
                    type="hidden"
                    value={shortcut.taskTemplateId}
                  />
                  <button className="shortcut-complete" type="submit">
                    <span aria-hidden="true">{shortcut.icon ?? "✓"}</span>
                    <strong>{shortcut.name}</strong>
                    <small>
                      {formatTaskAttributes(shortcut.attributes) || "Bez cech"}
                      {" · +1 pkt"}
                    </small>
                  </button>
                </form>
                <form action={removeTaskShortcut}>
                  <input
                    name="taskTemplateId"
                    type="hidden"
                    value={shortcut.taskTemplateId}
                  />
                  <button
                    aria-label={`Usuń skrót „${shortcut.name}”`}
                    className="shortcut-remove"
                    type="submit"
                  >
                    ×
                  </button>
                </form>
              </article>
            ))}
          </div>
        )}

        {shortcutData.available.length > 0 && (
          <details className="shortcut-add">
            <summary>+ Dodaj skrót</summary>
            <form action={addTaskShortcut}>
              <SearchableTaskSelect
                placeholder="Wybierz zadanie z katalogu"
                options={shortcutData.available.map((task) => {
                  const attributes = formatTaskAttributes(task.attributes);
                  const label = `${task.icon ?? "✓"} ${task.name}${attributes ? ` — ${attributes}` : ""}`;
                  return {
                    id: task.taskTemplateId,
                    label,
                    searchText: `${task.name} ${attributes}`,
                    attributes: task.attributes,
                  };
                })}
              />
              <button className="secondary-button" type="submit">
                Dodaj
              </button>
            </form>
          </details>
        )}
      </section>

      <div className="section-heading">
        <h2>Kto co zrobił</h2>
        <span>Ten miesiąc</span>
      </div>

      <div className="matrix-scroll">
        <table className="completion-matrix">
          <thead>
            <tr>
              <th scope="col">Zadanie</th>
              {matrix.rows.map((row) => (
                <th scope="col" key={row.profileId}>
                  {row.displayName}
                </th>
              ))}
              <th scope="col">Razem</th>
            </tr>
          </thead>
          <tbody>
            {matrix.columns.map((column) => {
              const taskTotal = matrix.rows.reduce(
                (sum, row) =>
                  sum + (row.counts[column.taskTemplateId] ?? 0),
                0,
              );

              return (
                <tr key={column.taskTemplateId}>
                  <th scope="row">
                    <div className="matrix-task-cell">
                      <span className="matrix-task-label">
                        <span aria-hidden="true">{column.icon ?? "✓"}</span>
                        {column.name}
                      </span>
                      <RepeatTaskButton
                        profileName={data.context.profileDisplayName}
                        taskName={column.name}
                        taskTemplateId={column.taskTemplateId}
                      />
                    </div>
                  </th>
                  {matrix.rows.map((row) => (
                    <td key={row.profileId}>
                      {row.counts[column.taskTemplateId] ?? 0}
                    </td>
                  ))}
                  <td className="matrix-total">{taskTotal}</td>
                </tr>
              );
            })}
            {matrix.columns.length === 0 && (
              <tr>
                <th scope="row">Brak wykonanych zadań</th>
                {matrix.rows.map((row) => (
                  <td key={row.profileId}>0</td>
                ))}
                <td className="matrix-total">0</td>
              </tr>
            )}
            <tr className="matrix-summary-row">
              <th scope="row">Razem</th>
              {matrix.rows.map((row) => (
                <td className="matrix-total" key={row.profileId}>
                  {row.total}
                </td>
              ))}
              <td className="matrix-total">
                {matrix.rows.reduce((sum, row) => sum + row.total, 0)}
              </td>
            </tr>
          </tbody>
        </table>
        {matrix.columns.length === 0 && (
          <p className="matrix-note">
            Kolumny z obowiązkami pojawią się po pierwszym wykonaniu.
          </p>
        )}
      </div>

      <div className="section-heading" id="today-tasks">
        <h2>Na dzisiaj</h2>
        <span>{data.todayTasks.length} pozostało</span>
      </div>

      <section className="tasks" aria-label="Zadania na dzisiaj">
        {data.todayTasks.length === 0 ? (
          <article className="empty-state">
            <span aria-hidden="true">✨</span>
            <strong>Wszystko gotowe!</strong>
            <p>Nie masz już zadań do wykonania na dzisiaj.</p>
            <Link className="inline-cta" href="/app/plan">
              Zaplanuj pierwsze zadanie
            </Link>
          </article>
        ) : (
          data.todayTasks.map((task) => (
            <article className="task" key={task.id}>
              <div className="task-icon" aria-hidden="true">
                {task.icon ?? "✓"}
              </div>
              <div>
                <strong>{task.name}</strong>
                <small>
                  {getTaskMeta(task.attributes, task.assignedToName)}
                </small>
              </div>
              <form action={completeTask}>
                <input name="plannedTaskId" type="hidden" value={task.id} />
                <button
                  className="done-button"
                  type="submit"
                  aria-label={`Oznacz zadanie „${task.name}” jako wykonane`}
                >
                  ✓
                </button>
              </form>
            </article>
          ))
        )}
      </section>

    </main>
  );
}
