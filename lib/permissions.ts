// =============================================
// Admin page permissions. Shared by the middleware (Edge), the API routes
// (Node) and the nav — one list, so a page can't be protected in one place
// and forgotten in another.
//
// A permission is "<page>:<action>", e.g. "programari:edit". Each page
// declares only the actions it actually supports: the dashboard is
// read-only, the settings page has nothing to create, the messaging
// inboxes cannot delete. Keys stored before this split were bare page
// names ("programari") and are still honoured as full access to that page,
// so existing accounts keep working until they are next saved.
// =============================================

export const ACTIONS = ["view", "create", "edit", "delete"] as const;
export type PermissionAction = (typeof ACTIONS)[number];

export const ACTION_LABELS: Record<PermissionAction, string> = {
  view: "Vizualizare",
  create: "Adăugare",
  edit: "Editare",
  delete: "Ștergere",
};

export const PERMISSIONS = [
  {
    key: "dashboard",
    label: "Panou principal",
    path: "/admin",
    actions: ["view"],
  },
  {
    key: "programari",
    label: "Programări",
    path: "/admin/programari",
    actions: ["view", "create", "edit", "delete"],
  },
  {
    key: "leads",
    label: "Leaduri",
    path: "/admin/leads",
    actions: ["view", "create", "edit", "delete"],
    actionLabels: { create: "Transformă în pacient" },
  },
  {
    key: "pacienti",
    label: "Pacienți",
    path: "/admin/pacienti",
    actions: ["view", "create", "edit", "delete"],
  },
  {
    key: "calendar",
    label: "Calendar disponibilitate",
    path: "/admin/calendar",
    actions: ["view", "edit"],
  },
  {
    key: "servicii",
    label: "Servicii",
    path: "/admin/servicii",
    actions: ["view", "create", "edit", "delete"],
  },
  {
    key: "echipa",
    label: "Echipă",
    path: "/admin/echipa",
    actions: ["view", "create", "edit", "delete"],
  },
  {
    key: "testimoniale",
    label: "Testimoniale",
    path: "/admin/testimoniale",
    actions: ["view", "create", "edit", "delete"],
  },
  {
    key: "galerie",
    label: "Galerie",
    path: "/admin/galerie",
    actions: ["view", "create", "edit", "delete"],
  },
  {
    key: "blog",
    label: "Blog",
    path: "/admin/blog",
    actions: ["view", "create", "edit", "delete"],
  },
  {
    key: "mesaje",
    label: "Mesaje site",
    path: "/admin/mesaje",
    actions: ["view", "edit", "delete"],
    actionLabels: { edit: "Marchează citit" },
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    path: "/admin/whatsapp",
    actions: ["view", "create"],
    actionLabels: { create: "Trimite mesaje" },
  },
  {
    key: "messenger",
    label: "Messenger",
    path: "/admin/messenger",
    actions: ["view", "create"],
    actionLabels: { create: "Trimite mesaje" },
  },
  {
    key: "instagram",
    label: "Instagram",
    path: "/admin/instagram",
    actions: ["view", "create"],
    actionLabels: { create: "Trimite mesaje" },
  },
  {
    key: "campanii",
    label: "Campanii",
    path: "/admin/campanii",
    actions: ["view", "create"],
    actionLabels: { create: "Trimite campanii" },
  },
  {
    key: "reclame",
    label: "Reclame",
    path: "/admin/reclame",
    // Refreshing pulls fresh numbers from Meta and costs API quota, so it is
    // gated separately from reading the report. Delete covers the question
    // history — without the key declared here, no account could ever hold it.
    actions: ["view", "edit", "delete"],
    actionLabels: {
      edit: "Reîmprospătează și întreabă",
      delete: "Șterge din istoricul de întrebări",
    },
  },
  {
    key: "utilizatori",
    label: "Utilizatori",
    path: "/admin/utilizatori",
    actions: ["view", "create", "edit", "delete"],
  },
  {
    key: "setari",
    label: "Setări",
    path: "/admin/setari",
    actions: ["view", "edit"],
  },
] as const satisfies readonly {
  key: string;
  label: string;
  path: string;
  actions: readonly PermissionAction[];
  actionLabels?: Partial<Record<PermissionAction, string>>;
}[];

export type PermissionPage = (typeof PERMISSIONS)[number];
export type PermissionKey = PermissionPage["key"];

/** "programari" + "edit" -> "programari:edit". */
export function permissionKey(page: string, action: PermissionAction): string {
  return `${page}:${action}`;
}

/** The label to show next to an action's checkbox for a given page. */
export function actionLabel(page: PermissionPage, action: PermissionAction): string {
  const custom = (page as { actionLabels?: Partial<Record<PermissionAction, string>> })
    .actionLabels;
  return custom?.[action] ?? ACTION_LABELS[action];
}

export const ALL_PERMISSION_KEYS: string[] = PERMISSIONS.flatMap((p) =>
  p.actions.map((a) => permissionKey(p.key, a)),
);

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
  if (perms.includes(SUPER_ADMIN)) return true;
  if (perms.includes(key)) return true;
  // Pre-split keys granted the whole page, so honour them for every action.
  return perms.includes(key.split(":")[0]);
}

/**
 * Which permission a path needs. Longest path wins so /admin/programari is
 * not matched by the "/admin" dashboard entry. Opening a page is always a
 * "view".
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
  return best ? permissionKey(best.key, "view") : null;
}

/** API routes mirror the page paths: /api/admin/patients -> pacienti, etc. */
const API_PERMISSION_MAP: Record<string, string> = {
  appointments: "programari",
  patients: "pacienti",
  leads: "leads",
  availability: "calendar",
  services: "servicii",
  team: "echipa",
  testimonials: "testimoniale",
  gallery: "galerie",
  blog: "blog",
  messages: "mesaje",
  whatsapp: "whatsapp",
  campaigns: "campanii",
  ads: "reclame",
  users: "utilizatori",
  settings: "setari",
};

const METHOD_ACTIONS: Record<string, PermissionAction> = {
  GET: "view",
  HEAD: "view",
  POST: "create",
  PUT: "edit",
  PATCH: "edit",
  DELETE: "delete",
};

/**
 * Resources where the HTTP method doesn't imply the usual action — the
 * settings page has a single POST that saves existing values rather than
 * creating anything.
 */
const METHOD_ACTION_OVERRIDES: Record<string, Partial<Record<string, PermissionAction>>> = {
  settings: { POST: "edit" },
  // Refreshing the ads report re-reads Meta; it creates nothing.
  ads: { POST: "edit" },
};

export function permissionForApiPath(pathname: string, method: string): string | null {
  const rest = pathname.replace(/^\/api\/admin\/?/, "");
  const segment = rest.split("/")[0];
  if (!segment) return null;

  const upper = method.toUpperCase();
  const action =
    METHOD_ACTION_OVERRIDES[segment]?.[upper] ?? METHOD_ACTIONS[upper] ?? "view";

  // /api/admin/social/messenger, /api/admin/social/instagram
  if (segment === "social") {
    const channel = rest.split("/")[1];
    return permissionKey(channel === "instagram" ? "instagram" : "messenger", action);
  }

  const page = API_PERMISSION_MAP[segment];
  return page ? permissionKey(page, action) : null;
}
