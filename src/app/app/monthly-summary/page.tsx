import { ensureHomeContext } from "@/lib/home";
import { getPreviousMonthSummary } from "@/lib/reports";
import { requireSsoUser } from "@/lib/sso";

const monthFormatter = new Intl.DateTimeFormat("pl-PL", {
  month: "long",
  year: "numeric",
  timeZone: "Europe/Warsaw",
});

export default async function MonthlySummaryPage() {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const summary = await getPreviousMonthSummary(context);
  const leaders = summary.members.filter(
    (member) => member.total > 0 && member.total === summary.members[0]?.total,
  );
  const winnerText =
    leaders.length === 0
      ? "W zeszłym miesiącu nie zapisano jeszcze żadnych wykonań."
      : leaders.length === 1
        ? `Mistrz miesiąca: ${leaders[0].displayName}`
        : `Wspólni mistrzowie: ${leaders.map((member) => member.displayName).join(" i ")}`;

  return (
    <main className="shell">
      <p className="eyebrow">{context.householdName}</p>
      <h1>Podsumowanie miesiąca</h1>
      <p className="lead">
        Zamknięty wynik za {monthFormatter.format(summary.periodStart)} — tylko
        wykonania, które nie zostały cofnięte.
      </p>

      <section className="monthly-winner" aria-label="Wynik miesiąca">
        <span aria-hidden="true">{leaders.length === 1 ? "🏆" : "✨"}</span>
        <div>
          <small>{monthFormatter.format(summary.periodStart)}</small>
          <h2>{winnerText}</h2>
          <p>
            W domu wykonano łącznie <strong>{summary.total}</strong>{" "}
            {summary.total === 1 ? "zadanie" : "zadań"}.
          </p>
        </div>
      </section>

      <section className="monthly-summary-section">
        <div className="section-heading">
          <div>
            <h2>Kto co wykonał</h2>
            <p>Rozpiska zadań dla każdej osoby z poprzedniego miesiąca.</p>
          </div>
          <span>{summary.total} pkt domu</span>
        </div>

        <div className="monthly-member-grid">
          {summary.members.map((member, index) => (
            <article className="monthly-member-card" key={member.profileId}>
              <header>
                <span className="monthly-place" aria-hidden="true">
                  {index === 0 && member.total > 0 ? "🏅" : index + 1}
                </span>
                <div>
                  <h3>{member.displayName}</h3>
                  <p>{member.total} {member.total === 1 ? "wykonanie" : "wykonań"}</p>
                </div>
                <strong>{member.total} pkt</strong>
              </header>

              {member.tasks.length === 0 ? (
                <p className="monthly-member-empty">Brak zapisanych wykonań.</p>
              ) : (
                <ul className="monthly-task-list">
                  {member.tasks.map((task) => (
                    <li key={task.taskTemplateId}>
                      <span aria-hidden="true">{task.icon ?? "✓"}</span>
                      <span>{task.name}</span>
                      <strong>×{task.count}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
