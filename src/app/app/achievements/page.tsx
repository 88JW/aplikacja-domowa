import { evaluateAchievements, getAchievements } from "@/lib/achievements";
import { ensureHomeContext } from "@/lib/home";
import { requireSsoUser } from "@/lib/sso";
import Link from "next/link";
import Image from "next/image";
import { getSharedMissions } from "@/lib/missions";

export default async function AchievementsPage() {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  await evaluateAchievements(context);
  const [achievements, missions] = await Promise.all([
    getAchievements(context),
    getSharedMissions(context),
  ]);
  const earnedCount = achievements.filter(
    (achievement) => achievement.earnedAt,
  ).length;
  const completedMissionCount = missions.filter(
    (mission) => mission.completed,
  ).length;
  const groups = [
    {
      key: "general",
      title: "Główne osiągnięcia",
      description: "Regularność, liczba zadań i wspólny wynik domu.",
    },
    {
      key: "time",
      title: "Pory dnia",
      description: "Wyzwania za pomaganie rano, w południe, po południu, wieczorem i nocą.",
    },
    {
      key: "space",
      title: "Przestrzenie",
      description: "Specjalizacje związane z pomieszczeniami i obszarami domu.",
    },
    {
      key: "activity",
      title: "Czynności",
      description: "Wyzwania za konkretny rodzaj pracy, niezależnie od miejsca.",
    },
    {
      key: "combo",
      title: "Połączenia",
      description: "Odznaki łączące czynność z przestrzenią, np. Mycie + Salon.",
    },
  ] as const;

  return (
    <main className="shell">
      <p className="eyebrow">{context.householdName}</p>
      <h1>Cele domu</h1>
      <p className="lead">
        Osiągnięcia pokazują indywidualny postęp, a wspólne misje większe
        rzeczy, które robicie razem.
      </p>

      <section className="goals-overview" aria-label="Podsumowanie celów">
        <a href="#achievements">
          <span aria-hidden="true">🏅</span>
          <div>
            <small>Ten miesiąc</small>
            <strong>Osiągnięcia</strong>
            <p>{earnedCount}/{achievements.length} zdobytych odznak</p>
          </div>
          <b aria-hidden="true">↓</b>
        </a>
        <Link href="/app/missions">
          <span aria-hidden="true">🗺️</span>
          <div>
            <small>Razem</small>
            <strong>Wspólne misje</strong>
            <p>{completedMissionCount}/{missions.length} ukończonych misji</p>
          </div>
          <b aria-hidden="true">›</b>
        </Link>
      </section>

      <div className="section-heading">
        <div>
          <h2>Wspólne misje</h2>
          <p>Najbliższe większe cele całego domu.</p>
        </div>
        <Link href="/app/missions">Wszystkie</Link>
      </div>

      <section className="mission-preview-list goals-mission-preview">
        {missions.slice(0, 2).map((mission) => (
          <article
            className={`challenge ${mission.completed ? "mission-completed" : ""}`}
            key={mission.code}
          >
            <div className="challenge-top">
              <div>
                <strong>
                  {mission.icon} {mission.name}
                </strong>
                <p>{mission.description}</p>
              </div>
              <strong>
                {mission.completed ? "Gotowe!" : `${mission.progress}%`}
              </strong>
            </div>
            <div
              className="progress"
              aria-label={`Postęp: ${mission.progress}%`}
            >
              <div style={{ width: `${mission.progress}%` }} />
            </div>
          </article>
        ))}
      </section>

      <div className="section-heading" id="achievements">
        <div>
          <h2>Osiągnięcia</h2>
          <p>
            Odznaki indywidualne i wspólne zaczynają się od nowa co miesiąc.
          </p>
        </div>
      </div>
      <Link className="secondary-button achievement-history-link" href="/app/achievements/history">
        📖 Zobacz album z poprzednich miesięcy
      </Link>

      {groups.map((group) => (
        <section className="achievement-section" key={group.key}>
          <div className="section-heading">
            <div>
              <h2>{group.title}</h2>
              <p>{group.description}</p>
            </div>
            <span>
              {
                achievements.filter(
                  (achievement) =>
                    achievement.challengeGroup === group.key &&
                    achievement.earnedAt,
                ).length
              }
              /
              {
                achievements.filter(
                  (achievement) => achievement.challengeGroup === group.key,
                ).length
              }
            </span>
          </div>
          <div className="achievement-grid">
            {achievements
              .filter(
                (achievement) => achievement.challengeGroup === group.key,
              )
              .map((achievement) => (
                <article
                  className={`achievement-card ${
                    achievement.earnedAt ? "achievement-earned" : ""
                  }`}
                  key={achievement.code}
                >
            <span className="achievement-icon" aria-hidden="true">
                    {achievement.imagePath ? (
                      <Image alt="" height={80} src={achievement.imagePath} width={80} />
                    ) : (
                      achievement.icon
                    )}
                  </span>
                  <div>
                    <small>
                      {achievement.scope === "individual"
                        ? "Indywidualne"
                        : "Wspólne"}
                    </small>
                    <h2>{achievement.name}</h2>
                    <p>{achievement.description}</p>
                  </div>
                  <div
                    className="achievement-progress"
                    aria-label={`Postęp: ${Math.min(achievement.progressCurrent, achievement.progressTarget)} z ${achievement.progressTarget}`}
                  >
                    <div style={{ width: `${achievement.progressPercent}%` }} />
                  </div>
                  <strong>
                    {achievement.earnedAt
                      ? "Zdobyte"
                      : `${Math.min(achievement.progressCurrent, achievement.progressTarget)}/${achievement.progressTarget}`}
                  </strong>
                </article>
              ))}
          </div>
        </section>
      ))}
    </main>
  );
}
