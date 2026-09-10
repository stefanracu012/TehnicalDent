// =============================================
// The clinic's full price list, as approved and signed by the director.
//
// These are not website pages. Sixty-odd procedures would bury the eight
// services patients actually browse, and most of them are steps inside a
// treatment rather than something to book — anaesthetic, an impression, a
// temporary filling. They exist so the assistant can answer "how much is a
// root canal" with the real number instead of sending everyone to reception.
//
// Loaded by scripts/seed-price-list.mts. Editing a price here and running it
// again updates the row; nothing is deleted, so anything the clinic has
// adjusted by hand in the admin is only overwritten where it appears below.
// =============================================

export interface PriceListItem {
  slug: string;
  title: string;
  category: string;
  /** Lower bound, so sorting and comparisons work. */
  price: number;
  /** Exact wording where one number will not do: a range, or a supplement. */
  priceNote?: string;
}

export const PRICE_LIST: PriceListItem[] = [
  // ── General ──────────────────────────────────────────────────────────────
  { slug: "pl-consultatie", title: "Consultația medicului stomatolog", category: "General", price: 300 },
  { slug: "pl-anestezie", title: "Anestezie infiltrativă/tronculară (1 carpulă)", category: "General", price: 100 },
  { slug: "pl-optragate", title: "Aplicare OptraGate", category: "General", price: 100 },

  // ── Terapie ──────────────────────────────────────────────────────────────
  { slug: "pl-cofferdam", title: "Aplicare cofferdam", category: "Terapie", price: 150 },
  { slug: "pl-igienizare-profesionala", title: "Igienizarea profesională (3 etape)", category: "Terapie", price: 1000, priceNote: "1000-1200 lei" },
  { slug: "pl-detartraj-ultrasunet", title: "Detartraj cu ultrasunet", category: "Terapie", price: 700 },
  { slug: "pl-airflow", title: "Igienizare cu sistemul Airflow", category: "Terapie", price: 700 },
  { slug: "pl-carie-cl1-cl5", title: "Tratamentul cariei dentare cl. I, V Black (o suprafață)", category: "Terapie", price: 1000 },
  { slug: "pl-carie-cl2", title: "Tratamentul cariei dentare cl. II Black (două suprafețe)", category: "Terapie", price: 1300 },
  { slug: "pl-carie-mod", title: "Tratamentul cariei dentare – cavitate MOD (3 suprafețe)", category: "Terapie", price: 1500 },
  { slug: "pl-restaurare-frontal", title: "Restaurarea estetică a dintelui frontal", category: "Terapie", price: 1700, priceNote: "1700-2000 lei" },
  { slug: "pl-obturatie-dentin", title: "Obturație provizorie cu dentin-pastă", category: "Terapie", price: 300 },
  { slug: "pl-obturatie-compozit", title: "Obturație provizorie cu compozit fotopolimerizabil", category: "Terapie", price: 300 },
  { slug: "pl-pivot-metalic", title: "Reconstrucția dintelui cu pivot metalic (build-up)", category: "Terapie", price: 800 },
  { slug: "pl-pivot-fibra", title: "Reconstrucția dintelui cu pivot din fibră de sticlă (build-up)", category: "Terapie", price: 1200 },
  { slug: "pl-trepanare", title: "Trepanarea cariei pulpare și aplicarea pastei devitalizante", category: "Terapie", price: 400 },
  { slug: "pl-proroot-mta", title: "Aplicarea ProRoot MTA (coafaj direct)", category: "Terapie", price: 400 },
  { slug: "pl-coafaj-indirect", title: "Aplicarea obturației curative în carie profundă (coafaj indirect)", category: "Terapie", price: 200 },

  // ── Endodonție ───────────────────────────────────────────────────────────
  { slug: "pl-pulpita-mono", title: "Tratamentul pulpitei – dinte monoradicular", category: "Endodonție", price: 1000 },
  { slug: "pl-pulpita-bi", title: "Tratamentul pulpitei – dinte biradicular", category: "Endodonție", price: 1500 },
  { slug: "pl-pulpita-pluri", title: "Tratamentul pulpitei – dinte pluriradicular", category: "Endodonție", price: 2000 },
  { slug: "pl-corp-strain-canal", title: "Înlăturarea corpului străin/instrumentului fracturat din canal", category: "Endodonție", price: 500, priceNote: "500-1000 lei" },
  { slug: "pl-abcess-remedy", title: "Aplicarea pastei Abcess Remedy (1 canal) – proces periapical", category: "Endodonție", price: 200 },
  { slug: "pl-retratament-canal", title: "Retratamentul canalului radicular (1 canal)", category: "Endodonție", price: 1000 },
  { slug: "pl-inlaturare-pivot", title: "Înlăturarea pivotului din canalul radicular", category: "Endodonție", price: 400 },

  // ── Protetică dentară ────────────────────────────────────────────────────
  { slug: "pl-ablatie-coroane", title: "Secționarea și ablația coroanelor de înveliș", category: "Protetică dentară", price: 300 },
  { slug: "pl-dcr-metalic", title: "DCR metalic", category: "Protetică dentară", price: 1000 },
  { slug: "pl-dcr-zirconiu", title: "DCR din dioxid de zirconiu", category: "Protetică dentară", price: 2000 },
  { slug: "pl-coroana-pmma-frezata", title: "Coroană de înveliș provizorie PMMA (frezată)", category: "Protetică dentară", price: 1000 },
  { slug: "pl-coroana-scutan", title: "Coroană de înveliș provizorie (metoda Scutan)", category: "Protetică dentară", price: 400 },
  { slug: "pl-coroana-metalo-ceramica", title: "Coroană de înveliș din metalo-ceramică", category: "Protetică dentară", price: 2300 },
  { slug: "pl-coroana-zirconiu", title: "Coroană de înveliș din dioxid de zirconiu (integral)", category: "Protetică dentară", price: 3200 },
  { slug: "pl-coroana-zirconiu-ceramica", title: "Coroană de înveliș din dioxid de zirconiu stratificat cu ceramică", category: "Protetică dentară", price: 4200 },
  { slug: "pl-amprentare", title: "Amprentare", category: "Protetică dentară", price: 500 },
  { slug: "pl-pmma-anyone", title: "Coroană provizorie din PMMA pe suport implantar AnyOne", category: "Protetică dentară", price: 2500 },
  { slug: "pl-pmma-anyridge", title: "Coroană provizorie din PMMA pe suport implantar AnyRidge", category: "Protetică dentară", price: 3000 },
  { slug: "pl-mc-anyone", title: "Coroană din metalo-ceramică pe suport implantar AnyOne", category: "Protetică dentară", price: 3800 },
  { slug: "pl-mc-anyridge", title: "Coroană din metalo-ceramică pe suport implantar AnyRidge", category: "Protetică dentară", price: 4500 },
  { slug: "pl-zirconiu-anyone", title: "Coroană din dioxid de zirconiu stratificat cu ceramică pe suport implantar AnyOne", category: "Protetică dentară", price: 5000 },
  { slug: "pl-zirconiu-anyridge", title: "Coroană din dioxid de zirconiu stratificat cu ceramică pe suport implantar AnyRidge", category: "Protetică dentară", price: 6000 },
  { slug: "pl-fatete-ceramica", title: "Fațete dentare din ceramică", category: "Protetică dentară", price: 6000 },
  { slug: "pl-proteza-totala-acrilica", title: "Proteză totală acrilică", category: "Protetică dentară", price: 6000 },
  { slug: "pl-proteza-partiala-acrilica", title: "Proteză parțial-mobilă acrilică (croșete metalice)", category: "Protetică dentară", price: 4500 },
  { slug: "pl-croset-biodentaplast", title: "Croșet din Biodentaplast (Bredent)", category: "Protetică dentară", price: 800, priceNote: "+800 lei" },
  { slug: "pl-proteza-biodentaplast", title: "Proteză parțial-mobilizabilă elastică din Biodentaplast", category: "Protetică dentară", price: 10000 },
  { slug: "pl-proteza-valplast", title: "Proteză parțial-mobilizabilă elastică din Valplast", category: "Protetică dentară", price: 7500 },
  { slug: "pl-reparare-proteze", title: "Repararea și rebazarea protezelor mobilizabile", category: "Protetică dentară", price: 900 },
  { slug: "pl-proteza-bara", title: "Proteză totală provizorie pe suport implantar (cu bară)", category: "Protetică dentară", price: 16000 },

  // ── Pedodonție ───────────────────────────────────────────────────────────
  { slug: "pl-ped-airflow", title: "Înlăturarea depunerilor dentare cu Airflow", category: "Pedodonție", price: 500 },
  { slug: "pl-ped-periaj", title: "Periaj profesional", category: "Pedodonție", price: 400 },
  { slug: "pl-ped-sigilare", title: "Sigilarea fisurilor", category: "Pedodonție", price: 450 },
  { slug: "pl-ped-obturatie-metalcompozit", title: "Obturație din metal compozit", category: "Pedodonție", price: 700, priceNote: "700-800 lei" },
  { slug: "pl-ped-carie-temporari", title: "Tratamentul cariei dentare a dinților temporari", category: "Pedodonție", price: 600 },
  { slug: "pl-ped-pulpita-frontal-compozit", title: "Tratament pulpită dinte temporar frontal + obturație din compozit", category: "Pedodonție", price: 800 },
  { slug: "pl-ped-pulpita-lateral-compozit", title: "Tratament pulpită dinte temporar lateral + obturație din compozit", category: "Pedodonție", price: 1000 },
  { slug: "pl-ped-pulpita-frontal-ciment", title: "Tratament pulpită dinte temporar frontal + obturație din ciment", category: "Pedodonție", price: 800 },
  { slug: "pl-ped-pulpita-lateral-ciment", title: "Tratament pulpită dinte temporar lateral + obturație din ciment", category: "Pedodonție", price: 700 },
  { slug: "pl-ped-periodontita-frontal-ciment", title: "Tratament periodontită dinte temporar frontal + obturație din ciment", category: "Pedodonție", price: 900 },
  { slug: "pl-ped-periodontita-frontal-compozit", title: "Tratament periodontită dinte temporar frontal + obturație din compozit", category: "Pedodonție", price: 1100 },
  { slug: "pl-ped-periodontita-lateral-ciment", title: "Tratament periodontită dinte temporar lateral + obturație din ciment", category: "Pedodonție", price: 1000 },
  { slug: "pl-ped-periodontita-lateral-compozit", title: "Tratament periodontită dinte temporar lateral + obturație din compozit", category: "Pedodonție", price: 1200 },
  { slug: "pl-ped-extractie-temporar", title: "Extracție dinte temporar (cu anestezie)", category: "Pedodonție", price: 550 },
];
