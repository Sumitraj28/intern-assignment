export function formatDate(date) {
  if (date instanceof Date && !Number.isNaN(date.getTime())) {
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  if (typeof date === "string") {
    return date.slice(0, 10);
  }
  return String(date);
}

export function dateValue(date) {
  const val = date instanceof Date ? date.getTime() : new Date(date).getTime();
  return Number.isNaN(val) ? 0 : val;
}
