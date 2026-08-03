import { ensureHomeContext } from "@/lib/home";
import { getHistory } from "@/lib/reports";
import { requireSsoUser } from "@/lib/sso";
import { deleteCompletion, restoreCompletion } from "./actions";
import { formatTaskAttributes } from "@/lib/task-meta";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Warsaw",
});

export default async function HistoryPage() {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const history = await getHistory(context);

  return (
    <main className="shell">
      <p className="eyebrow">{context.householdName}</p>
      <h1>Historia</h1>
      <p className="lead">
        Ostatnie obowiązki wszystkich domowników. Wojtek i Iza mogą usuwać oraz
        przywracać wpisy, aby wspólnie poprawiać pomyłki.
      </p>

      <section className="timeline">
        {history.length === 0 ? (
          <article className="empty-state">
            <span aria-hidden="true">🕒</span>
            <strong>Historia jest jeszcze pusta</strong>
            <p>Wykonane zadania pojawią się w tym miejscu.</p>
          </article>
        ) : (
          history.map((item) => (
            <article
              className={`timeline-item ${item.undoneAt ? "timeline-undone" : ""}`}
              key={item.id}
            >
              <div className="task-icon" aria-hidden="true">
                {item.icon ?? "✓"}
              </div>
              <div>
                <strong>{item.taskName}</strong>
                <small>
                  {item.completedByName}
                  {formatTaskAttributes(item.attributes)
                    ? ` · ${formatTaskAttributes(item.attributes)}`
                    : ""}
                </small>
                <time>{dateFormatter.format(new Date(item.completedAt))}</time>
                {item.undoneAt && <em>Usunięte — punkt nie jest naliczany</em>}
              </div>
              {item.canDelete && (
                <form action={deleteCompletion}>
                  <input name="completionId" type="hidden" value={item.id} />
                  <button className="delete-button" type="submit">
                    Usuń
                  </button>
                </form>
              )}
              {item.canRestore && (
                <form action={restoreCompletion}>
                  <input name="completionId" type="hidden" value={item.id} />
                  <button className="restore-button" type="submit">
                    Przywróć
                  </button>
                </form>
              )}
            </article>
          ))
        )}
      </section>
    </main>
  );
}
