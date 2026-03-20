// Data fetching functions
// These work with both database and fallback mock data for development

import prisma from "./prisma";

export interface Service {
  id: string;
  slug: string;
  title: string;
  shortDesc: string;
  description: string;
  overview: string;
  process: string;
  recovery: string;
  benefits: string[];
  images: string[];
  category: string;
  order: number;
  isActive: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  description: string;
  image: string;
  order: number;
  isActive: boolean;
}

export interface Testimonial {
  id: string;
  name: string;
  content: string;
  service: string | null;
  isActive: boolean;
}

export interface GalleryImage {
  id: string;
  url: string;
  alt: string;
  category: string;
  order: number;
  isActive: boolean;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  tags: string[];
  author: string;
  isPublished: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Mock data for development
const mockServices: Service[] = [
  {
    id: "1",
    slug: "implantologie",
    title: "Implantologie Dentară",
    shortDesc: "Restaurarea completă a dinților lipsă prin implanturi dentare de ultimă generație, oferind funcționalitate și estetică naturală.",
    description: "Implantologia dentară reprezintă soluția modernă și de lungă durată pentru înlocuirea dinților pierduți. Folosind tehnologie avansată și materiale biocompatibile, implanturile oferă o alternativă superioară protezelor clasice.",
    overview: "Implantul dentar este o rădăcină artificială din titan, plasată chirurgical în osul maxilar sau mandibular. Peste acest implant se montează o coroană ceramică care arată și funcționează exact ca un dinte natural. Procedura este realizată sub anestezie locală și este practic nedureroasă.",
    process: "Procesul de implantare începe cu o evaluare detaliată, incluzând tomografie computerizată 3D pentru planificarea precisă. Intervenția propriu-zisă durează între 30 și 60 de minute per implant. După o perioadă de osteointegrare de 3-6 luni, se montează coroana definitivă.",
    recovery: "Recuperarea după implantare este de obicei rapidă. În primele zile pot apărea ușoare disconfort și edem, controlabile cu medicație prescrisă. Majoritatea pacienților revin la activitățile normale în 2-3 zile.",
    benefits: [
      "Durabilitate excepțională - pot dura toată viața cu îngrijire corespunzătoare",
      "Aspect natural și funcționalitate completă",
      "Prevenirea resorbției osoase",
      "Nu afectează dinții adiacenți",
      "Confort superior protezelor mobile"
    ],
    images: ["/images/services/implantologie-1.jpg", "/images/services/implantologie-2.jpg"],
    category: "Chirurgie",
    order: 1,
    isActive: true
  },
  {
    id: "2",
    slug: "ortodontie",
    title: "Ortodonție",
    shortDesc: "Corectarea malocluziilor și alinierea dinților prin aparate dentare moderne, incluzând soluții invizibile pentru adulți.",
    description: "Tratamentul ortodontic corectează poziția incorectă a dinților și relația dintre arcade, îmbunătățind atât estetica zâmbetului cât și funcționalitatea masticatorie.",
    overview: "Ortodonția modernă oferă multiple opțiuni de tratament, de la aparate fixe clasice la alignere transparente. Alegerea metodei depinde de complexitatea cazului și preferințele pacientului.",
    process: "Tratamentul începe cu o consultație detaliată și analize specifice (radiografii, fotografii, modele digitale). Pe baza acestora se elaborează planul de tratament personalizat. Durata tratamentului variază între 6 luni și 3 ani.",
    recovery: "Aparatele ortodontice necesită o perioadă de adaptare de 1-2 săptămâni. Controalele regulate sunt esențiale pentru ajustări și monitorizarea progresului.",
    benefits: [
      "Zâmbet estetic și armonios",
      "Îmbunătățirea funcției masticatorii",
      "Prevenirea uzurii premature a dinților",
      "Facilitarea igienei orale",
      "Corectarea problemelor de vorbire"
    ],
    images: ["/images/services/ortodontie-1.jpg", "/images/services/ortodontie-2.jpg"],
    category: "Ortodonție",
    order: 2,
    isActive: true
  },
  {
    id: "3",
    slug: "estetica-dentara",
    title: "Estetică Dentară",
    shortDesc: "Transformarea zâmbetului prin fațete, albire profesională și conturare estetică pentru un aspect natural și luminos.",
    description: "Estetica dentară reunește proceduri menite să îmbunătățească aspectul zâmbetului, de la albire profesională până la fațete ceramice și restaurări estetice.",
    overview: "Fiecare tratament estetic începe cu o analiză detaliată a zâmbetului și a trăsăturilor faciale. Scopul este obținerea unui rezultat natural, armonios, care să complementeze fizionomia pacientului.",
    process: "În funcție de tratamentul ales, procedura poate dura de la o singură ședință (albire profesională) până la câteva săptămâni (fațete ceramice). Folosim materiale premium și tehnologii de ultimă generație.",
    recovery: "Majoritatea procedurilor estetice au recuperare minimă. Sensibilitatea dentară temporară poate apărea după albire, dar dispare în câteva zile.",
    benefits: [
      "Zâmbet mai alb și mai luminos",
      "Corectarea formei și dimensiunii dinților",
      "Rezultate naturale și de lungă durată",
      "Creșterea încrederii în sine",
      "Proceduri minim invazive"
    ],
    images: ["/images/services/estetica-1.jpg", "/images/services/estetica-2.jpg"],
    category: "Estetică",
    order: 3,
    isActive: true
  },
  {
    id: "4",
    slug: "chirurgie-orala",
    title: "Chirurgie Orală",
    shortDesc: "Intervenții chirurgicale specializate pentru extracții complexe, tratamentul chisturilor și pregătirea pentru implanturi.",
    description: "Chirurgia orală acoperă o gamă largă de proceduri, de la extracții simple până la intervenții complexe de adiție osoasă și tratamentul patologiilor orale.",
    overview: "Echipa noastră de chirurgie orală are experiență vastă în toate tipurile de intervenții, folosind tehnici minim invazive pentru recuperare rapidă și confort maxim.",
    process: "Fiecare intervenție este precedată de o evaluare completă și planificare detaliată. Folosim anestezie locală de ultimă generație și, la cerere, sedare conștientă pentru pacienții anxioși.",
    recovery: "Timpul de recuperare variază în funcție de complexitatea intervenției. Oferim instrucțiuni detaliate post-operatorii și suntem disponibili pentru orice întrebări.",
    benefits: [
      "Tehnici minim invazive",
      "Recuperare rapidă",
      "Anestezie eficientă",
      "Monitorizare post-operatorie",
      "Experiență în cazuri complexe"
    ],
    images: ["/images/services/chirurgie-1.jpg", "/images/services/chirurgie-2.jpg"],
    category: "Chirurgie",
    order: 4,
    isActive: true
  },
  {
    id: "5",
    slug: "protetica-dentara",
    title: "Protetică Dentară",
    shortDesc: "Restaurarea funcționalității și esteticii prin coroane, punți și proteze dentare realizate din materiale premium.",
    description: "Protetica dentară oferă soluții pentru restaurarea dinților afectați sau înlocuirea celor lipsă, folosind lucrări personalizate de înaltă calitate.",
    overview: "Folosim tehnologie CAD/CAM pentru proiectarea și realizarea lucrărilor protetice cu precizie maximă. Materialele utilizate sunt ceramică premium și zirconiu, garantând durabilitate și estetică.",
    process: "După pregătirea dinților, se realizează amprentă digitală pentru confecționarea lucrării. Timpul de realizare este de 5-10 zile, în funcție de complexitate. Se aplică provizorii pentru perioada de așteptare.",
    recovery: "Adaptarea la lucrările protetice noi durează câteva zile. Controalele de ajustare asigură confortul perfect.",
    benefits: [
      "Aspect natural și estetic",
      "Materiale biocompatibile",
      "Durabilitate îndelungată",
      "Funcționalitate completă",
      "Tehnologie digitală de precizie"
    ],
    images: ["/images/services/protetica-1.jpg", "/images/services/protetica-2.jpg"],
    category: "Protetică",
    order: 5,
    isActive: true
  },
  {
    id: "6",
    slug: "endodontie",
    title: "Endodonție",
    shortDesc: "Tratamentul de canal și salvarea dinților afectați prin proceduri precise și nedureroase cu instrumentar modern.",
    description: "Endodonția se ocupă cu tratamentul țesuturilor din interiorul dintelui. Tratamentul de canal permite salvarea dinților care altfel ar necesita extracție.",
    overview: "Folosim microscopie și instrumentar rotativ de ultimă generație pentru tratamente precise și eficiente. Anestezia modernă asigură o procedură complet nedureroasă.",
    process: "Tratamentul presupune curățarea și dezinfectarea canalelor radiculare, urmată de umplerea etanșă a acestora. În funcție de complexitate, poate fi realizat într-o singură ședință sau în mai multe.",
    recovery: "După tratament poate exista o sensibilitate ușoară timp de câteva zile. Dintele tratat de canal necesită de obicei o coroană pentru protecție pe termen lung.",
    benefits: [
      "Salvarea dintelui natural",
      "Eliminarea infecției și durerii",
      "Procedură nedureroasă",
      "Tehnologie de ultimă generație",
      "Rata mare de succes"
    ],
    images: ["/images/services/endodontie-1.jpg", "/images/services/endodontie-2.jpg"],
    category: "Tratamente",
    order: 6,
    isActive: true
  },
  {
    id: "7",
    slug: "parodontologie",
    title: "Parodontologie",
    shortDesc: "Tratamentul afecțiunilor gingivale și parodontale pentru menținerea sănătății țesuturilor de susținere a dinților.",
    description: "Parodontologia se ocupă cu prevenția, diagnosticul și tratamentul bolilor care afectează gingia și osul de susținere a dinților.",
    overview: "Boala parodontală este una dintre cele mai frecvente afecțiuni orale și cauza principală a pierderii dinților la adulți. Diagnosticul și tratamentul precoce sunt esențiale.",
    process: "Tratamentul include igienizare profesională, detartraj subgingival și, în cazuri avansate, proceduri chirurgicale de regenerare. Mențtinerea rezultatelor necesită controale regulate.",
    recovery: "Recuperarea variază în funcție de severitatea afecțiunii și tipul tratamentului. Igena orală riguroasă acasă este esențială pentru succes.",
    benefits: [
      "Stoparea progresiei bolii",
      "Reducerea inflamației și sângerării",
      "Prevenirea pierderii dinților",
      "Îmbunătățirea sănătății orale generale",
      "Tratamente personalizate"
    ],
    images: ["/images/services/parodontologie-1.jpg", "/images/services/parodontologie-2.jpg"],
    category: "Tratamente",
    order: 7,
    isActive: true
  },
  {
    id: "8",
    slug: "pedodontie",
    title: "Pedodonție",
    shortDesc: "Stomatologie specializată pentru copii, într-un mediu prietenos care transformă vizita la dentist într-o experiență pozitivă.",
    description: "Pedodonția oferă îngrijire dentară adaptată nevoilor copiilor, de la primul dinte până la adolescență, punând accent pe prevenție și educație.",
    overview: "Mediul nostru este special amenajat pentru a fi primitor și liniștitor pentru micii pacienți. Echipa noastră are experiență în lucrul cu copiii și folosește tehnici de comunicare adaptate vârstei.",
    process: "Prima vizită include o familiarizare cu cabinetul și echipamentele. Tratamentele sunt realizate cu răbdare, în ritmul copilului, pentru o experiență pozitivă.",
    recovery: "Copiii se recuperează de obicei foarte rapid după tratamente. Oferim sfaturi pentru părinți privind îngrijirea la domiciliu.",
    benefits: [
      "Mediu prietenos pentru copii",
      "Prevenție și educație",
      "Tratamente fără durere",
      "Creare de obiceiuri sănătoase",
      "Experiențe pozitive la dentist"
    ],
    images: ["/images/services/pedodontie-1.jpg", "/images/services/pedodontie-2.jpg"],
    category: "Specialități",
    order: 8,
    isActive: true
  }
];

const mockTeamMembers: TeamMember[] = [
  {
    id: "1",
    name: "Dr. Maria Ionescu",
    role: "Medic Primar Stomatolog, Fondator",
    description: "Cu peste 20 de ani de experiență în stomatologie, Dr. Ionescu a fondat TechnicalDent cu viziunea de a oferi servicii stomatologice de excelență. Specializată în implantologie și estetică dentară, este recunoscută pentru atenția la detalii și abordarea personalizată a fiecărui caz.",
    image: "/images/team/doctor-1.jpg",
    order: 1,
    isActive: true
  },
  {
    id: "2",
    name: "Dr. Alexandru Popa",
    role: "Medic Specialist Ortodont",
    description: "Dr. Popa este specialist în ortodonție cu formare în tehnici moderne de aliniere dentară. A tratat cu succes mii de pacienți folosind atât aparate clasice cât și sisteme invizibile de ultimă generație.",
    image: "/images/team/doctor-2.jpg",
    order: 2,
    isActive: true
  },
  {
    id: "3",
    name: "Dr. Elena Vasile",
    role: "Medic Specialist Chirurgie Orală",
    description: "Specializată în chirurgie orală și implantologie, Dr. Vasile aduce expertiză în proceduri complexe. Abordarea sa minim invazivă și atenția pentru confortul pacientului o fac un membru valoros al echipei.",
    image: "/images/team/doctor-3.jpg",
    order: 3,
    isActive: true
  },
  {
    id: "4",
    name: "Dr. Andrei Dumitrescu",
    role: "Medic Specialist Endodont",
    description: "Dr. Dumitrescu este expert în tratamente de canal și microchirurgie endodontică. Folosind microscopie și tehnologie avansată, salvează dinți care altfel ar fi considerați pierduți.",
    image: "/images/team/doctor-4.jpg",
    order: 4,
    isActive: true
  }
];

const mockTestimonials: Testimonial[] = [
  {
    id: "1",
    name: "Andreea M.",
    content: "Am venit la TechnicalDent pentru un tratament de implant după ce am pierdut un dinte într-un accident. De la prima consultație, echipa m-a făcut să mă simt în siguranță și mi-a explicat fiecare pas al procedurii. Rezultatul a depășit așteptările mele - nimeni nu își dă seama că am un implant. Recomand cu încredere această clinică oricui caută profesionalism și empatie.",
    service: "Implantologie dentară",
    isActive: true
  },
  {
    id: "2",
    name: "Mihai și Ana T.",
    content: "Întreaga noastră familie se tratează la TechnicalDent de peste 5 ani. Copiii noștri, inițial speriați de dentist, acum se bucură să meargă la controale. Atmosfera prietenoasă și răbdarea echipei au făcut diferența. Pentru noi, aceasta nu este doar o clinică stomatologică, ci un loc unde ne simțim cu adevărat îngrijiți.",
    service: "Pedodonție și stomatologie generală",
    isActive: true
  },
  {
    id: "3",
    name: "Constantin D.",
    content: "La 62 de ani, credeam că zâmbetul meu nu mai poate fi recuperat. Aveam dinți lipsa și cei rămași erau într-o stare precară. Echipa TechnicalDent mi-a propus un plan de tratament complex, realizat etapizat pe parcursul a 8 luni. Astăzi am un zâmbet complet, funcțional și estetic. Recunoștința mea este imensă.",
    service: "Reabilitare orală completă",
    isActive: true
  },
  {
    id: "4",
    name: "Ioana L.",
    content: "Am purtat aparat dentar timp de 18 luni și rezultatele sunt extraordinare. Dr. Popa mi-a explicat tot procesul, mi-a răspuns la toate întrebările și m-a încurajat în momentele mai dificile. Acum am zâmbetul pe care l-am visat întotdeauna și încrederea de a-l arăta lumii.",
    service: "Ortodonție",
    isActive: true
  }
];

const mockGalleryImages: GalleryImage[] = [
  { id: "1",  url: "/images/gallery/clinic-1.jpg",  alt: "Recepție clinică stomatologică",             category: "Clinică",    order: 1,  isActive: true },
  { id: "2",  url: "/images/gallery/clinic-2.jpg",  alt: "Cabinet de consultație modern",              category: "Clinică",    order: 2,  isActive: true },
  { id: "3",  url: "/images/gallery/clinic-3.jpg",  alt: "Echipament stomatologic de ultimă generație", category: "Echipament", order: 3,  isActive: true },
  { id: "4",  url: "/images/gallery/clinic-4.jpg",  alt: "Sala de așteptare confortabilă",             category: "Clinică",    order: 4,  isActive: true },
  { id: "5",  url: "/images/gallery/clinic-5.jpg",  alt: "Cabinet de chirurgie",                       category: "Echipament", order: 5,  isActive: true },
  { id: "6",  url: "/images/gallery/clinic-6.jpg",  alt: "Zonă sterilizare",                           category: "Echipament", order: 6,  isActive: true },
  { id: "7",  url: "/images/gallery/clinic-7.jpg",  alt: "Holul de intrare al clinicii",               category: "Clinică",    order: 7,  isActive: true },
  { id: "8",  url: "/images/gallery/clinic-8.jpg",  alt: "Cabinet stomatologie pediatrică",            category: "Clinică",    order: 8,  isActive: true },
  { id: "9",  url: "/images/gallery/clinic-9.jpg",  alt: "Unitate dentară digitală",                   category: "Echipament", order: 9,  isActive: true },
  { id: "10", url: "/images/gallery/clinic-10.jpg", alt: "Masa de lucru sterilizare",                  category: "Echipament", order: 10, isActive: true },
  { id: "11", url: "/images/gallery/clinic-11.jpg", alt: "Camera de radiologie",                       category: "Echipament", order: 11, isActive: true },
  { id: "12", url: "/images/gallery/clinic-12.jpg", alt: "Cabinet modern vedere laterală",             category: "Clinică",    order: 12, isActive: true },
  { id: "13", url: "/images/gallery/result-1.jpg",  alt: "Rezultat tratament estetic",                 category: "Rezultate",  order: 13, isActive: true },
  { id: "14", url: "/images/gallery/result-2.jpg",  alt: "Înainte și după albire dentară",             category: "Rezultate",  order: 14, isActive: true },
  { id: "15", url: "/images/gallery/result-3.jpg",  alt: "Rezultat implant dentar",                    category: "Rezultate",  order: 15, isActive: true },
  { id: "16", url: "/images/gallery/result-4.jpg",  alt: "Fatete ceramice — transformare completă",    category: "Rezultate",  order: 16, isActive: true },
  { id: "17", url: "/images/gallery/result-5.jpg",  alt: "Proteză pe implanturi — rezultat final",     category: "Rezultate",  order: 17, isActive: true },
  { id: "18", url: "/images/gallery/result-6.jpg",  alt: "Corecție ortodontică — zâmbet înainte/după", category: "Rezultate",  order: 18, isActive: true },
];

// Data fetching functions with database fallback to mock data
export async function getServices(): Promise<Service[]> {
  try {
    const services = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
    if (services.length > 0) {
      return services as Service[];
    }
  } catch (error) {
    console.log("Database not available, using mock data");
  }
  return mockServices;
}

export async function getServiceBySlug(slug: string): Promise<Service | null> {
  try {
    const service = await prisma.service.findUnique({
      where: { slug },
    });
    if (service) {
      return service as Service;
    }
  } catch (error) {
    console.log("Database not available, using mock data");
  }
  return mockServices.find((s) => s.slug === slug) || null;
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  try {
    const members = await prisma.teamMember.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
    if (members.length > 0) {
      return members as TeamMember[];
    }
  } catch (error) {
    console.log("Database not available, using mock data");
  }
  return mockTeamMembers;
}

export async function getTestimonials(): Promise<Testimonial[]> {
  try {
    const testimonials = await prisma.testimonial.findMany({
      where: { isActive: true },
    });
    if (testimonials.length > 0) {
      return testimonials as Testimonial[];
    }
  } catch (error) {
    console.log("Database not available, using mock data");
  }
  return mockTestimonials;
}

export async function getGalleryImages(): Promise<GalleryImage[]> {
  try {
    const images = await prisma.galleryImage.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
    if (images.length > 0) {
      return images as GalleryImage[];
    }
  } catch (error) {
    console.log("Database not available, using mock data");
  }
  return mockGalleryImages;
}

export async function createContactSubmission(data: {
  name: string;
  phone: string;
  email?: string;
  message: string;
}) {
  try {
    return await prisma.contactSubmission.create({
      data,
    });
  } catch (error) {
    console.log("Database not available, contact form submitted but not saved");
    return { id: "mock", ...data, createdAt: new Date() };
  }
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: "desc" },
    });
    return posts as BlogPost[];
  } catch (error) {
    console.log("Database not available for blog posts");
    return [];
  }
}

export async function getBlogPostBySlug(
  slug: string,
): Promise<BlogPost | null> {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { slug },
    });
    if (post && post.isPublished) {
      return post as BlogPost;
    }
    return null;
  } catch (error) {
    console.log("Database not available for blog post");
    return null;
  }
}
