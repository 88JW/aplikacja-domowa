"use client";

import { useFormStatus } from "react-dom";
import { completeUnplannedTask } from "./actions";

function SubmitButton({ profileName, taskName }: { profileName: string; taskName: string }) {
  const { pending } = useFormStatus();
  const label = `Dodaj kolejne wykonanie zadania „${taskName}” dla profilu ${profileName}`;

  return (
    <button
      aria-label={label}
      className="matrix-repeat-button"
      disabled={pending}
      title={label}
      type="submit"
    >
      {pending ? "…" : "+"}
    </button>
  );
}

export function RepeatTaskButton({
  profileName,
  taskName,
  taskTemplateId,
}: {
  profileName: string;
  taskName: string;
  taskTemplateId: string;
}) {
  return (
    <form action={completeUnplannedTask} className="matrix-repeat-form">
      <input name="taskTemplateId" type="hidden" value={taskTemplateId} />
      <SubmitButton profileName={profileName} taskName={taskName} />
    </form>
  );
}
