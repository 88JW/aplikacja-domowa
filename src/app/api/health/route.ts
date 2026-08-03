import { NextResponse } from "next/server";
import packageJson from "../../../../package.json";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const checkedAt = new Date().toISOString();

  try {
    await db.query("select 1");

    return NextResponse.json(
      {
        status: "ok",
        version: packageJson.version,
        checkedAt,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        status: "unavailable",
        version: packageJson.version,
        checkedAt,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
