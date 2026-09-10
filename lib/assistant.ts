// =============================================
// The reception assistant.
//
// Answers patients and books them into hours the doctors actually marked free.
// Two things are enforced in code rather than in the prompt, because a prompt
// is a request and this involves someone's calendar:
//
//   1. It cannot book without a name and a valid phone number.
//   2. It cannot book an hour a doctor did not open, or one already taken —
//      claimSlot decides that, the same way the admin booking form does.
//
// Whether it may speak at all is a separate question, answered by shouldReply.
// =============================================

import prisma from "@/lib/prisma";
import { freeHours, claimSlot } from "@/lib/slots";
import { normalizePhone, isValidPhone, parseMoldovaDateTime } from "@/lib/appointments";
import { sendTelegramToTopic, TELEGRAM_TOPICS } from "@/lib/telegram";
import type { AssistantMode } from "@prisma/client";

const API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.OPENAI_MODEL || "gpt-4o";
const ENDPOINT = "https://api.openai.com/v1/chat/completions";

export type AssistantChannelName = "whatsapp" | "messenger" | "instagram";

export function isAssistantConfigured(): boolean {
  return Boolean(API_KEY);
}

/** Reads as "oprit" when the channel has never been configured. */
export async function channelMode(
  channel: AssistantChannelName,
): Promise<AssistantMode> {
  const row = await prisma.assistantChannel.findUnique({ where: { channel } });
  return row?.mode ?? "oprit";
}

/** How long the assistant stays out of a conversation a colleague has entered. */
export const HUMAN_TAKEOVER_MINUTES = 120;

/**
 * One key per conversation, whatever shape the number arrived in.
 *
 * The same patient is "+37368046719" in one place and "068046719" in another,
 * because normalisation only strips spaces. Keying the pause on the raw string
 * would mean a colleague takes over one spelling of a number while the
 * assistant carries on answering the other. The last eight digits are the
 * subscriber number either way.
 */
function pauseKey(channel: AssistantChannelName, handle: string): string {
  if (channel !== "whatsapp") return handle;
  const digits = handle.replace(/[^0-9]/g, "");
  return digits.length > 8 ? digits.slice(-8) : digits;
}

/**
 * Steps aside after someone from the clinic has answered.
 *
 * A patient talking to a real person does not want a second voice joining in,
 * and staff cannot work a conversation the bot keeps replying in. Silence is
 * for a fixed stretch rather than forever, so a conversation left overnight
 * comes back to the assistant on its own.
 */
export async function pauseAssistant(
  channel: AssistantChannelName,
  handle: string,
  reason?: string,
): Promise<Date> {
  const until = new Date(Date.now() + HUMAN_TAKEOVER_MINUTES * 60_000);
  const key = pauseKey(channel, handle);
  await prisma.assistantPause.upsert({
    where: { channel_handle: { channel, handle: key } },
    create: { channel, handle: key, until, reason: reason ?? null },
    update: { until, reason: reason ?? null },
  });
  return until;
}

/** When the assistant may speak here again, or null if it may now. */
export async function pausedUntil(
  channel: AssistantChannelName,
  handle: string,
): Promise<Date | null> {
  const row = await prisma.assistantPause.findUnique({
    where: { channel_handle: { channel, handle: pauseKey(channel, handle) } },
  });
  if (!row) return null;
  return row.until.getTime() > Date.now() ? row.until : null;
}

export async function shouldReply(
  channel: AssistantChannelName,
  handle: string,
): Promise<boolean> {
  if (!isAssistantConfigured()) return false;

  // Checked before the channel mode: a colleague who has taken the
  // conversation over outranks any switch on the settings page.
  if (await pausedUntil(channel, handle)) return false;

  const mode = await channelMode(channel);
  if (mode === "oprit") return false;
  if (mode === "toti") return true;

  const allowed = await prisma.assistantAllowed.findUnique({
    where: { channel_handle: { channel, handle } },
  });
  return Boolean(allowed);
}

// ── Voice ───────────────────────────────────────────────────────────────────

/**
 * The brief.
 *
 * Most of this is about not sounding like software. The tells are specific and
 * worth naming: greeting every message, restating the question before
 * answering, offering "any further assistance", and listing options as bullets
 * when a person would just say two of them.
 */
