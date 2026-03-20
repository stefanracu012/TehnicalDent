import prisma from "./prisma";
import { localizeBlogPost, type TranslationsMap } from "./localize";

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string[];
  category: string;
  image: string;
  readTime: number;
  date: string;
  author: {
    name: string;
    role: string;
  };
  tags: string[];
}

export const categories = [
  { name: "Toate", slug: "toate" },
  { name: "Igienă Orală", slug: "igiena-orala" },
  { name: "Estetică", slug: "estetica" },
  { name: "Prevenție", slug: "preventie" },
  { name: "Copii", slug: "copii" },
  { name: "Nutriție", slug: "nutritie" },
  { name: "Tratamente", slug: "tratamente" },
];

export const blogPosts: BlogPost[] = [
  {
    slug: "ghid-complet-periaj-dentar",
    title: "Ghidul complet al periajului dentar corect",
    excerpt:
      "Periajul dentar este baza sănătății orale. Descoperă tehnica corectă, frecvența ideală și cele mai bune instrumente pentru un zâmbet sănătos.",
    content: [
      "Periajul dentar este piatra de temelie a igienei orale, dar mulți dintre noi îl realizăm incorect sau insuficient. Un periaj eficient poate preveni cariile, bolile gingivale și problemele de halena (respirație neplăcută).",
      "Tehnica corectă presupune mișcări circulare blânde, la un unghi de 45 de grade față de linia gingiei. Nu apăsați prea tare — o presiune excesivă poate deteriora smalțul și irită gingiile. Periajul ar trebui să dureze minimum 2 minute, de două ori pe zi.",
      "Alegeți o periuță cu peri moi sau medii și un cap mic, care poate ajunge ușor în toate zonele gurii. Periuțele electrice cu mișcare oscilantă sunt deosebit de eficiente, studiile arătând o reducere cu 21% mai mare a plăcii bacteriene comparativ cu periuțele manuale.",
      "Nu uitați de limbă! Bacteriile se acumulează pe suprafața limbii și contribuie la halena. Periați ușor limba de la spate spre vârf sau folosiți un curățător de limbă dedicat.",
      "Înlocuiți periuța la fiecare 3 luni sau când observați că perii sunt uzați. O periuță cu peri deformați nu mai curăță eficient și poate deveni un mediu propice pentru bacterii.",
    ],
    category: "igiena-orala",
    image: "/images/gallery/clinic-1.jpg",
    readTime: 5,
    date: "2026-03-15",
    author: {
      name: "Dr. Alexandru Munteanu",
      role: "Medic Stomatolog",
    },
    tags: ["periaj", "igienă", "prevenție"],
  },
  {
    slug: "alimentele-care-iti-distrug-dintii",
    title: "10 alimente care îți distrug dinții fără să știi",
    excerpt:
      "Unele alimente aparent inofensive pot cauza daune serioase dinților tăi. Află care sunt și cum să te protejezi.",
    content: [
      "Alimentația joacă un rol crucial în sănătatea dentară. Multe alimente pe care le consumăm zilnic pot eroda smalțul, favoriza cariile sau păta dinții fără ca noi să realizăm.",
      "Citricele și sucurile acide (portocale, lămâi, grepfrut) sunt bogate în vitamina C, dar acidul citric erodează smalțul dentar. Recomandarea: consumați-le la mese, nu ca gustări, și clătiți gura cu apă după.",
      "Băuturile carbogazoase, inclusiv cele 'zero zahăr', conțin acid fosforic și acid citric care atacă smalțul. Chiar și apa minerală carbogazoasă are un pH mai scăzut decât apa plată.",
      "Pâinea albă și crackerele se transformă rapid în zahăr simplu în gură, hrănind bacteriile cariogene. Amidoanele se lipesc de dinți și rămân în fisuri mai mult decât ciocolata.",
      "Gheața pe care mulți o mestecă din obișnuință poate cauza microfisuri în smalț și deteriora lucrările dentare existente. Cafeaua și ceaiul, deși au antioxidanți benefici, pot păta smalțul în timp.",
      "Fructele uscate, deși nutritive, sunt lipicioase și bogate în zahăr concentrat. Se lipesc între dinți și alimentează bacteriile pentru perioade lungi. Preferați fructele proaspete în loc.",
      "Sfatul medicului: nu vă periați dinții imediat după consumul de alimente acide — așteptați 30 de minute. Acidul înmoaie temporar smalțul, iar periajul imediat poate cauza eroziune.",
    ],
    category: "nutritie",
    image: "/images/gallery/clinic-3.jpg",
    readTime: 7,
    date: "2026-03-10",
    author: {
      name: "Dr. Alexandru Munteanu",
      role: "Medic Stomatolog",
    },
    tags: ["nutriție", "prevenție", "smalț"],
  },
  {
    slug: "cand-trebuie-sa-mergi-la-dentist",
    title: "7 semne că trebuie să mergi urgent la dentist",
    excerpt:
      "Nu ignora aceste simptome — pot indica probleme serioase care necesită intervenție imediată.",
    content: [
      "Mulți oameni amână vizitele la dentist până când durerea devine insuportabilă. Însă unele simptome sunt semnale de alarmă care nu ar trebui niciodată ignorate.",
      "Sângerarea gingiilor în timpul periajului nu este normală. Este cel mai frecvent semn al gingivitei — stadiul incipient al bolii parodontale. Tratată la timp, gingivita este complet reversibilă.",
      "Sensibilitatea la cald și rece care persistă mai mult de câteva secunde poate indica o carie profundă sau o fisură în dinte. Cu cât interveniți mai devreme, cu atât tratamentul este mai simplu și mai puțin costisitor.",
      "Durerea spontană (care apare fără stimul) sugerează că nervul dintelui este inflamat sau infectat. Aceasta necesită de obicei tratament endodontic (de canal) și nu se va rezolva de la sine.",
      "Gingiile retrase, dinții care par mai lungi sau spații noi între dinți pot indica boală parodontală avansată, care poate duce la pierderea dinților dacă nu este tratată.",
      "Respirația persistentă neplăcută (halena), în ciuda unei igiene orale bune, poate fi cauzată de infecții dentare ascunse, boli gingivale sau alte probleme orale care necesită evaluare profesională.",
      "Petele albe sau maro pe dinți, umflăturile pe gingie sau orice modificare a țesuturilor moi din gură ar trebui evaluate prompt. Detectarea precoce a oricărei anomalii este esențială.",
      "Recomandarea noastră: vizitați medicul stomatolog la fiecare 6 luni pentru control și igienizare profesională, chiar dacă nu aveți simptome. Prevenția este întotdeauna mai bună decât tratamentul.",
    ],
    category: "preventie",
    image: "/images/gallery/clinic-5.jpg",
    readTime: 6,
    date: "2026-03-05",
    author: {
      name: "Dr. Alexandru Munteanu",
      role: "Medic Stomatolog",
    },
    tags: ["urgență", "simptome", "prevenție"],
  },
  {
    slug: "albirea-dentara-mit-vs-realitate",
    title: "Albirea dentară: mit vs. realitate",
    excerpt:
      "Există multe mituri despre albirea dinților. Află ce funcționează cu adevărat și ce poate fi dăunător pentru smalțul tău.",
    content: [
      "Albirea dentară este una dintre cele mai solicitate proceduri estetice, dar este înconjurată de multe mituri și informații eronate care pot duce la decizii greșite.",
      "MIT: Bicarbonatul de sodiu este cel mai bun agent de albire natural. REALITATE: Bicarbonatul este un abraziv care poate deteriora smalțul prin utilizare regulată. Poate oferi un efect temporar de curățare, dar nu albește cu adevărat dinții.",
      "MIT: Albirea deteriorează permanent smalțul. REALITATE: Albirea profesională, realizată corect sub supravegherea medicului, este sigură. Substanțele active (peroxid de hidrogen sau carbamidă) pătrund în smalț pentru a descompune pigmenții, fără a deteriora structura dentară.",
      "MIT: Produsele de albire din comerț sunt la fel de eficiente ca albirea profesională. REALITATE: Concentrațiile de peroxid din produsele OTC sunt semnificativ mai mici. Albirea profesională oferă rezultate mai rapide, mai uniforme și mai sigure.",
      "MIT: Odată albiți, dinții rămân albi permanent. REALITATE: Rezultatele albirea durează 1-3 ani, în funcție de dietă și obiceiuri. Cafeaua, vinul roșu, ceaiul și tutunul pot re-pigmenta dinții.",
      "Cel mai important: înainte de orice procedură de albire, este esențial un control stomatologic complet. Cariile, fisurile sau bolile gingivale trebuie tratate mai întâi. Albirea pe dinți cu probleme poate cauza sensibilitate severă sau complicații.",
    ],
    category: "estetica",
    image: "/images/gallery/result-1.jpg",
    readTime: 6,
    date: "2026-02-28",
    author: {
      name: "Dr. Alexandru Munteanu",
      role: "Medic Stomatolog",
    },
    tags: ["albire", "estetică", "mituri"],
  },
  {
    slug: "igiena-orala-la-copii",
    title: "Igiena orală la copii: ghid pe vârste",
    excerpt:
      "De la primul dințișor la adolescență — tot ce trebuie să știi pentru a proteja dinții copilului tău.",
    content: [
      "Sănătatea orală a copiilor începe mult mai devreme decât cred majoritatea părinților. Formarea unor obiceiuri corecte de la vârste fragede previne problemele dentare pe tot parcursul vieții.",
      "0-1 an: Curățați gingiile bebelușului cu o cârpă umedă moale după fiecare hrănire. Când apare primul dinte (de obicei în jurul vârstei de 6 luni), începeți periajul cu o periuță specială pentru sugari și o cantitate de pastă de dinți cu fluor cât un bob de orez.",
      "1-3 ani: Periați dinții copilului de două ori pe zi cu o cantitate de pastă cât un bob de orez. Prima vizită la dentist ar trebui să aibă loc până la împlinirea vârstei de 1 an. Evitați biberonul cu lapte sau suc la culcare — aceasta poate cauza 'caria de biberon'.",
      "3-6 ani: Creșteți cantitatea de pastă la dimensiunea unui bob de mazăre. Începeți să învățați copilul tehnica periajului, dar supravegheați-l și ajutați-l până când are dexteritatea necesară (de obicei până la 7-8 ani).",
      "6-12 ani: Molarii permanenți încep să erupă. Sigilarea fisurilor (aplicarea unui strat protector pe suprafața de masticație a molarilor) este foarte eficientă pentru prevenirea cariilor. Introduceți treptat ața dentară.",
      "Adolescenți: Perioada cu cel mai mare risc de carii din cauza alimentației (sucuri, dulciuri) și igienei neglijate. Aparatele ortodontice necesită atenție specială la igienă. Protecțiile bucale sunt esențiale pentru sporturile de contact.",
      "Sfatul nostru: faceți din vizita la dentist o experiență pozitivă! Pedodonția modernă folosește tehnici adaptate copiilor pentru a elimina teama și a crea o relație de încredere cu medicul dentist.",
    ],
    category: "copii",
    image: "/images/gallery/clinic-7.jpg",
    readTime: 8,
    date: "2026-02-20",
    author: {
      name: "Dr. Alexandru Munteanu",
      role: "Medic Stomatolog",
    },
    tags: ["copii", "pedodonție", "prevenție"],
  },
  {
    slug: "implantul-dentar-ghid-complet",
    title: "Implantul dentar: tot ce trebuie să știi",
    excerpt:
      "De la evaluarea inițială la vindecarea completă — ghidul complet despre implanturile dentare și la ce să te aștepți.",
    content: [
      "Implantul dentar este considerat standardul de aur pentru înlocuirea dinților lipsă. Este o soluție permanentă, care arată, funcționează și se simte ca un dinte natural.",
      "Ce este un implant dentar? Este un șurub mic din titan (sau zirconiu) care se inserează chirurgical în osul maxilar, înlocuind rădăcina dintelui natural. Pe acest implant se fixează o coroană ceramică ce reproduce perfect aspectul unui dinte natural.",
      "Procedura se desfășoară în mai multe etape: evaluare (radiografii, CBCT, planificare digitală), inserarea implantului (30-60 minute, sub anestezie locală), perioada de osteointegrare (3-6 luni, în care osul se unește cu implantul), și fixarea coroanei finale.",
      "Rata de succes a implanturilor moderne depășește 97%. Factorii care influențează succesul includ: calitatea și cantitatea osoasă, igiena orală, starea generală de sănătate și experiența chirurgului.",
      "Implanturile necesită aceeași îngrijire ca dinții naturali: periaj, ață dentară și vizite regulate la dentist. Cu o igienă adecvată, un implant poate dura toată viața.",
      "Alternativele la implant (punți dentare, proteze mobile) implică sacrificarea dinților sănătoși vecini sau confort redus. Implantul preservă osul maxilar, prevenind resorbția osoasă care apare după pierderea unui dinte.",
      "La TehnicalDent folosim tehnologie de ultimă generație pentru planificarea digitală a implanturilor, asigurând precizie maximă și rezultate predictibile. Fiecare caz este evaluat individual pentru a determina cel mai bun plan de tratament.",
    ],
    category: "tratamente",
    image: "/images/gallery/clinic-9.jpg",
    readTime: 9,
    date: "2026-02-15",
    author: {
      name: "Dr. Alexandru Munteanu",
      role: "Medic Stomatolog",
    },
    tags: ["implant", "chirurgie", "tratament"],
  },
  {
    slug: "ata-dentara-de-ce-este-esentiala",
    title: "Ața dentară: de ce este esențială și cum să o folosești corect",
    excerpt:
      "Periajul singur curăță doar 60% din suprafața dinților. Află de ce ața dentară este indispensabilă pentru sănătatea orală.",
    content: [
      "Periajul dentar, oricât de corect ar fi realizat, nu poate ajunge în spațiile interdentare — zonele dintre dinți unde se acumulează cel mai frecvent placa bacteriană și unde încep cele mai multe carii.",
      "Ața dentară elimină resturile alimentare și placa bacteriană din spațiile unde periuța nu ajunge. Utilizarea zilnică a aței dentare reduce riscul de carii interdentare cu până la 40% și riscul de boală gingivală cu 60%.",
      "Tehnica corectă: tăiați aproximativ 45 cm de ață, înfășurați-o pe degetele mijlocii și ghidați-o cu degetele arătătoare și mari. Introduceți ața ușor între dinți cu o mișcare de ferăstrău, apoi curbați-o în formă de C în jurul fiecărui dinte și glisați-o sub linia gingiei.",
      "Nu treceți ața brusc — puteți răni gingia. Folosiți o porțiune curată de ață pentru fiecare spațiu interdental. Dacă gingiile sângerează inițial, nu vă alarmați — sângerarea se oprește de obicei în 1-2 săptămâni de utilizare consistentă.",
      "Alternative moderne: periuțele interdentare (de diferite dimensiuni), irigatorele bucale (water flosser) și ața dentară cu suport sunt opțiuni excelente pentru cei care au dificultăți cu ața tradițională sau poartă aparate ortodontice.",
      "Momentul ideal: folosiți ața dentară cel puțin o dată pe zi, preferabil seara, înainte de periajul de noapte. Aceasta permite pastei de dinți cu fluor să ajungă și în spațiile interdentare curățate.",
    ],
    category: "igiena-orala",
    image: "/images/gallery/clinic-11.jpg",
    readTime: 5,
    date: "2026-02-10",
    author: {
      name: "Dr. Alexandru Munteanu",
      role: "Medic Stomatolog",
    },
    tags: ["ață dentară", "igienă", "prevenție"],
  },
  {
    slug: "bruxismul-ranger-dintilor",
    title: "Bruxismul: de ce rangezi din dinți și ce poți face",
    excerpt:
      "Rangi din dinți noaptea? Acest obicei inconștient poate cauza daune serioase. Descoperă cauzele și soluțiile.",
    content: [
      "Bruxismul — scrâșnirea sau încleștarea involuntară a dinților — afectează aproximativ 20% din populația adultă. Cele mai multe persoane nici nu știu că suferă de această condiție, deoarece apare predominant în timpul somnului.",
      "Semnele bruxismului includ: dureri de cap matinale (mai ales în zona tâmplelor), dureri ale articulației temporo-mandibulare (ATM), sensibilitate dentară crescută, uzura vizibilă a dinților, și oboseală a mușchilor masticatori la trezire.",
      "Cauzele sunt multiple: stresul și anxietatea sunt factorii principali, dar și malocluziile (problemele de mușcătură), consumul de alcool sau cofeină seara, apneea în somn și anumite medicamente pot contribui.",
      "Consecințele bruxismului netratat pot fi severe: uzura excesivă a smalțului, fracturi dentare, deteriorarea lucrărilor protetice, dureri cronice ale ATM și chiar pierderea dinților în cazuri extreme.",
      "Tratamentul de elecție este gutiera de bruxism (night guard) — o proteză ocluzală personalizată, realizată pe modelul dinților dumneavoastră, care protejează dinții și relaxează musculatura în timpul somnului.",
      "Tratamente complementare includ: exerciții de relaxare a mandibulei, managementul stresului, fizioterapie pentru ATM, și în unele cazuri, tratament ortodontic pentru corectarea mușcăturii.",
      "Dacă suspectați că suferiți de bruxism, programați o consultație. Putem evalua uzura dentară, verifica articulația ATM și recomanda cel mai potrivit plan de tratament pentru situația dumneavoastră.",
    ],
    category: "tratamente",
    image: "/images/gallery/clinic-2.jpg",
    readTime: 7,
    date: "2026-02-05",
    author: {
      name: "Dr. Alexandru Munteanu",
      role: "Medic Stomatolog",
    },
    tags: ["bruxism", "ATM", "gutieră"],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

export function getBlogPostsByCategory(categorySlug: string): BlogPost[] {
  if (categorySlug === "toate") return blogPosts;
  return blogPosts.filter((post) => post.category === categorySlug);
}

// ---- DB-aware async functions ----

function estimateReadTime(text: string): number {
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function dbPostToBlogPost(dbPost: {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  tags: string[];
  author: string;
  publishedAt: Date | null;
  createdAt: Date;
  translations?: TranslationsMap | null;
}, locale?: string): BlogPost {
  // Localize before transforming if locale provided
  const post = locale ? localizeBlogPost(dbPost, locale) : dbPost;
  const paragraphs = (post.content as string)
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return {
    slug: post.slug as string,
    title: post.title as string,
    excerpt: post.excerpt as string,
    content: paragraphs.length > 0 ? paragraphs : [post.content as string],
    category: post.category as string,
    image: (post.coverImage as string) || "/images/gallery/clinic-1.jpg",
    readTime: estimateReadTime(post.content as string),
    date: ((dbPost.publishedAt || dbPost.createdAt) as Date).toISOString().split("T")[0],
    author: {
      name: (post.author as string) || "TechnicalDent",
      role: "Echipa TechnicalDent",
    },
    tags: post.tags as string[],
  };
}

export async function getPublishedBlogPosts(locale?: string): Promise<BlogPost[]> {
  try {
    const dbPosts = await prisma.blogPost.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: "desc" },
    });
    if (dbPosts.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return dbPosts.map((p) => dbPostToBlogPost(p as any, locale));
    }
  } catch (error) {
    console.log("Database not available for blog, using mock data");
  }
  return blogPosts;
}

export async function getPublishedBlogPost(
  slug: string,
  locale?: string,
): Promise<BlogPost | undefined> {
  try {
    const dbPost = await prisma.blogPost.findUnique({
      where: { slug },
    });
    if (dbPost && dbPost.isPublished) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return dbPostToBlogPost(dbPost as any, locale);
    }
  } catch (error) {
    console.log("Database not available for blog post, using mock data");
  }
  return blogPosts.find((post) => post.slug === slug);
}

export async function getAllPublishedSlugs(): Promise<string[]> {
  try {
    const dbPosts = await prisma.blogPost.findMany({
      where: { isPublished: true },
      select: { slug: true },
    });
    if (dbPosts.length > 0) {
      return dbPosts.map((p) => p.slug);
    }
  } catch {
    // fall through
  }
  return blogPosts.map((p) => p.slug);
}
