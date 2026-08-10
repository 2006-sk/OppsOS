import { describe, expect, it } from "vitest";
import { evaluateEligibility } from "@/lib/eligibility";
import type { Opportunity, Profile } from "@prisma/client";

function yearsAgo(n: number): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d;
}

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "p1",
    userId: "u1",
    name: "Test Student",
    educationLevel: "high_school",
    grade: 10,
    dateOfBirth: null,
    collegeYear: null,
    major: null,
    country: "India",
    state: null,
    city: null,
    school: null,
    interests: [],
    preferredCategories: [],
    teamPreference: "either",
    hoursPerWeek: 6,
    budgetMin: null,
    budgetMax: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as Profile;
}

function makeOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: "o1",
    slug: "test-opportunity",
    name: "Test Opportunity",
    organization: "Some Org",
    description: "A test opportunity.",
    category: "other",
    subcategory: null,
    officialUrl: "https://example.com",
    applicationUrl: null,
    countryScope: "global",
    eligibleCountries: null,
    minGrade: null,
    maxGrade: null,
    minAge: null,
    maxAge: null,
    educationLevels: null,
    citizenshipRequirements: null,
    schoolNominationRequired: false,
    institutionNominationRequired: false,
    individualAllowed: true,
    teamAllowed: true,
    teamSizeMin: 1,
    teamSizeMax: 4,
    applicationFee: null,
    feeCurrency: null,
    prizeDescription: null,
    deadline: null,
    opensAt: null,
    closesAt: null,
    status: "open",
    published: true,
    difficultyScore: 50,
    valueScore: 50,
    legitimacyScore: 80,
    sourceConfidence: 80,
    classification: "unknown",
    discoverySource: "seed",
    discoveredAt: new Date(),
    lastVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as Opportunity;
}

describe("evaluateEligibility — grade gate", () => {
  it("is ineligible below the minimum grade", () => {
    const result = evaluateEligibility(
      makeProfile({ grade: 8 }),
      makeOpportunity({ minGrade: 9, maxGrade: 12 })
    );
    expect(result.status).toBe("ineligible");
  });

  it("is ineligible above the maximum grade", () => {
    const result = evaluateEligibility(
      makeProfile({ grade: 12 }),
      makeOpportunity({ minGrade: 5, maxGrade: 10 })
    );
    expect(result.status).toBe("ineligible");
  });

  it("is eligible within the grade range", () => {
    const result = evaluateEligibility(
      makeProfile({ grade: 10 }),
      makeOpportunity({ minGrade: 5, maxGrade: 12 })
    );
    expect(result.status).toBe("eligible");
  });
});

describe("evaluateEligibility — age gate", () => {
  it("is ineligible below the minimum age", () => {
    const result = evaluateEligibility(
      makeProfile({ grade: null, dateOfBirth: yearsAgo(12) }),
      makeOpportunity({ minAge: 13, maxAge: 19 })
    );
    expect(result.status).toBe("ineligible");
  });

  it("is ineligible above the maximum age", () => {
    const result = evaluateEligibility(
      makeProfile({ grade: null, dateOfBirth: yearsAgo(20) }),
      makeOpportunity({ minAge: 13, maxAge: 19 })
    );
    expect(result.status).toBe("ineligible");
  });

  it("is unverified when age is required but date of birth is unknown", () => {
    const result = evaluateEligibility(
      makeProfile({ dateOfBirth: null }),
      makeOpportunity({ minAge: 13, maxAge: 19 })
    );
    expect(result.status).toBe("unverified");
  });
});

describe("evaluateEligibility — country gate", () => {
  it("is ineligible when the country is excluded from an explicit allowlist", () => {
    const result = evaluateEligibility(
      makeProfile({ country: "India" }),
      makeOpportunity({ countryScope: "country_specific", eligibleCountries: ["United States"] })
    );
    expect(result.status).toBe("ineligible");
  });

  it("is eligible when country matches an explicit allowlist", () => {
    const result = evaluateEligibility(
      makeProfile({ country: "India" }),
      makeOpportunity({ countryScope: "country_specific", eligibleCountries: ["India"] })
    );
    expect(result.status).toBe("eligible");
  });
});

