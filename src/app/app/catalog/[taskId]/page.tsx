import { ensureHomeContext } from "@/lib/home";
import { getPlanningOptions, getTaskTemplate } from "@/lib/planning";
import { requireSsoUser } from "@/lib/sso";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateTaskTemplate } from "../actions";

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const [task, options] = await Promise.all([
    getTaskTemplate(context, taskId),
    getPlanningOptions(context),
  ]);

  if (!task) {
    notFound();
  }

  return (
    <main className="shell">
      <p className="eyebrow">{context.householdName}</p>
      <h1>Edytuj zadanie</h1>
      <p className="lead">
        Zmiana nazwy, przestrzeni lub czynności zachowuje wcześniejszą historię
        wykonań.
      </p>

      <form className="planner-card" action={updateTaskTemplate}>
        <input name="taskTemplateId" type="hidden" value={task.id} />
        <label>
          Nazwa
          <input
            defaultValue={task.name}
            maxLength={100}
            name="name"
            required
          />
        </label>
        <label>
          Ikona
          <input defaultValue={task.icon ?? ""} maxLength={12} name="icon" />
        </label>
        <div className="attribute-picker">
          <fieldset>
            <legend>Gdzie?</legend>
            {options.attributes
              .filter((attribute) => attribute.kind === "space")
              .map((attribute) => (
                <label key={attribute.id}>
                  <input
                    defaultChecked={task.attributes.some(
                      (selected) => selected.id === attribute.id,
                    )}
                    name="attributeIds"
                    type="checkbox"
                    value={attribute.id}
                  />
                  <span>
                    {attribute.icon} {attribute.name}
                  </span>
                </label>
              ))}
          </fieldset>
          <fieldset>
            <legend>Co robisz?</legend>
            {options.attributes
              .filter((attribute) => attribute.kind === "activity")
              .map((attribute) => (
                <label key={attribute.id}>
                  <input
                    defaultChecked={task.attributes.some(
                      (selected) => selected.id === attribute.id,
                    )}
                    name="attributeIds"
                    type="checkbox"
                    value={attribute.id}
                  />
                  <span>
                    {attribute.icon} {attribute.name}
                  </span>
                </label>
              ))}
          </fieldset>
        </div>
        <p className="form-hint">
          Wybierz co najmniej jedną odpowiedź. Przestrzenie i czynności
          naliczają równolegle pasujące wyzwania.
        </p>
        <button className="primary-button" type="submit">
          Zapisz zmiany
        </button>
        <Link className="text-link" href="/app/catalog">
          Wróć do katalogu
        </Link>
      </form>
    </main>
  );
}
