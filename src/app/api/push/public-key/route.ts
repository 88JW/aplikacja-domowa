import { ensureHomeContext } from "@/lib/home";
import { requireSsoUser } from "@/lib/sso";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await requireSsoUser();
  await ensureHomeContext(user);
  const publicKey = process.env.VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return NextResponse.json(
      { error: "Powiadomienia push nie są skonfigurowane." },
      { status: 503 },
    );
  }

  return NextResponse.json({ publicKey });
}
