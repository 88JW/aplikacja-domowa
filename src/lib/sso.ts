import { headers } from "next/headers";
import { redirect } from "next/navigation";

export type SsoUser = {
  subject: string;
  email: string;
  displayName: string;
};

const EMAIL_ALIASES = new Map([
  ["derastro@gmail.com", "w.jaskula8@gmail.com"],
]);

export async function requireSsoUser(): Promise<SsoUser> {
  const requestHeaders = await headers();
  const forwardedUser = requestHeaders.get("x-forwarded-user")?.trim();
  const forwardedEmail = requestHeaders
    .get("x-forwarded-email")
    ?.trim()
    .toLowerCase();

  if (!forwardedUser) {
    throw new Error(
      "Brak danych użytkownika SSO. Dostęp do aplikacji musi prowadzić przez Traefika.",
    );
  }

  const rawSubject = forwardedUser.toLowerCase();
  const rawEmail = forwardedEmail ?? rawSubject;
  const email = EMAIL_ALIASES.get(rawEmail) ?? rawEmail;
  const subject = EMAIL_ALIASES.has(rawEmail)
    ? email
    : (EMAIL_ALIASES.get(rawSubject) ?? rawSubject);
  const allowedEmails = new Set(
    (process.env.ALLOWED_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );

  if (!allowedEmails.has(email)) {
    redirect("/denied");
  }

  const displayName = subject.includes("@")
    ? subject.split("@")[0]
    : forwardedUser;

  return {
    subject,
    email,
    displayName,
  };
}