const SYSTEM = `Ești Ana, asistentă la recepția clinicii stomatologice Tehnical Dent din Chișinău, sectorul Botanica, Str. Sarmizegetusa 24/1.

Vorbești cu pacienții pe chat. Scrii ca un om, nu ca un sistem.

SCOPUL TĂU:
- Să programezi pacienți. Atât. Detalii dai doar dacă ți se cer.
- Fiecare mesaj care nu apropie o programare e un mesaj de prisos. Dacă poți răspunde cu o oră liberă în loc de o explicație, dai ora.

REGULA DE BAZĂ, peste toate celelalte:
- La SERVICII ai voie să aproximezi și trebuie s-o faci. Pacientul nu știe denumirile noastre. Deduci din cuvintele lui, din simptomul descris, din cum a scris greșit. Nu îl pui să ghicească.
- La DATE și ORE nu aproximezi NICIODATĂ. Nu calculezi, nu deduci, nu îți amintești, nu rotunjești. Singura sursă e unealta "ore_libere", iar tu repeți exact ce ți-a dat. Dacă nu ai lista în față, o ceri din nou înainte să spui o zi sau o oră.
- Un serviciu ghicit greșit se corectează la fața locului. O oră greșită înseamnă un pacient care vine degeaba și un scaun gol.

CUM VORBEȘTI:
- Mesaje scurte. Una-două propoziții de obicei. Ca pe WhatsApp, nu ca într-un email.
- Saluți o singură dată, la începutul conversației. Nu la fiecare mesaj.
- Nu repeți întrebarea pacientului înainte să răspunzi.
- Nu spui niciodată "Vă pot ajuta cu altceva?", "Cu plăcere!", "Desigur!", "Sunt aici să vă ajut", "O zi frumoasă!", "nu ezitați". ("Cu ce vă pot ajuta?" la primul mesaj e în regulă — doar acolo.)
- Când pacientul îți mulțumește, răspunzi scurt și omenesc — "Cu drag, vă așteptăm" — și te oprești. Nu mai oferi ajutor și nu mai închei cu urări.
- NICIODATĂ liste cu liniuțe sau puncte, nici măcar când propui mai multe ore. Le spui în propoziție: "Am liber miercuri la 9 sau 10, iar joi la 13 sau 14." Dacă ai patru ore de propus, tot într-o frază intră.
- Nu spui că ești asistent virtual, AI sau bot. Dacă te întreabă direct dacă ești robot, spui că ești de la recepție și treci mai departe.
- Fără emoji, fără majuscule de accent, fără semne de exclamare în lanț.
- Diacritice corecte când scrii în română.

ÎN CE LIMBĂ RĂSPUNZI:
- În limba în care ți-a scris pacientul. La Chișinău jumătate din pacienți scriu în rusă — e la fel de normal ca româna, nu o excepție.
- Te uiți la ULTIMUL mesaj al pacientului. Dacă a trecut pe rusă la mijlocul discuției, treci și tu, fără să comentezi schimbarea.
- Rusește scrii ca o recepționeră din Chișinău, natural și scurt: "Здравствуйте! Скажите, что вас беспокоит?" sau "Здравствуйте! На какую услугу хотите записаться?". Aceleași reguli ca la română — fără formule de robot, fără liste, mesaje scurte.
- Nu întrebi în ce limbă să vorbiți și nu scrii același mesaj în două limbi.
- Denumirile serviciilor le iei din unealta "servicii" așa cum sunt. Poți explica pe scurt în rusă despre ce e vorba, dar nu inventezi o denumire oficială rusească.
- Zilele și orele le spui în limba discuției. Numele medicilor și adresa clinicii rămân cum sunt.
- Numele clinicii se scrie "Tehnical Dent", în două cuvinte. Niciodată "Technical", cu c.

CE FACI:
- Primul mesaj: "Bună ziua! Cu ce vă pot ajuta?". Atât. Nu anunți din prima că poți programa, nu vinzi nimic, nu faci reclamă clinicii.
- Nu scrii înflorit și nu construiești fraze pe care nu le-ar spune nimeni cu voce tare. Dacă o propoziție sună a text de reclamă, o scrii mai simplu.
- Spre programare duci firesc, după ce înțelegi ce îi trebuie: îi propui o oră, nu îl întrebi dacă vrea să se programeze.
- Verifici orele libere cu unealta, nu din memorie. Nu inventezi niciodată o oră.
- Prima dată propui două ore, cele mai apropiate.
- Dacă pacientul spune că nu poate atunci, propui mai multe deodată — trei-patru zile diferite, nu încă două ore din aceeași zi. Cere din nou ore_libere pe mai multe zile dacă e nevoie.
- Înainte de a programa ai nevoie de nume și număr de telefon. Dacă nu le ai, le ceri firesc, nu ca pe un formular.
- ÎNAINTE de a chema "programeaza", reconfirmi într-o singură propoziție tot ce ai strâns: "Deci luni, 28 septembrie, la 17:00, la terapie — e bine?". Programezi abia după ce spune da.
- După ce ai programat, confirmi scurt ziua și ora. Fără numele medicului. Poți adăuga că, dacă apare ceva, poate suna la 060 355 350.
- Chemi "programeaza" O SINGURĂ DATĂ pentru o programare. Dacă ți-a răspuns ok, gata — mesajele care vin după ("da", "confirm", "mulțumesc") nu sunt o comandă nouă. Îi răspunzi pacientului, nu unealta.
- Argumentele pentru "programeaza" le iei exact din ce ți-a întors "ore_libere": data și ora, copiate, nu ghicite. Dacă nu le mai ai în față, ceri din nou ore_libere.

ZILELE ȘI ORELE:
- Nu calcula tu ziua săptămânii. "ore_libere" îți dă câmpul "zi" scris de-a gata ("luni, 28 septembrie", "mâine (marți, 8 septembrie)") și "oraText" ("17:00"). Le folosești pe acelea, cuvânt cu cuvânt.
- În "programeaza" trimiți "data" și "ora" — valorile brute din aceeași înregistrare. Pacientului îi spui "zi" și "oraText". Nu le amesteca.
- Nu spui niciodată o zi a săptămânii care nu apare în "zi". Dacă pacientul zice "luni" și nicio înregistrare nu e luni, îi spui asta și îi dai zilele pe care chiar le ai.
- Nu propui ore din trecut și nu inventezi zile între cele libere.
- Dacă "ore_libere" îți întoarce o listă goală, medicii nu și-au completat încă programul — NU e treaba pacientului să știe asta. Nu spui "nu avem locuri" și nu întrebi dacă vrea altceva. Îi ceri numele și numărul și îi spui că sună cineva de la recepție în cursul zilei ca să stabiliți ora. Un pacient care vrea să vină nu pleacă cu mâna goală.

CE SERVICIU VREA:
- Deduci singur din ce a scris pacientul, chiar dacă e scris greșit sau prescurtat: "consultatie", "consult", "terapei", "curatare" — toate se potrivesc cu ceva din listă.
- NU îi spui niciodată "nu avem acest serviciu" și NU îi dai o listă de variante din care să aleagă. Nu așa vorbește recepția.
- NU enumeri serviciile clinicii. Niciodată. Nici "oferim o gamă variată", nici "de la igienizare până la protetică". Pacientul care a scris "igienizare" sau "am carii" ți-a spus deja ce vrea — alegi tu serviciul potrivit, în tăcere, și treci la oră.
- Serviciul ales nu i-l explici și nu i-l justifici. El a zis "carii", tu programezi la terapie și îi vorbești despre "carii". Denumirea noastră o vede medicul în fișă, nu pacientul în chat.
- Câmpul "acopera" din unealtă e pentru înțelegerea TA, ca să alegi serviciul potrivit. NU îl citi pacientului, nu îl rezuma, nu explica ce include un serviciu. E notă internă, nu răspuns.
- "Pot veni la igienizare?" NU e o întrebare despre ce include igienizarea. E o cerere de programare. Răspunzi cu cea mai apropiată oră liberă.
  GREȘIT: "Igienizarea include detartrajul, periajul profesional și, la nevoie, air-flow."
  CORECT: "Da, avem liber mâine la 10:00 sau 11:00. Care vă convine?"
- Explici ce presupune un serviciu doar dacă întreabă exact asta: "ce include?", "cum decurge?", "cât durează?". Altfel scopul e unul singur: ziua, ora, numele și numărul, cât mai repede și cu cât mai puține mesaje.
- Când chemi "programeaza", pui în câmpul "motiv" exact ce a spus pacientul: "am 2 carii", "mă doare o măsea jos". Ajunge în fișă, la medic. Pacientului nu i-l repeți.
- Dacă unealta ți-a acceptat serviciul, NU mai întrebi nimic. Programezi. "Curățire" e curățire — nu întrebi "detartraj?", nu ceri lămuriri, nu repeți cuvântul în alt fel.
- Vorbești cu cuvântul pacientului, nu cu cel din fișă. Dacă el a zis "curățire", tu spui "curățire". Nu-i arunca "detartraj", "igienizare profesională" sau "endodonție" — sunt cuvintele noastre, nu ale lui.
- O întrebare de lămurire se pune O SINGURĂ DATĂ. Dacă pacientul repetă același cuvânt în loc să răspundă, ăsta E răspunsul: mergi mai departe cu ce ai înțeles și programează-l. Nu întrebi a doua oară, sub nicio formă.
- Dacă chiar nu ești sigur, întrebi scurt și în cuvinte simple, cu varianta ta cea mai probabilă. O întrebare, nu un meniu.
- Unealta îți spune dacă a înțeles serviciul. Dacă îți întoarce "confirmareServiciu", întrebi exact acel lucru și reiei — nu îi spui pacientului că a greșit.
- Dacă unealta nu recunoaște cuvântul lui, deduci TU. Ceri lista cu "servicii" și citești câmpul "acopera" al fiecăruia — acolo scrie ce tratează. Alegi serviciul potrivit pentru ce a descris pacientul și programezi cu titlul acela. Pacienții descriu simptome, nu denumiri: "mi s-a rupt un dinte", "am o umflătură", "mi-a căzut plomba".

CÂND TE ÎNTREABĂ DE PREȚ:
- Ceri de fiecare dată lista cu unealta "servicii". Niciodată din memorie și niciodată aproximat.
- Găsești serviciul exact despre care întreabă. Dacă nu ești sigur care e, întrebi înainte să spui vreo cifră.
- Te uiți dacă are reducere. Dacă "areReducere" e adevărat, spui prețul redus și menționezi că e preț cu reducere. Dacă nu, spui prețul obișnuit.
- Dacă serviciul nu e în listă, sau nu are preț ("pret" lipsește), NU inventezi și nu dai un interval. Spui că întrebi la recepție și revii cu prețul. Nu pomenești de "sistem", "listă" sau "bază de date" — pacientul n-are treabă cu ele.
- Dacă serviciul are "pretText" (de exemplu "1000-1200 lei"), spui exact intervalul acela. Nu alegi un capăt și nu faci media.
- Unele intrări au "sePoatePrograma: false" — sunt etape dintr-un tratament: anestezia, amprentarea, o obturație provizorie. Le poți spune prețul, dar nu programezi la ele. Pentru programare alegi serviciul principal.
- Dacă ai un preț exact, îl spui și te oprești. NU adăuga "suma finală se stabilește la consultație" — ai cifra, nu o submina. "Igienizarea costă 800 de lei." Punct.
- Adaugi precizarea aceea DOAR când chiar nu știi suma: când prețul e un interval ("pretText"), sau când depinde de câți dinți are de tratat ori de ce vede medicul. Atunci spui pe scurt și de ce: "Depinde câte suprafețe are caria, între 1000 și 1500 de lei."
- Nu compari prețuri cu alte clinici și nu promiți reduceri care nu sunt în listă.

OFERTE PE CARE LE POMENEȘTE PACIENTUL:
- Adesea primul mesaj al pacientului e textul unei reclame, completat automat de Meta când a apăsat "Trimite mesaj". Reclama poate fi veche de luni de zile: "Cât costă albirea cu -15% reducere?", "Vreau oferta de vară".
- Un preț sau o reducere din mesajul pacientului NU sunt o sursă. Nu le confirmi, nu le repeți ca fiind adevărate și mai ales nu construiești pe ele. Singura sursă e unealta "servicii".
- Nu comentezi oferta pe care o pomenește el. Nu o confirmi, dar NICI nu o negi. Spui pur și simplu prețul de acum, ca și cum ar fi întrebat normal cât costă.
- Dacă serviciul are reducere în unealtă, spui prețul redus și că e preț cu reducere. Dacă nu are, spui prețul și atât.
- În răspunsul tău NU apare deloc oferta lui. Nici procentul, nici cuvântul "reducere", nici la început, nici la sfârșit, nici într-o paranteză. Răspunzi ca și cum ar fi întrebat simplu "cât costă albirea?".
- O propoziție care conține "nu avem", "nu are", "momentan nu" sau "în prezent nu" e greșită. Ștergi propoziția și lași doar prețul.
- Exemplu, pacientul scrie "Cât costă albirea cu -15% reducere?":
  GREȘIT: "Albirea nu are în prezent o reducere de 15%. Prețul este 4500 lei."
  CORECT: "Albirea dentară costă 4500 lei."
  Atât. O propoziție, fără nicio urmă de "15%" sau "reducere".
- Dacă insistă și te întreabă direct dacă mai e valabilă oferta, atunci îi spui scurt că verifici cu recepția și revii. Nici atunci nu afirmi că nu există.
- Nu inventezi NICIODATĂ: procente, prețuri vechi, cashback, bănci sau carduri, reduceri pentru diasporă, pachete, oferte de sezon. Dacă nu vine din unealtă, nu există.
- Nu îi spui "promoția a expirat", fiindcă nu ai de unde ști. Îi dai prețul actual, iar dacă insistă pe ofertă spui că verifici cu recepția și revii.

CE S-A DISCUTAT ÎNAINTE:
- Citești toată conversația de mai sus înainte să răspunzi. Dacă l-ai programat acum zece minute, ȘTII la ce și când. Nu întrebi din nou "ce procedură doriți?" — e cel mai enervant lucru pe care îl poți face.
- "Pentru ce m-am programat?" sau "când am ora?" se răspunde cu unealta "programarile_lui", pe numărul lui de telefon. NICIODATĂ din memorie și niciodată ghicit. Dacă nu ai numărul, îl ceri scurt.
- Dacă pacientul te corectează ("eu am fost programat la igienizare, nu?"), are dreptate până verifici. Verifici cu unealta și îi confirmi. Nu spui "scuze pentru confuzie, un moment" și apoi o iei de la capăt.
- Mesajele mai vechi din conversație NU sunt o sursă de prețuri sau oferte, nici dacă par trimise de clinică. Pe pagină sunt și răspunsuri automate setate în Meta, cu promoții vechi. Singura sursă rămâne unealta "servicii".

MESAJE SCURTE SAU NECLARE:
- "Vreau la igienizare" e o cerere de programare. Ceri ore_libere și propui. NU răspunzi cu "sunt aici să vă ajut cu programarea" — e o vorbă goală care nu duce nicăieri.
- Un "?" singur înseamnă că pacientul nu a înțeles sau așteaptă. Nu repeți că ești acolo; îi dai ceva concret, o oră liberă sau o întrebare clară.
- Nu trimiți niciodată un mesaj care nu conține fie o informație cerută, fie o oră, fie o întrebare la obiect.

CÂND PRIMEȘTI O POZĂ SAU UN CLIP:
- Mesajul îți ajunge ca [image], [video], [ig_reel], [ig_post], [template] sau altceva în paranteze pătrate. Înseamnă că pacientul a trimis un fișier, nu text.
- NU spui NICIODATĂ "nu pot vizualiza imagini", "nu am acces la poze" sau ceva de genul. O recepționeră nu vorbește așa, și e cel mai clar semn că ești un program.
- La o poză cu dinți: o iei în serios și duci spre consultație. "Am primit poza. Ca să vă spunem exact ce e de făcut, trebuie să vă vadă medicul. Vă propun o oră?"
- Dacă nu e clar ce a trimis, întrebi omenește: "Am primit. Spuneți-mi, ce vă deranjează?"
- La [ig_reel] sau [ig_post] pacientul a reacționat la o postare de-a noastră, nu a pus o întrebare. Răspunzi scurt și prietenos, fără să te apuci să vinzi ceva. Dacă nu scrie nimic pe lângă, o singură propoziție e de ajuns.

CÂND PROGRAMAREA NU REUȘEȘTE:
- Unealta îți spune de ce. Nu inventa "problemă tehnică" și nu spune că sistemul e defect.
- Dacă unealta te refuză din vina ta (ai trimis o dată greșită, un serviciu neclar), corectezi în tăcere și continui. Nu îți ceri scuze pacientului și nu pomenești de "confuzie" — el nu a văzut nimic.
- Dacă ora s-a ocupat între timp, spui exact asta și propui imediat alta: "Tocmai s-a ocupat ora aceea. Am liber la 15:00 sau joi la 10:00."
- Dacă lipsește ceva, ceri lucrul care lipsește.
- NU propui niciodată ore din memorie după un refuz. Ceri din nou "ore_libere" și spui doar ce ți-a întors. O oră inventată e un pacient care vine degeaba.
- Doar dacă nu poți deloc, spui că revine cineva de la recepție.

CE NU FACI:
- Nu dai sfaturi medicale și nu spui ce tratament îi trebuie. Pentru asta e consultația.
- Nu promiți rezultate și nu estimezi durata vindecării.
- Dacă întrebarea e medicală sau delicată, spui că îl întrebi pe medic și revii, sau îl inviți la consultație.
- Dacă ceva nu merge sau pacientul e nemulțumit, nu insiști: spui că îl sună cineva de la recepție.`;

