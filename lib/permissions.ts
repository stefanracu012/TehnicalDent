// =============================================
// Admin page permissions. Shared by the middleware (Edge), the API routes
// (Node) and the nav — one list, so a page can't be protected in one place
// and forgotten in another.
// =============================================

export const PERMISSIONS = [
  { key: "dashboard", label: "Panou principal", path: "/admin" },
  { key: "programari", label: "Programări", path: "/admin/programari" },
  { key: "pacienti", label: "Pacienți", path: "/admin/pacienti" },
  { key: "calendar", label: "Calendar disponibilitate", path: "/admin/calendar" },
  { key: "servicii", label: "Servicii", path: "/admin/servicii" },
  { key: "echipa", label: "Echipă", path: "/admin/echipa" },
  { key: "testimoniale", label: "Testimoniale", path: "/admin/testimoniale" },
  { key: "galerie", label: "Galerie", path: "/admin/galerie" },
  { key: "blog", label: "Blog", path: "/admin/blog" },
  { key: "mesaje", label: "Mesaje site", path: "/admin/mesaje" },
  { key: "whatsapp", label: "WhatsApp", path: "/admin/whatsapp" },
  { key: "messenger", label: "Messenger", path: "/admin/messenger" },
  { key: "instagram", label: "Instagram", path: "/admin/instagram" },
  { key: "campanii", label: "Campanii", path: "/admin/campanii" },
  { key: "utilizatori", label: "Utilizatori", path: "/admin/utilizatori" },
  { key: "setari", label: "Setări", path: "/admin/setari" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export const ALL_PERMISSION_KEYS: string[] = PERMISSIONS.map((p) => p.key);

/**
 * The owner account holds this instead of a copy of every key. Permissions
 * are baked into the session at login, so a static list would silently stop
 * covering pages added after that session was issued.
 */
export const SUPER_ADMIN = "*";

/** Whether a permission list grants a key. Used by the proxy, APIs and nav. */
export function grantsPermission(
  perms: readonly string[] | undefined | null,
  key: string | null,
): boolean {
  if (!key) return true;
  if (!Array.isArray(perms)) return false;
  return perms.includes(SUPER_ADMIN) || perms.includes(key);
}

/**
 * Which permission a path needs. Longest path wins so /admin/programari is
 * not matched by the "/admin" dashboard entry.
 */
export function permissionForPath(pathname: string): string | null {
  let best: { key: string; length: number } | null = null;
  for (const p of PERMISSIONS) {
    if (pathname === p.path || pathname.startsWith(p.path + "/")) {
      if (!best || p.path.length > best.length) {
        best = { key: p.key, length: p.path.length };
      }
    }
  }
  return best?.key ?? null;
}

/** API routes mirror the page paths: /api/admin/patients -> pacienti, etc. */
const API_PERMISSION_MAP: Record<string, string> = {
  appointments: "programari",
  patients: "pacienti",
  availability: "calendar",
  services: "servicii",
  team: "echipa",
  testimonials: "testimoniale",
  gallery: "galerie",
  blog: "blog",
  messages: "mesaje",
  whatsapp: "whatsapp",
  campaigns: "campanii",
  users: "utilizatori",
  settings: "setari",
};

export function permissionForApiPath(pathname: string): string | null {
  const rest = pathname.replace(/^\/api\/admin\/?/, "");
  const segment = rest.split("/")[0];
  if (!segment) return null;

  // /api/admin/social/messenger, /api/admin/social/instagram
  if (segment === "social") {
    const channel = rest.split("/")[1];
    return channel === "instagram" ? "instagram" : "messenger";
  }
  return API_PERMISSION_MAP[segment] ?? null;
}
