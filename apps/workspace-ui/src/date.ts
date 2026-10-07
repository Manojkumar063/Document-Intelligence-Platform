export function formatDateLabel(value: string | null): string {
  if (!value) return "No due date";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
