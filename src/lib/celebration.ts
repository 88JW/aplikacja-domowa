import { cookies } from "next/headers";

export const CELEBRATION_COOKIE = "homeapp-celebration";

export async function queueTaskCelebration(displayName: string) {
  const value = encodeURIComponent(
    JSON.stringify({
      title: "+1 punkt!",
      message: `Brawo, ${displayName}! Dom jest o krok bardziej ogarnięty.`,
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
