import { ensureHomeContext } from "@/lib/home";
import { getNotifications } from "@/lib/notifications";
import { requireSsoUser } from "@/lib/sso";
import Link from "next/link";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "./actions";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Warsaw",
});

export default async function NotificationsPage() {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const notifications = await getNotifications(context);
  const unreadCount = notifications.filter((item) => !item.readAt).length;

  return (
    <main className="shell">
      <p className="eyebrow">{context.householdName}</p>
      <div className="title-row">
        <div>
          <h1>Powiadomienia</h1>
          <p className="lead">Przypisane zadania i ważne zdarzenia domu.</p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllNotificationsRead}>
            <button className="secondary-button" type="submit">
              Przeczytaj wszystkie
            </button>
          </form>
        )}
      </div>

      <section className="notification-list">
        {notifications.length === 0 ? (
          <article className="empty-state">
            <span aria-hidden="true">🔔</span>
            <strong>Brak powiadomień</strong>
            <p>Nowe przypisania zadań pojawią się w tym miejscu.</p>
          </article>
        ) : (
          notifications.map((notification) => (
            <article
              className={`notification-item ${
                notification.readAt ? "" : "notification-unread"
              }`}
              key={notification.id}
            >
              <span className="notification-symbol" aria-hidden="true">
                {notification.readAt ? "✓" : "🔔"}
              </span>
              <div>
                <strong>{notification.title}</strong>
                <p>{notification.body}</p>
                <time>
                  {dateFormatter.format(new Date(notification.createdAt))}
                </time>
              </div>
              <div className="notification-actions">
                {!notification.readAt && (
                  <form action={markNotificationRead}>
                    <input
                      name="notificationId"
                      type="hidden"
                      value={notification.id}
                    />
                    <button className="icon-button" type="submit">
                      Przeczytane
                    </button>
                  </form>
                )}
                <Link href={notification.href}>Otwórz</Link>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
