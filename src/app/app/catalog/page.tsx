import { ensureHomeContext } from "@/lib/home";
import { getPlanningOptions } from "@/lib/planning";
import { requireSsoUser } from "@/lib/sso";
import Link from "next/link";
import { CatalogTaskBrowser } from "./catalog-task-browser";
import { createTaskAttribute, createTaskTemplate } from "./actions";

export default async function CatalogPage() {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const options = await getPlanningOptions(context);
  const spaces = options.attributes.filter(
    (attribute) => attribute.kind === "space",
  );
  const activities = options.attributes.filter(
    (attribute) => attribute.kind === "activity",
  );

  return (
    <main className="shell catalog-page">
      <p className="eyebrow">{context.householdName}</p>
      <h1>Katalog zadań</h1>
      <p className="lead">
        Tu są wszystkie czynności, które można zaplanować albo dodać jako skrót.
        Najpierw wybierz, co chcesz zrobić, a potem gdzie.
      </p>

      <section className="catalog-summary" aria-label="Podsumowanie katalogu">
        <article>
          <span aria-hidden="true">✓</span>
          <strong>{options.templates.length}</strong>
          <small>Zadań</small>
        </article>
        <article>
          <span aria-hidden="true">🧽</span>
          <strong>{activities.length}</strong>
          <small>Czynności</small>
        </article>
        <article>
          <span aria-hidden="true">📍</span>
          <strong>{spaces.length}</strong>
          <small>Miejsc</small>
        </article>
      </section>

      <section className="catalog-explainer" aria-label="Jak działa katalog">
        <div>
          <span>1</span>
          <p>
            <strong>Czynność</strong>
            <small>Co robisz, np. odkurzanie lub mycie.</small>
          </p>
        </div>
        <div aria-hidden="true" className="catalog-explainer-arrow">
          +
        </div>
        <div>
          <span>2</span>
          <p>
            <strong>Miejsce</strong>
            <small>Gdzie to robisz, np. kuchnia lub salon.</small>
          </p>
        </div>
        <div aria-hidden="true" className="catalog-explainer-arrow">
          =
        </div>
        <div>
          <span>3</span>
          <p>
            <strong>Zadanie</strong>
            <small>Konkretna pozycja gotowa do użycia.</small>
          </p>
        </div>
      </section>

      <section className="catalog-create-panels">
        <details className="catalog-create-panel">
          <summary>
            <span aria-hidden="true">＋</span>
            <span>
              <strong>Dodaj nowe zadanie</strong>
              <small>Połącz czynność z jednym lub kilkoma miejscami</small>
            </span>
          </summary>
          <form className="catalog-create-form" action={createTaskTemplate}>
            <div className="form-row">
              <label>
                Ikona
                <input maxLength={12} name="icon" placeholder="✨" />
              </label>
              <label>
                Nazwa zadania
                <input
                  maxLength={100}
                  name="name"
                  placeholder="np. Wyczyścić kuwetę"
                  required
                />
              </label>
            </div>
            <div className="attribute-picker">
              <fieldset>
                <legend>1. Co robisz?</legend>
                {activities.map((attribute) => (
                  <label key={attribute.id}>
                    <input
                      name="attributeIds"
                      type="checkbox"
                      value={attribute.id}
                    />
                    <span>
                      {attribute.icon ?? "✓"} {attribute.name}
                    </span>
                  </label>
                ))}
              </fieldset>
              <fieldset>
                <legend>2. Gdzie?</legend>
                {spaces.map((attribute) => (
                  <label key={attribute.id}>
                    <input
                      name="attributeIds"
                      type="checkbox"
                      value={attribute.id}
                    />
                    <span>
                      {attribute.icon ?? "📍"} {attribute.name}
                    </span>
                  </label>
                ))}
              </fieldset>
            </div>
            <p className="form-hint">
              Możesz zaznaczyć kilka odpowiedzi. Jedno wykonanie zadania zasili
              wszystkie pasujące osiągnięcia i wyzwania.
            </p>
            <button className="primary-button" type="submit">
              Zapisz zadanie
            </button>
          </form>
        </details>

        <details className="catalog-create-panel">
          <summary>
            <span aria-hidden="true">✎</span>
            <span>
              <strong>Dodaj czynność lub miejsce</strong>
              <small>Gdy potrzebnej pozycji nie ma jeszcze na liście</small>
            </span>
          </summary>
          <form
            className="catalog-create-form compact-form"
            action={createTaskAttribute}
          >
            <label>
              Co dodajesz?
              <select defaultValue="space" name="kind" required>
                <option value="activity">Czynność — co robisz</option>
                <option value="space">Miejsce — gdzie to robisz</option>
              </select>
            </label>
            <div className="form-row">
              <label>
                Ikona
                <input maxLength={12} name="icon" placeholder="🏠" />
              </label>
              <label>
                Nazwa
                <input
                  maxLength={60}
                  name="name"
                  placeholder="np. Mycie okien albo Garaż"
                  required
                />
              </label>
            </div>
            <p className="form-hint">
              Nowa pozycja pojawi się od razu przy tworzeniu i filtrowaniu
              zadań.
            </p>
            <button className="secondary-button" type="submit">
              Dodaj do katalogu
            </button>
          </form>
        </details>
      </section>

      <div className="section-heading catalog-list-heading">
        <div>
          <p className="eyebrow">Przeglądaj</p>
          <h2>Wszystkie zadania</h2>
        </div>
        <Link className="catalog-hidden-link" href="/app/catalog/hidden">
          Ukryte zadania
        </Link>
      </div>

      <CatalogTaskBrowser
        activities={activities}
        spaces={spaces}
        tasks={options.templates}
      />
    </main>
  );
}
