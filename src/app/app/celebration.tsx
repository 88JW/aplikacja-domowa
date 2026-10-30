import { cookies } from "next/headers";
import { CELEBRATION_COOKIE } from "@/lib/celebration";
import { CelebrationPopup } from "./celebration-popup";

export async function Celebration() {
  const value = (await cookies()).get(CELEBRATION_COOKIE)?.value;
  return <CelebrationPopup key={value ?? "empty"} value={value} />;
}
