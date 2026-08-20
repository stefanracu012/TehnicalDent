// =============================================
// Reading the clinic's Meta ads performance.
//
// Read-only by construction: every call here is a GET, and nothing in this file
// can create, pause or change a campaign. The token may well carry
// ads_management — this module simply never uses it.
// =============================================

const GRAPH = "https://graph.facebook.com/v21.0";

const TOKEN = process.env.META_ADS_TOKEN || "";
const ACCOUNT = process.env.META_AD_ACCOUNT_ID || "";

export function isAdsConfigured(): boolean {
  return Boolean(TOKEN && ACCOUNT);
}

export interface AdRow {
  name: string;
  campaign: string;
  spend: number;
  ctr: number;
  connections: number;
  deep: number;
  leads: number;
  costPerLead: number | null;
  costPerConnection: number | null;
}

export interface CampaignRow {
  name: string;
  status: string;
  objective: string;
  spend: number;
  connections: number;
  leads: number;
}

export interface FunnelStep {
  label: string;
  value: number;
}

export interface DailyPoint {
  date: string;
  spend: number;
  connections: number;
  leads: number;
}

export interface AdsReport {
  currency: string;
  totals: {
    spend: number;
    impressions: number;
    reach: number;
    clicks: number;
    ctr: number;
    connections: number;
    leads: number;
    costPerConnection: number | null;
    costPerLead: number | null;
    blocks: number;
  };
  funnel: FunnelStep[];
  ads: AdRow[];
  campaigns: CampaignRow[];
  /** Every day the account has run, oldest first. */
  daily: DailyPoint[];
}