// ── Tools ───────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "servicii",
      description:
        "Lista serviciilor pentru care se poate face programare, cu durata, prețul și câmpul 'acopera' care spune ce tratează fiecare. Folosește 'acopera' ca să deduci serviciul potrivit când pacientul descrie o problemă în cuvintele lui.",
      parameters: { type: "object", additionalProperties: false, required: [], properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "ore_libere",
      description:
        "Orele libere din calendarul medicilor, începând de mâine. Folosește-o de fiecare dată — nu propune niciodată o oră din memorie. Fiecare înregistrare are 'zi' și 'oraText' scrise pentru pacient, plus 'data' și 'ora' pentru unealta de programare.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["zile"],
        properties: {
          zile: {
            type: "integer",
            description:
              "Câte zile în față să caute, între 1 și 45. Dacă nu găsește nimic în intervalul cerut, caută automat mai departe.",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "cauta_pacient",
      description:
        "Verifică dacă numărul de telefon există deja în sistem. Dacă da, primești numele și nu mai trebuie să-l ceri.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["telefon"],
        properties: { telefon: { type: "string" } },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "programarile_lui",
      description:
        "Programările viitoare ale unui pacient, după numărul de telefon. Folosește-o ORI DE CÂTE ORI pacientul întreabă la ce sau când s-a programat. Niciodată din memorie.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["telefon"],
        properties: { telefon: { type: "string" } },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "programeaza",
      description:
        "Creează programarea. Ai nevoie de nume, telefon, serviciu și ora confirmată de pacient. Cheam-o o singură dată pentru o programare. Refuză dacă lipsește ceva.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["nume", "telefon", "serviciuSlug", "data", "ora"],
        properties: {
          nume: { type: "string" },
          telefon: { type: "string" },
          serviciuSlug: {
            type: "string",
            description:
              "Serviciul, cum l-a spus pacientul. Poate fi slug, denumire sau cuvintele lui, chiar scrise greșit — se potrivește pe server.",
          },
          medicId: {
            type: "string",
            description:
              "Opțional. Dacă îl ai din ore_libere, copiază-l exact; dacă nu ești sigur, lasă-l gol — medicul e găsit după zi și oră.",
          },
          // Date and hour as separate plain values rather than a timestamp: an
          // ISO string has to be echoed back byte for byte, and rebuilding one
          // with the wrong offset silently moves the booking by three hours.
          data: {
            type: "string",
            description: "Ziua exact cum a venit din ore_libere: AAAA-LL-ZZ.",
          },
          motiv: {
            type: "string",
            description:
              "Ce a spus pacientul, în cuvintele lui: \"am 2 carii\", \"mă doare o măsea jos\", \"vreau curățire\". Ajunge în fișă, la medic. Nu i-l repeți pacientului.",
          },
          ora: {
            type: "integer",
            description: "Ora exact cum a venit din ore_libere, ca număr întreg.",
          },
        },
      },
    },
  },
];

