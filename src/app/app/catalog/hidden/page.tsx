import { ensureHomeContext } from "@/lib/home";
import { getArchivedTaskTemplates } from "@/lib/planning";
import { requireSsoUser } from "@/lib/sso";
import Link from "next/link";
import { restoreTaskTemplate } from "../actions";
import { formatTaskAttributes } from "@/lib/task-meta";

export default async function HiddenTasksPage() {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const tasks = await getArchivedTaskTemplates(context);

  return (
    <main className="shell">
      <p className="eyebrow">{context.householdName}</p>
      <h1>Ukryte zadania</h1>
      <p className="lead">
        Zadania ukryte z katalogu zachowują wcześniejszą historię. Możesz je
        przywrócić i ponownie planować.
      </p>

      <div className="section-heading">
        <h2>Archiwum</h2>
        <span>{tasks.length}</span>
      </div>

      <section className="catalog-list hidden-task-list">
        {tasks.length === 0 ? (
          <article className="empty-state">
            <span aria-hidden="true">🗃️</span>
            <strong>Brak ukrytych zadań</strong>
            <p>Ukryte pozycje z katalogu pojawią się tutaj.</p>
          </article>
        ) : (
          tasks.map((task) => (
            <article className="hidden-task-card" key={task.id}>
              <div className="task-icon" aria-hidden="true">
                {task.icon ?? "✓"}
              </div>
              <div>
                <strong>{task.name}</strong>
                {task.attributes.length > 0 && (
                  <small className="task-attributes">
                    {formatTaskAttributes(task.attributes)}
                  </small>
                )}
              </div>
              <form action={restoreTaskTemplate}>
                <input name="taskTemplateId" type="hidden" value={task.id} />
                <button className="secondary-button" type="submit">
                  Przywróć
                </button>
              </form>
            </article>
          ))
        )}
      </section>

      <Link className="text-link back-link" href="/app/catalog">
        Wróć do katalogu
      </Link>
    </main>
  );
}
