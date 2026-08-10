// Seed data — spec section 25 explicitly forbids fabricating facts, so
// every field below is either (a) sourced from a live web lookup performed
// on 2026-08-08 with a citation in `sources`, or (b) explicitly `null`
// where the source was ambiguous/unconfirmed. Do not "fill in" a null with
// a guess later — re-verify against the official URL instead.
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

function jsonOrNull(value: string[] | null): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value === null ? Prisma.DbNull : value;
}

interface SeedSource {
  url: string;
  sourceType: "official" | "news" | "directory" | "winner_profile" | "other";
  title: string;
  isOfficial: boolean;
  note?: string;
}

interface SeedOpportunity {
  slug: string;
  name: string;
  organization: string;
  description: string;
  category: string;
  officialUrl: string;
  countryScope: "global" | "country_specific" | "regional";
  eligibleCountries: string[] | null;
  minGrade: number | null;
  maxGrade: number | null;
  minAge: number | null;
  maxAge: number | null;
  individualAllowed: boolean;
  teamAllowed: boolean;
  teamSizeMin: number | null;
  teamSizeMax: number | null;
  applicationFee: number | null;
  feeCurrency: string | null;
  prizeDescription: string | null;
  deadline: string | null; // ISO date, null if unconfirmed
  status: "open" | "upcoming" | "closed" | "results_announced" | "unknown";
  difficultyScore: number;
  valueScore: number;
  legitimacyScore: number;
  sourceConfidence: number;
  sources: SeedSource[];
}