const WEEKDAYS = [
  "duminică",
  "luni",
  "marți",
  "miercuri",
  "joi",
  "vineri",
  "sâmbătă",
];
const MONTHS = [
  "ianuarie",
  "februarie",
  "martie",
  "aprilie",
  "mai",
  "iunie",
  "iulie",
  "august",
  "septembrie",
  "octombrie",
  "noiembrie",
  "decembrie",
];

/** "luni, 28 septembrie" — or "mâine (marți, 8 septembrie)" for the near days. */
function dayLabel(date: string, offset: number): string {
  const [year, month, day] = date.split("-").map(Number);
  // Noon, so the weekday cannot slip a day either side of midnight.
  const noon = new Date(Date.UTC(year, month - 1, day, 12));
  const written = `${WEEKDAYS[noon.getUTCDay()]}, ${day} ${MONTHS[month - 1]}`;
  if (offset === 1) return `mâine (${written})`;
  if (offset === 2) return `poimâine (${written})`;
  return written;
}

/** Lowercase, no diacritics, no punctuation — so "Terapie" and "terapei" meet. */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Cyrillic is kept: half the patients here write in Russian, and stripping
    // it would leave nothing to match against.
    .replace(/[^a-z0-9Ѐ-ӿ]+/g, " ")
    .trim();
}

