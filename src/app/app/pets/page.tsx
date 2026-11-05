import { db } from "@/lib/db";
import { ensureHomeContext, getHouseholdMembers } from "@/lib/home";
import { requireSsoUser } from "@/lib/sso";
import { addPetShortcut, addPetTask, archivePetTask, completePetShortcut, removePetCompletion, removePetShortcut } from "./actions";
import { PetCountdowns } from "./pet-countdowns";

type PetTask = { id: string; name: string; schedule: "morning" | "evening" | "both" | "manual" };
const labels = { morning: "Rano", evening: "Wieczorem", manual: "Dzisiaj" };
export default async function PetsPage() {
  const home = await ensureHomeContext(await requireSsoUser());
  const result = await db.query<PetTask>(`select t.id, t.name, t.schedule from home_tasks.pet_tasks t
    where t.household_id = $1 and t.archived_at is null
    order by t.created_at, t.id`, [home.householdId]);
  const [members, totals, history, shortcuts, countdowns] = await Promise.all([
    getHouseholdMembers(home),
    db.query<{ taskId: string; taskName: string; profileId: string; count: number }>(`select t.id as "taskId", t.name as "taskName", c.completed_by as "profileId", count(*)::int as count
      from home_tasks.pet_task_completions c join home_tasks.pet_tasks t on t.id = c.task_id
      where t.household_id = $1 and c.completion_date >= date_trunc('month', now() at time zone 'Europe/Warsaw')::date
        and c.completion_date < (date_trunc('month', now() at time zone 'Europe/Warsaw') + interval '1 month')::date
      group by t.id, t.name, c.completed_by order by t.name`, [home.householdId]),
    db.query<{ id: string; name: string; slot: "morning" | "evening" | "manual" | "extra"; completedBy: string | null; completedAt: Date }>(`select c.id, t.name, c.slot, p.display_name as "completedBy", c.completed_at as "completedAt"
      from home_tasks.pet_task_completions c join home_tasks.pet_tasks t on t.id = c.task_id
      left join home_tasks.profiles p on p.id = c.completed_by
      where t.household_id = $1 order by c.completed_at desc limit 30`, [home.householdId]),
    db.query<{ id: string; name: string }>(`select t.id, t.name from home_tasks.pet_task_shortcuts s
      join home_tasks.pet_tasks t on t.id = s.task_id where s.profile_id = $1 and t.household_id = $2 and t.archived_at is null
      order by s.created_at, t.name`, [home.profileId, home.householdId]),
    db.query<{ id: string; name: string; slot: "morning" | "evening"; nextAt: Date; previousAt: Date; serverTime: Date }>(`select t.id, t.name, due.slot, due.next_at as "nextAt", due.previous_at as "previousAt", now() as "serverTime"
      from home_tasks.pet_tasks t
      cross join lateral (
        select s.slot, (d.day + s.due_time) at time zone 'Europe/Warsaw' as next_at,
          (case when s.slot = 'morning' then (d.day - 1) + time '18:00' else d.day + time '07:00' end) at time zone 'Europe/Warsaw' as previous_at
        from generate_series(0, 2) offset_days
        cross join lateral (select (now() at time zone 'Europe/Warsaw')::date + offset_days as day) d
        cross join (values ('morning', time '07:00'), ('evening', time '18:00')) s(slot, due_time)
        where (d.day + s.due_time) at time zone 'Europe/Warsaw' > now()
          and not exists (select 1 from home_tasks.pet_task_completions c where c.task_id = t.id and c.completion_date = d.day and c.slot = s.slot)
        order by next_at limit 1
      ) due
      where t.household_id = $1 and t.archived_at is null and t.show_countdown order by t.created_at, t.id`, [home.householdId]),
  ]);
  const uniqueTasks = result.rows;
  const monthlyTasks = [...new Map(totals.rows.map(row => [row.taskId, row.taskName])).entries()];
  const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Warsaw" });
  return <main className="shell pets-page">
    <p className="eyebrow">{home.householdName}</p><h1>🐾 Zwierzaki</h1>
    <p className="lead">Wspólna opieka na dziś. Zaznacz wykonanie i sprawdź osobny wynik zwierzaków.</p>
    <PetCountdowns initialTime={countdowns.rows[0]?.serverTime.getTime() ?? 0} items={countdowns.rows.map(item => ({ id: item.id, name: item.name, slot: item.slot, nextAt: item.nextAt.toISOString(), previousAt: item.previousAt.toISOString() }))} />
    <div className="section-heading"><h2>Szybkie zadania</h2><span>{home.profileDisplayName}</span></div>
    <section className="shortcut-panel">
      <p>Jedno kliknięcie zapisuje wykonanie na Twoim profilu.</p>
      <div className="shortcut-grid">{shortcuts.rows.map(task => <article className="shortcut-card" key={task.id}>
        <form action={completePetShortcut}><input type="hidden" name="id" value={task.id}/><button className="shortcut-complete" type="submit"><span aria-hidden="true">🐾</span><strong>{task.name}</strong><small>Zapisz wykonanie</small></button></form>
        <form action={removePetShortcut}><input type="hidden" name="id" value={task.id}/><button className="shortcut-remove" type="submit" aria-label={`Usuń skrót ${task.name}`}>×</button></form>
      </article>)}</div>
      {uniqueTasks.some(task => !shortcuts.rows.some(shortcut => shortcut.id === task.id)) && <details className="shortcut-add"><summary>+ Dodaj skrót</summary><form action={addPetShortcut}><select name="id" aria-label="Wybierz zadanie" required>{uniqueTasks.filter(task => !shortcuts.rows.some(shortcut => shortcut.id === task.id)).map(task => <option value={task.id} key={task.id}>{task.name}</option>)}</select><button className="secondary-button" type="submit">Dodaj</button></form></details>}
    </section>
    <div className="section-heading"><h2>Wynik w tym miesiącu</h2><span>Liczba wykonań</span></div>
    <section className="summary" aria-label="Miesięczny wynik zwierzaków">
      {members.map(member => <article className="metric" key={member.profileId}><strong>{totals.rows.filter(row => row.profileId === member.profileId).reduce((sum, row) => sum + row.count, 0)}</strong><span>{member.displayName}</span></article>)}
    </section>
    {monthlyTasks.length > 0 && <div className="matrix-scroll"><table className="completion-matrix"><thead><tr><th>Zadanie</th>{members.map(member => <th key={member.profileId}>{member.displayName}</th>)}</tr></thead><tbody>{monthlyTasks.map(([id, name]) => <tr key={id}><th>{name}</th>{members.map(member => <td key={member.profileId}>{totals.rows.find(row => row.taskId === id && row.profileId === member.profileId)?.count ?? 0}</td>)}</tr>)}</tbody></table></div>}
    {result.rows.length === 0 && <p>Dodaj pierwsze zadanie dla zwierzaków.</p>}
    <details className="planner-card"><summary>Historia zwierzaków</summary>{history.rows.length === 0 ? <p>Jeszcze nic nie zapisano.</p> : history.rows.map(item => <article className="pet-manage" key={item.id}><span><strong>{item.name}</strong><br/><small>{item.completedBy ?? "Domownik"} · {item.slot === "extra" ? "dodatkowo" : labels[item.slot]} · {dateFormatter.format(new Date(item.completedAt))}</small></span><form action={removePetCompletion}><input type="hidden" name="id" value={item.id}/><button className="secondary-button" type="submit">Usuń</button></form></article>)}</details>
    <form className="planner-card" action={addPetTask}><h2>Dodaj zadanie</h2>
      <label>Nazwa<input name="name" maxLength={100} placeholder="Np. podać leki" required /></label>
      <label>Kiedy<select name="schedule" defaultValue="manual"><option value="manual">Codziennie, bez przypomnienia</option><option value="morning">Codziennie rano</option><option value="evening">Codziennie wieczorem</option><option value="both">Codziennie rano i wieczorem</option></select></label>
      <button className="primary-button" type="submit">Dodaj zadanie</button>
      <small className="form-hint">Przypomnienia są wysyłane około 7:00 i 18:00, jeśli zadanie nie jest jeszcze wykonane.</small>
    </form>
    <details className="planner-card"><summary>Zarządzaj zadaniami</summary>{uniqueTasks.map(task => <form className="pet-manage" action={archivePetTask} key={task.id}><input type="hidden" name="id" value={task.id}/><span>{task.name} · {task.schedule === "both" ? "rano i wieczorem" : task.schedule === "manual" ? "bez przypomnienia" : labels[task.schedule].toLowerCase()}</span><button className="secondary-button" type="submit">Usuń</button></form>)}</details>
  </main>;
}