const SEED_OPPORTUNITIES: SeedOpportunity[] = [
  {
    slug: "iris-national-fair",
    name: "IRIS National Fair",
    organization: "ExSTEMplar Education Linkers Foundation",
    description:
      "India's national student science-research competition for classes 5-12. Top performers qualify to represent India at Regeneron ISEF (the International Science and Engineering Fair).",
    category: "research",
    officialUrl: "https://iris.exstemplar.com/",
    countryScope: "country_specific",
    eligibleCountries: ["India"],
    minGrade: 5,
    maxGrade: 12,
    minAge: null,
    maxAge: null,
    individualAllowed: true,
    teamAllowed: true,
    teamSizeMin: 2,
    teamSizeMax: 2,
    applicationFee: 5000,
    feeCurrency: "INR",
    prizeDescription:
      "Top performers represent India at Regeneron ISEF; special achievement awards from Yale, Ricoh, American Psychological Association, and others.",
    deadline: "2026-10-03",
    status: "open",
    difficultyScore: 65,
    valueScore: 72,
    legitimacyScore: 90,
    sourceConfidence: 75,
    sources: [
      {
        url: "https://iris.exstemplar.com/",
        sourceType: "official",
        title: "IRIS National Fair — official site",
        isOfficial: true,
      },
      {
        url: "https://www.vedantu.com/olympiad/iris-initiative-for-research-and-innovation-in-science",
        sourceType: "other",
        title: "IRIS overview (third-party, corroborating)",
        isOfficial: false,
      },
    ],
  },
  {
    slug: "the-earth-prize",
    name: "The Earth Prize",
    organization: "The Earth Foundation",
    description:
      "The world's largest environmental sustainability competition for students aged 13-19. Teams design real-world projects addressing environmental challenges.",
    category: "environment",
    officialUrl: "https://www.theearthprize.org/2026",
    countryScope: "global",
    eligibleCountries: null,
    minGrade: null,
    maxGrade: null,
    minAge: 13,
    maxAge: 19,
    individualAllowed: true,
    teamAllowed: true,
    teamSizeMin: 1,
    teamSizeMax: 5,
    applicationFee: 0,
    feeCurrency: null,
    prizeDescription:
      "$100,000 total prize pool: seven regional winners receive $12,500 each; three Mentor of the Year awards of $2,500 each; $2,500 to an Educators Hub.",
    // The official page had internally conflicting dates for the 2026 vs
    // 2027 cycle at the time of lookup — recorded as null rather than
    // guessing which one is current. Re-check officialUrl before relying on this.
    deadline: null,
    status: "unknown",
    difficultyScore: 60,
    valueScore: 85,
    legitimacyScore: 88,
    sourceConfidence: 45,
    sources: [
      {
        url: "https://www.theearthprize.org/2026",
        sourceType: "official",
        title: "The Earth Prize 2026 — official site",
        isOfficial: true,
        note: "Page showed conflicting 2026/2027 deadline text at time of retrieval — deadline intentionally left null.",
      },
      {
        url: "https://opportunitydesk.org/2025/09/08/earth-prize-2026/",
        sourceType: "other",
        title: "Earth Prize 2026 writeup (third-party)",
        isOfficial: false,
      },
    ],
  },
  {
    slug: "diamond-challenge",
    name: "Diamond Challenge",
    organization: "Horn Entrepreneurship, University of Delaware",
    description:
      "A global entrepreneurship competition for high school students to pitch business or social-venture concepts, with free educational resources throughout.",
    category: "entrepreneurship",
    officialUrl: "https://diamondchallenge.org/competition/",
    countryScope: "global",
    eligibleCountries: null,
    minGrade: null,
    maxGrade: null,
    minAge: 14,
    maxAge: 18,
    individualAllowed: false,
    teamAllowed: true,
    teamSizeMin: 2,
    teamSizeMax: 4,
    applicationFee: 0,
    feeCurrency: null,
    prizeDescription:
      "$100,000 total across Business Innovation and Social Innovation tracks — $12,000 / $8,000 / $4,500 for 1st / 2nd / 3rd per track, plus sponsor topical prizes.",
    deadline: "2027-01-14",
    status: "upcoming",
    difficultyScore: 58,
    valueScore: 78,
    legitimacyScore: 92,
    sourceConfidence: 80,
    sources: [
      {
        url: "https://diamondchallenge.org/competition/",
        sourceType: "official",
        title: "Diamond Challenge — competition page",
        isOfficial: true,
      },
      {
        url: "https://www.udel.edu/research-innovation/horn/pre-college-programs/diamond-challenge/",
        sourceType: "official",
        title: "University of Delaware — Diamond Challenge program page",
        isOfficial: true,
      },
    ],
  },
  {
    slug: "blue-ocean-competition",
    name: "Blue Ocean Competition",
    organization: "Blue Ocean Student Entrepreneurs Corporation",
    description:
      "The world's largest virtual pitch competition for high school students, based on Blue Ocean Strategy methodology. Students submit a 5-minute video pitch.",
    category: "entrepreneurship",
    officialUrl: "https://blueoceancompetition.org/",
    countryScope: "global",
    eligibleCountries: null,
    minGrade: null,
    maxGrade: null,
    minAge: null,
    maxAge: null,
    individualAllowed: true,
    teamAllowed: true,
    teamSizeMin: 1,
    teamSizeMax: 5,
    // Not stated on the retrieved page — left null rather than assumed free.
    applicationFee: null,
    feeCurrency: null,
    prizeDescription: "Thousands of dollars in cash prizes; winner and teacher recognition (exact total not published).",
    deadline: null,
    status: "open",
    difficultyScore: 48,
    valueScore: 70,
    legitimacyScore: 80,
    sourceConfidence: 55,
    sources: [
      {
        url: "https://blueoceancompetition.org/",
        sourceType: "official",
        title: "Blue Ocean Competition — official site",
        isOfficial: true,
      },
      {
        url: "https://blueoceancompetition.org/about/the-competition/",
        sourceType: "official",
        title: "Blue Ocean Competition — about the competition",
        isOfficial: true,
      },
      {
        url: "https://blueoceancompetition.org/2025-2026-winners/",
        sourceType: "official",
        title: "Blue Ocean Competition — 2025-2026 winners",
        isOfficial: true,
      },
    ],
  },
  {
    slug: "iit-eureka-junior",
    name: "Eureka! Junior (National Entrepreneurship Olympiad)",
    organization: "E-Cell, IIT Bombay",
    description:
      "The school-student track of Asia's largest business model competition, run by E-Cell IIT Bombay. Distinct from the main Eureka! competition, which targets college students and startups.",
    category: "entrepreneurship",
    officialUrl: "https://www.ecell.in/eurekajunior/",
    countryScope: "country_specific",
    eligibleCountries: ["India"],
    minGrade: 6,
    maxGrade: 12,
    minAge: null,
    maxAge: null,
    individualAllowed: true,
    teamAllowed: true,
    teamSizeMin: 1,
    teamSizeMax: 3,
    applicationFee: 0,
    feeCurrency: null,
    prizeDescription:
      "Prize pool worth ₹3 lakh; top 100 per category receive a Certificate of Excellence, top 3 per category eligible for cash prizes.",
    // A "30th September" deadline appeared in a third-party source with no
    // year stated — including a year would be guessing, so left null.
    deadline: null,
    status: "open",
    difficultyScore: 45,
    valueScore: 62,
    legitimacyScore: 78,
    sourceConfidence: 45,
    sources: [
      {
        url: "https://www.ecell.in/eurekajunior/",
        sourceType: "official",
        title: "Eureka! Junior — official site",
        isOfficial: true,
        note: "Official site is JavaScript-rendered; body content could not be fetched without a browser-capable fetcher. Needs re-verification by the monitoring pipeline (Playwright).",
      },
      {
        url: "https://www.wonderskool.com/index.php/blogdetail/1263-eureka-junior-road-to-enterprise-e-cell-iit-bombay",
        sourceType: "other",
        title: "Eureka! Junior overview (third-party)",
        isOfficial: false,
      },
    ],
  },
];