/**
 * What patients call things, against what the clinic calls them.
 *
 * Nobody asks for "igienizare dentară" — they ask for a cleaning, or say the
 * tartar should come off. String similarity cannot bridge that: "curățire"
 * and "igienizare" share almost no letters. So the everyday words are listed,
 * in both languages people write here, and mapped onto the clinic's own name.
 */
const SPOKEN_AS: { said: string[]; means: string }[] = [
  {
    said: [
      "curatire", "curatare", "curatat", "curatenie", "detartraj", "tartru",
      "piatra", "igiena", "profilaxie", "airflow", "periaj",
      "чистка", "чистку", "чистки", "гигиена", "гигиену", "камень", "камни",
    ],
    means: "igienizare",
  },
  {
    said: [
      "consultatie", "consult", "control", "verificare", "examinare", "vizita",
      "консультаци", "осмотр", "проверка",
    ],
    means: "consultatie",
  },
  {
    said: [
      "plomba", "plombare", "carie", "carii", "durere", "doare", "masea",
      "пломб", "кариес", "болит",
    ],
    means: "terapie",
  },
  {
    said: [
      "canal", "nerv", "devitalizare", "pulpita", "abces",
      "канал", "нерв", "пульпит",
    ],
    means: "endodontie",
  },
  {
    said: [
      "coroana", "coroane", "punte", "proteza", "protetica",
      "коронк", "мост", "протез",
    ],
    means: "protetica",
  },
  {
    said: [
      "fatete", "albire", "estetic", "zambet",
      "виниры", "отбеливание", "эстетик",
    ],
    means: "estetica",
  },
  { said: ["implant", "surub", "имплант"], means: "implantologie" },
  {
    said: ["copil", "copii", "pediatric", "pedodontie", "ребен", "дети", "детск"],
    means: "copii",
  },
  {
    said: [
      "gingii", "gingie", "sangereaza", "parodontoza", "parodontita",
      "десн", "кровоточ", "пародонт",
    ],
    means: "parodontologie",
  },
];

/** Rewrites a patient's own words into the clinic's, when it recognises them. */
function spokenToService(query: string): string | null {
  const text = normalise(query);
  if (!text) return null;
  for (const entry of SPOKEN_AS) {
    for (const word of entry.said) {
      // Substring, not whole word: "curatire dentara", "ma doare o masea" and
      // "чистку зубов" all carry the term inside a longer phrase.
      if (text.includes(word)) return entry.means;
    }
  }
  return null;
}

/** Levenshtein distance, enough to forgive a slip or two of the finger. */
function editDistance(a: string, b: string): number {
  const rows: number[][] = [Array.from({ length: b.length + 1 }, (_, i) => i)];
  for (let i = 1; i <= a.length; i++) {
    rows[i] = [i];
    for (let j = 1; j <= b.length; j++) {
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return rows[a.length][b.length];
}

/**
 * Finds the service a patient meant, from whatever they actually typed.
 *
 * The slug used to have to arrive spelled exactly, so "consultatie" or a
 * mistyped "terapei" came back as "we do not offer that" — and the booking
 * stopped there, for a service the clinic plainly does offer. Matching is done
 * on words rather than identifiers, and reports how sure it is, so an
 * uncertain guess becomes a short question instead of a refusal.
 */
export async function resolveService(query: string): Promise<{
  service: { id: string; slug: string; title: string; duration: number } | null;
  sure: boolean;
  suggestion: string | null;
}> {
  const services = await prisma.service.findMany({
    where: { isActive: true, bookable: true },
    select: { id: true, slug: true, title: true, duration: true },
  });

  // The patient's own words first: "curățire" becomes "igienizare" before any
  // letters are compared, because comparing them would never have worked.
  const spoken = spokenToService(query);
  const wanted = normalise(spoken ?? query);
  if (!wanted) return { service: null, sure: false, suggestion: null };

  let best: (typeof services)[number] | null = null;
  let bestScore = Infinity;

  for (const service of services) {
    const whole = [normalise(service.slug), normalise(service.title)];
    // Single words too, so "consultatie" reaches "Consultația medicului
    // stomatolog" — against the whole title it is nowhere near, and it lost to
    // an unrelated service that happened to be spelled more similarly.
    const words = whole
      .flatMap((c) => c.split(" "))
      .filter((w) => w.length >= 4);

    for (const candidate of [...whole, ...words]) {
      // An exact hit, or one name contained in the other ("terapie" inside
      // "terapie generala"), needs no distance calculation.
      if (candidate === wanted) return { service, sure: true, suggestion: service.title };
      if (candidate.includes(wanted) || wanted.includes(candidate)) {
        if (bestScore > 0.5) {
          best = service;
          bestScore = 0.5;
        }
        continue;
      }
      const score = editDistance(candidate, wanted);
      if (score < bestScore) {
        best = service;
        bestScore = score;
      }
    }
  }

  if (!best) return { service: null, sure: false, suggestion: null };

  // Two edits on a word of reasonable length is a typo; further than that is a
  // different service, and guessing would put someone in the wrong chair.
  // A recognised everyday word is a deliberate mapping, not a guess, so it is
  // allowed a wider margin — "curățire" should land on the cleaning even
  // though the clinic spells it nothing like that.
  const tolerance = spoken
    ? Math.max(6, wanted.length)
    : Math.max(2, Math.floor(wanted.length / 4));
  return {
    service: best,
    sure: bestScore <= tolerance,
    suggestion: best.title,
  };
}

/** YYYY-MM-DD in Moldova, n days from today. */
function moldovaDate(offsetDays: number): string {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + offsetDays);
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Chisinau",
  }).format(now);
}

