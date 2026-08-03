import { getAchievementHistory } from "@/lib/achievements";
import { ensureHomeContext } from "@/lib/home";
import { requireSsoUser } from "@/lib/sso";
import Image from "next/image";

const monthFormatter = new Intl.DateTimeFormat("pl-PL", {
  month: "long",
  year: "numeric",
  timeZone: "Europe/Warsaw",
});

export default async function AchievementHistoryPage() {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const history = await getAchievementHistory(context);
  const periods = Array.from(
    new Map(
      history.map((item) => [
        new Date(item.periodStart).toISOString().slice(0, 7),
        new Date(item.periodStart),
      ]),
    ).entries(),
  );

  return (
    <main className="shell">
      <p className="eyebrow">{context.householdName}</p>
      <h1>Album odznak</h1>
      <p className="lead">
        Osiągnięcia {context.profileDisplayName} oraz wspólne odznaki domu z
        kolejnych miesięcy.
      </p>

      {periods.length === 0 ? (
        <article className="empty-state achievement-history-empty">
          <span aria-hidden="true">📖</span>
          <strong>Album jest jeszcze pusty</strong>
          <p>Pierwsze zakończone miesiące pojawią się w tym miejscu.</p>
        </article>
      ) : (
        periods.map(([periodKey, periodDate]) => {
          const items = history.filter(
            (item) => new Date(item.periodStart).toISOString().slice(0, 7) === periodKey,
          );
          return (
            <section className="achievement-history-section" key={periodKey}>
              <div className="section-heading">
                <h2>{monthFormatter.format(periodDate)}</h2>
                <span>{items.length} odznak</span>
              </div>
              <div className="achievement-history-grid">
                {items.map((item) => (
                  <article key={`${item.scope}-${item.code}`}>
                    <span className="achievement-icon" aria-hidden="true">
                      {item.imagePath ? <Image alt="" height={80} src={item.imagePath} width={80} /> : item.icon}
                    </span>
                    <div>
                      <strong>{item.name}</strong>
                      <small>{item.scope === "household" ? "Wspólne" : "Indywidualne"}</small>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })
      )}
    </main>
  );
}