async function main() {
  for (const seed of SEED_OPPORTUNITIES) {
    const opportunity = await prisma.opportunity.upsert({
      where: { slug: seed.slug },
      create: {
        slug: seed.slug,
        name: seed.name,
        organization: seed.organization,
        description: seed.description,
        category: seed.category,
        officialUrl: seed.officialUrl,
        countryScope: seed.countryScope,
        eligibleCountries: jsonOrNull(seed.eligibleCountries),
        minGrade: seed.minGrade,
        maxGrade: seed.maxGrade,
        minAge: seed.minAge,
        maxAge: seed.maxAge,
        individualAllowed: seed.individualAllowed,
        teamAllowed: seed.teamAllowed,
        teamSizeMin: seed.teamSizeMin,
        teamSizeMax: seed.teamSizeMax,
        applicationFee: seed.applicationFee,
        feeCurrency: seed.feeCurrency,
        prizeDescription: seed.prizeDescription,
        deadline: seed.deadline ? new Date(seed.deadline) : null,
        status: seed.status,
        difficultyScore: seed.difficultyScore,
        valueScore: seed.valueScore,
        legitimacyScore: seed.legitimacyScore,
        sourceConfidence: seed.sourceConfidence,
        discoverySource: "seed",
        lastVerifiedAt: new Date("2026-08-08"),
      },
      update: {
        // Re-running the seed refreshes facts but never invents new ones.
        description: seed.description,
        status: seed.status,
        deadline: seed.deadline ? new Date(seed.deadline) : null,
        difficultyScore: seed.difficultyScore,
        valueScore: seed.valueScore,
        legitimacyScore: seed.legitimacyScore,
        sourceConfidence: seed.sourceConfidence,
        lastVerifiedAt: new Date("2026-08-08"),
      },
    });

    for (const source of seed.sources) {
      const existing = await prisma.opportunitySource.findFirst({
        where: { opportunityId: opportunity.id, url: source.url },
      });
      if (existing) continue;
      await prisma.opportunitySource.create({
        data: {
          opportunityId: opportunity.id,
          url: source.url,
          sourceType: source.sourceType,
          title: source.title,
          isOfficial: source.isOfficial,
          retrievedAt: new Date("2026-08-08"),
          metadata: source.note ? { note: source.note } : undefined,
        },
      });
    }

    console.log(`Seeded: ${seed.name}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