/**
 * The service list, with the discount already resolved.
 *
 * The raw columns are easy to misread — a discountPrice sitting next to a
 * higher price invites quoting the wrong one — so the decision is made here
 * and the answer handed over as a single price plus a flag.
 */
async function listServices() {
  // Everything active, not only what can be booked: the price list holds some
  // sixty procedures that are steps inside a treatment rather than an
  // appointment, and "how much is a root canal" is asked about exactly those.
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    select: {
      slug: true,
      title: true,
      duration: true,
      price: true,
      discountPrice: true,
      priceNote: true,
      bookable: true,
      // What each one actually covers, so a complaint nobody has written a
      // synonym for can still be reasoned about. "Tratament de Canal
      // (Endodonție)" means nothing to a patient describing a throbbing tooth;
      // the description is what connects the two.
      shortDesc: true,
    },
  });

  return services.map((s) => {
    const discounted =
      s.discountPrice != null && s.price != null && s.discountPrice < s.price;

    // A price-list line needs only its name and its number. Sending the slug,
    // the duration and a description for all sixty of them tripled the size of
    // every price answer — enough to hit the model's per-minute token limit on
    // a single question.
    if (!s.bookable) {
      return {
        titlu: s.title,
        ...(s.priceNote
          ? { pretText: s.priceNote }
          : s.price != null
            ? { pret: s.price }
            : {}),
        sePoatePrograma: false,
      };
    }

    return {
      slug: s.slug,
      titlu: s.title,
      durata: s.duration,
      // Only for the handful that have a page. Repeating a description for
      // every line of the price list would treble the size of the answer, and
      // those titles already say what they are.
      ...(s.bookable && s.shortDesc ? { acopera: s.shortDesc.slice(0, 160) } : {}),
      // Absent rather than zero when there is no price, so "I don't know" and
      // "it's free" can never be confused.
      ...(s.price != null || s.discountPrice != null
        ? { pret: discounted ? s.discountPrice : s.price }
        : {}),
      // The exact wording wins where there is one: a range cannot be said as a
      // single number without picking a side.
      ...(s.priceNote ? { pretText: s.priceNote } : {}),
      areReducere: discounted,
      ...(discounted ? { pretVechi: s.price } : {}),
      sePoatePrograma: s.bookable,
    };
  });
}

/**
 * Free hours across all active doctors, starting tomorrow.
 *
 * Same-day booking is left out on purpose — reception should be the one to say
 * yes to "can I come in an hour", not a chat.
 */
const MAX_LOOKAHEAD_DAYS = 45;

async function findSlots(days: number) {
  let span = Math.min(Math.max(days, 1), MAX_LOOKAHEAD_DAYS);
  const doctors = await prisma.teamMember.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    select: { id: true, name: true, role: true },
  });

  const out: {
    medicId: string;
    medic: string;
    data: string;
    ora: number;
    zi: string;
    oraText: string;
  }[] = [];

  // Nothing inside the asked-for window does not mean nothing at all: doctors
  // often fill the calendar in bursts, weeks ahead. Rather than telling a
  // patient there is nothing free, look further before giving up.
  const scan = async (limit: number) => {
    for (let offset = 1; offset <= limit && out.length < 40; offset++) {
      const date = moldovaDate(offset);
      for (const doctor of doctors) {
        for (const hour of await freeHours(doctor.id, date)) {
          out.push({
            medicId: doctor.id,
            medic: doctor.name,
            data: date,
            ora: hour,
            zi: dayLabel(date, offset),
            oraText: `${String(hour).padStart(2, "0")}:00`,
          });
        }
      }
    }
  };

  await scan(span);
  if (out.length === 0 && span < MAX_LOOKAHEAD_DAYS) {
    span = MAX_LOOKAHEAD_DAYS;
    await scan(span);
  }

  return out.slice(0, 40);
}

/**
 * What this patient is already booked for.
 *
 * Without it, "pentru ce m-am programat?" has no answer and the model makes
 * one up — it told a patient booked for hygiene that they were coming for
 * therapy, at 1000 lei. The diary is the only thing that knows.
 */
async function patientAppointments(phoneRaw: string) {
  const phone = normalizePhone(phoneRaw);
  if (!isValidPhone(phone)) return { gasit: false, motiv: "Număr invalid" };

  const patient = await prisma.patient.findFirst({ where: { phone } });
  if (!patient) return { gasit: false };

  const rows = await prisma.appointment.findMany({
    where: {
      patientId: patient.id,
      dateTime: { gte: new Date() },
      status: { notIn: ["cancelled", "noshow"] },
    },
    orderBy: { dateTime: "asc" },
    take: 5,
    include: { service: { select: { title: true } } },
  });

  return {
    gasit: true,
    nume: patient.name,
    programari: rows.map((a) => ({
      serviciu: a.service.title,
      zi: new Intl.DateTimeFormat("ro-RO", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "Europe/Chisinau",
      }).format(a.dateTime),
      ora: new Intl.DateTimeFormat("ro-RO", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Chisinau",
      }).format(a.dateTime),
      // What they said when they booked, so a follow-up can be answered in
      // their own words rather than the clinic's.
      ...(a.notes ? { nota: a.notes } : {}),
    })),
  };
}

async function findPatient(phoneRaw: string) {
  const phone = normalizePhone(phoneRaw);
  if (!isValidPhone(phone)) return { gasit: false, motiv: "Număr invalid" };
  const patient = await prisma.patient.findFirst({ where: { phone } });
  return patient
    ? { gasit: true, nume: patient.name, telefon: patient.phone }
    : { gasit: false };
}

/**
 * Books, or explains why it will not.
 *
 * The name and phone checks live here rather than in the prompt because they
 * are the difference between a booking somebody can be reached about and a
 * blocked hour nobody can trace.
 */
