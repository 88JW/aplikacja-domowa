import { ensureHomeContext } from "@/lib/home";
import { getSharedMissions } from "@/lib/missions";
import { requireSsoUser } from "@/lib/sso";

export default async function MissionsPage() {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const missions = await getSharedMissions(context);

  return (
    <main className="shell">
      <p className="eyebrow">{context.householdName}</p>
      <h1>Wspólne misje</h1>
      <p className="lead">
        Większe akcje składają się z kilku kroków. Nie dają dodatkowych punktów —
        pokazują, co udało się osiągnąć razem.
      </p>

      <section className="mission-list">
        {missions.map((mission) => (
          <article
            className={`mission-card ${mission.completed ? "mission-completed" : ""}`}
            key={mission.code}
          >
            <div className="mission-title">
              <span aria-hidden="true">{mission.icon}</span>
              <div>
                <small>{mission.periodLabel}</small>
                <h2>{mission.name}</h2>
                <p>{mission.description}</p>
              </div>
              <strong>{mission.completed ? "Gotowe!" : `${mission.progress}%`}</strong>
            </div>
            <div className="mission-progress" aria-label={`Postęp: ${mission.progress}%`}>
              <div style={{ width: `${mission.progress}%` }} />
            </div>
            <ul className="mission-checkpoints">
              {mission.checkpoints.map((checkpoint) => (
                <li key={checkpoint.label}>
                  <span aria-hidden="true">
                    {checkpoint.current >= checkpoint.target ? "✓" : "○"}
                  </span>
                  <span>{checkpoint.label}</span>
                  <strong>
                    {Math.min(checkpoint.current, checkpoint.target)}/{checkpoint.target}
                  </strong>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}
