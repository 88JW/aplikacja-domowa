import { ensureHomeContext } from "@/lib/home";
import { requireSsoUser } from "@/lib/sso";
import { getStatistics } from "@/lib/statistics";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Warsaw",
});

export default async function StatisticsPage() {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const statistics = await getStatistics(context);
  const maximumDaily = Math.max(...statistics.daily.map((item) => item.count), 1);
  const days = Array.from(new Set(statistics.daily.map((item) => item.day)));

  return (
    <main className="shell">
      <p className="eyebrow">{context.householdName}</p>
      <h1>Statystyki domu</h1>
      <p className="lead">Dokładniejszy obraz ostatnich 30 dni i rytmu pracy w domu.</p>

      <section className="stats-summary" aria-label="Podsumowanie ostatnich 30 dni">
        <article><strong>{statistics.total30Days}</strong><span>zadań razem</span></article>
        <article><strong>{statistics.averagePerActiveDay}</strong><span>na aktywny dzień</span></article>
        <article>
          <strong>{statistics.mostActiveDay ? dateFormatter.format(new Date(`${statistics.mostActiveDay}T12:00:00+02:00`)) : "—"}</strong>
          <span>najbardziej pracowity dzień</span>
        </article>
      </section>

      <section className="stats-section">
        <div className="section-heading"><h2>Wynik domowników</h2><span>30 dni</span></div>
        <div className="stats-members">
          {statistics.memberTotals.map((member) => {
            const maximum = Math.max(...statistics.memberTotals.map((item) => item.count), 1);
            return (
              <article key={member.profileId}>
                <div><strong>{member.displayName}</strong><span>{member.count}</span></div>
                <div className="stats-bar"><i style={{ width: `${(member.count / maximum) * 100}%` }} /></div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="stats-section">
        <div className="section-heading"><h2>Ostatnie 14 dni</h2><span>zadania dziennie</span></div>
        <div className="stats-chart" aria-label="Wykres zadań z ostatnich 14 dni">
          {days.map((day) => (
            <div className="stats-day" key={day}>
              <div className="stats-day-bars">
                {statistics.memberTotals.map((member) => {
                  const count = statistics.daily.find((item) => item.day === day && item.profileId === member.profileId)?.count ?? 0;
                  return <i key={member.profileId} title={`${member.displayName}: ${count}`} style={{ height: `${Math.max((count / maximumDaily) * 100, count ? 8 : 0)}%` }} />;
                })}
              </div>
              <small>{new Date(`${day}T12:00:00+02:00`).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" })}</small>
            </div>
          ))}
        </div>
        <div className="stats-legend">
          {statistics.memberTotals.map((member) => <span key={member.profileId}>{member.displayName}</span>)}
        </div>
      </section>

      <div className="stats-lists">
        <Ranking title="Najczęstsze miejsca" items={statistics.spaces} />
        <Ranking title="Najczęstsze czynności" items={statistics.activities} />
      </div>
    </main>
  );
}

function Ranking({ title, items }: { title: string; items: Array<{ name: string; icon: string | null; count: number }> }) {
  return (
    <section className="stats-section">
      <div className="section-heading"><h2>{title}</h2><span>30 dni</span></div>
      {items.length ? (
        <ol className="stats-ranking">
          {items.map((item) => <li key={item.name}><span>{item.icon ?? "✦"} {item.name}</span><strong>{item.count}</strong></li>)}
        </ol>
      ) : <p className="form-hint">Jeszcze nie ma danych.</p>}
    </section>
  );
}
