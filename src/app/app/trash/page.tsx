import { ensureHomeContext } from "@/lib/home";
import { requireSsoUser } from "@/lib/sso";
import { getWasteData } from "@/lib/waste";
import { TrashTracker } from "./trash-tracker";

function currentMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}`;
}

export default async function TrashPage({ searchParams }: { searchParams: Promise<{ month?: string | string[] }> }) {
  const params = await searchParams;
  const month = typeof params.month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month) ? params.month : currentMonth();
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const data = await getWasteData(context, `${month}-01`);

  return <main className="shell waste-page"><p className="eyebrow">{context.householdName}</p><h1>Śmieci</h1><p className="lead">Zapisuj wystawione worki i terminy odbiorów.</p><TrashTracker month={month} {...data} /></main>;
}
