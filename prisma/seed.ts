import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed with full translations (ro/en/ru/it)...\n");

  // ══════════════════════════════════════════════════════════════
  // ── SERVICES ──────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════
  console.log("📋 Seeding services...");
  const services = [
    {
      slug: "implantologie",
      title: "Implantologie Dentară",
      shortDesc:
        "Restaurarea completă a dinților lipsă prin implanturi dentare de ultimă generație, oferind funcționalitate și estetică naturală.",
      description:
        "Implantologia dentară reprezintă soluția modernă și de lungă durată pentru înlocuirea dinților pierduți. Folosind tehnologie avansată și materiale biocompatibile, implanturile oferă o alternativă superioară protezelor clasice.",
      overview:
        "Implantul dentar este o rădăcină artificială din titan, plasată chirurgical în osul maxilar sau mandibular. Peste acest implant se montează o coroană ceramică care arată și funcționează exact ca un dinte natural. Procedura este realizată sub anestezie locală și este practic nedureroasă.",
      process:
        "Procesul de implantare începe cu o evaluare detaliată, incluzând tomografie computerizată 3D pentru planificarea precisă. Intervenția propriu-zisă durează între 30 și 60 de minute per implant. După o perioadă de osteointegrare de 3-6 luni, se montează coroana definitivă.",
      recovery:
        "Recuperarea după implantare este de obicei rapidă. În primele zile pot apărea ușoare disconfort și edem, controlabile cu medicație prescrisă. Majoritatea pacienților revin la activitățile normale în 2-3 zile.",
      benefits: [
        "Durabilitate excepțională - pot dura toată viața cu îngrijire corespunzătoare",
        "Aspect natural și funcționalitate completă",
        "Prevenirea resorbției osoase",
        "Nu afectează dinții adiacenți",
        "Confort superior protezelor mobile",
      ],
      images: ["/images/services/implantologie-1.jpg", "/images/services/implantologie-2.jpg"],
      category: "Chirurgie",
      price: 4500,
      discountPrice: 3800,
      order: 1,
      isActive: true,
      translations: {
        en: {
          title: "Dental Implantology",
          shortDesc: "Complete restoration of missing teeth using state-of-the-art dental implants, providing natural functionality and aesthetics.",
          description: "Dental implantology is the modern, long-lasting solution for replacing lost teeth. Using advanced technology and biocompatible materials, implants offer a superior alternative to traditional dentures.",
          overview: "A dental implant is an artificial titanium root surgically placed in the jawbone. A ceramic crown is then mounted on the implant, looking and functioning exactly like a natural tooth. The procedure is performed under local anesthesia and is virtually painless.",
          process: "The implant process begins with a detailed evaluation, including 3D computed tomography for precise planning. The procedure itself takes between 30 and 60 minutes per implant. After an osseointegration period of 3-6 months, the definitive crown is placed.",
          recovery: "Recovery after implantation is usually quick. In the first few days, mild discomfort and swelling may occur, manageable with prescribed medication. Most patients return to normal activities within 2-3 days.",
          benefits: ["Exceptional durability - can last a lifetime with proper care", "Natural appearance and full functionality", "Prevention of bone resorption", "Does not affect adjacent teeth", "Superior comfort compared to removable dentures"],
          category: "Surgery",
        },
        ru: {
          title: "Дентальная имплантология",
          shortDesc: "Полное восстановление отсутствующих зубов с помощью дентальных имплантатов последнего поколения, обеспечивающих функциональность и естественную эстетику.",
          description: "Дентальная имплантология — это современное и долговечное решение для замены утраченных зубов. Используя передовые технологии и биосовместимые материалы, имплантаты предлагают превосходную альтернативу классическим протезам.",
          overview: "Зубной имплантат — это искусственный титановый корень, хирургически помещённый в челюстную кость. На имплантат устанавливается керамическая коронка, которая выглядит и функционирует точно как натуральный зуб. Процедура проводится под местной анестезией и практически безболезненна.",
          process: "Процесс имплантации начинается с детальной оценки, включая 3D компьютерную томографию для точного планирования. Сама процедура длится от 30 до 60 минут на один имплантат. После периода остеоинтеграции в 3-6 месяцев устанавливается постоянная коронка.",
          recovery: "Восстановление после имплантации обычно проходит быстро. В первые дни может появиться лёгкий дискомфорт и отёк, которые контролируются назначенными препаратами. Большинство пациентов возвращаются к нормальной деятельности через 2-3 дня.",
          benefits: ["Исключительная долговечность — могут служить всю жизнь при надлежащем уходе", "Естественный вид и полная функциональность", "Предотвращение резорбции кости", "Не затрагивают соседние зубы", "Превосходный комфорт по сравнению со съёмными протезами"],
          category: "Хирургия",
        },
        it: {
          title: "Implantologia Dentale",
          shortDesc: "Ripristino completo dei denti mancanti tramite impianti dentali di ultima generazione, offrendo funzionalità ed estetica naturale.",
          description: "L'implantologia dentale rappresenta la soluzione moderna e duratura per la sostituzione dei denti persi. Utilizzando tecnologia avanzata e materiali biocompatibili, gli impianti offrono un'alternativa superiore alle protesi classiche.",
          overview: "L'impianto dentale è una radice artificiale in titanio, posizionata chirurgicamente nell'osso mascellare o mandibolare. Sull'impianto viene montata una corona in ceramica che appare e funziona esattamente come un dente naturale. La procedura viene eseguita in anestesia locale ed è praticamente indolore.",
          process: "Il processo di impianto inizia con una valutazione dettagliata, inclusa la tomografia computerizzata 3D per una pianificazione precisa. L'intervento dura tra i 30 e i 60 minuti per impianto. Dopo un periodo di osteointegrazione di 3-6 mesi, viene posizionata la corona definitiva.",
          recovery: "Il recupero dopo l'impianto è solitamente rapido. Nei primi giorni possono comparire leggero disagio e gonfiore, controllabili con farmaci prescritti. La maggior parte dei pazienti torna alle attività normali entro 2-3 giorni.",
          benefits: ["Durata eccezionale — possono durare tutta la vita con cure adeguate", "Aspetto naturale e funzionalità completa", "Prevenzione del riassorbimento osseo", "Non influiscono sui denti adiacenti", "Comfort superiore rispetto alle protesi mobili"],
          category: "Chirurgia",
        },
      },
    },
    {
      slug: "ortodontie",
      title: "Ortodonție",
      shortDesc: "Corectarea malocluziilor și alinierea dinților prin aparate dentare moderne, incluzând soluții invizibile pentru adulți.",
      description: "Tratamentul ortodontic corectează poziția incorectă a dinților și relația dintre arcade, îmbunătățind atât estetica zâmbetului cât și funcționalitatea masticatorie.",
      overview: "Ortodonția modernă oferă multiple opțiuni de tratament, de la aparate fixe clasice la alignere transparente. Alegerea metodei depinde de complexitatea cazului și preferințele pacientului.",
      process: "Tratamentul începe cu o consultație detaliată și analize specifice (radiografii, fotografii, modele digitale). Pe baza acestora se elaborează planul de tratament personalizat. Durata tratamentului variază între 6 luni și 3 ani.",
      recovery: "Aparatele ortodontice necesită o perioadă de adaptare de 1-2 săptămâni. Controalele regulate sunt esențiale pentru ajustări și monitorizarea progresului.",
      benefits: ["Zâmbet estetic și armonios", "Îmbunătățirea funcției masticatorii", "Prevenirea uzurii premature a dinților", "Facilitarea igienei orale", "Corectarea problemelor de vorbire"],
      images: ["/images/services/ortodontie-1.jpg", "/images/services/ortodontie-2.jpg"],
      category: "Ortodonție",
      price: 3500,
      discountPrice: null,
      order: 2,
      isActive: true,
      translations: {
        en: { title: "Orthodontics", shortDesc: "Correction of malocclusions and teeth alignment using modern dental appliances, including invisible solutions for adults.", description: "Orthodontic treatment corrects the incorrect position of teeth and the relationship between dental arches, improving both smile aesthetics and chewing functionality.", overview: "Modern orthodontics offers multiple treatment options, from traditional fixed braces to clear aligners. The choice of method depends on the complexity of the case and patient preferences.", process: "Treatment begins with a detailed consultation and specific analyses (X-rays, photographs, digital models). Based on these, a personalized treatment plan is developed. Treatment duration varies between 6 months and 3 years.", recovery: "Orthodontic appliances require an adaptation period of 1-2 weeks. Regular check-ups are essential for adjustments and progress monitoring.", benefits: ["Aesthetic and harmonious smile", "Improved chewing function", "Prevention of premature tooth wear", "Easier oral hygiene", "Correction of speech problems"], category: "Orthodontics" },
        ru: { title: "Ортодонтия", shortDesc: "Исправление прикуса и выравнивание зубов с помощью современных ортодонтических аппаратов, включая невидимые решения для взрослых.", description: "Ортодонтическое лечение исправляет неправильное положение зубов и соотношение между зубными дугами, улучшая как эстетику улыбки, так и жевательную функцию.", overview: "Современная ортодонтия предлагает множество вариантов лечения — от классических брекетов до прозрачных элайнеров. Выбор метода зависит от сложности случая и предпочтений пациента.", process: "Лечение начинается с детальной консультации и специальных анализов (рентген, фотографии, цифровые модели). На их основе разрабатывается персонализированный план лечения. Продолжительность лечения варьируется от 6 месяцев до 3 лет.", recovery: "Ортодонтические аппараты требуют периода адаптации в 1-2 недели. Регулярные осмотры необходимы для корректировок и контроля прогресса.", benefits: ["Эстетичная и гармоничная улыбка", "Улучшение жевательной функции", "Предотвращение преждевременного износа зубов", "Облегчение гигиены полости рта", "Исправление проблем с речью"], category: "Ортодонтия" },
        it: { title: "Ortodonzia", shortDesc: "Correzione delle malocclusioni e allineamento dei denti con apparecchi dentali moderni, incluse soluzioni invisibili per adulti.", description: "Il trattamento ortodontico corregge la posizione scorretta dei denti e il rapporto tra le arcate, migliorando sia l'estetica del sorriso che la funzionalità masticatoria.", overview: "L'ortodonzia moderna offre molteplici opzioni di trattamento, dagli apparecchi fissi classici agli allineatori trasparenti. La scelta del metodo dipende dalla complessità del caso e dalle preferenze del paziente.", process: "Il trattamento inizia con una consulenza dettagliata e analisi specifiche (radiografie, fotografie, modelli digitali). Su questa base viene elaborato il piano di trattamento personalizzato. La durata del trattamento varia tra 6 mesi e 3 anni.", recovery: "Gli apparecchi ortodontici richiedono un periodo di adattamento di 1-2 settimane. I controlli regolari sono essenziali per gli aggiustamenti e il monitoraggio dei progressi.", benefits: ["Sorriso estetico e armonioso", "Miglioramento della funzione masticatoria", "Prevenzione dell'usura prematura dei denti", "Facilitazione dell'igiene orale", "Correzione dei problemi di pronuncia"], category: "Ortodonzia" },
      },
    },
    {
      slug: "estetica-dentara",
      title: "Estetică Dentară",
      shortDesc: "Transformarea zâmbetului prin fațete, albire profesională și conturare estetică pentru un aspect natural și luminos.",
      description: "Estetica dentară reunește proceduri menite să îmbunătățească aspectul zâmbetului, de la albire profesională până la fațete ceramice și restaurări estetice.",
      overview: "Fiecare tratament estetic începe cu o analiză detaliată a zâmbetului și a trăsăturilor faciale. Scopul este obținerea unui rezultat natural, armonios, care să complementeze fizionomia pacientului.",
      process: "În funcție de tratamentul ales, procedura poate dura de la o singură ședință (albire profesională) până la câteva săptămâni (fațete ceramice). Folosim materiale premium și tehnologii de ultimă generație.",
      recovery: "Majoritatea procedurilor estetice au recuperare minimă. Sensibilitatea dentară temporară poate apărea după albire, dar dispare în câteva zile.",
      benefits: ["Zâmbet mai alb și mai luminos", "Corectarea formei și dimensiunii dinților", "Rezultate naturale și de lungă durată", "Creșterea încrederii în sine", "Proceduri minim invazive"],
      images: ["/images/services/estetica-1.jpg", "/images/services/estetica-2.jpg"],
      category: "Estetică",
      price: 2500,
      discountPrice: 2000,
      order: 3,
      isActive: true,
      translations: {
        en: { title: "Cosmetic Dentistry", shortDesc: "Smile transformation through veneers, professional whitening, and aesthetic contouring for a natural, radiant look.", description: "Cosmetic dentistry encompasses procedures designed to enhance the appearance of your smile, from professional whitening to ceramic veneers and aesthetic restorations.", overview: "Each aesthetic treatment begins with a detailed analysis of the smile and facial features. The goal is to achieve a natural, harmonious result that complements the patient's physiognomy.", process: "Depending on the chosen treatment, the procedure can take from a single session (professional whitening) to a few weeks (ceramic veneers). We use premium materials and state-of-the-art technologies.", recovery: "Most cosmetic procedures have minimal recovery. Temporary tooth sensitivity may occur after whitening but disappears within a few days.", benefits: ["Whiter and brighter smile", "Correction of tooth shape and size", "Natural and long-lasting results", "Increased self-confidence", "Minimally invasive procedures"], category: "Aesthetics" },
        ru: { title: "Эстетическая стоматология", shortDesc: "Преображение улыбки с помощью виниров, профессионального отбеливания и эстетического контурирования для естественного и сияющего вида.", description: "Эстетическая стоматология объединяет процедуры, направленные на улучшение внешнего вида улыбки — от профессионального отбеливания до керамических виниров и эстетических реставраций.", overview: "Каждое эстетическое лечение начинается с детального анализа улыбки и черт лица. Цель — достижение естественного, гармоничного результата, дополняющего физиономию пациента.", process: "В зависимости от выбранного лечения процедура может занять от одного сеанса (профессиональное отбеливание) до нескольких недель (керамические виниры). Мы используем премиальные материалы и технологии последнего поколения.", recovery: "Большинство эстетических процедур имеют минимальный период восстановления. Временная чувствительность зубов может появиться после отбеливания, но проходит в течение нескольких дней.", benefits: ["Более белая и яркая улыбка", "Коррекция формы и размера зубов", "Естественные и долговечные результаты", "Повышение уверенности в себе", "Минимально инвазивные процедуры"], category: "Эстетика" },
        it: { title: "Estetica Dentale", shortDesc: "Trasformazione del sorriso attraverso faccette, sbiancamento professionale e modellamento estetico per un aspetto naturale e luminoso.", description: "L'estetica dentale riunisce le procedure volte a migliorare l'aspetto del sorriso, dallo sbiancamento professionale alle faccette in ceramica e ai restauri estetici.", overview: "Ogni trattamento estetico inizia con un'analisi dettagliata del sorriso e dei tratti del viso. L'obiettivo è ottenere un risultato naturale e armonioso che complementi la fisionomia del paziente.", process: "A seconda del trattamento scelto, la procedura può durare da una singola seduta (sbiancamento professionale) a poche settimane (faccette in ceramica). Utilizziamo materiali premium e tecnologie di ultima generazione.", recovery: "La maggior parte delle procedure estetiche ha un recupero minimo. Una sensibilità dentale temporanea può comparire dopo lo sbiancamento, ma scompare in pochi giorni.", benefits: ["Sorriso più bianco e luminoso", "Correzione della forma e dimensione dei denti", "Risultati naturali e duraturi", "Aumento della fiducia in sé stessi", "Procedure minimamente invasive"], category: "Estetica" },
      },
    },
    {
      slug: "chirurgie-orala",
      title: "Chirurgie Orală",
      shortDesc: "Intervenții chirurgicale specializate pentru extracții complexe, tratamentul chisturilor și pregătirea pentru implanturi.",
      description: "Chirurgia orală acoperă o gamă largă de proceduri, de la extracții simple până la intervenții complexe de adiție osoasă și tratamentul patologiilor orale.",
      overview: "Echipa noastră de chirurgie orală are experiență vastă în toate tipurile de intervenții, folosind tehnici minim invazive pentru recuperare rapidă și confort maxim.",
      process: "Fiecare intervenție este precedată de o evaluare completă și planificare detaliată. Folosim anestezie locală de ultimă generație și, la cerere, sedare conștientă pentru pacienții anxioși.",
      recovery: "Timpul de recuperare variază în funcție de complexitatea intervenției. Oferim instrucțiuni detaliate post-operatorii și suntem disponibili pentru orice întrebări.",
      benefits: ["Tehnici minim invazive", "Recuperare rapidă", "Anestezie eficientă", "Monitorizare post-operatorie", "Experiență în cazuri complexe"],
      images: ["/images/services/chirurgie-1.jpg", "/images/services/chirurgie-2.jpg"],
      category: "Chirurgie",
      price: 1800,
      discountPrice: null,
      order: 4,
      isActive: true,
      translations: {
        en: { title: "Oral Surgery", shortDesc: "Specialized surgical interventions for complex extractions, cyst treatment, and implant preparation.", description: "Oral surgery covers a wide range of procedures, from simple extractions to complex bone grafting interventions and treatment of oral pathologies.", overview: "Our oral surgery team has extensive experience in all types of interventions, using minimally invasive techniques for rapid recovery and maximum comfort.", process: "Each intervention is preceded by a complete evaluation and detailed planning. We use state-of-the-art local anesthesia and, upon request, conscious sedation for anxious patients.", recovery: "Recovery time varies depending on the complexity of the intervention. We provide detailed post-operative instructions and are available for any questions.", benefits: ["Minimally invasive techniques", "Fast recovery", "Effective anesthesia", "Post-operative monitoring", "Experience with complex cases"], category: "Surgery" },
        ru: { title: "Хирургическая стоматология", shortDesc: "Специализированные хирургические вмешательства для сложных удалений, лечения кист и подготовки к имплантации.", description: "Хирургическая стоматология охватывает широкий спектр процедур — от простых удалений до сложных операций по наращиванию кости и лечения патологий полости рта.", overview: "Наша команда хирургов имеет обширный опыт во всех типах вмешательств, применяя минимально инвазивные методики для быстрого восстановления и максимального комфорта.", process: "Каждому вмешательству предшествует полная оценка и детальное планирование. Мы используем местную анестезию последнего поколения и, по запросу, седацию для тревожных пациентов.", recovery: "Время восстановления зависит от сложности вмешательства. Мы предоставляем подробные послеоперационные инструкции и доступны для любых вопросов.", benefits: ["Минимально инвазивные методики", "Быстрое восстановление", "Эффективная анестезия", "Послеоперационное наблюдение", "Опыт в сложных случаях"], category: "Хирургия" },
        it: { title: "Chirurgia Orale", shortDesc: "Interventi chirurgici specializzati per estrazioni complesse, trattamento di cisti e preparazione per impianti.", description: "La chirurgia orale copre un'ampia gamma di procedure, dalle estrazioni semplici agli interventi complessi di innesto osseo e trattamento delle patologie orali.", overview: "Il nostro team di chirurgia orale ha una vasta esperienza in tutti i tipi di interventi, utilizzando tecniche minimamente invasive per un recupero rapido e il massimo comfort.", process: "Ogni intervento è preceduto da una valutazione completa e una pianificazione dettagliata. Utilizziamo anestesia locale di ultima generazione e, su richiesta, sedazione cosciente per i pazienti ansiosi.", recovery: "I tempi di recupero variano in base alla complessità dell'intervento. Forniamo istruzioni dettagliate post-operatorie e siamo disponibili per qualsiasi domanda.", benefits: ["Tecniche minimamente invasive", "Recupero rapido", "Anestesia efficace", "Monitoraggio post-operatorio", "Esperienza in casi complessi"], category: "Chirurgia" },
      },
    },
    {
      slug: "protetica-dentara",
      title: "Protetică Dentară",
      shortDesc: "Restaurarea funcționalității și esteticii prin coroane, punți și proteze dentare realizate din materiale premium.",
      description: "Protetica dentară oferă soluții pentru restaurarea dinților afectați sau înlocuirea celor lipsă, folosind lucrări personalizate de înaltă calitate.",
      overview: "Folosim tehnologie CAD/CAM pentru proiectarea și realizarea lucrărilor protetice cu precizie maximă. Materialele utilizate sunt ceramică premium și zirconiu, garantând durabilitate și estetică.",
      process: "După pregătirea dinților, se realizează amprentă digitală pentru confecționarea lucrării. Timpul de realizare este de 5-10 zile, în funcție de complexitate. Se aplică provizorii pentru perioada de așteptare.",
      recovery: "Adaptarea la lucrările protetice noi durează câteva zile. Controalele de ajustare asigură confortul perfect.",
      benefits: ["Aspect natural și estetic", "Materiale biocompatibile", "Durabilitate îndelungată", "Funcționalitate completă", "Tehnologie digitală de precizie"],
      images: ["/images/services/protetica-1.jpg", "/images/services/protetica-2.jpg"],
      category: "Protetică",
      price: 3000,
      discountPrice: 2500,
      order: 5,
      isActive: true,
      translations: {
        en: { title: "Dental Prosthetics", shortDesc: "Restoration of functionality and aesthetics through crowns, bridges, and dental prostheses made from premium materials.", description: "Dental prosthetics provides solutions for restoring damaged teeth or replacing missing ones, using high-quality custom-made restorations.", overview: "We use CAD/CAM technology for designing and fabricating prosthetic work with maximum precision. The materials used are premium ceramics and zirconia, guaranteeing durability and aesthetics.", process: "After tooth preparation, a digital impression is taken for fabricating the restoration. Production time is 5-10 days, depending on complexity. Temporaries are placed during the waiting period.", recovery: "Adapting to new prosthetic work takes a few days. Adjustment check-ups ensure perfect comfort.", benefits: ["Natural and aesthetic appearance", "Biocompatible materials", "Long-lasting durability", "Full functionality", "Precision digital technology"], category: "Prosthetics" },
        ru: { title: "Зубное протезирование", shortDesc: "Восстановление функциональности и эстетики с помощью коронок, мостов и зубных протезов из премиальных материалов.", description: "Зубное протезирование предлагает решения для восстановления повреждённых зубов или замены отсутствующих, используя индивидуальные работы высокого качества.", overview: "Мы используем технологию CAD/CAM для проектирования и изготовления протезных работ с максимальной точностью. Используемые материалы — премиальная керамика и цирконий, гарантирующие долговечность и эстетику.", process: "После подготовки зубов снимается цифровой слепок для изготовления работы. Время изготовления составляет 5-10 дней в зависимости от сложности. На период ожидания устанавливаются временные конструкции.", recovery: "Адаптация к новым протезным работам занимает несколько дней. Контрольные визиты для подгонки обеспечивают идеальный комфорт.", benefits: ["Естественный и эстетичный вид", "Биосовместимые материалы", "Длительная долговечность", "Полная функциональность", "Прецизионные цифровые технологии"], category: "Протезирование" },
        it: { title: "Protesi Dentale", shortDesc: "Ripristino della funzionalità e dell'estetica attraverso corone, ponti e protesi dentali realizzate con materiali premium.", description: "La protesi dentale offre soluzioni per il restauro dei denti danneggiati o la sostituzione di quelli mancanti, utilizzando lavori personalizzati di alta qualità.", overview: "Utilizziamo la tecnologia CAD/CAM per la progettazione e realizzazione dei lavori protesici con la massima precisione. I materiali utilizzati sono ceramica premium e zirconia, garantendo durabilità ed estetica.", process: "Dopo la preparazione dei denti, viene eseguita un'impronta digitale per la realizzazione del lavoro. Il tempo di realizzazione è di 5-10 giorni, a seconda della complessità. Vengono applicati provvisori per il periodo di attesa.", recovery: "L'adattamento ai nuovi lavori protesici richiede qualche giorno. I controlli di aggiustamento assicurano un comfort perfetto.", benefits: ["Aspetto naturale ed estetico", "Materiali biocompatibili", "Durabilità a lungo termine", "Funzionalità completa", "Tecnologia digitale di precisione"], category: "Protesi" },
      },
    },
    {
      slug: "endodontie",
      title: "Endodonție",
      shortDesc: "Tratamentul de canal și salvarea dinților afectați prin proceduri precise și nedureroase cu instrumentar modern.",
      description: "Endodonția se ocupă cu tratamentul țesuturilor din interiorul dintelui. Tratamentul de canal permite salvarea dinților care altfel ar necesita extracție.",
      overview: "Folosim microscopie și instrumentar rotativ de ultimă generație pentru tratamente precise și eficiente. Anestezia modernă asigură o procedură complet nedureroasă.",
      process: "Tratamentul presupune curățarea și dezinfectarea canalelor radiculare, urmată de umplerea etanșă a acestora. În funcție de complexitate, poate fi realizat într-o singură ședință sau în mai multe.",
      recovery: "După tratament poate exista o sensibilitate ușoară timp de câteva zile. Dintele tratat de canal necesită de obicei o coroană pentru protecție pe termen lung.",
      benefits: ["Salvarea dintelui natural", "Eliminarea infecției și durerii", "Procedură nedureroasă", "Tehnologie de ultimă generație", "Rata mare de succes"],
      images: ["/images/services/endodontie-1.jpg", "/images/services/endodontie-2.jpg"],
      category: "Tratamente",
      price: 1500,
      discountPrice: null,
      order: 6,
      isActive: true,
      translations: {
        en: { title: "Endodontics", shortDesc: "Root canal treatment and saving affected teeth through precise and painless procedures with modern instruments.", description: "Endodontics deals with the treatment of tissues inside the tooth. Root canal treatment allows saving teeth that would otherwise require extraction.", overview: "We use state-of-the-art microscopy and rotary instruments for precise and efficient treatments. Modern anesthesia ensures a completely painless procedure.", process: "Treatment involves cleaning and disinfecting the root canals, followed by their sealed filling. Depending on complexity, it can be completed in a single session or multiple visits.", recovery: "After treatment, mild sensitivity may persist for a few days. A root canal-treated tooth usually requires a crown for long-term protection.", benefits: ["Saving the natural tooth", "Elimination of infection and pain", "Painless procedure", "State-of-the-art technology", "High success rate"], category: "Treatments" },
        ru: { title: "Эндодонтия", shortDesc: "Лечение каналов и сохранение поражённых зубов с помощью точных и безболезненных процедур с современным инструментарием.", description: "Эндодонтия занимается лечением тканей внутри зуба. Лечение корневых каналов позволяет сохранить зубы, которые в противном случае потребовали бы удаления.", overview: "Мы используем микроскопию и ротационные инструменты последнего поколения для точного и эффективного лечения. Современная анестезия обеспечивает полностью безболезненную процедуру.", process: "Лечение включает очищение и дезинфекцию корневых каналов с последующим их герметичным пломбированием. В зависимости от сложности может быть выполнено за один сеанс или за несколько.", recovery: "После лечения может сохраняться лёгкая чувствительность в течение нескольких дней. Зуб после лечения каналов обычно нуждается в коронке для долгосрочной защиты.", benefits: ["Сохранение естественного зуба", "Устранение инфекции и боли", "Безболезненная процедура", "Технология последнего поколения", "Высокий процент успеха"], category: "Лечение" },
        it: { title: "Endodonzia", shortDesc: "Trattamento canalare e salvataggio dei denti compromessi attraverso procedure precise e indolori con strumentazione moderna.", description: "L'endodonzia si occupa del trattamento dei tessuti all'interno del dente. Il trattamento canalare permette di salvare i denti che altrimenti richiederebbero l'estrazione.", overview: "Utilizziamo microscopia e strumentazione rotante di ultima generazione per trattamenti precisi ed efficienti. L'anestesia moderna assicura una procedura completamente indolore.", process: "Il trattamento prevede la pulizia e disinfezione dei canali radicolari, seguita dal loro riempimento ermetico. A seconda della complessità, può essere realizzato in una singola seduta o in più appuntamenti.", recovery: "Dopo il trattamento può persistere una leggera sensibilità per alcuni giorni. Il dente trattato necessita solitamente di una corona per la protezione a lungo termine.", benefits: ["Salvataggio del dente naturale", "Eliminazione dell'infezione e del dolore", "Procedura indolore", "Tecnologia di ultima generazione", "Alto tasso di successo"], category: "Trattamenti" },
      },
    },
    {
      slug: "parodontologie",
      title: "Parodontologie",
      shortDesc: "Tratamentul afecțiunilor gingivale și parodontale pentru menținerea sănătății țesuturilor de susținere a dinților.",
      description: "Parodontologia se ocupă cu prevenția, diagnosticul și tratamentul bolilor care afectează gingia și osul de susținere a dinților.",
      overview: "Boala parodontală este una dintre cele mai frecvente afecțiuni orale și cauza principală a pierderii dinților la adulți. Diagnosticul și tratamentul precoce sunt esențiale.",
      process: "Tratamentul include igienizare profesională, detartraj subgingival și, în cazuri avansate, proceduri chirurgicale de regenerare. Menținerea rezultatelor necesită controale regulate.",
      recovery: "Recuperarea variază în funcție de severitatea afecțiunii și tipul tratamentului. Igiena orală riguroasă acasă este esențială pentru succes.",
      benefits: ["Stoparea progresiei bolii", "Reducerea inflamației și sângerării", "Prevenirea pierderii dinților", "Îmbunătățirea sănătății orale generale", "Tratamente personalizate"],
      images: ["/images/services/parodontologie-1.jpg", "/images/services/parodontologie-2.jpg"],
      category: "Tratamente",
      price: 1200,
      discountPrice: 950,
      order: 7,
      isActive: true,
      translations: {
        en: { title: "Periodontics", shortDesc: "Treatment of gum and periodontal diseases to maintain the health of tooth-supporting tissues.", description: "Periodontics deals with the prevention, diagnosis, and treatment of diseases affecting the gums and the bone supporting the teeth.", overview: "Periodontal disease is one of the most common oral conditions and the leading cause of tooth loss in adults. Early diagnosis and treatment are essential.", process: "Treatment includes professional cleaning, subgingival scaling, and in advanced cases, surgical regeneration procedures. Maintaining results requires regular check-ups.", recovery: "Recovery varies depending on the severity of the condition and the type of treatment. Rigorous oral hygiene at home is essential for success.", benefits: ["Stopping disease progression", "Reduction of inflammation and bleeding", "Prevention of tooth loss", "Improvement of overall oral health", "Personalized treatments"], category: "Treatments" },
        ru: { title: "Пародонтология", shortDesc: "Лечение заболеваний дёсен и пародонта для поддержания здоровья тканей, удерживающих зубы.", description: "Пародонтология занимается профилактикой, диагностикой и лечением заболеваний, поражающих десну и кость, удерживающую зубы.", overview: "Пародонтит — одно из самых распространённых заболеваний полости рта и основная причина потери зубов у взрослых. Ранняя диагностика и лечение имеют решающее значение.", process: "Лечение включает профессиональную чистку, поддесневой кюретаж и, в запущенных случаях, хирургические процедуры регенерации. Поддержание результатов требует регулярных осмотров.", recovery: "Восстановление зависит от тяжести заболевания и типа лечения. Тщательная гигиена полости рта дома является залогом успеха.", benefits: ["Остановка прогрессирования заболевания", "Уменьшение воспаления и кровоточивости", "Предотвращение потери зубов", "Улучшение общего состояния полости рта", "Индивидуальный подход к лечению"], category: "Лечение" },
        it: { title: "Parodontologia", shortDesc: "Trattamento delle malattie gengivali e parodontali per mantenere la salute dei tessuti di supporto dei denti.", description: "La parodontologia si occupa della prevenzione, diagnosi e trattamento delle malattie che colpiscono la gengiva e l'osso di supporto dei denti.", overview: "La malattia parodontale è una delle patologie orali più comuni e la causa principale della perdita dei denti negli adulti. La diagnosi e il trattamento precoci sono essenziali.", process: "Il trattamento include igiene professionale, scaling sottogengivale e, nei casi avanzati, procedure chirurgiche di rigenerazione. Il mantenimento dei risultati richiede controlli regolari.", recovery: "Il recupero varia in base alla gravità della patologia e al tipo di trattamento. Un'igiene orale rigorosa a casa è essenziale per il successo.", benefits: ["Arresto della progressione della malattia", "Riduzione dell'infiammazione e del sanguinamento", "Prevenzione della perdita dei denti", "Miglioramento della salute orale generale", "Trattamenti personalizzati"], category: "Trattamenti" },
      },
    },
    {
      slug: "pedodontie",
      title: "Pedodonție",
      shortDesc: "Stomatologie specializată pentru copii, într-un mediu prietenos care transformă vizita la dentist într-o experiență pozitivă.",
      description: "Pedodonția oferă îngrijire dentară adaptată nevoilor copiilor, de la primul dinte până la adolescență, punând accent pe prevenție și educație.",
      overview: "Mediul nostru este special amenajat pentru a fi primitor și liniștitor pentru micii pacienți. Echipa noastră are experiență în lucrul cu copiii și folosește tehnici de comunicare adaptate vârstei.",
      process: "Prima vizită include o familiarizare cu cabinetul și echipamentele. Tratamentele sunt realizate cu răbdare, în ritmul copilului, pentru o experiență pozitivă.",
      recovery: "Copiii se recuperează de obicei foarte rapid după tratamente. Oferim sfaturi pentru părinți privind îngrijirea la domiciliu.",
      benefits: ["Mediu prietenos pentru copii", "Prevenție și educație", "Tratamente fără durere", "Creare de obiceiuri sănătoase", "Experiențe pozitive la dentist"],
      images: ["/images/services/pedodontie-1.jpg", "/images/services/pedodontie-2.jpg"],
      category: "Specialități",
      price: 800,
      discountPrice: null,
      order: 8,
      isActive: true,
      translations: {
        en: { title: "Pediatric Dentistry", shortDesc: "Specialized dentistry for children, in a friendly environment that turns dental visits into a positive experience.", description: "Pediatric dentistry provides dental care tailored to children's needs, from the first tooth to adolescence, emphasizing prevention and education.", overview: "Our environment is specially designed to be welcoming and calming for young patients. Our team has experience working with children and uses age-appropriate communication techniques.", process: "The first visit includes familiarization with the office and equipment. Treatments are performed patiently, at the child's pace, for a positive experience.", recovery: "Children usually recover very quickly after treatments. We offer advice for parents regarding home care.", benefits: ["Child-friendly environment", "Prevention and education", "Pain-free treatments", "Building healthy habits", "Positive dental experiences"], category: "Specialties" },
        ru: { title: "Детская стоматология", shortDesc: "Специализированная стоматология для детей в дружелюбной обстановке, превращающей визит к стоматологу в позитивный опыт.", description: "Детская стоматология предлагает стоматологическую помощь, адаптированную к потребностям детей — от первого зуба до подросткового возраста, с акцентом на профилактику и образование.", overview: "Наша обстановка специально оборудована, чтобы быть гостеприимной и успокаивающей для маленьких пациентов. Наша команда имеет опыт работы с детьми и использует возрастные техники общения.", process: "Первый визит включает знакомство с кабинетом и оборудованием. Лечение проводится терпеливо, в темпе ребёнка, для создания позитивного опыта.", recovery: "Дети обычно очень быстро восстанавливаются после лечения. Мы даём рекомендации родителям по уходу на дому.", benefits: ["Дружелюбная обстановка для детей", "Профилактика и образование", "Безболезненные процедуры", "Формирование здоровых привычек", "Позитивный опыт у стоматолога"], category: "Специальности" },
        it: { title: "Pedodonzia", shortDesc: "Odontoiatria specializzata per bambini, in un ambiente amichevole che trasforma la visita dal dentista in un'esperienza positiva.", description: "La pedodonzia offre cure dentali adattate alle esigenze dei bambini, dal primo dente all'adolescenza, con enfasi sulla prevenzione e l'educazione.", overview: "Il nostro ambiente è appositamente allestito per essere accogliente e tranquillizzante per i piccoli pazienti. Il nostro team ha esperienza nel lavoro con i bambini e utilizza tecniche di comunicazione adatte all'età.", process: "La prima visita include la familiarizzazione con lo studio e le attrezzature. I trattamenti vengono eseguiti con pazienza, nel ritmo del bambino, per un'esperienza positiva.", recovery: "I bambini si riprendono solitamente molto rapidamente dopo i trattamenti. Offriamo consigli ai genitori per le cure a domicilio.", benefits: ["Ambiente a misura di bambino", "Prevenzione e educazione", "Trattamenti senza dolore", "Creazione di abitudini sane", "Esperienze positive dal dentista"], category: "Specialità" },
      },
    },
  ];

  for (const service of services) {
    await prisma.service.upsert({ where: { slug: service.slug }, update: service, create: service });
  }
  console.log(`  ✅ ${services.length} services seeded (with en/ru/it translations)`);

  // ══════════════════════════════════════════════════════════════
  // ── TEAM MEMBERS ──────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════
  console.log("👥 Seeding team members...");
  const teamMembers = [
    {
      name: "Dr. Maria Ionescu",
      role: "Medic Primar Stomatolog, Fondator",
      description: "Cu peste 20 de ani de experiență în stomatologie, Dr. Ionescu a fondat TechnicalDent cu viziunea de a oferi servicii stomatologice de excelență. Specializată în implantologie și estetică dentară, este recunoscută pentru atenția la detalii și abordarea personalizată a fiecărui caz.",
      image: "/images/team/doctor-1.jpg",
      order: 1,
      isActive: true,
      translations: {
        en: { role: "Chief Dentist, Founder", description: "With over 20 years of experience in dentistry, Dr. Ionescu founded TechnicalDent with the vision of providing excellent dental services. Specialized in implantology and cosmetic dentistry, she is recognized for her attention to detail and personalized approach to each case." },
        ru: { role: "Главный стоматолог, Основатель", description: "С более чем 20-летним опытом работы в стоматологии, Dr. Ionescu основала TechnicalDent с целью предоставления стоматологических услуг высшего качества. Специализируясь на имплантологии и эстетической стоматологии, она известна вниманием к деталям и персонализированным подходом к каждому случаю." },
        it: { role: "Medico Primario Dentista, Fondatrice", description: "Con oltre 20 anni di esperienza in odontoiatria, Dr. Ionescu ha fondato TechnicalDent con la visione di offrire servizi odontoiatrici d'eccellenza. Specializzata in implantologia ed estetica dentale, è riconosciuta per l'attenzione ai dettagli e l'approccio personalizzato a ogni caso." },
      },
    },
    {
      name: "Dr. Alexandru Popa",
      role: "Medic Specialist Ortodont",
      description: "Dr. Popa este specialist în ortodonție cu formare în tehnici moderne de aliniere dentară. A tratat cu succes mii de pacienți folosind atât aparate clasice cât și sisteme invizibile de ultimă generație.",
      image: "/images/team/doctor-2.jpg",
      order: 2,
      isActive: true,
      translations: {
        en: { role: "Orthodontics Specialist", description: "Dr. Popa is an orthodontics specialist trained in modern dental alignment techniques. He has successfully treated thousands of patients using both traditional braces and state-of-the-art invisible aligner systems." },
        ru: { role: "Специалист-ортодонт", description: "Dr. Popa — специалист по ортодонтии, обученный современным методам выравнивания зубов. Он успешно пролечил тысячи пациентов, используя как классические брекеты, так и невидимые элайнеры последнего поколения." },
        it: { role: "Medico Specialista Ortodontista", description: "Dr. Popa è specialista in ortodonzia con formazione nelle moderne tecniche di allineamento dentale. Ha trattato con successo migliaia di pazienti utilizzando sia apparecchi classici che sistemi invisibili di ultima generazione." },
      },
    },
    {
      name: "Dr. Elena Vasile",
      role: "Medic Specialist Chirurgie Orală",
      description: "Specializată în chirurgie orală și implantologie, Dr. Vasile aduce expertiză în proceduri complexe. Abordarea sa minim invazivă și atenția pentru confortul pacientului o fac un membru valoros al echipei.",
      image: "/images/team/doctor-3.jpg",
      order: 3,
      isActive: true,
      translations: {
        en: { role: "Oral Surgery Specialist", description: "Specialized in oral surgery and implantology, Dr. Vasile brings expertise in complex procedures. Her minimally invasive approach and attention to patient comfort make her a valuable member of the team." },
        ru: { role: "Специалист по хирургической стоматологии", description: "Специализируясь на хирургической стоматологии и имплантологии, Dr. Vasile привносит экспертизу в сложные процедуры. Её минимально инвазивный подход и внимание к комфорту пациента делают её ценным членом команды." },
        it: { role: "Medico Specialista in Chirurgia Orale", description: "Specializzata in chirurgia orale e implantologia, Dr. Vasile porta competenza nelle procedure complesse. Il suo approccio minimamente invasivo e l'attenzione al comfort del paziente la rendono un membro prezioso del team." },
      },
    },
    {
      name: "Dr. Andrei Dumitrescu",
      role: "Medic Specialist Endodont",
      description: "Dr. Dumitrescu este expert în tratamente de canal și microchirurgie endodontică. Folosind microscopie și tehnologie avansată, salvează dinți care altfel ar fi considerați pierduți.",
      image: "/images/team/doctor-4.jpg",
      order: 4,
      isActive: true,
      translations: {
        en: { role: "Endodontics Specialist", description: "Dr. Dumitrescu is an expert in root canal treatments and endodontic microsurgery. Using microscopy and advanced technology, he saves teeth that would otherwise be considered lost." },
        ru: { role: "Специалист-эндодонтист", description: "Dr. Dumitrescu — эксперт в лечении корневых каналов и эндодонтической микрохирургии. Используя микроскопию и передовые технологии, он сохраняет зубы, которые в противном случае были бы потеряны." },
        it: { role: "Medico Specialista Endodontista", description: "Dr. Dumitrescu è esperto in trattamenti canalari e microchirurgia endodontica. Utilizzando microscopia e tecnologia avanzata, salva denti che altrimenti sarebbero considerati persi." },
      },
    },
  ];

  await prisma.teamMember.deleteMany({});
  for (const member of teamMembers) {
    await prisma.teamMember.create({ data: member });
  }
  console.log(`  ✅ ${teamMembers.length} team members seeded (with en/ru/it translations)`);

  // ══════════════════════════════════════════════════════════════
  // ── TESTIMONIALS ──────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════
  console.log("💬 Seeding testimonials...");
  const testimonials = [
    {
      name: "Andreea M.",
      content: "Am venit la TechnicalDent pentru un tratament de implant după ce am pierdut un dinte într-un accident. De la prima consultație, echipa m-a făcut să mă simt în siguranță și mi-a explicat fiecare pas al procedurii. Rezultatul a depășit așteptările mele - nimeni nu își dă seama că am un implant. Recomand cu încredere această clinică oricui caută profesionalism și empatie.",
      image: "/images/testimonials/patient-1.jpg",
      service: "Implantologie dentară",
      isActive: true,
      translations: {
        en: { content: "I came to TechnicalDent for an implant treatment after losing a tooth in an accident. From the very first consultation, the team made me feel safe and explained every step of the procedure. The result exceeded my expectations — no one can tell I have an implant. I confidently recommend this clinic to anyone looking for professionalism and empathy.", service: "Dental implantology" },
        ru: { content: "Я обратилась в TechnicalDent для установки имплантата после того, как потеряла зуб в результате несчастного случая. С первой консультации команда дала мне чувство безопасности и объяснила каждый шаг процедуры. Результат превзошёл мои ожидания — никто не замечает, что у меня имплантат. Я с уверенностью рекомендую эту клинику всем, кто ищет профессионализм и эмпатию.", service: "Дентальная имплантология" },
        it: { content: "Sono venuta al TechnicalDent per un trattamento implantare dopo aver perso un dente in un incidente. Fin dalla prima consulenza, il team mi ha fatto sentire al sicuro e mi ha spiegato ogni passaggio della procedura. Il risultato ha superato le mie aspettative — nessuno si accorge che ho un impianto. Raccomando con fiducia questa clinica a chiunque cerchi professionalità ed empatia.", service: "Implantologia dentale" },
      },
    },
    {
      name: "Mihai și Ana T.",
      content: "Întreaga noastră familie se tratează la TechnicalDent de peste 5 ani. Copiii noștri, inițial speriați de dentist, acum se bucură să meargă la controale. Atmosfera prietenoasă și răbdarea echipei au făcut diferența. Pentru noi, aceasta nu este doar o clinică stomatologică, ci un loc unde ne simțim cu adevărat îngrijiți.",
      image: "/images/testimonials/patient-2.jpg",
      service: "Pedodonție și stomatologie generală",
      isActive: true,
      translations: {
        en: { content: "Our entire family has been treated at TechnicalDent for over 5 years. Our children, initially scared of the dentist, now look forward to their check-ups. The friendly atmosphere and the team's patience made all the difference. For us, this is not just a dental clinic, but a place where we truly feel cared for.", service: "Pediatric dentistry and general dentistry" },
        ru: { content: "Вся наша семья лечится в TechnicalDent уже более 5 лет. Наши дети, изначально боявшиеся стоматолога, теперь с радостью ходят на осмотры. Дружелюбная атмосфера и терпение команды сделали разницу. Для нас это не просто стоматологическая клиника, а место, где мы действительно чувствуем заботу.", service: "Детская стоматология и общая стоматология" },
        it: { content: "Tutta la nostra famiglia si cura al TechnicalDent da oltre 5 anni. I nostri figli, inizialmente spaventati dal dentista, ora non vedono l'ora di andare ai controlli. L'atmosfera amichevole e la pazienza del team hanno fatto la differenza. Per noi, questa non è solo una clinica dentistica, ma un luogo dove ci sentiamo veramente curati.", service: "Pedodonzia e odontoiatria generale" },
      },
    },
    {
      name: "Constantin D.",
      content: "La 62 de ani, credeam că zâmbetul meu nu mai poate fi recuperat. Aveam dinți lipsa și cei rămași erau într-o stare precară. Echipa TechnicalDent mi-a propus un plan de tratament complex, realizat etapizat pe parcursul a 8 luni. Astăzi am un zâmbet complet, funcțional și estetic. Recunoștința mea este imensă.",
      image: "/images/testimonials/patient-3.jpg",
      service: "Reabilitare orală completă",
      isActive: true,
      translations: {
        en: { content: "At 62 years old, I thought my smile could no longer be restored. I had missing teeth and the remaining ones were in poor condition. The TechnicalDent team proposed a complex treatment plan, carried out in stages over 8 months. Today I have a complete, functional, and aesthetic smile. My gratitude is immense.", service: "Complete oral rehabilitation" },
        ru: { content: "В 62 года я думал, что моя улыбка уже не подлежит восстановлению. У меня были отсутствующие зубы, а оставшиеся находились в плохом состоянии. Команда TechnicalDent предложила комплексный план лечения, выполненный поэтапно в течение 8 месяцев. Сегодня у меня полноценная, функциональная и эстетичная улыбка. Моя благодарность безгранична.", service: "Полная реабилитация полости рта" },
        it: { content: "A 62 anni, pensavo che il mio sorriso non potesse più essere recuperato. Avevo denti mancanti e quelli rimasti erano in condizioni precarie. Il team TechnicalDent mi ha proposto un piano di trattamento complesso, realizzato per fasi nell'arco di 8 mesi. Oggi ho un sorriso completo, funzionale ed estetico. La mia gratitudine è immensa.", service: "Riabilitazione orale completa" },
      },
    },
    {
      name: "Ioana L.",
      content: "Am purtat aparat dentar timp de 18 luni și rezultatele sunt extraordinare. Dr. Popa mi-a explicat tot procesul, mi-a răspuns la toate întrebările și m-a încurajat în momentele mai dificile. Acum am zâmbetul pe care l-am visat întotdeauna și încrederea de a-l arăta lumii.",
      image: null,
      service: "Ortodonție",
      isActive: true,
      translations: {
        en: { content: "I wore braces for 18 months and the results are extraordinary. Dr. Popa explained the entire process, answered all my questions, and encouraged me during the more difficult moments. Now I have the smile I always dreamed of and the confidence to show it to the world.", service: "Orthodontics" },
        ru: { content: "Я носила брекеты 18 месяцев, и результаты потрясающие. Dr. Popa объяснил мне весь процесс, ответил на все мои вопросы и поддерживал меня в трудные моменты. Теперь у меня улыбка, о которой я всегда мечтала, и уверенность показать её миру.", service: "Ортодонтия" },
        it: { content: "Ho portato l'apparecchio per 18 mesi e i risultati sono straordinari. Dr. Popa mi ha spiegato tutto il processo, ha risposto a tutte le mie domande e mi ha incoraggiata nei momenti più difficili. Ora ho il sorriso che ho sempre sognato e la sicurezza di mostrarlo al mondo.", service: "Ortodonzia" },
      },
    },
  ];

  await prisma.testimonial.deleteMany({});
  for (const testimonial of testimonials) {
    await prisma.testimonial.create({ data: testimonial });
  }
  console.log(`  ✅ ${testimonials.length} testimonials seeded (with en/ru/it translations)`);

  // ══════════════════════════════════════════════════════════════
  // ── GALLERY IMAGES ────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════
  console.log("🖼️  Seeding gallery images...");
  const galleryImages = [
    { url: "/images/gallery/clinic-1.jpg", alt: "Recepție clinică stomatologică", category: "Clinică", order: 1, isActive: true, translations: { en: { alt: "Dental clinic reception", category: "Clinic" }, ru: { alt: "Ресепшен стоматологической клиники", category: "Клиника" }, it: { alt: "Reception della clinica dentistica", category: "Clinica" } } },
    { url: "/images/gallery/clinic-2.jpg", alt: "Cabinet de consultație modern", category: "Clinică", order: 2, isActive: true, translations: { en: { alt: "Modern consultation office", category: "Clinic" }, ru: { alt: "Современный кабинет консультации", category: "Клиника" }, it: { alt: "Studio di consultazione moderno", category: "Clinica" } } },
    { url: "/images/gallery/clinic-3.jpg", alt: "Echipament stomatologic de ultimă generație", category: "Echipament", order: 3, isActive: true, translations: { en: { alt: "State-of-the-art dental equipment", category: "Equipment" }, ru: { alt: "Стоматологическое оборудование последнего поколения", category: "Оборудование" }, it: { alt: "Attrezzatura odontoiatrica di ultima generazione", category: "Attrezzature" } } },
    { url: "/images/gallery/clinic-4.jpg", alt: "Sala de așteptare confortabilă", category: "Clinică", order: 4, isActive: true, translations: { en: { alt: "Comfortable waiting room", category: "Clinic" }, ru: { alt: "Комфортный зал ожидания", category: "Клиника" }, it: { alt: "Sala d'attesa confortevole", category: "Clinica" } } },
    { url: "/images/gallery/clinic-5.jpg", alt: "Cabinet de chirurgie", category: "Echipament", order: 5, isActive: true, translations: { en: { alt: "Surgery room", category: "Equipment" }, ru: { alt: "Хирургический кабинет", category: "Оборудование" }, it: { alt: "Sala chirurgica", category: "Attrezzature" } } },
    { url: "/images/gallery/clinic-6.jpg", alt: "Zonă sterilizare", category: "Echipament", order: 6, isActive: true, translations: { en: { alt: "Sterilization area", category: "Equipment" }, ru: { alt: "Зона стерилизации", category: "Оборудование" }, it: { alt: "Area di sterilizzazione", category: "Attrezzature" } } },
    { url: "/images/gallery/clinic-7.jpg", alt: "Holul de intrare al clinicii", category: "Clinică", order: 7, isActive: true, translations: { en: { alt: "Clinic entrance hall", category: "Clinic" }, ru: { alt: "Входной холл клиники", category: "Клиника" }, it: { alt: "Hall d'ingresso della clinica", category: "Clinica" } } },
    { url: "/images/gallery/clinic-8.jpg", alt: "Cabinet stomatologie pediatrică", category: "Clinică", order: 8, isActive: true, translations: { en: { alt: "Pediatric dentistry office", category: "Clinic" }, ru: { alt: "Кабинет детской стоматологии", category: "Клиника" }, it: { alt: "Studio di odontoiatria pediatrica", category: "Clinica" } } },
    { url: "/images/gallery/clinic-9.jpg", alt: "Unitate dentară digitală", category: "Echipament", order: 9, isActive: true, translations: { en: { alt: "Digital dental unit", category: "Equipment" }, ru: { alt: "Цифровая стоматологическая установка", category: "Оборудование" }, it: { alt: "Unità dentale digitale", category: "Attrezzature" } } },
    { url: "/images/gallery/clinic-10.jpg", alt: "Masa de lucru sterilizare", category: "Echipament", order: 10, isActive: true, translations: { en: { alt: "Sterilization workstation", category: "Equipment" }, ru: { alt: "Рабочий стол стерилизации", category: "Оборудование" }, it: { alt: "Postazione di lavoro sterilizzazione", category: "Attrezzature" } } },
    { url: "/images/gallery/clinic-11.jpg", alt: "Camera de radiologie", category: "Echipament", order: 11, isActive: true, translations: { en: { alt: "Radiology room", category: "Equipment" }, ru: { alt: "Рентген-кабинет", category: "Оборудование" }, it: { alt: "Sala di radiologia", category: "Attrezzature" } } },
    { url: "/images/gallery/clinic-12.jpg", alt: "Cabinet modern vedere laterală", category: "Clinică", order: 12, isActive: true, translations: { en: { alt: "Modern office side view", category: "Clinic" }, ru: { alt: "Современный кабинет — вид сбоку", category: "Клиника" }, it: { alt: "Studio moderno vista laterale", category: "Clinica" } } },
    { url: "/images/gallery/result-1.jpg", alt: "Rezultat tratament estetic", category: "Rezultate", order: 13, isActive: true, translations: { en: { alt: "Cosmetic treatment result", category: "Results" }, ru: { alt: "Результат эстетического лечения", category: "Результаты" }, it: { alt: "Risultato trattamento estetico", category: "Risultati" } } },
    { url: "/images/gallery/result-2.jpg", alt: "Înainte și după albire dentară", category: "Rezultate", order: 14, isActive: true, translations: { en: { alt: "Before and after teeth whitening", category: "Results" }, ru: { alt: "До и после отбеливания зубов", category: "Результаты" }, it: { alt: "Prima e dopo sbiancamento dentale", category: "Risultati" } } },
    { url: "/images/gallery/result-3.jpg", alt: "Rezultat implant dentar", category: "Rezultate", order: 15, isActive: true, translations: { en: { alt: "Dental implant result", category: "Results" }, ru: { alt: "Результат дентальной имплантации", category: "Результаты" }, it: { alt: "Risultato impianto dentale", category: "Risultati" } } },
    { url: "/images/gallery/result-4.jpg", alt: "Fațete ceramice — transformare completă", category: "Rezultate", order: 16, isActive: true, translations: { en: { alt: "Ceramic veneers — complete transformation", category: "Results" }, ru: { alt: "Керамические виниры — полное преображение", category: "Результаты" }, it: { alt: "Faccette in ceramica — trasformazione completa", category: "Risultati" } } },
    { url: "/images/gallery/result-5.jpg", alt: "Proteză pe implanturi — rezultat final", category: "Rezultate", order: 17, isActive: true, translations: { en: { alt: "Implant-supported prosthesis — final result", category: "Results" }, ru: { alt: "Протез на имплантатах — финальный результат", category: "Результаты" }, it: { alt: "Protesi su impianti — risultato finale", category: "Risultati" } } },
    { url: "/images/gallery/result-6.jpg", alt: "Corecție ortodontică — zâmbet înainte/după", category: "Rezultate", order: 18, isActive: true, translations: { en: { alt: "Orthodontic correction — smile before/after", category: "Results" }, ru: { alt: "Ортодонтическая коррекция — улыбка до/после", category: "Результаты" }, it: { alt: "Correzione ortodontica — sorriso prima/dopo", category: "Risultati" } } },
  ];

  await prisma.galleryImage.deleteMany({});
  for (const image of galleryImages) {
    await prisma.galleryImage.create({ data: image });
  }
  console.log(`  ✅ ${galleryImages.length} gallery images seeded (with en/ru/it translations)`);

  // ══════════════════════════════════════════════════════════════
  // ── BLOG POSTS ────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════
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
      translations: {
        en: { title: "The Complete Guide to Proper Tooth Brushing", excerpt: "Tooth brushing is the foundation of oral health. Discover the correct technique, ideal frequency, and best tools for a healthy smile.", content: "Tooth brushing is the cornerstone of oral hygiene, yet many of us do it incorrectly or insufficiently. Effective brushing can prevent cavities, gum disease, and halitosis (bad breath).\n\nThe correct technique involves gentle circular motions at a 45-degree angle to the gum line. Don't press too hard — excessive pressure can damage enamel and irritate gums. Brushing should last a minimum of 2 minutes, twice a day.\n\nChoose a toothbrush with soft or medium bristles and a small head that can easily reach all areas of the mouth. Electric toothbrushes with oscillating motion are particularly effective, with studies showing 21% greater plaque reduction compared to manual brushes.\n\nDon't forget your tongue! Bacteria accumulate on the tongue surface and contribute to halitosis. Gently brush your tongue from back to tip or use a dedicated tongue scraper.\n\nReplace your toothbrush every 3 months or when you notice the bristles are worn. A toothbrush with deformed bristles no longer cleans effectively and can become a breeding ground for bacteria." },
        ru: { title: "Полное руководство по правильной чистке зубов", excerpt: "Чистка зубов — основа здоровья полости рта. Узнайте правильную технику, идеальную частоту и лучшие инструменты для здоровой улыбки.", content: "Чистка зубов — краеугольный камень гигиены полости рта, но многие из нас делают это неправильно или недостаточно. Эффективная чистка может предотвратить кариес, заболевания дёсен и галитоз (неприятный запах изо рта).\n\nПравильная техника предполагает мягкие круговые движения под углом 45 градусов к линии десны. Не надавливайте слишком сильно — чрезмерное давление может повредить эмаль и раздражить дёсны. Чистка должна длиться не менее 2 минут, два раза в день.\n\nВыбирайте зубную щётку с мягкой или средней щетиной и маленькой головкой, которая легко достаёт до всех участков рта. Электрические зубные щётки с осциллирующим движением особенно эффективны — исследования показывают на 21% большее снижение зубного налёта по сравнению с ручными.\n\nНе забывайте о языке! Бактерии скапливаются на поверхности языка и способствуют галитозу. Аккуратно чистите язык от задней части к кончику или используйте специальный скребок для языка.\n\nМеняйте зубную щётку каждые 3 месяца или когда заметите износ щетинок." },
        it: { title: "La guida completa allo spazzolamento corretto dei denti", excerpt: "Lo spazzolamento dei denti è la base della salute orale. Scopri la tecnica corretta, la frequenza ideale e i migliori strumenti per un sorriso sano.", content: "Lo spazzolamento dei denti è la pietra angolare dell'igiene orale, ma molti di noi lo fanno in modo scorretto o insufficiente. Uno spazzolamento efficace può prevenire carie, malattie gengivali e alitosi.\n\nLa tecnica corretta prevede movimenti circolari delicati a un angolo di 45 gradi rispetto alla linea gengivale. Non premere troppo forte — una pressione eccessiva può danneggiare lo smalto e irritare le gengive. Lo spazzolamento dovrebbe durare almeno 2 minuti, due volte al giorno.\n\nScegli uno spazzolino con setole morbide o medie e una testina piccola, che possa raggiungere facilmente tutte le zone della bocca. Gli spazzolini elettrici con movimento oscillante sono particolarmente efficaci, con studi che mostrano una riduzione della placca del 21% maggiore rispetto agli spazzolini manuali.\n\nNon dimenticare la lingua! I batteri si accumulano sulla superficie della lingua e contribuiscono all'alitosi. Spazzola delicatamente la lingua dalla parte posteriore alla punta o usa un puliscilingua dedicato.\n\nSostituisci lo spazzolino ogni 3 mesi o quando noti che le setole sono consumate." },
      },
    },
    {
      slug: "alimentele-care-iti-distrug-dintii",
      title: "10 alimente care îți distrug dinții fără să știi",
      excerpt: "Unele alimente aparent inofensive pot cauza daune serioase dinților tăi. Află care sunt și cum să te protejezi.",
      content: "Alimentația joacă un rol crucial în sănătatea dentară. Multe alimente pe care le consumăm zilnic pot eroda smalțul, favoriza cariile sau păta dinții fără ca noi să realizăm.\n\nCitricele și sucurile acide (portocale, lămâi, grepfrut) sunt bogate în vitamina C, dar acidul citric erodează smalțul dentar. Recomandarea: consumați-le la mese, nu ca gustări, și clătiți gura cu apă după.\n\nBăuturile carbogazoase, inclusiv cele 'zero zahăr', conțin acid fosforic și acid citric care atacă smalțul. Chiar și apa minerală carbogazoasă are un pH mai scăzut decât apa plată.\n\nPâinea albă și crackerele se transformă rapid în zahăr simplu în gură, hrănind bacteriile cariogene. Amidoanele se lipesc de dinți și rămân în fisuri mai mult decât ciocolata.\n\nGheața pe care mulți o mestecă din obișnuință poate cauza microfisuri în smalț și deteriora lucrările dentare existente. Cafeaua și ceaiul, deși au antioxidanți benefici, pot păta smalțul în timp.\n\nFructele uscate, deși nutritive, sunt lipicioase și bogate în zahăr concentrat. Se lipesc între dinți și alimentează bacteriile pentru perioade lungi. Preferați fructele proaspete în loc.\n\nSfatul medicului: nu vă periați dinții imediat după consumul de alimente acide — așteptați 30 de minute.",
      coverImage: "/images/gallery/clinic-3.jpg",
      category: "nutritie",
      tags: ["nutriție", "prevenție", "smalț"],
      author: "Dr. Alexandru Munteanu",
      isPublished: true,
      publishedAt: new Date("2026-03-10"),
      translations: {
        en: { title: "10 Foods That Are Destroying Your Teeth Without You Knowing", excerpt: "Some seemingly harmless foods can cause serious damage to your teeth. Find out which ones and how to protect yourself.", content: "Diet plays a crucial role in dental health. Many foods we consume daily can erode enamel, promote cavities, or stain teeth without us realizing.\n\nCitrus fruits and acidic juices (oranges, lemons, grapefruit) are rich in vitamin C, but citric acid erodes dental enamel. Recommendation: consume them during meals, not as snacks, and rinse your mouth with water afterwards.\n\nCarbonated beverages, including 'zero sugar' varieties, contain phosphoric acid and citric acid that attack enamel. Even sparkling mineral water has a lower pH than still water.\n\nWhite bread and crackers quickly turn into simple sugars in the mouth, feeding cavity-causing bacteria. Starches stick to teeth and remain in fissures longer than chocolate.\n\nIce that many people chew out of habit can cause micro-cracks in enamel and damage existing dental work. Coffee and tea, while containing beneficial antioxidants, can stain enamel over time.\n\nDried fruits, while nutritious, are sticky and rich in concentrated sugar. They stick between teeth and feed bacteria for extended periods. Prefer fresh fruits instead.\n\nDoctor's advice: don't brush your teeth immediately after consuming acidic foods — wait 30 minutes." },
        ru: { title: "10 продуктов, которые разрушают ваши зубы, а вы не знаете", excerpt: "Некоторые, казалось бы, безобидные продукты могут наносить серьёзный вред вашим зубам. Узнайте, какие именно, и как защитить себя.", content: "Питание играет решающую роль в здоровье зубов. Многие продукты, которые мы потребляем ежедневно, могут разрушать эмаль, способствовать кариесу или окрашивать зубы, а мы даже не подозреваем.\n\nЦитрусовые и кислые соки (апельсины, лимоны, грейпфрут) богаты витамином C, но лимонная кислота разрушает зубную эмаль. Рекомендация: употребляйте их во время еды, а не в качестве перекуса, и полощите рот водой после.\n\nГазированные напитки, включая варианты «без сахара», содержат фосфорную и лимонную кислоты, которые атакуют эмаль.\n\nБелый хлеб и крекеры быстро превращаются в простые сахара во рту, питая кариесогенные бактерии.\n\nЛёд, который многие грызут по привычке, может вызвать микротрещины в эмали. Кофе и чай, хотя и содержат полезные антиоксиданты, со временем могут окрашивать эмаль.\n\nСухофрукты, хотя и питательны, липкие и богаты концентрированным сахаром. Они застревают между зубами и подпитывают бактерии.\n\nСовет врача: не чистите зубы сразу после употребления кислых продуктов — подождите 30 минут." },
        it: { title: "10 alimenti che distruggono i tuoi denti senza che tu lo sappia", excerpt: "Alcuni alimenti apparentemente innocui possono causare danni seri ai tuoi denti. Scopri quali sono e come proteggerti.", content: "L'alimentazione gioca un ruolo cruciale nella salute dentale. Molti alimenti che consumiamo quotidianamente possono erodere lo smalto, favorire le carie o macchiare i denti senza che ce ne rendiamo conto.\n\nGli agrumi e i succhi acidi sono ricchi di vitamina C, ma l'acido citrico erode lo smalto dentale. Raccomandazione: consumateli durante i pasti, non come spuntini, e sciacquate la bocca con acqua dopo.\n\nLe bevande gassate, incluse quelle 'zero zuccheri', contengono acido fosforico e acido citrico che attaccano lo smalto.\n\nIl pane bianco e i cracker si trasformano rapidamente in zuccheri semplici nella bocca, nutrendo i batteri cariogeni.\n\nIl ghiaccio che molti masticano per abitudine può causare microfratture nello smalto. Caffè e tè possono macchiare lo smalto nel tempo.\n\nLa frutta secca, sebbene nutritiva, è appiccicosa e ricca di zucchero concentrato. Si attacca tra i denti e alimenta i batteri per lunghi periodi.\n\nConsiglio del medico: non spazzolate i denti subito dopo aver consumato alimenti acidi — aspettate 30 minuti." },
      },
    },
    {
      slug: "cand-trebuie-sa-mergi-la-dentist",
      title: "7 semne că trebuie să mergi urgent la dentist",
      excerpt: "Nu ignora aceste simptome — pot indica probleme serioase care necesită intervenție imediată.",
      content: "Mulți oameni amână vizitele la dentist până când durerea devine insuportabilă. Însă unele simptome sunt semnale de alarmă care nu ar trebui niciodată ignorate.\n\nSângerarea gingiilor în timpul periajului nu este normală. Este cel mai frecvent semn al gingivitei — stadiul incipient al bolii parodontale. Tratată la timp, gingivita este complet reversibilă.\n\nSensibilitatea la cald și rece care persistă mai mult de câteva secunde poate indica o carie profundă sau o fisură în dinte.\n\nDurerea spontană sugerează că nervul dintelui este inflamat sau infectat. Aceasta necesită de obicei tratament endodontic și nu se va rezolva de la sine.\n\nGingiile retrase, dinții care par mai lungi sau spații noi între dinți pot indica boală parodontală avansată.\n\nRespirația persistentă neplăcută (halena), în ciuda unei igiene orale bune, poate fi cauzată de infecții dentare ascunse.\n\nPetele albe sau maro pe dinți, umflăturile pe gingie sau orice modificare a țesuturilor moi din gură ar trebui evaluate prompt.\n\nRecomandarea noastră: vizitați medicul stomatolog la fiecare 6 luni pentru control și igienizare profesională.",
      coverImage: "/images/gallery/clinic-5.jpg",
      category: "preventie",
      tags: ["urgență", "simptome", "prevenție"],
      author: "Dr. Alexandru Munteanu",
      isPublished: true,
      publishedAt: new Date("2026-03-05"),
      translations: {
        en: { title: "7 Signs You Need to See a Dentist Urgently", excerpt: "Don't ignore these symptoms — they may indicate serious problems requiring immediate intervention.", content: "Many people postpone dental visits until the pain becomes unbearable. However, some symptoms are warning signs that should never be ignored.\n\nBleeding gums during brushing is not normal. It is the most common sign of gingivitis — the early stage of periodontal disease. Treated in time, gingivitis is completely reversible.\n\nSensitivity to hot and cold that persists for more than a few seconds may indicate a deep cavity or a tooth crack.\n\nSpontaneous pain suggests the tooth nerve is inflamed or infected. This usually requires endodontic treatment and will not resolve on its own.\n\nReceding gums, teeth that appear longer, or new gaps between teeth may indicate advanced periodontal disease.\n\nPersistent bad breath despite good oral hygiene may be caused by hidden dental infections.\n\nWhite or brown spots on teeth, swelling on gums, or any changes in the soft tissues should be evaluated promptly.\n\nOur recommendation: visit the dentist every 6 months for a check-up and professional cleaning." },
        ru: { title: "7 признаков, что вам срочно нужно к стоматологу", excerpt: "Не игнорируйте эти симптомы — они могут указывать на серьёзные проблемы, требующие немедленного вмешательства.", content: "Многие люди откладывают визит к стоматологу, пока боль не становится невыносимой. Однако некоторые симптомы являются тревожными сигналами, которые нельзя игнорировать.\n\nКровоточивость дёсен во время чистки — это ненормально. Это самый частый признак гингивита. При своевременном лечении гингивит полностью обратим.\n\nЧувствительность к горячему и холодному, сохраняющаяся более нескольких секунд, может указывать на глубокий кариес или трещину в зубе.\n\nСпонтанная боль говорит о том, что нерв зуба воспалён или инфицирован. Обычно требуется эндодонтическое лечение.\n\nОпущение дёсен, зубы, которые выглядят длиннее, или новые промежутки между зубами могут указывать на запущенный пародонтит.\n\nПостоянный неприятный запах изо рта, несмотря на хорошую гигиену, может быть вызван скрытыми инфекциями.\n\nБелые или коричневые пятна на зубах, припухлости на десне следует оценить незамедлительно.\n\nНаша рекомендация: посещайте стоматолога каждые 6 месяцев." },
        it: { title: "7 segnali che devi andare urgentemente dal dentista", excerpt: "Non ignorare questi sintomi — possono indicare problemi seri che richiedono un intervento immediato.", content: "Molte persone rimandano le visite dal dentista finché il dolore non diventa insopportabile. Tuttavia, alcuni sintomi sono segnali d'allarme che non dovrebbero mai essere ignorati.\n\nIl sanguinamento delle gengive durante lo spazzolamento non è normale. È il segno più comune della gengivite. Trattata in tempo, la gengivite è completamente reversibile.\n\nLa sensibilità al caldo e al freddo che persiste può indicare una carie profonda o una frattura nel dente.\n\nIl dolore spontaneo suggerisce che il nervo del dente è infiammato o infetto. Questo richiede solitamente un trattamento endodontico.\n\nGengive ritirate, denti che appaiono più lunghi o nuovi spazi tra i denti possono indicare una malattia parodontale avanzata.\n\nL'alito cattivo persistente nonostante una buona igiene orale può essere causato da infezioni dentali nascoste.\n\nMacchie bianche o marroni sui denti, gonfiori sulle gengive dovrebbero essere valutati tempestivamente.\n\nLa nostra raccomandazione: visitate il dentista ogni 6 mesi." },
      },
    },
    {
      slug: "albirea-dentara-mit-vs-realitate",
      title: "Albirea dentară: mit vs. realitate",
      excerpt: "Există multe mituri despre albirea dinților. Află ce funcționează cu adevărat și ce poate fi dăunător pentru smalțul tău.",
      content: "Albirea dentară este una dintre cele mai solicitate proceduri estetice, dar este înconjurată de multe mituri și informații eronate care pot duce la decizii greșite.\n\nMIT: Bicarbonatul de sodiu este cel mai bun agent de albire natural. REALITATE: Bicarbonatul este un abraziv care poate deteriora smalțul prin utilizare regulată.\n\nMIT: Albirea deteriorează permanent smalțul. REALITATE: Albirea profesională, realizată corect sub supravegherea medicului, este sigură.\n\nMIT: Produsele de albire din comerț sunt la fel de eficiente ca albirea profesională. REALITATE: Concentrațiile de peroxid din produsele OTC sunt semnificativ mai mici.\n\nMIT: Odată albiți, dinții rămân albi permanent. REALITATE: Rezultatele albirea durează 1-3 ani, în funcție de dietă și obiceiuri.\n\nCel mai important: înainte de orice procedură de albire, este esențial un control stomatologic complet.",
      coverImage: "/images/gallery/result-1.jpg",
      category: "estetica",
      tags: ["albire", "estetică", "mituri"],
      author: "Dr. Alexandru Munteanu",
      isPublished: true,
      publishedAt: new Date("2026-02-28"),
      translations: {
        en: { title: "Teeth Whitening: Myth vs. Reality", excerpt: "There are many myths about teeth whitening. Find out what really works and what can be harmful to your enamel.", content: "Teeth whitening is one of the most requested cosmetic procedures, but it is surrounded by many myths and misinformation that can lead to wrong decisions.\n\nMYTH: Baking soda is the best natural whitening agent. REALITY: Baking soda is an abrasive that can damage enamel with regular use.\n\nMYTH: Whitening permanently damages enamel. REALITY: Professional whitening, performed correctly under medical supervision, is safe.\n\nMYTH: Over-the-counter whitening products are just as effective. REALITY: Peroxide concentrations in OTC products are significantly lower.\n\nMYTH: Once whitened, teeth stay white permanently. REALITY: Whitening results last 1-3 years, depending on diet and habits.\n\nMost importantly: before any whitening procedure, a complete dental check-up is essential." },
        ru: { title: "Отбеливание зубов: мифы и реальность", excerpt: "Существует много мифов об отбеливании зубов. Узнайте, что действительно работает, а что может навредить вашей эмали.", content: "Отбеливание зубов — одна из самых популярных эстетических процедур, но она окружена множеством мифов.\n\nМИФ: Пищевая сода — лучшее натуральное отбеливающее средство. РЕАЛЬНОСТЬ: Сода — это абразив, который может повредить эмаль при регулярном использовании.\n\nМИФ: Отбеливание навсегда повреждает эмаль. РЕАЛЬНОСТЬ: Профессиональное отбеливание, выполненное правильно под наблюдением врача, безопасно.\n\nМИФ: Магазинные средства для отбеливания так же эффективны. РЕАЛЬНОСТЬ: Концентрации перекиси в безрецептурных средствах значительно ниже.\n\nМИФ: После отбеливания зубы остаются белыми навсегда. РЕАЛЬНОСТЬ: Результаты сохраняются 1-3 года в зависимости от диеты и привычек.\n\nСамое важное: перед любой процедурой отбеливания необходим полный стоматологический осмотр." },
        it: { title: "Sbiancamento dentale: mito vs. realtà", excerpt: "Ci sono molti miti sullo sbiancamento dei denti. Scopri cosa funziona davvero e cosa può essere dannoso per il tuo smalto.", content: "Lo sbiancamento dentale è una delle procedure estetiche più richieste, ma è circondato da molti miti e informazioni errate.\n\nMITO: Il bicarbonato di sodio è il miglior agente sbiancante naturale. REALTÀ: Il bicarbonato è un abrasivo che può danneggiare lo smalto con un uso regolare.\n\nMITO: Lo sbiancamento danneggia permanentemente lo smalto. REALTÀ: Lo sbiancamento professionale, eseguito correttamente sotto supervisione medica, è sicuro.\n\nMITO: I prodotti sbiancanti da banco sono altrettanto efficaci. REALTÀ: Le concentrazioni di perossido nei prodotti OTC sono significativamente inferiori.\n\nMITO: Una volta sbiancati, i denti rimangono bianchi per sempre. REALTÀ: I risultati durano 1-3 anni, a seconda della dieta e delle abitudini.\n\nLa cosa più importante: prima di qualsiasi procedura di sbiancamento, è essenziale un controllo dentistico completo." },
      },
    },
    {
      slug: "igiena-orala-la-copii",
      title: "Igiena orală la copii: ghid pe vârste",
      excerpt: "De la primul dințișor la adolescență — tot ce trebuie să știi pentru a proteja dinții copilului tău.",
      content: "Sănătatea orală a copiilor începe mult mai devreme decât cred majoritatea părinților. Formarea unor obiceiuri corecte de la vârste fragede previne problemele dentare pe tot parcursul vieții.\n\n0-1 an: Curățați gingiile bebelușului cu o cârpă umedă moale. Când apare primul dinte, începeți periajul cu o periuță specială pentru sugari.\n\n1-3 ani: Periați dinții copilului de două ori pe zi. Prima vizită la dentist până la 1 an. Evitați biberonul cu lapte sau suc la culcare.\n\n3-6 ani: Creșteți cantitatea de pastă la dimensiunea unui bob de mazăre. Supravegheați periajul până la 7-8 ani.\n\n6-12 ani: Molarii permanenți încep să erupă. Sigilarea fisurilor este foarte eficientă pentru prevenirea cariilor.\n\nAdolescenți: Perioada cu cel mai mare risc de carii. Aparatele ortodontice necesită atenție specială la igienă.\n\nSfatul nostru: faceți din vizita la dentist o experiență pozitivă!",
      coverImage: "/images/gallery/clinic-7.jpg",
      category: "copii",
      tags: ["copii", "pedodonție", "prevenție"],
      author: "Dr. Alexandru Munteanu",
      isPublished: true,
      publishedAt: new Date("2026-02-20"),
      translations: {
        en: { title: "Children's Oral Hygiene: An Age-by-Age Guide", excerpt: "From the first baby tooth to adolescence — everything you need to know to protect your child's teeth.", content: "Children's oral health begins much earlier than most parents think. Forming correct habits from an early age prevents dental problems throughout life.\n\n0-1 year: Clean baby's gums with a soft damp cloth. When the first tooth appears, start brushing with an infant toothbrush.\n\n1-3 years: Brush the child's teeth twice a day. First dental visit by age 1. Avoid bottles with milk or juice at bedtime.\n\n3-6 years: Increase paste to pea-sized. Supervise brushing until age 7-8.\n\n6-12 years: Permanent molars begin to erupt. Fissure sealing is very effective for cavity prevention.\n\nTeenagers: The period with the highest cavity risk. Orthodontic appliances require special attention to hygiene.\n\nOur advice: make dental visits a positive experience!" },
        ru: { title: "Гигиена полости рта у детей: руководство по возрастам", excerpt: "От первого зубика до подросткового возраста — всё, что нужно знать для защиты зубов вашего ребёнка.", content: "Здоровье полости рта у детей начинается гораздо раньше, чем думает большинство родителей. Формирование правильных привычек с раннего возраста предотвращает стоматологические проблемы на протяжении всей жизни.\n\n0-1 год: Протирайте дёсны малыша мягкой влажной тканью. Когда появится первый зуб, начните чистку специальной детской щёткой.\n\n1-3 года: Чистите зубы ребёнка два раза в день. Первый визит к стоматологу до 1 года. Избегайте бутылочки с молоком или соком перед сном.\n\n3-6 лет: Увеличьте количество пасты до размера горошины. Контролируйте чистку до 7-8 лет.\n\n6-12 лет: Начинают прорезываться постоянные моляры. Герметизация фиссур очень эффективна.\n\nПодростки: Период наибольшего риска кариеса. Ортодонтические аппараты требуют особого внимания к гигиене.\n\nНаш совет: сделайте визит к стоматологу позитивным опытом!" },
        it: { title: "Igiene orale nei bambini: guida per età", excerpt: "Dal primo dentino all'adolescenza — tutto quello che devi sapere per proteggere i denti del tuo bambino.", content: "La salute orale dei bambini inizia molto prima di quanto pensino la maggior parte dei genitori. La formazione di abitudini corrette fin dalla tenera età previene i problemi dentali per tutta la vita.\n\n0-1 anno: Pulite le gengive del neonato con un panno morbido umido. Quando appare il primo dente, iniziate lo spazzolamento.\n\n1-3 anni: Spazzolate i denti del bambino due volte al giorno. Prima visita dal dentista entro il primo anno. Evitate il biberon con latte o succo prima di dormire.\n\n3-6 anni: Aumentate la quantità di dentifricio alla dimensione di un pisello. Supervisionate fino a 7-8 anni.\n\n6-12 anni: I molari permanenti iniziano a eruttare. La sigillatura dei solchi è molto efficace.\n\nAdolescenti: Il periodo con il maggior rischio di carie. Gli apparecchi ortodontici richiedono attenzione speciale.\n\nIl nostro consiglio: rendete la visita dal dentista un'esperienza positiva!" },
      },
    },
    {
      slug: "implantul-dentar-ghid-complet",
      title: "Implantul dentar: tot ce trebuie să știi",
      excerpt: "De la evaluarea inițială la vindecarea completă — ghidul complet despre implanturile dentare și la ce să te aștepți.",
      content: "Implantul dentar este considerat standardul de aur pentru înlocuirea dinților lipsă. Este o soluție permanentă, care arată, funcționează și se simte ca un dinte natural.\n\nCe este un implant dentar? Este un șurub mic din titan care se inserează chirurgical în osul maxilar, înlocuind rădăcina dintelui natural.\n\nProcedura se desfășoară în mai multe etape: evaluare, inserarea implantului (30-60 minute), perioada de osteointegrare (3-6 luni), și fixarea coroanei finale.\n\nRata de succes depășește 97%. Factorii care influențează succesul includ: calitatea osoasă, igiena orală, starea generală de sănătate și experiența chirurgului.\n\nImplanturile necesită aceeași îngrijire ca dinții naturali. Cu o igienă adecvată, un implant poate dura toată viața.\n\nLa TechnicalDent folosim tehnologie de ultimă generație pentru planificarea digitală a implanturilor.",
      coverImage: "/images/gallery/clinic-9.jpg",
      category: "tratamente",
      tags: ["implant", "chirurgie", "tratament"],
      author: "Dr. Alexandru Munteanu",
      isPublished: true,
      publishedAt: new Date("2026-02-15"),
      translations: {
        en: { title: "Dental Implants: Everything You Need to Know", excerpt: "From initial evaluation to complete healing — the complete guide to dental implants and what to expect.", content: "The dental implant is considered the gold standard for replacing missing teeth. It is a permanent solution that looks, functions, and feels like a natural tooth.\n\nWhat is a dental implant? It is a small titanium screw surgically inserted into the jawbone, replacing the root of the natural tooth.\n\nThe procedure takes place in several stages: evaluation, implant insertion (30-60 minutes), the osseointegration period (3-6 months), and the final crown placement.\n\nThe success rate exceeds 97%. Factors influencing success include: bone quality, oral hygiene, general health, and the surgeon's experience.\n\nImplants require the same care as natural teeth. With proper hygiene, an implant can last a lifetime.\n\nAt TechnicalDent we use state-of-the-art technology for digital implant planning." },
        ru: { title: "Зубной имплантат: всё, что нужно знать", excerpt: "От первичной оценки до полного заживления — полное руководство по зубным имплантатам и что вас ждёт.", content: "Зубной имплантат считается золотым стандартом замены отсутствующих зубов. Это постоянное решение, которое выглядит, функционирует и ощущается как натуральный зуб.\n\nЧто такое зубной имплантат? Это небольшой титановый винт, хирургически устанавливаемый в челюстную кость.\n\nПроцедура проходит в несколько этапов: обследование, установка имплантата (30-60 минут), период остеоинтеграции (3-6 месяцев) и установка постоянной коронки.\n\nПоказатель успешности превышает 97%. Факторы: качество кости, гигиена полости рта, общее состояние здоровья и опыт хирурга.\n\nИмплантаты требуют такого же ухода, как натуральные зубы. При надлежащей гигиене имплантат может служить всю жизнь.\n\nВ TechnicalDent мы используем технологии последнего поколения для цифрового планирования." },
        it: { title: "L'impianto dentale: tutto quello che devi sapere", excerpt: "Dalla valutazione iniziale alla guarigione completa — la guida completa sugli impianti dentali e cosa aspettarsi.", content: "L'impianto dentale è considerato il gold standard per la sostituzione dei denti mancanti. È una soluzione permanente che appare, funziona e si sente come un dente naturale.\n\nCos'è un impianto dentale? È una piccola vite in titanio inserita chirurgicamente nell'osso mascellare.\n\nLa procedura si svolge in più fasi: valutazione, inserimento dell'impianto (30-60 minuti), periodo di osteointegrazione (3-6 mesi) e posizionamento della corona finale.\n\nIl tasso di successo supera il 97%. I fattori: qualità ossea, igiene orale, stato di salute generale ed esperienza del chirurgo.\n\nGli impianti richiedono le stesse cure dei denti naturali. Con un'igiene adeguata, un impianto può durare tutta la vita.\n\nAl TechnicalDent utilizziamo tecnologia di ultima generazione per la pianificazione digitale." },
      },
    },
    {
      slug: "ata-dentara-de-ce-este-esentiala",
      title: "Ața dentară: de ce este esențială și cum să o folosești corect",
      excerpt: "Periajul singur curăță doar 60% din suprafața dinților. Află de ce ața dentară este indispensabilă pentru sănătatea orală.",
      content: "Periajul dentar, oricât de corect ar fi realizat, nu poate ajunge în spațiile interdentare — zonele unde se acumulează cel mai frecvent placa bacteriană.\n\nAța dentară elimină resturile alimentare și placa bacteriană din spațiile unde periuța nu ajunge. Utilizarea zilnică reduce riscul de carii interdentare cu până la 40% și riscul de boală gingivală cu 60%.\n\nTehnica corectă: tăiați aproximativ 45 cm de ață, introduceți-o ușor între dinți cu o mișcare de ferăstrău, apoi curbați-o în formă de C în jurul fiecărui dinte.\n\nNu treceți ața brusc — puteți răni gingia. Dacă gingiile sângerează inițial, sângerarea se oprește de obicei în 1-2 săptămâni.\n\nAlternative moderne: periuțele interdentare, irigatorele bucale și ața dentară cu suport.\n\nMomentul ideal: cel puțin o dată pe zi, preferabil seara, înainte de periajul de noapte.",
      coverImage: "/images/gallery/clinic-11.jpg",
      category: "igiena-orala",
      tags: ["ață dentară", "igienă", "prevenție"],
      author: "Dr. Alexandru Munteanu",
      isPublished: true,
      publishedAt: new Date("2026-02-10"),
      translations: {
        en: { title: "Dental Floss: Why It's Essential and How to Use It Correctly", excerpt: "Brushing alone cleans only 60% of tooth surfaces. Learn why dental floss is indispensable for oral health.", content: "Tooth brushing, no matter how correctly performed, cannot reach the interdental spaces — the areas where bacterial plaque most frequently accumulates.\n\nDental floss removes food debris and bacterial plaque from spaces the toothbrush can't reach. Daily flossing reduces interdental cavity risk by up to 40% and gum disease by 60%.\n\nThe correct technique: cut approximately 45 cm of floss, gently insert between teeth with a sawing motion, then curve in a C-shape around each tooth.\n\nDon't snap the floss in — you can injure the gums. If gums bleed initially, bleeding usually stops within 1-2 weeks.\n\nModern alternatives: interdental brushes, water flossers, and floss holders.\n\nIdeal timing: at least once a day, preferably in the evening, before nighttime brushing." },
        ru: { title: "Зубная нить: почему она необходима и как правильно ею пользоваться", excerpt: "Одна чистка зубов очищает лишь 60% поверхности зубов. Узнайте, почему зубная нить незаменима.", content: "Чистка зубов, какой бы правильной она ни была, не может проникнуть в межзубные промежутки — участки, где чаще всего скапливается бактериальный налёт.\n\nЗубная нить удаляет остатки пищи и налёт из пространств, куда щётка не достаёт. Ежедневное использование снижает риск межзубного кариеса на 40% и заболеваний дёсен на 60%.\n\nПравильная техника: отрежьте примерно 45 см нити, аккуратно вводите между зубами пилящим движением, затем изогните в форме буквы С.\n\nНе вводите нить резко — можно травмировать десну. Если дёсны кровоточат, это обычно прекращается через 1-2 недели.\n\nСовременные альтернативы: межзубные ёршики, ирригаторы и держатели для нити.\n\nОптимальное время: минимум раз в день, предпочтительно вечером, перед ночной чисткой." },
        it: { title: "Il filo interdentale: perché è essenziale e come usarlo correttamente", excerpt: "Lo spazzolamento da solo pulisce solo il 60% della superficie dei denti. Scopri perché il filo interdentale è indispensabile.", content: "Lo spazzolamento dei denti, per quanto corretto, non può raggiungere gli spazi interdentali — le zone dove si accumula più frequentemente la placca batterica.\n\nIl filo interdentale rimuove residui alimentari e placca dagli spazi dove lo spazzolino non arriva. L'uso quotidiano riduce il rischio di carie interdentali fino al 40% e di malattia gengivale del 60%.\n\nLa tecnica corretta: tagliate circa 45 cm di filo, inserite delicatamente tra i denti con un movimento a sega, poi curvate a forma di C.\n\nNon forzate il filo. Se le gengive sanguinano inizialmente, il sanguinamento di solito si ferma entro 1-2 settimane.\n\nAlternative moderne: scovolini interdentali, idropulsori e portafilo.\n\nIl momento ideale: almeno una volta al giorno, preferibilmente la sera, prima dello spazzolamento notturno." },
      },
    },
    {
      slug: "bruxismul-ranger-dintilor",
      title: "Bruxismul: de ce rangezi din dinți și ce poți face",
      excerpt: "Rangi din dinți noaptea? Acest obicei inconștient poate cauza daune serioase. Descoperă cauzele și soluțiile.",
      content: "Bruxismul — scrâșnirea sau încleștarea involuntară a dinților — afectează aproximativ 20% din populația adultă. Cele mai multe persoane nici nu știu că suferă de această condiție.\n\nSemnele bruxismului includ: dureri de cap matinale, dureri ale ATM, sensibilitate dentară crescută, uzura vizibilă a dinților.\n\nCauzele sunt multiple: stresul și anxietatea, malocluziile, consumul de alcool sau cofeină seara, apneea în somn.\n\nConsecințele bruxismului netratat pot fi severe: uzura excesivă a smalțului, fracturi dentare, deteriorarea lucrărilor protetice, dureri cronice ale ATM.\n\nTratamentul de elecție este gutiera de bruxism — o proteză ocluzală personalizată care protejează dinții și relaxează musculatura.\n\nTratamente complementare includ: exerciții de relaxare, managementul stresului, fizioterapie pentru ATM.\n\nDacă suspectați bruxism, programați o consultație. Putem evalua uzura dentară și recomanda tratamentul potrivit.",
      coverImage: "/images/gallery/clinic-2.jpg",
      category: "tratamente",
      tags: ["bruxism", "ATM", "gutieră"],
      author: "Dr. Alexandru Munteanu",
      isPublished: true,
      publishedAt: new Date("2026-02-05"),
      translations: {
        en: { title: "Bruxism: Why You Grind Your Teeth and What You Can Do", excerpt: "Do you grind your teeth at night? This unconscious habit can cause serious damage. Discover the causes and solutions.", content: "Bruxism — involuntary grinding or clenching of teeth — affects approximately 20% of the adult population. Most people don't even know they suffer from this condition.\n\nSigns of bruxism include: morning headaches, TMJ pain, increased tooth sensitivity, visible tooth wear.\n\nThe causes are multiple: stress and anxiety, malocclusions, evening alcohol or caffeine consumption, sleep apnea.\n\nThe consequences of untreated bruxism can be severe: excessive enamel wear, tooth fractures, damage to prosthetic work, chronic TMJ pain.\n\nThe treatment of choice is the bruxism guard — a custom occlusal splint that protects teeth and relaxes muscles.\n\nComplementary treatments include: relaxation exercises, stress management, TMJ physiotherapy.\n\nIf you suspect bruxism, schedule a consultation. We can evaluate tooth wear and recommend the appropriate treatment." },
        ru: { title: "Бруксизм: почему вы скрипите зубами и что можно сделать", excerpt: "Скрипите зубами по ночам? Эта бессознательная привычка может нанести серьёзный вред. Узнайте причины и решения.", content: "Бруксизм — непроизвольное скрежетание или сжатие зубов — поражает примерно 20% взрослого населения. Большинство людей даже не подозревают об этом.\n\nПризнаки бруксизма: утренние головные боли, боль в ВНЧС, повышенная чувствительность зубов, видимый износ зубов.\n\nПричины многочисленны: стресс и тревожность, нарушения прикуса, вечернее употребление алкоголя или кофеина, апноэ сна.\n\nПоследствия нелечённого бруксизма могут быть серьёзными: чрезмерный износ эмали, переломы зубов, повреждение протезных работ, хронические боли в ВНЧС.\n\nМетод выбора — капа от бруксизма — индивидуальная окклюзионная шина, защищающая зубы и расслабляющая мускулатуру.\n\nДополнительные методы: упражнения для расслабления, управление стрессом, физиотерапия ВНЧС.\n\nЕсли вы подозреваете бруксизм, запишитесь на консультацию." },
        it: { title: "Bruxismo: perché digrigni i denti e cosa puoi fare", excerpt: "Digrigni i denti di notte? Questa abitudine inconscia può causare danni seri. Scopri le cause e le soluzioni.", content: "Il bruxismo — il digrignamento o serramento involontario dei denti — colpisce circa il 20% della popolazione adulta. La maggior parte delle persone non sa nemmeno di soffrirne.\n\nI segni del bruxismo includono: mal di testa mattutini, dolore all'ATM, aumento della sensibilità dentale, usura visibile dei denti.\n\nLe cause sono molteplici: stress e ansia, malocclusioni, consumo serale di alcol o caffeina, apnea notturna.\n\nLe conseguenze del bruxismo non trattato possono essere gravi: usura eccessiva dello smalto, fratture dentali, deterioramento dei lavori protesici, dolore cronico dell'ATM.\n\nIl trattamento d'elezione è il bite per bruxismo — una placca occlusale personalizzata che protegge i denti e rilassa la muscolatura.\n\nTrattamenti complementari: esercizi di rilassamento, gestione dello stress, fisioterapia per l'ATM.\n\nSe sospettate di soffrire di bruxismo, prenotate una consulenza." },
      },
    },
  ];

  for (const post of blogPosts) {
    await prisma.blogPost.upsert({ where: { slug: post.slug }, update: post, create: post });
  }
  console.log(`  ✅ ${blogPosts.length} blog posts seeded (with en/ru/it translations)`);

  // ══════════════════════════════════════════════════════════════
  console.log("\n🎉 Seed complete with full translations!");
  console.log(`   Services:     ${services.length} (× 4 languages)`);
  console.log(`   Team members: ${teamMembers.length} (× 4 languages)`);
  console.log(`   Testimonials: ${testimonials.length} (× 4 languages)`);
  console.log(`   Gallery:      ${galleryImages.length} (× 4 languages)`);
  console.log(`   Blog posts:   ${blogPosts.length} (× 4 languages)`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