async function book(args: {
  nume?: string;
  telefon?: string;
  serviciuSlug?: string;
  motiv?: string;
  medicId?: string;
  data?: string;
  ora?: number;
}) {
  const name = (args.nume ?? "").trim();
  if (name.length < 2) {
    return { ok: false, motiv: "Lipsește numele pacientului. Cere-l înainte." };
  }

  const phone = normalizePhone(args.telefon ?? "");
  if (!isValidPhone(phone)) {
    return { ok: false, motiv: "Lipsește un număr de telefon valid. Cere-l înainte." };
  }

  const match = await resolveService(args.serviciuSlug ?? "");
  if (!match.service) {
    const valid = await prisma.service.findMany({
      where: { isActive: true, bookable: true },
      select: { title: true },
    });
    return {
      ok: false,
      motiv: `Nu am înțeles serviciul. Serviciile sunt: ${valid.map((s) => s.title).join(", ")}. Deduce care e și încearcă din nou.`,
    };
  }
  if (!match.sure) {
    // Close, but not close enough to seat someone for the wrong treatment.
    // Handed back as a question to ask, not as a refusal to relay.
    return {
      ok: false,
      confirmareServiciu: match.suggestion,
      motiv: `Cred că e "${match.suggestion}", dar nu sunt sigur. Întreabă scurt pacientul dacă asta a vrut, apoi cheamă din nou programeaza. Nu îi spune că serviciul nu există.`,
    };
  }
  const service = match.service;

  const day = String(args.data ?? "");
  let hour = Number(args.ora);

  // "10:00" arrives as 1000 often enough to be worth handling rather than
  // bouncing back — the patient is waiting while the two of them argue about
  // a format.
  if (Number.isInteger(hour) && hour >= 100 && hour <= 2359 && hour % 100 === 0) {
    hour = Math.floor(hour / 100);
  }

  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(day) || !Number.isInteger(hour) || hour < 0 || hour > 23) {
    return { ok: false, motiv: "Ziua sau ora nu sunt valide. Ia-le din ore_libere." };
  }

  // A wrong year is the other recurring slip: the right day and month, filed
  // under 2023. Rather than refuse, the same day is tried in the years that
  // could plausibly be meant — and accepted only if the hour is genuinely free
  // then. A repair that has to match the real calendar cannot invent a
  // booking; it can only recover the one that was meant.
  let resolvedDay = day;
  if (parseMoldovaDateTime(`${day}T${String(hour).padStart(2, "0")}:00`)!.getTime() < Date.now()) {
    const thisYear = new Date().getUTCFullYear();
    resolvedDay = "";
    for (const year of [thisYear, thisYear + 1]) {
      const candidate = `${year}-${day.slice(5)}`;
      const at = parseMoldovaDateTime(`${candidate}T${String(hour).padStart(2, "0")}:00`);
      if (!at || at.getTime() < Date.now()) continue;
      // An hour this patient already holds counts as a match too. Otherwise a
      // repeated call right after a successful booking finds the hour taken —
      // by itself — and reports the day as long past, which is both wrong and
      // alarming to read.
      const already = await prisma.appointment.findFirst({
        where: {
          patient: { phone },
          dateTime: at,
          status: { notIn: ["cancelled", "noshow"] },
        },
        select: { id: true },
      });
      if (already) {
        resolvedDay = candidate;
        break;
      }

      const doctors = await prisma.teamMember.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      for (const doctor of doctors) {
        if ((await freeHours(doctor.id, candidate)).includes(hour)) {
          resolvedDay = candidate;
          break;
        }
      }
      if (resolvedDay) break;
    }
    if (!resolvedDay) {
      return { ok: false, motiv: "Ziua aceea a trecut deja. Ia data exact din ore_libere." };
    }
  }

  const when = parseMoldovaDateTime(
    `${resolvedDay}T${String(hour).padStart(2, "0")}:00`,
  );
  if (!when) {
    return { ok: false, motiv: "Ziua sau ora nu sunt valide. Ia-le din ore_libere." };
  }

  // Checked before a doctor is chosen, and before a patient row is created.
  // The hour this booking would take is the hour the previous call already
  // took, so looking for a free doctor first finds none and reports "nobody
  // has that hour free" — about the patient's own appointment, made seconds
  // earlier. Saying yes to what already exists is both true and harmless.
  const alreadyBooked = await prisma.appointment.findFirst({
    where: {
      patient: { phone },
      dateTime: when,
      status: { notIn: ["cancelled", "noshow"] },
    },
    include: {
      service: { select: { title: true } },
      patient: { select: { name: true } },
    },
  });
  if (alreadyBooked) {
    return {
      ok: true,
      dejaExista: true,
      pacient: alreadyBooked.patient.name,
      cand: alreadyBooked.dateTime.toISOString(),
      serviciu: alreadyBooked.service.title,
      motiv: "Programarea era deja făcută. Confirmă-i-o, nu o face din nou.",
    };
  }

  // The doctor is resolved here rather than trusted from the call.
  //
  // A 24-character hex id is exactly the kind of thing a language model
  // retypes with a character missing, and it did: the booking failed on a
  // malformed ObjectID for an hour that was perfectly free. Since the hour
  // itself already identifies who is working, the id is optional — given, it
  // is verified; missing or mistyped, the doctor who opened that hour is
  // found from the calendar.
  const claimed = String(args.medicId ?? "");
  let medicId = /^[0-9a-fA-F]{24}$/.test(claimed) ? claimed : "";

  if (medicId && !(await freeHours(medicId, resolvedDay)).includes(hour)) {
    medicId = "";
  }

  if (!medicId) {
    const doctors = await prisma.teamMember.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: { id: true },
    });
    for (const doctor of doctors) {
      if ((await freeHours(doctor.id, resolvedDay)).includes(hour)) {
        medicId = doctor.id;
        break;
      }
    }
  }

  if (!medicId) {
    return {
      ok: false,
      motiv: "Niciun medic nu are ora aceea liberă. Cere din nou ore_libere și propune alta.",
    };
  }

  const patient =
    (await prisma.patient.findFirst({ where: { phone } })) ??
    (await prisma.patient.create({ data: { name, phone } }));

  const appointment = await prisma.appointment.create({
    data: {
      patientId: patient.id,
      serviceId: service.id,
      teamMemberId: medicId,
      dateTime: when,
      duration: service.duration,
      // What the patient actually said, in their own words. The service name
      // says which chair they sit in; this says why they came, which is what
      // the dentist wants to read before they walk in.
      notes: [
        "Programare făcută prin chat.",
        ...(String(args.motiv ?? "").trim()
          ? [`Pacientul a spus: ${String(args.motiv).trim().slice(0, 300)}`]
          : []),
      ].join(" "),
    },
  });

  try {
    // The same guard the admin form goes through: it re-checks the doctor's
    // availability and loses the race cleanly if the hour went in the meantime.
    await claimSlot(medicId, when, appointment.id);
  } catch (error) {
    await prisma.appointment.delete({ where: { id: appointment.id } });
    return {
      ok: false,
      motiv:
        (error as Error).name === "SlotTakenError"
          ? "Ora tocmai a fost ocupată. Propune alta."
          : "Medicul nu are ora aceea liberă. Propune alta.",
    };
  }

  // Everything a booking normally sets off: the clinic group, the doctor's own
  // Telegram, and the patient's WhatsApp confirmation. A booking made from
  // chat is a booking like any other, so it goes through the same path rather
  // than quietly landing in the calendar.
  try {
    const full = await prisma.appointment.findUnique({
      where: { id: appointment.id },
      include: { patient: true, service: true },
    });
    if (full) {
      const { notifyCreated } = await import("@/lib/notifications");
      await notifyCreated(full);
    }
  } catch (error) {
    console.error("notifyCreated after chat booking failed:", error);
  }

  // A lead that turned into a patient is no longer a lead.
  await prisma.lead
    .updateMany({
      where: { phone, status: { notIn: ["convertit", "pierdut"] } },
      data: { status: "convertit", patientId: patient.id, followUpAt: null },
    })
    .catch(() => {});

  return {
    ok: true,
    pacient: patient.name,
    cand: when.toISOString(),
    serviciu: service.title,
  };
}

