import { ensureHomeContext } from "@/lib/home";
import { requireSsoUser } from "@/lib/sso";
import Link from "next/link";
import { updateProfile } from "./actions";
import { PushSettings } from "./push-settings";
import { ConnectionStatus } from "./connection-status";
import packageJson from "../../../../package.json";

export default async function MorePage() {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);

  return (
    <main className="shell">
      <p className="eyebrow">{context.householdName}</p>
      <h1>Więcej</h1>
      <p className="lead">Profil oraz pozostałe ustawienia gospodarstwa.</p>

      <form className="planner-card" action={updateProfile}>
        <h2>Aktywny profil: {context.profileDisplayName}</h2>
        <label>
          Wyświetlana nazwa
          <input
            defaultValue={context.profileDisplayName}
            maxLength={60}
            name="displayName"
            required
          />
        </label>
        <small className="form-hint">
          Profil: {context.profileEmail} · dostęp Google: {user.email}
        </small>
        <button className="primary-button" type="submit">
          Zapisz nazwę
        </button>
      </form>

      <PushSettings />

      <section className="more-links">
        <Link href="/app/ranking">
          <span aria-hidden="true">★</span>
          <div>
            <strong>Ranking</strong>
            <small>Punkty Wojtka i Izy</small>
          </div>
          <b aria-hidden="true">›</b>
        </Link>
        <Link href="/app/map">
          <span aria-hidden="true">🏡</span>
          <div>
            <strong>Mapa domu</strong>
            <small>Pomieszczenia i dzisiejsze zadania</small>
          </div>
          <b aria-hidden="true">›</b>
        </Link>
        <Link href="/tablet">
          <span aria-hidden="true">🧊</span>
          <div>
            <strong>Tryb lodówkowy</strong>
            <small>Duży, stały ekran dla tabletu 8″</small>
          </div>
          <b aria-hidden="true">›</b>
        </Link>
        <details className="more-submenu">
          <summary>
            <span aria-hidden="true">🏆</span>
            <div>
              <strong>Cele i statystyki</strong>
              <small>Misje, odznaki, album i wyniki</small>
            </div>
            <b aria-hidden="true">⌄</b>
          </summary>
          <div className="more-submenu-links">
            <Link href="/app/achievements">
              <span aria-hidden="true">🏅</span>
              <div>
                <strong>Cele domu</strong>
                <small>Osiągnięcia i podgląd wspólnych misji</small>
              </div>
              <b aria-hidden="true">›</b>
            </Link>
            <Link href="/app/missions">
              <span aria-hidden="true">🗺️</span>
              <div>
                <strong>Wspólne misje</strong>
                <small>Większe akcje i postęp całego domu</small>
              </div>
              <b aria-hidden="true">›</b>
            </Link>
            <Link href="/app/achievements/history">
              <span aria-hidden="true">📖</span>
              <div>
                <strong>Album odznak</strong>
                <small>Osiągnięcia z poprzednich miesięcy</small>
              </div>
              <b aria-hidden="true">›</b>
            </Link>
            <Link href="/app/stats">
              <span aria-hidden="true">📊</span>
              <div>
                <strong>Statystyki</strong>
                <small>Wyniki, rytm pracy, miejsca i czynności</small>
              </div>
              <b aria-hidden="true">›</b>
            </Link>
          </div>
        </details>
        <Link href="/app/notifications">
          <span aria-hidden="true">🔔</span>
          <div>
            <strong>Powiadomienia</strong>
            <small>Przypisania zadań i ustawienia urządzenia</small>
          </div>
          <b aria-hidden="true">›</b>
        </Link>
        <Link href="/app/catalog">
          <span aria-hidden="true">☷</span>
          <div>
            <strong>Katalog zadań</strong>
            <small>Dodawaj zadania, przestrzenie i czynności</small>
          </div>
          <b aria-hidden="true">›</b>
        </Link>
      </section>

      <ConnectionStatus version={packageJson.version} />
    </main>
  );
}
