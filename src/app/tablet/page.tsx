import Link from "next/link";
import { Celebration } from "@/app/app/celebration";
import { completeTask } from "@/app/app/actions";
import { ProfileSwitcher } from "@/app/app/profile/profile-switcher";
import { completeTaskShortcut } from "@/app/app/shortcuts/actions";
import { getDashboardData, getHouseholdMembers } from "@/lib/home";
import { getSharedMissions } from "@/lib/missions";
import { requireSsoUser } from "@/lib/sso";
import { getTaskShortcuts } from "@/lib/shortcuts";
import { getStreakStats } from "@/lib/streaks";
import { formatTaskAttributes } from "@/lib/task-meta";
import { TabletClock } from "./tablet-clock";

export default async function TabletPage() {
  const user = await requireSsoUser();
  const data = await getDashboardData(user);
  const [members, missions, shortcuts, streaks] = await Promise.all([
    getHouseholdMembers(data.context),
    getSharedMissions(data.context),
    getTaskShortcuts(data.context),
    getStreakStats(data.context),
  ]);
  const profileTheme =
    data.context.profileEmail.toLowerCase() === "iza.hille@gmail.com"
      ? "iza"
      : "wojtek";

  return (
    <div className="app-theme tablet-theme" data-profile-theme={profileTheme}>
      <Celebration />
      <main className="tablet-shell">
        <header className="tablet-header">
          <div>
            <p className="eyebrow">{data.context.householdName} · tryb lodówkowy</p>
            <h1>Cześć, {data.context.profileDisplayName}!</h1>
          </div>
          <TabletClock />
          <Link className="tablet-exit" href="/app">
            Pełna aplikacja ↗
          </Link>
        </header>

        <ProfileSwitcher
          activeProfileId={data.context.profileId}
          members={members}
        />

        <section className="tablet-summary" aria-label="Podsumowanie">
          <article><strong>{data.userWeeklyPoints}</strong><span>Twoje punkty</span></article>
          <article><strong>{data.householdWeeklyPoints}</strong><span>Punkty domu</span></article>
          <article><strong>{streaks.householdCurrent}</strong><span>Seria domu</span></article>
          <article><strong>{data.todayTasks.length}</strong><span>Na dzisiaj</span></article>
        </section>

        <div className="tablet-board">
          <section>
            <div className="section-heading">
              <h2>Do zrobienia dzisiaj</h2>
              <span>{data.todayTasks.length} pozostało</span>
            </div>
            <div className="tablet-task-list">
              {data.todayTasks.length === 0 ? (
                <article className="empty-state">
                  <span aria-hidden="true">✨</span>
                  <strong>Wszystko gotowe!</strong>
                  <p>Możecie odpocząć albo wybrać szybkie zadanie.</p>
                </article>
              ) : (
                data.todayTasks.map((task) => (
                  <article className="tablet-task" key={task.id}>
                    <span aria-hidden="true">{task.icon ?? "✓"}</span>
                    <div>
                      <strong>{task.name}</strong>
                      <small>
                        {formatTaskAttributes(task.attributes) || "Zadanie domowe"}
                        {task.assignedToName ? ` · ${task.assignedToName}` : " · dla każdego"}
                      </small>
                    </div>
                    <form action={completeTask}>
                      <input name="plannedTaskId" type="hidden" value={task.id} />
                      <button type="submit" aria-label={`Wykonano: ${task.name}`}>✓</button>
                    </form>
                  </article>
                ))
              )}
            </div>
          </section>

          <aside className="tablet-side">
            <section>
              <div className="section-heading">
                <h2>Szybkie zadania</h2>
                <span>{data.context.profileDisplayName}</span>
              </div>
              <div className="tablet-shortcuts">
                {shortcuts.shortcuts.slice(0, 6).map((shortcut) => (
                  <form action={completeTaskShortcut} key={shortcut.taskTemplateId}>
                    <input name="taskTemplateId" type="hidden" value={shortcut.taskTemplateId} />
                    <button type="submit">
                      <span aria-hidden="true">{shortcut.icon ?? "✓"}</span>
                      {shortcut.name}
                    </button>
                  </form>
                ))}
                {shortcuts.shortcuts.length === 0 && (
                  <p className="tablet-note">Skróty można dodać w pełnej aplikacji.</p>
                )}
              </div>
            </section>

            <section>
              <div className="section-heading">
                <h2>Misje</h2>
                <Link href="/app/missions">Wszystkie</Link>
              </div>
              <div className="tablet-missions">
                {missions.slice(0, 2).map((mission) => (
                  <article key={mission.code}>
                    <span aria-hidden="true">{mission.icon}</span>
                    <div><strong>{mission.name}</strong><small>{mission.progress}%</small></div>
                    <div className="mission-progress"><div style={{ width: `${mission.progress}%` }} /></div>
                  </article>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