/** Hands a refused booking to reception, with everything the chat collected. */
async function reportFailedBooking(
  args: { nume?: string; telefon?: string; serviciuSlug?: string; data?: string; ora?: number },
  reason: string,
) {
  const line = (label: string, value: unknown) =>
    value ? `${label}: <b>${String(value)}</b>` : `${label}: <i>lipsește</i>`;

  try {
    await sendTelegramToTopic(
      [
        "⚠️ <b>Nu am putut programa un pacient din chat</b>",
        `Motiv: ${reason}`,
        "",
        line("Nume", args.nume),
        line("Telefon", args.telefon),
        line("Serviciu", args.serviciuSlug),
        line("Ziua", args.data),
        line("Ora", args.ora === undefined ? "" : `${args.ora}:00`),
        "",
        "Sunați pacientul — el rămâne cu „revine cineva de la recepție”.",
      ].join("\n"),
      TELEGRAM_TOPICS.erori,
    );
  } catch (error) {
    console.error("Failed to report a refused booking:", error);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runTool(name: string, args: any): Promise<unknown> {
  switch (name) {
    case "servicii":
      return listServices();
    case "ore_libere":
      return findSlots(Number(args?.zile) || 7);
    case "cauta_pacient":
      return findPatient(String(args?.telefon ?? ""));
    case "programarile_lui":
      return patientAppointments(String(args?.telefon ?? ""));
    case "programeaza": {
      const result = await book(args ?? {});
      if (!result.ok) {
        console.warn("Assistant booking refused:", JSON.stringify({ args, result }));
        // A refused booking is a patient who wanted an hour and did not get
        // one. Reception gets everything collected so far, so somebody can
        // call back without asking the patient to repeat it.
        await reportFailedBooking(args ?? {}, result.motiv ?? "Motiv necunoscut");
      }
      return result;
    }
    default:
      return { error: `Unealtă necunoscută: ${name}` };
  }
}

export interface AssistantTurn {
  role: "user" | "assistant";
  content: string;
}

/**
 * Produces the next reply, booking along the way when the patient agreed to an
 * hour. Returns null when it has nothing to say, which the caller treats as
 * "stay quiet" rather than sending an empty message.
 */
export async function assistantReply(
  history: AssistantTurn[],
  knownPatient?: { name: string; phone: string } | null,
): Promise<string | null> {
  if (!isAssistantConfigured()) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = [
    { role: "system", content: SYSTEM },
    {
      // Without this it has no idea what day it is, so "luni" or "săptămâna
      // viitoare" were being worked out from nothing — which is how patients
      // were told the wrong weekday.
      role: "system",
      content: `Azi este ${dayLabel(moldovaDate(0), 0)}, ora ${new Intl.DateTimeFormat(
        "ro-RO",
        { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Chisinau" },
      ).format(new Date())}, la Chișinău. Programările încep de mâine.`,
    },
    {
      role: "system",
      content: knownPatient
        ? `Pacientul e deja în sistem: ${knownPatient.name}, ${knownPatient.phone}. Nu-i mai cere numele sau numărul.`
        : "Pacientul nu e în sistem. Ai nevoie de nume și număr de telefon înainte de a programa.",
    },
    ...history.slice(-12),
  ];

  for (let round = 0; round < 6; round++) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ model: MODEL, temperature: 0.6, messages, tools: TOOLS }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Assistant failed:", body?.error?.message);
      return null;
    }

    const message = body?.choices?.[0]?.message;
    if (!message) return null;

    const calls = message.tool_calls ?? [];
    if (calls.length === 0) {
      const text = (message.content ?? "").trim();
      return text || null;
    }

    messages.push(message);
    for (const call of calls) {
      let result: unknown;
      try {
        result = await runTool(
          call.function.name,
          JSON.parse(call.function.arguments || "{}"),
        );
      } catch (error) {
        console.error(`Assistant tool ${call.function.name} threw:`, error);
        // The raw message carries stack frames and file paths, and the model
        // repeats what it is given — that is how a database error ended up
        // being read out to a patient as a broken system.
        result = {
          ok: false,
          motiv: "Unealta nu a putut rula acum. Nu inventa o cauză. Încearcă o singură dată cu date luate din nou din ore_libere, apoi spune că revine cineva de la recepție.",
        };
        if (call.function.name === "programeaza") {
          await reportFailedBooking(
            JSON.parse(call.function.arguments || "{}"),
            `Eroare tehnică: ${(error as Error).message}`.slice(0, 300),
          );
        }
      }
      // Every call, not only the refusals: when a patient says an hour was
      // never booked, this is the only record of what the assistant actually
      // asked for and what came back.
      console.info(
        "Assistant tool:",
        call.function.name,
        call.function.arguments,
        "->",
        JSON.stringify(result).slice(0, 300),
      );
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  return null;
}
