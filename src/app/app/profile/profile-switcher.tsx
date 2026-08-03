"use client";

import type { HouseholdMember } from "@/lib/home";
import { usePathname } from "next/navigation";
import { switchActiveProfile } from "./actions";

export function ProfileSwitcher({
  activeProfileId,
  members,
}: {
  activeProfileId: string;
  members: HouseholdMember[];
}) {
  const pathname = usePathname();

  return (
    <aside className="profile-switcher" aria-label="Aktywny domownik">
      <span>Kto teraz korzysta?</span>
      <div>
        {members.map((member) => {
          const isActive = member.profileId === activeProfileId;
          const isIza = member.email.toLowerCase() === "iza.hille@gmail.com";

          return (
            <form action={switchActiveProfile} key={member.profileId}>
              <input name="profileId" type="hidden" value={member.profileId} />
              <input name="returnTo" type="hidden" value={pathname} />
              <button
                aria-pressed={isActive}
                className={`profile-choice profile-choice-${isIza ? "iza" : "wojtek"}`}
                disabled={isActive}
                type="submit"
              >
                <b aria-hidden="true">{isIza ? "I" : "W"}</b>
                {member.displayName}
                {isActive && <small>aktywny</small>}
              </button>
            </form>
          );
        })}
      </div>
    </aside>
  );
}