describe("evaluateEligibility — education level mismatch (never compensated by fit/value)", () => {
  it("is ineligible for a school-grade opportunity when the profile is undergraduate", () => {
    const result = evaluateEligibility(
      makeProfile({ educationLevel: "undergraduate", grade: null, collegeYear: 2 }),
      makeOpportunity({ minGrade: 5, maxGrade: 12 })
    );
    expect(result.status).toBe("ineligible");
  });

  it("is ineligible for an undergraduate-only opportunity when the profile is high school", () => {
    const result = evaluateEligibility(
      makeProfile({ educationLevel: "high_school", grade: 10 }),
      makeOpportunity({ educationLevels: ["undergraduate"] })
    );
    expect(result.status).toBe("ineligible");
  });

  it("is eligible for an undergraduate-only opportunity when the profile is undergraduate", () => {
    const result = evaluateEligibility(
      makeProfile({ educationLevel: "undergraduate", grade: null, collegeYear: 2 }),
      makeOpportunity({ educationLevels: ["undergraduate"] })
    );
    expect(result.status).toBe("eligible");
  });
});

describe("evaluateEligibility — absence of stated restriction is open, not unverified", () => {
  it("is eligible when no grade/age/country restriction is stated at all", () => {
    const result = evaluateEligibility(makeProfile(), makeOpportunity());
    expect(result.status).toBe("eligible");
  });
});

describe("evaluateEligibility — nomination gates cannot be self-determined", () => {
  it("is unverified when school nomination is required, even with no other blocking facts", () => {
    const result = evaluateEligibility(makeProfile(), makeOpportunity({ schoolNominationRequired: true }));
    expect(result.status).toBe("unverified");
  });
});

describe("evaluateEligibility — worked example (Grade 10 India vs 2nd-year undergrad India)", () => {
  const grade10India = makeProfile({
    educationLevel: "high_school",
    grade: 10,
    dateOfBirth: yearsAgo(15),
    country: "India",
  });
  const undergradIndia = makeProfile({
    educationLevel: "undergraduate",
    grade: null,
    collegeYear: 2,
    dateOfBirth: yearsAgo(20),
    country: "India",
  });

  // Modeled directly on the seeded opportunities (see prisma/seed.ts).
  const irisNationalFair = makeOpportunity({
    slug: "iris-national-fair",
    countryScope: "country_specific",
    eligibleCountries: ["India"],
    minGrade: 5,
    maxGrade: 12,
  });
  const earthPrize = makeOpportunity({
    slug: "the-earth-prize",
    minAge: 13,
    maxAge: 19,
  });
  const diamondChallenge = makeOpportunity({
    slug: "diamond-challenge",
    minAge: 14,
    maxAge: 18,
  });
  const blueOcean = makeOpportunity({ slug: "blue-ocean-competition" });
  const eurekaJunior = makeOpportunity({
    slug: "iit-eureka-junior",
    countryScope: "country_specific",
    eligibleCountries: ["India"],
    minGrade: 6,
    maxGrade: 12,
  });
  const acmChiSrc = makeOpportunity({
    slug: "acm-chi-src",
    educationLevels: ["undergraduate"],
  });

  const seedSet = [irisNationalFair, earthPrize, diamondChallenge, blueOcean, eurekaJunior, acmChiSrc];

  it("Grade 10 India is eligible for the school-targeted set and not the undergrad-only one", () => {
    const results = Object.fromEntries(
      seedSet.map((o) => [o.slug, evaluateEligibility(grade10India, o).status])
    );
    expect(results).toEqual({
      "iris-national-fair": "eligible",
      "the-earth-prize": "eligible",
      "diamond-challenge": "eligible",
      "blue-ocean-competition": "eligible",
      "iit-eureka-junior": "eligible",
      "acm-chi-src": "ineligible",
    });
  });

  it("2nd-year undergrad India is eligible for the undergrad-only and unrestricted ones, not the school-targeted set", () => {
    const results = Object.fromEntries(
      seedSet.map((o) => [o.slug, evaluateEligibility(undergradIndia, o).status])
    );
    expect(results).toEqual({
      "iris-national-fair": "ineligible",
      "the-earth-prize": "ineligible",
      "diamond-challenge": "ineligible",
      "blue-ocean-competition": "eligible",
      "iit-eureka-junior": "ineligible",
      "acm-chi-src": "eligible",
    });
  });

  it("the two profiles' eligible sets only overlap on opportunities with no stated restriction", () => {
    const eligibleFor = (profile: Profile) =>
      new Set(seedSet.filter((o) => evaluateEligibility(profile, o).status === "eligible").map((o) => o.slug));

    const grade10Eligible = eligibleFor(grade10India);
    const undergradEligible = eligibleFor(undergradIndia);
    const overlap = [...grade10Eligible].filter((slug) => undergradEligible.has(slug));

    expect(overlap).toEqual(["blue-ocean-competition"]);
    // Each profile also gets opportunities the other is excluded from.
    expect(grade10Eligible.size).toBeGreaterThan(overlap.length);
    expect(undergradEligible.size).toBeGreaterThan(overlap.length);
  });
});
