import { cookies } from "next/headers";

export const CELEBRATION_COOKIE = "homeapp-celebration";

export async function queueTaskCelebration(
  displayName: string,
  taskName: string,
  achievements: Array<{ name: string; icon: string }> = [],
) {
  const value = encodeURIComponent(
    JSON.stringify({
      id: crypto.randomUUID(),
      title: `Gratulacje, ${displayName}!`,
      message: `Zadanie „${taskName}” zostało wykonane.`,
      detail: "+1 punkt · Wykonanie zapisane w historii",
      achievement: achievements.length > 0,
      achievementMessage: achievements[0]
        ? `${achievements[0].icon} Zdobyto odznakę „${achievements[0].name}”${achievements.length > 1 ? ` i ${achievements.length - 1} kolejne.` : "."}`
        : undefined,
    }),
  );

  (await cookies()).set(CELEBRATION_COOKIE, value, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30,
  });
}

export async function queueAchievementCelebration(
  name: string,
  icon: string,
  extraCount = 0,
) {
  const value = encodeURIComponent(
    JSON.stringify({
      id: crypto.randomUUID(),
      title: `${icon} Nowa odznaka!`,
      message:
        extraCount > 0
          ? `Zdobyto „${name}” oraz ${extraCount} kolejne osiągnięcia.`
          : `Zdobyto osiągnięcie „${name}”.`,
      achievement: true,
    }),
  );

  (await cookies()).set(CELEBRATION_COOKIE, value, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30,
  });
}
