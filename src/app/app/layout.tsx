import Link from "next/link";
import { ensureHomeContext, getHouseholdMembers } from "@/lib/home";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { requireSsoUser } from "@/lib/sso";
import { ProfileSwitcher } from "./profile/profile-switcher";
import { Celebration } from "./celebration";
import { HomeAssistant } from "@/app/components/home-assistant";

const navigation = [
  { href: "/app", icon: "✓", label: "Dzisiaj" },
  { href: "/app/plan", icon: "▦", label: "Plan" },
  { href: "/app/history", icon: "◴", label: "Historia" },
  { href: "/app/notifications", icon: "🔔", label: "Alerty" },
  { href: "/app/achievements", icon: "🏆", label: "Cele" },
  { href: "/app/trash", icon: "🗑️", label: "Śmieci" },
  { href: "/app/more", icon: "•••", label: "Więcej" },
];

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const [unreadCount, members] = await Promise.all([
    getUnreadNotificationCount(context),
    getHouseholdMembers(context),
  ]);
  const profileTheme =
    context.profileEmail.toLowerCase() === "iza.hille@gmail.com"
      ? "iza"
      : "wojtek";

  return (
    <div className="app-theme" data-profile-theme={profileTheme}>
      <Celebration />
      <HomeAssistant />
      <div className="profile-switcher-wrap">
        <ProfileSwitcher
          activeProfileId={context.profileId}
          members={members}
        />
      </div>
      {children}
      <nav className="bottom-nav" aria-label="Główna nawigacja">
        {navigation.map((item) => (
          <Link href={item.href} key={item.href}>
            <span className="nav-icon" aria-hidden="true">
              {item.icon}
              {item.href === "/app/notifications" && unreadCount > 0 && (
                <b className="notification-badge">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </b>
              )}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
