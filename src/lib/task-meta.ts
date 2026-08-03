export type TaskAttributeMeta = {
  name: string;
  icon: string | null;
  kind: "space" | "activity";
};

export function formatTaskAttributes(attributes: TaskAttributeMeta[]) {
  const spaces = attributes
    .filter((attribute) => attribute.kind === "space")
    .map((attribute) => `${attribute.icon ?? "📍"} ${attribute.name}`)
    .join(", ");
  const activities = attributes
    .filter((attribute) => attribute.kind === "activity")
    .map((attribute) => `${attribute.icon ?? "✓"} ${attribute.name}`)
    .join(", ");

  return [spaces ? `Gdzie: ${spaces}` : null, activities ? `Co: ${activities}` : null]
    .filter(Boolean)
    .join(" · ");
}
