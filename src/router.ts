export type Route =
  | { name: "today" }
  | { name: "dictionary"; q: string }
  | { name: "entry"; entryId: string; senseId?: string }
  | { name: "words" }
  | { name: "progress" }
  | { name: "settings" }
  | { name: "review" }
  | { name: "install" }
  | { name: "diagnostic" };

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, "") || "/today";
  const [path, queryString] = raw.split("?");
  const parts = path.split("/").filter(Boolean);
  const query = new URLSearchParams(queryString ?? "");
  const head = parts[0] ?? "today";
  if (head === "dictionary" && parts[1]) return { name: "entry", entryId: parts[1], senseId: parts[2] };
  if (head === "dictionary") return { name: "dictionary", q: query.get("q") ?? "" };
  if (head === "words" || head === "progress" || head === "settings" || head === "review" || head === "install" || head === "diagnostic") {
    return { name: head };
  }
  return { name: "today" };
}

export function toHash(route: Route): string {
  switch (route.name) {
    case "dictionary":
      return route.q ? `#/dictionary?q=${encodeURIComponent(route.q)}` : "#/dictionary";
    case "entry":
      return route.senseId ? `#/dictionary/${route.entryId}/${route.senseId}` : `#/dictionary/${route.entryId}`;
    case "today":
      return "#/today";
    default:
      return `#/${route.name}`;
  }
}

export function go(route: Route): void {
  window.location.hash = toHash(route);
}
