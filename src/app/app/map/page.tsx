import { ensureHomeContext } from "@/lib/home";
import { getHomeMap } from "@/lib/home-map";
import { requireSsoUser } from "@/lib/sso";

export default async function HomeMapPage() {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const map = await getHomeMap(context);

  return (
    <main className="shell map-shell">
      <p className="eyebrow">{context.householdName}</p>
      <h1>Mapa domu</h1>
      <p className="lead">
        Szkic pokazuje dzisiejsze zadania przypisane do konkretnych miejsc.
        Nie ocenia poziomu czystości pomieszczeń.
      </p>

      {map.generalTasks.length > 0 && (
        <section className="map-general">
          <h2>Do doprecyzowania</h2>
          <p>Zadania oznaczone ogólnie, np. „Łazienka”, „Ogród” albo „Cały dom”.</p>
          <ul>
            {map.generalTasks.map((task) => (
              <li key={task.id}>
                <span aria-hidden="true">{task.icon ?? "✓"}</span>
                <strong>{task.name}</strong>
                <small>{task.assignedToName ?? "Dla każdego"}</small>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="home-map">
        {map.levels.map((level) => (
          <section className={`map-level map-level-${level.code}`} key={level.code}>
            <div className="section-heading">
              <h2>{level.name}</h2>
              <span>
                {level.areas.reduce((sum, area) => sum + area.tasks.length, 0)} zadań
              </span>
            </div>
            <div className="map-area-grid">
              {level.areas.map((area) => (
                <article className={area.tasks.length ? "map-area map-area-active" : "map-area"} key={area.code}>
                  <header><span aria-hidden="true">{area.icon}</span><strong>{area.name}</strong></header>
                  {area.tasks.length ? (
                    <ul>
                      {area.tasks.map((task) => (
                        <li key={task.id}>
                          <span>{task.name}</span>
                          <small>{task.assignedToName ?? "Wszyscy"}</small>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <small>Bez zadań na dziś</small>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