async function graph(
  path: string,
  params: Record<string, string> = {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const url = new URL(`${GRAPH}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", TOKEN);

  const res = await fetch(url, { cache: "no-store" });
  const body = await res.json();
  if (body.error) throw new Error(body.error.message);
  return body;
}

/** Meta returns conversions as an untyped list; this pulls one out by name. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function action(actions: any[] | undefined, type: string): number {
  return Number(actions?.find((a) => a.action_type === type)?.value ?? 0);
}

/**
 * Meta's own cost per conversion, which is the number to show.
 *
 * Dividing spend by conversions ourselves lands within a cent of it, but Meta
 * applies its attribution window to both halves — so when the two disagree, its
 * figure is the one that matches what the Ads Manager shows.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function costPer(costs: any[] | undefined, type: string): number | null {
  const found = costs?.find((c) => c.action_type === type);
  return found ? Math.round(Number(found.value) * 100) / 100 : null;
}

const A = {
  connection: "onsite_conversion.total_messaging_connection",
  welcome: "onsite_conversion.messaging_welcome_message_view",
  firstReply: "onsite_conversion.messaging_first_reply",
  depth2: "onsite_conversion.messaging_user_depth_2_message_send",
  depth3: "onsite_conversion.messaging_user_depth_3_message_send",
  depth5: "onsite_conversion.messaging_user_depth_5_message_send",
  block: "onsite_conversion.messaging_block",
  lead: "onsite_conversion.lead",
};

const INSIGHT_FIELDS =
  "campaign_name,ad_name,spend,impressions,reach,clicks,ctr,actions,cost_per_action_type";

const ratio = (cost: number, count: number) =>
  count > 0 ? Math.round((cost / count) * 100) / 100 : null;

// ── Live queries, for the assistant ─────────────────────────────────────────
//
// Every parameter below is an enum or a bounded value, never a free-form path
// or field list. The assistant chooses between prepared questions; it cannot
// compose a request of its own, which is what keeps "read-only" true no matter
// what it is asked to do.

const DATE_PRESETS = [
  "today",
  "yesterday",
  "this_week_mon_today",
  "last_week_mon_sun",
  "last_7d",
  "last_14d",
  "last_30d",
  "last_90d",
  "this_month",
  "last_month",
  "maximum",
] as const;

const LEVELS = ["account", "campaign", "adset", "ad"] as const;

const BREAKDOWNS = [
  "age",
  "gender",
  "country",
  "region",
  "publisher_platform",
  "platform_position",
  "impression_device",
] as const;

export type DatePreset = (typeof DATE_PRESETS)[number];
export type InsightLevel = (typeof LEVELS)[number];
export type Breakdown = (typeof BREAKDOWNS)[number];

export const INSIGHT_ENUMS = {
  datePresets: DATE_PRESETS,
  levels: LEVELS,
  breakdowns: BREAKDOWNS,
};

/** Trims Meta's action list to the handful that mean something here. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function summariseRow(r: any) {
  return {
    ...(r.date_start ? { date: r.date_start } : {}),
    ...(r.campaign_name ? { campaign: r.campaign_name } : {}),
    ...(r.adset_name ? { adset: r.adset_name } : {}),
    ...(r.ad_name ? { ad: r.ad_name } : {}),
    ...Object.fromEntries(
      BREAKDOWNS.filter((b) => r[b] !== undefined).map((b) => [b, r[b]]),
    ),
    spend: Number(r.spend ?? 0),
    impressions: Number(r.impressions ?? 0),
    clicks: Number(r.clicks ?? 0),
    ctr: Number(r.ctr ?? 0),
    conversations: action(r.actions, A.connection),
    leads: action(r.actions, A.lead),
    costPerLead: costPer(r.cost_per_action_type, A.lead),
    costPerConversation: costPer(r.cost_per_action_type, A.connection),
  };
}

export async function queryInsights(params: {
  level?: InsightLevel;
  datePreset?: DatePreset;
  breakdown?: Breakdown;
  daily?: boolean;
  limit?: number;
}) {
  const level = LEVELS.includes(params.level as InsightLevel)
    ? params.level!
    : "ad";
  const preset = DATE_PRESETS.includes(params.datePreset as DatePreset)
    ? params.datePreset!
    : "last_30d";

  const query: Record<string, string> = {
    date_preset: preset,
    fields:
      "campaign_name,adset_name,ad_name,date_start,spend,impressions,clicks,ctr,actions,cost_per_action_type",
    limit: String(Math.min(Math.max(params.limit ?? 50, 1), 200)),
  };
  if (level !== "account") query.level = level;
  if (params.daily) query.time_increment = "1";
  if (BREAKDOWNS.includes(params.breakdown as Breakdown)) {
    query.breakdowns = params.breakdown!;
  }

  const { data } = await graph(`${ACCOUNT}/insights`, query);
  return (data ?? []).map(summariseRow);
}

export async function listStructure(type: "campaigns" | "adsets" | "ads") {
  const fields: Record<string, string> = {
    campaigns: "name,status,objective,daily_budget,lifetime_budget,created_time",
    adsets:
      "name,status,optimization_goal,billing_event,daily_budget,lifetime_budget,campaign{name}",
    ads: "name,status,effective_status,created_time,adset{name},campaign{name}",
  };
  const kind = fields[type] ? type : "campaigns";
  const { data } = await graph(`${ACCOUNT}/${kind}`, {
    fields: fields[kind],
    limit: "100",
  });
  return data ?? [];
}

/** The words and image of an ad, so copy can be judged alongside its numbers. */
export async function getAdCreatives() {
  const { data } = await graph(`${ACCOUNT}/ads`, {
    fields:
      "name,status,creative{title,body,object_story_spec,call_to_action_type,image_url,thumbnail_url}",
    limit: "50",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((ad: any) => {
    const spec = ad.creative?.object_story_spec?.link_data ?? {};
    return {
      ad: ad.name,
      status: ad.status,
      title: ad.creative?.title ?? spec.name ?? null,
      body: ad.creative?.body ?? spec.message ?? null,
      description: spec.description ?? null,
      callToAction:
        ad.creative?.call_to_action_type ?? spec.call_to_action?.type ?? null,
    };
  });
}

/** Pulls the whole account history and shapes it for the report page. */
export async function fetchAdsReport(): Promise<AdsReport> {
  if (!isAdsConfigured()) {
    throw new Error(
      "Raportul nu este configurat (META_ADS_TOKEN, META_AD_ACCOUNT_ID)",
    );
  }

  const [account, totalRes, adRes, campaignRes, campaignMeta, dailyRes] =
    await Promise.all([
    graph(ACCOUNT, { fields: "currency" }),
    graph(`${ACCOUNT}/insights`, {
      date_preset: "maximum",
      fields: "spend,impressions,reach,clicks,ctr,actions,cost_per_action_type",
    }),
    graph(`${ACCOUNT}/insights`, {
      date_preset: "maximum",
      level: "ad",
      fields: INSIGHT_FIELDS,
      limit: "200",
    }),
    graph(`${ACCOUNT}/insights`, {
      date_preset: "maximum",
      level: "campaign",
      fields: "campaign_id,campaign_name,spend,actions",
      limit: "100",
    }),
    graph(`${ACCOUNT}/campaigns`, {
      fields: "id,name,status,objective",
      limit: "100",
    }),
    // Whole history, not a window: the account is young enough that every day
    // fits, and a chart that starts mid-story invites wrong conclusions.
    graph(`${ACCOUNT}/insights`, {
      date_preset: "maximum",
      time_increment: "1",
      fields: "date_start,spend,actions",
      limit: "500",
    }),
  ]);

  const t = totalRes.data?.[0] ?? {};
  const spend = Number(t.spend ?? 0);
  const connections = action(t.actions, A.connection);
  const leads = action(t.actions, A.lead);

  const ads: AdRow[] = (adRes.data ?? [])
    .map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (r: any): AdRow => {
        const adSpend = Number(r.spend ?? 0);
        const conn = action(r.actions, A.connection);
        const lead = action(r.actions, A.lead);
        return {
          name: r.ad_name ?? "(fără nume)",
          campaign: r.campaign_name ?? "",
          spend: Math.round(adSpend * 100) / 100,
          ctr: Math.round(Number(r.ctr ?? 0) * 100) / 100,
          connections: conn,
          deep: action(r.actions, A.depth5),
          leads: lead,
          costPerLead: costPer(r.cost_per_action_type, A.lead) ?? ratio(adSpend, lead),
          costPerConnection:
            costPer(r.cost_per_action_type, A.connection) ?? ratio(adSpend, conn),
        };
      },
    )
    .sort((a: AdRow, b: AdRow) => b.spend - a.spend);

  // Status and objective live on the campaign object, the money on insights.
  const meta = new Map<string, { status: string; objective: string }>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (campaignMeta.data ?? []).map((c: any) => [
      c.name,
      { status: c.status ?? "", objective: c.objective ?? "" },
    ]),
  );

  const campaigns: CampaignRow[] = (campaignRes.data ?? [])
    .map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c: any): CampaignRow => ({
        name: c.campaign_name ?? "(fără nume)",
        status: meta.get(c.campaign_name)?.status ?? "",
        objective: meta.get(c.campaign_name)?.objective ?? "",
        spend: Math.round(Number(c.spend ?? 0) * 100) / 100,
        connections: action(c.actions, A.connection),
        leads: action(c.actions, A.lead),
      }),
    )
    .sort((a: CampaignRow, b: CampaignRow) => b.spend - a.spend);

  return {
    currency: account.currency ?? "USD",
    totals: {
      spend: Math.round(spend * 100) / 100,
      impressions: Number(t.impressions ?? 0),
      reach: Number(t.reach ?? 0),
      clicks: Number(t.clicks ?? 0),
      ctr: Math.round(Number(t.ctr ?? 0) * 100) / 100,
      connections,
      leads,
      costPerConnection:
        costPer(t.cost_per_action_type, A.connection) ?? ratio(spend, connections),
      costPerLead: costPer(t.cost_per_action_type, A.lead) ?? ratio(spend, leads),
      blocks: action(t.actions, A.block),
    },
    // Ordered widest to narrowest; the page draws them proportional to the first.
    funnel: [
      { label: "Au deschis chatul", value: action(t.actions, A.welcome) },
      { label: "Au scris primul mesaj", value: action(t.actions, A.firstReply) },
      { label: "Au trimis al doilea mesaj", value: action(t.actions, A.depth2) },
      { label: "Au trimis al treilea", value: action(t.actions, A.depth3) },
      { label: "Discuție reală (5+ mesaje)", value: action(t.actions, A.depth5) },
      { label: "Au lăsat datele", value: leads },
    ],
    ads,
    campaigns,
    daily: (dailyRes.data ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (d: any): DailyPoint => ({
        date: d.date_start,
        spend: Math.round(Number(d.spend ?? 0) * 100) / 100,
        connections: action(d.actions, A.connection),
        leads: action(d.actions, A.lead),
      }),
    ),
  };
}
