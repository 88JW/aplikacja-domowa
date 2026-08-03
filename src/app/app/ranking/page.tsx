import { ensureHomeContext } from "@/lib/home";
import { getRanking } from "@/lib/reports";
import { requireSsoUser } from "@/lib/sso";

export default async function RankingPage() {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const [weekly, monthly] = await Promise.all([
    getRanking(context, "week"),
    getRanking(context, "month"),
  ]);

  return (
    <main className="shell">
      <p className="eyebrow">{context.householdName}</p>
      <h1>Ranking</h1>
      <p className="lead">
        Każde wykonane zadanie to jeden punkt. Wyniki okresowe nie wpływają
        na historię całkowitą.
      </p>

      <RankingTable title="Ten tydzień" items={weekly} />
      <RankingTable title="Ten miesiąc" items={monthly} />
    </main>
  );
}

function RankingTable({
  title,
  items,
}: {
  title: string;
  items: Awaited<ReturnType<typeof getRanking>>;
}) {
  return (
    <section className="ranking-section">
      <div className="section-heading">
        <h2>{title}</h2>
        <span>{items.reduce((sum, item) => sum + item.points, 0)} pkt domu</span>
      </div>
      <div className="ranking-list">
        {items.map((item, index) => (
          <article className="ranking-row" key={item.profileId}>
            <span className="ranking-place">{index + 1}</span>
            <div>
              <strong>{item.displayName}</strong>
              <small>{item.email}</small>
            </div>
            <strong>{item.points} pkt</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
