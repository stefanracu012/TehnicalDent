import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...\n");

  // ── SERVICES ─────────────────────────────────────────────────
  console.log("📋 Seeding services...");
  const services = [
    {
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
        "Confort superior protezelor mobile",
      ],
      images: ["/images/services/implantologie-1.jpg", "/images/services/implantologie-2.jpg"],
      category: "Chirurgie",
      order: 1,
      isActive: true,
    },
    {
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
        "Corectarea problemelor de vorbire",
      ],
      images: ["/images/services/ortodontie-1.jpg", "/images/services/ortodontie-2.jpg"],
      category: "Ortodonție",
      order: 2,
      isActive: true,
    },
    {
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
        "Proceduri minim invazive",
      ],
      images: ["/images/services/estetica-1.jpg", "/images/services/estetica-2.jpg"],
      category: "Estetică",
      order: 3,
      isActive: true,
    },
    {
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
        "Experiență în cazuri complexe",
      ],
      images: ["/images/services/chirurgie-1.jpg", "/images/services/chirurgie-2.jpg"],
      category: "Chirurgie",
      order: 4,
      isActive: true,
    },
    {
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
        "Tehnologie digitală de precizie",
      ],
      images: ["/images/services/protetica-1.jpg", "/images/services/protetica-2.jpg"],
      category: "Protetică",
      order: 5,
      isActive: true,
    },
    {
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
        "Rata mare de succes",
      ],
      images: ["/images/services/endodontie-1.jpg", "/images/services/endodontie-2.jpg"],
      category: "Tratamente",
      order: 6,
      isActive: true,
    },
    {
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
        "Tratamente personalizate",
      ],
      images: ["/images/services/parodontologie-1.jpg", "/images/services/parodontologie-2.jpg"],
      category: "Tratamente",
      order: 7,
      isActive: true,
    },
    {
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
        "Experiențe pozitive la dentist",
      ],
      images: ["/images/services/pedodontie-1.jpg", "/images/services/pedodontie-2.jpg"],
      category: "Specialități",
      order: 8,
      isActive: true,
    },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { slug: service.slug },
      update: service,
      create: service,
    });
  }
  console.log(`  ✅ ${services.length} services seeded`);

  // ── TEAM MEMBERS ─────────────────────────────────────────────
  console.log("👥 Seeding team members...");
  const teamMembers = [
    {
      name: "Dr. Maria Ionescu",
      role: "Medic Primar Stomatolog, Fondator",
      description: "Cu peste 20 de ani de experiență în stomatologie, Dr. Ionescu a fondat TechnicalDent cu viziunea de a oferi servicii stomatologice de excelență. Specializată în implantologie și estetică dentară, este recunoscută pentru atenția la detalii și abordarea personalizată a fiecărui caz.",
      image: "/images/team/doctor-1.jpg",
      order: 1,
      isActive: true,
    },
    {
      name: "Dr. Alexandru Popa",
      role: "Medic Specialist Ortodont",
      description: "Dr. Popa este specialist în ortodonție cu formare în tehnici moderne de aliniere dentară. A tratat cu succes mii de pacienți folosind atât aparate clasice cât și sisteme invizibile de ultimă generație.",
      image: "/images/team/doctor-2.jpg",
      order: 2,
      isActive: true,
    },
    {
      name: "Dr. Elena Vasile",
      role: "Medic Specialist Chirurgie Orală",
      description: "Specializată în chirurgie orală și implantologie, Dr. Vasile aduce expertiză în proceduri complexe. Abordarea sa minim invazivă și atenția pentru confortul pacientului o fac un membru valoros al echipei.",
      image: "/images/team/doctor-3.jpg",
      order: 3,
      isActive: true,
    },
    {
      name: "Dr. Andrei Dumitrescu",
      role: "Medic Specialist Endodont",
      description: "Dr. Dumitrescu este expert în tratamente de canal și microchirurgie endodontică. Folosind microscopie și tehnologie avansată, salvează dinți care altfel ar fi considerați pierduți.",
      image: "/images/team/doctor-4.jpg",
      order: 4,
      isActive: true,
    },
  ];

  // Delete existing team members and re-create (no unique field to upsert on)
  await prisma.teamMember.deleteMany({});
  for (const member of teamMembers) {
    await prisma.teamMember.create({ data: member });
  }
  console.log(`  ✅ ${teamMembers.length} team members seeded`);

  // ── TESTIMONIALS ─────────────────────────────────────────────
  console.log("💬 Seeding testimonials...");
  const testimonials = [
    {
      name: "Andreea M.",
      content: "Am venit la TechnicalDent pentru un tratament de implant după ce am pierdut un dinte într-un accident. De la prima consultație, echipa m-a făcut să mă simt în siguranță și mi-a explicat fiecare pas al procedurii. Rezultatul a depășit așteptările mele - nimeni nu își dă seama că am un implant. Recomand cu încredere această clinică oricui caută profesionalism și empatie.",
      service: "Implantologie dentară",
      isActive: true,
    },
    {
      name: "Mihai și Ana T.",
      content: "Întreaga noastră familie se tratează la TechnicalDent de peste 5 ani. Copiii noștri, inițial speriați de dentist, acum se bucură să meargă la controale. Atmosfera prietenoasă și răbdarea echipei au făcut diferența. Pentru noi, aceasta nu este doar o clinică stomatologică, ci un loc unde ne simțim cu adevărat îngrijiți.",
      service: "Pedodonție și stomatologie generală",
      isActive: true,
    },
    {
      name: "Constantin D.",
      content: "La 62 de ani, credeam că zâmbetul meu nu mai poate fi recuperat. Aveam dinți lipsa și cei rămași erau într-o stare precară. Echipa TechnicalDent mi-a propus un plan de tratament complex, realizat etapizat pe parcursul a 8 luni. Astăzi am un zâmbet complet, funcțional și estetic. Recunoștința mea este imensă.",
      service: "Reabilitare orală completă",
      isActive: true,
    },
    {
      name: "Ioana L.",
      content: "Am purtat aparat dentar timp de 18 luni și rezultatele sunt extraordinare. Dr. Popa mi-a explicat tot procesul, mi-a răspuns la toate întrebările și m-a încurajat în momentele mai dificile. Acum am zâmbetul pe care l-am visat întotdeauna și încrederea de a-l arăta lumii.",
      service: "Ortodonție",
      isActive: true,
    },
  ];

  await prisma.testimonial.deleteMany({});
  for (const testimonial of testimonials) {
    await prisma.testimonial.create({ data: testimonial });
  }
  console.log(`  ✅ ${testimonials.length} testimonials seeded`);

  // ── GALLERY IMAGES ───────────────────────────────────────────
  console.log("🖼️  Seeding gallery images...");
  const galleryImages = [
    { url: "/images/gallery/clinic-1.jpg",  alt: "Recepție clinică stomatologică",              category: "Clinică",    order: 1,  isActive: true },
    { url: "/images/gallery/clinic-2.jpg",  alt: "Cabinet de consultație modern",               category: "Clinică",    order: 2,  isActive: true },
    { url: "/images/gallery/clinic-3.jpg",  alt: "Echipament stomatologic de ultimă generație", category: "Echipament", order: 3,  isActive: true },
    { url: "/images/gallery/clinic-4.jpg",  alt: "Sala de așteptare confortabilă",              category: "Clinică",    order: 4,  isActive: true },
    { url: "/images/gallery/clinic-5.jpg",  alt: "Cabinet de chirurgie",                        category: "Echipament", order: 5,  isActive: true },
    { url: "/images/gallery/clinic-6.jpg",  alt: "Zonă sterilizare",                            category: "Echipament", order: 6,  isActive: true },
    { url: "/images/gallery/clinic-7.jpg",  alt: "Holul de intrare al clinicii",                category: "Clinică",    order: 7,  isActive: true },
    { url: "/images/gallery/clinic-8.jpg",  alt: "Cabinet stomatologie pediatrică",             category: "Clinică",    order: 8,  isActive: true },
    { url: "/images/gallery/clinic-9.jpg",  alt: "Unitate dentară digitală",                    category: "Echipament", order: 9,  isActive: true },
    { url: "/images/gallery/clinic-10.jpg", alt: "Masa de lucru sterilizare",                   category: "Echipament", order: 10, isActive: true },
    { url: "/images/gallery/clinic-11.jpg", alt: "Camera de radiologie",                        category: "Echipament", order: 11, isActive: true },
    { url: "/images/gallery/clinic-12.jpg", alt: "Cabinet modern vedere laterală",              category: "Clinică",    order: 12, isActive: true },
    { url: "/images/gallery/result-1.jpg",  alt: "Rezultat tratament estetic",                  category: "Rezultate",  order: 13, isActive: true },
    { url: "/images/gallery/result-2.jpg",  alt: "Înainte și după albire dentară",              category: "Rezultate",  order: 14, isActive: true },
    { url: "/images/gallery/result-3.jpg",  alt: "Rezultat implant dentar",                     category: "Rezultate",  order: 15, isActive: true },
    { url: "/images/gallery/result-4.jpg",  alt: "Fatete ceramice — transformare completă",     category: "Rezultate",  order: 16, isActive: true },
    { url: "/images/gallery/result-5.jpg",  alt: "Proteză pe implanturi — rezultat final",      category: "Rezultate",  order: 17, isActive: true },
    { url: "/images/gallery/result-6.jpg",  alt: "Corecție ortodontică — zâmbet înainte/după",  category: "Rezultate",  order: 18, isActive: true },
  ];

  await prisma.galleryImage.deleteMany({});
  for (const image of galleryImages) {
    await prisma.galleryImage.create({ data: image });
  }
  console.log(`  ✅ ${galleryImages.length} gallery images seeded`);

  // ── BLOG POSTS ───────────────────────────────────────────────
  console.log("📝 Seeding blog posts...");
  const blogPosts = [
    {
      slug: "ghid-complet-periaj-dentar",
      title: "Ghidul complet al periajului dentar corect",
      excerpt: "Periajul dentar este baza sănătății orale. Descoperă tehnica corectă, frecvența ideală și cele mai bune instrumente pentru un zâmbet sănătos.",
      content: "Periajul dentar este piatra de temelie a igienei orale, dar mulți dintre noi îl realizăm incorect sau insuficient. Un periaj eficient poate preveni cariile, bolile gingivale și problemele de halena (respirație neplăcută).\n\nTehnica corectă presupune mișcări circulare blânde, la un unghi de 45 de grade față de linia gingiei. Nu apăsați prea tare — o presiune excesivă poate deteriora smalțul și irită gingiile. Periajul ar trebui să dureze minimum 2 minute, de două ori pe zi.\n\nAlegeți o periuță cu peri moi sau medii și un cap mic, care poate ajunge ușor în toate zonele gurii. Periuțele electrice cu mișcare oscilantă sunt deosebit de eficiente, studiile arătând o reducere cu 21% mai mare a plăcii bacteriene comparativ cu periuțele manuale.\n\nNu uitați de limbă! Bacteriile se acumulează pe suprafața limbii și contribuie la halena. Periați ușor limba de la spate spre vârf sau folosiți un curățător de limbă dedicat.\n\nÎnlocuiți periuța la fiecare 3 luni sau când observați că perii sunt uzați. O periuță cu peri deformați nu mai curăță eficient și poate deveni un mediu propice pentru bacterii.",
      coverImage: "/images/gallery/clinic-1.jpg",
      category: "igiena-orala",
      tags: ["periaj", "igienă", "prevenție"],
      author: "Dr. Alexandru Munteanu",
      isPublished: true,
      publishedAt: new Date("2026-03-15"),
    },
    {
      slug: "alimentele-care-iti-distrug-dintii",
      title: "10 alimente care îți distrug dinții fără să știi",
      excerpt: "Unele alimente aparent inofensive pot cauza daune serioase dinților tăi. Află care sunt și cum să te protejezi.",
      content: "Alimentația joacă un rol crucial în sănătatea dentară. Multe alimente pe care le consumăm zilnic pot eroda smalțul, favoriza cariile sau păta dinții fără ca noi să realizăm.\n\nCitricele și sucurile acide (portocale, lămâi, grepfrut) sunt bogate în vitamina C, dar acidul citric erodează smalțul dentar. Recomandarea: consumați-le la mese, nu ca gustări, și clătiți gura cu apă după.\n\nBăuturile carbogazoase, inclusiv cele 'zero zahăr', conțin acid fosforic și acid citric care atacă smalțul. Chiar și apa minerală carbogazoasă are un pH mai scăzut decât apa plată.\n\nPâinea albă și crackerele se transformă rapid în zahăr simplu în gură, hrănind bacteriile cariogene. Amidoanele se lipesc de dinți și rămân în fisuri mai mult decât ciocolata.\n\nGheața pe care mulți o mestecă din obișnuință poate cauza microfisuri în smalț și deteriora lucrările dentare existente. Cafeaua și ceaiul, deși au antioxidanți benefici, pot păta smalțul în timp.\n\nFructele uscate, deși nutritive, sunt lipicioase și bogate în zahăr concentrat. Se lipesc între dinți și alimentează bacteriile pentru perioade lungi. Preferați fructele proaspete în loc.\n\nSfatul medicului: nu vă periați dinții imediat după consumul de alimente acide — așteptați 30 de minute. Acidul înmoaie temporar smalțul, iar periajul imediat poate cauza eroziune.",
      coverImage: "/images/gallery/clinic-3.jpg",
      category: "nutritie",
      tags: ["nutriție", "prevenție", "smalț"],
      author: "Dr. Alexandru Munteanu",
      isPublished: true,
      publishedAt: new Date("2026-03-10"),
    },
    {
      slug: "cand-trebuie-sa-mergi-la-dentist",
      title: "7 semne că trebuie să mergi urgent la dentist",
      excerpt: "Nu ignora aceste simptome — pot indica probleme serioase care necesită intervenție imediată.",
      content: "Mulți oameni amână vizitele la dentist până când durerea devine insuportabilă. Însă unele simptome sunt semnale de alarmă care nu ar trebui niciodată ignorate.\n\nSângerarea gingiilor în timpul periajului nu este normală. Este cel mai frecvent semn al gingivitei — stadiul incipient al bolii parodontale. Tratată la timp, gingivita este complet reversibilă.\n\nSensibilitatea la cald și rece care persistă mai mult de câteva secunde poate indica o carie profundă sau o fisură în dinte. Cu cât interveniți mai devreme, cu atât tratamentul este mai simplu și mai puțin costisitor.\n\nDurerea spontană (care apare fără stimul) sugerează că nervul dintelui este inflamat sau infectat. Aceasta necesită de obicei tratament endodontic (de canal) și nu se va rezolva de la sine.\n\nGingiile retrase, dinții care par mai lungi sau spații noi între dinți pot indica boală parodontală avansată, care poate duce la pierderea dinților dacă nu este tratată.\n\nRespirația persistentă neplăcută (halena), în ciuda unei igiene orale bune, poate fi cauzată de infecții dentare ascunse, boli gingivale sau alte probleme orale care necesită evaluare profesională.\n\nPetele albe sau maro pe dinți, umflăturile pe gingie sau orice modificare a țesuturilor moi din gură ar trebui evaluate prompt. Detectarea precoce a oricărei anomalii este esențială.\n\nRecomandarea noastră: vizitați medicul stomatolog la fiecare 6 luni pentru control și igienizare profesională, chiar dacă nu aveți simptome. Prevenția este întotdeauna mai bună decât tratamentul.",
      coverImage: "/images/gallery/clinic-5.jpg",
      category: "preventie",
      tags: ["urgență", "simptome", "prevenție"],
      author: "Dr. Alexandru Munteanu",
      isPublished: true,
      publishedAt: new Date("2026-03-05"),
    },
    {
      slug: "albirea-dentara-mit-vs-realitate",
      title: "Albirea dentară: mit vs. realitate",
      excerpt: "Există multe mituri despre albirea dinților. Află ce funcționează cu adevărat și ce poate fi dăunător pentru smalțul tău.",
      content: "Albirea dentară este una dintre cele mai solicitate proceduri estetice, dar este înconjurată de multe mituri și informații eronate care pot duce la decizii greșite.\n\nMIT: Bicarbonatul de sodiu este cel mai bun agent de albire natural. REALITATE: Bicarbonatul este un abraziv care poate deteriora smalțul prin utilizare regulată. Poate oferi un efect temporar de curățare, dar nu albește cu adevărat dinții.\n\nMIT: Albirea deteriorează permanent smalțul. REALITATE: Albirea profesională, realizată corect sub supravegherea medicului, este sigură. Substanțele active (peroxid de hidrogen sau carbamidă) pătrund în smalț pentru a descompune pigmenții, fără a deteriora structura dentară.\n\nMIT: Produsele de albire din comerț sunt la fel de eficiente ca albirea profesională. REALITATE: Concentrațiile de peroxid din produsele OTC sunt semnificativ mai mici. Albirea profesională oferă rezultate mai rapide, mai uniforme și mai sigure.\n\nMIT: Odată albiți, dinții rămân albi permanent. REALITATE: Rezultatele albirea durează 1-3 ani, în funcție de dietă și obiceiuri. Cafeaua, vinul roșu, ceaiul și tutunul pot re-pigmenta dinții.\n\nCel mai important: înainte de orice procedură de albire, este esențial un control stomatologic complet. Cariile, fisurile sau bolile gingivale trebuie tratate mai întâi. Albirea pe dinți cu probleme poate cauza sensibilitate severă sau complicații.",
      coverImage: "/images/gallery/result-1.jpg",
      category: "estetica",
      tags: ["albire", "estetică", "mituri"],
      author: "Dr. Alexandru Munteanu",
      isPublished: true,
      publishedAt: new Date("2026-02-28"),
    },
    {
      slug: "igiena-orala-la-copii",
      title: "Igiena orală la copii: ghid pe vârste",
      excerpt: "De la primul dințișor la adolescență — tot ce trebuie să știi pentru a proteja dinții copilului tău.",
      content: "Sănătatea orală a copiilor începe mult mai devreme decât cred majoritatea părinților. Formarea unor obiceiuri corecte de la vârste fragede previne problemele dentare pe tot parcursul vieții.\n\n0-1 an: Curățați gingiile bebelușului cu o cârpă umedă moale după fiecare hrănire. Când apare primul dinte (de obicei în jurul vârstei de 6 luni), începeți periajul cu o periuță specială pentru sugari și o cantitate de pastă de dinți cu fluor cât un bob de orez.\n\n1-3 ani: Periați dinții copilului de două ori pe zi cu o cantitate de pastă cât un bob de orez. Prima vizită la dentist ar trebui să aibă loc până la împlinirea vârstei de 1 an. Evitați biberonul cu lapte sau suc la culcare — aceasta poate cauza 'caria de biberon'.\n\n3-6 ani: Creșteți cantitatea de pastă la dimensiunea unui bob de mazăre. Începeți să învățați copilul tehnica periajului, dar supravegheați-l și ajutați-l până când are dexteritatea necesară (de obicei până la 7-8 ani).\n\n6-12 ani: Molarii permanenți încep să erupă. Sigilarea fisurilor (aplicarea unui strat protector pe suprafața de masticație a molarilor) este foarte eficientă pentru prevenirea cariilor. Introduceți treptat ața dentară.\n\nAdolescenți: Perioada cu cel mai mare risc de carii din cauza alimentației (sucuri, dulciuri) și igienei neglijate. Aparatele ortodontice necesită atenție specială la igienă. Protecțiile bucale sunt esențiale pentru sporturile de contact.\n\nSfatul nostru: faceți din vizita la dentist o experiență pozitivă! Pedodonția modernă folosește tehnici adaptate copiilor pentru a elimina teama și a crea o relație de încredere cu medicul dentist.",
      coverImage: "/images/gallery/clinic-7.jpg",
      category: "copii",
      tags: ["copii", "pedodonție", "prevenție"],
      author: "Dr. Alexandru Munteanu",
      isPublished: true,
      publishedAt: new Date("2026-02-20"),
    },
    {
      slug: "implantul-dentar-ghid-complet",
      title: "Implantul dentar: tot ce trebuie să știi",
      excerpt: "De la evaluarea inițială la vindecarea completă — ghidul complet despre implanturile dentare și la ce să te aștepți.",
      content: "Implantul dentar este considerat standardul de aur pentru înlocuirea dinților lipsă. Este o soluție permanentă, care arată, funcționează și se simte ca un dinte natural.\n\nCe este un implant dentar? Este un șurub mic din titan (sau zirconiu) care se inserează chirurgical în osul maxilar, înlocuind rădăcina dintelui natural. Pe acest implant se fixează o coroană ceramică ce reproduce perfect aspectul unui dinte natural.\n\nProcedura se desfășoară în mai multe etape: evaluare (radiografii, CBCT, planificare digitală), inserarea implantului (30-60 minute, sub anestezie locală), perioada de osteointegrare (3-6 luni, în care osul se unește cu implantul), și fixarea coroanei finale.\n\nRata de succes a implanturilor moderne depășește 97%. Factorii care influențează succesul includ: calitatea și cantitatea osoasă, igiena orală, starea generală de sănătate și experiența chirurgului.\n\nImplanturile necesită aceeași îngrijire ca dinții naturali: periaj, ață dentară și vizite regulate la dentist. Cu o igienă adecvată, un implant poate dura toată viața.\n\nAlternativele la implant (punți dentare, proteze mobile) implică sacrificarea dinților sănătoși vecini sau confort redus. Implantul preservă osul maxilar, prevenind resorbția osoasă care apare după pierderea unui dinte.\n\nLa TehnicalDent folosim tehnologie de ultimă generație pentru planificarea digitală a implanturilor, asigurând precizie maximă și rezultate predictibile. Fiecare caz este evaluat individual pentru a determina cel mai bun plan de tratament.",
      coverImage: "/images/gallery/clinic-9.jpg",
      category: "tratamente",
      tags: ["implant", "chirurgie", "tratament"],
      author: "Dr. Alexandru Munteanu",
      isPublished: true,
      publishedAt: new Date("2026-02-15"),
    },
    {
      slug: "ata-dentara-de-ce-este-esentiala",
      title: "Ața dentară: de ce este esențială și cum să o folosești corect",
      excerpt: "Periajul singur curăță doar 60% din suprafața dinților. Află de ce ața dentară este indispensabilă pentru sănătatea orală.",
      content: "Periajul dentar, oricât de corect ar fi realizat, nu poate ajunge în spațiile interdentare — zonele dintre dinți unde se acumulează cel mai frecvent placa bacteriană și unde încep cele mai multe carii.\n\nAța dentară elimină resturile alimentare și placa bacteriană din spațiile unde periuța nu ajunge. Utilizarea zilnică a aței dentare reduce riscul de carii interdentare cu până la 40% și riscul de boală gingivală cu 60%.\n\nTehnica corectă: tăiați aproximativ 45 cm de ață, înfășurați-o pe degetele mijlocii și ghidați-o cu degetele arătătoare și mari. Introduceți ața ușor între dinți cu o mișcare de ferăstrău, apoi curbați-o în formă de C în jurul fiecărui dinte și glisați-o sub linia gingiei.\n\nNu treceți ața brusc — puteți răni gingia. Folosiți o porțiune curată de ață pentru fiecare spațiu interdental. Dacă gingiile sângerează inițial, nu vă alarmați — sângerarea se oprește de obicei în 1-2 săptămâni de utilizare consistentă.\n\nAlternative moderne: periuțele interdentare (de diferite dimensiuni), irigatorele bucale (water flosser) și ața dentară cu suport sunt opțiuni excelente pentru cei care au dificultăți cu ața tradițională sau poartă aparate ortodontice.\n\nMomentul ideal: folosiți ața dentară cel puțin o dată pe zi, preferabil seara, înainte de periajul de noapte. Aceasta permite pastei de dinți cu fluor să ajungă și în spațiile interdentare curățate.",
      coverImage: "/images/gallery/clinic-11.jpg",
      category: "igiena-orala",
      tags: ["ață dentară", "igienă", "prevenție"],
      author: "Dr. Alexandru Munteanu",
      isPublished: true,
      publishedAt: new Date("2026-02-10"),
    },
    {
      slug: "bruxismul-ranger-dintilor",
      title: "Bruxismul: de ce rangezi din dinți și ce poți face",
      excerpt: "Rangi din dinți noaptea? Acest obicei inconștient poate cauza daune serioase. Descoperă cauzele și soluțiile.",
      content: "Bruxismul — scrâșnirea sau încleștarea involuntară a dinților — afectează aproximativ 20% din populația adultă. Cele mai multe persoane nici nu știu că suferă de această condiție, deoarece apare predominant în timpul somnului.\n\nSemnele bruxismului includ: dureri de cap matinale (mai ales în zona tâmplelor), dureri ale articulației temporo-mandibulare (ATM), sensibilitate dentară crescută, uzura vizibilă a dinților, și oboseală a mușchilor masticatori la trezire.\n\nCauzele sunt multiple: stresul și anxietatea sunt factorii principali, dar și malocluziile (problemele de mușcătură), consumul de alcool sau cofeină seara, apneea în somn și anumite medicamente pot contribui.\n\nConsecințele bruxismului netratat pot fi severe: uzura excesivă a smalțului, fracturi dentare, deteriorarea lucrărilor protetice, dureri cronice ale ATM și chiar pierderea dinților în cazuri extreme.\n\nTratamentul de elecție este gutiera de bruxism (night guard) — o proteză ocluzală personalizată, realizată pe modelul dinților dumneavoastră, care protejează dinții și relaxează musculatura în timpul somnului.\n\nTratamente complementare includ: exerciții de relaxare a mandibulei, managementul stresului, fizioterapie pentru ATM, și în unele cazuri, tratament ortodontic pentru corectarea mușcăturii.\n\nDacă suspectați că suferiți de bruxism, programați o consultație. Putem evalua uzura dentară, verifica articulația ATM și recomanda cel mai potrivit plan de tratament pentru situația dumneavoastră.",
      coverImage: "/images/gallery/clinic-2.jpg",
      category: "tratamente",
      tags: ["bruxism", "ATM", "gutieră"],
      author: "Dr. Alexandru Munteanu",
      isPublished: true,
      publishedAt: new Date("2026-02-05"),
    },
  ];

  for (const post of blogPosts) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: post,
      create: post,
    });
  }
  console.log(`  ✅ ${blogPosts.length} blog posts seeded`);

  console.log("\n🎉 Seed complete!");
  console.log(`   Services:     ${services.length}`);
  console.log(`   Team members: ${teamMembers.length}`);
  console.log(`   Testimonials: ${testimonials.length}`);
  console.log(`   Gallery:      ${galleryImages.length}`);
  console.log(`   Blog posts:   ${blogPosts.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
