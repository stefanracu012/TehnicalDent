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
  /** Last 90 days, day by day. Lets questions about trends be answered
   *  from the stored report instead of another round trip to Meta. */
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
    graph(`${ACCOUNT}/insights`, {
      date_preset: "last_90d",
      time_increment: "1",
      fields: "date_start,spend,actions",
      limit: "100",
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
