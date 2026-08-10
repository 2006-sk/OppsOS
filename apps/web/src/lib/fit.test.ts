import { describe, expect, it } from "vitest";
import { computeFit } from "@/lib/fit";
import type { Opportunity, Profile } from "@prisma/client";

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
    interests: ["computer_science", "ai"],
    preferredCategories: ["hackathon", "research"],
    teamPreference: "either",
    hoursPerWeek: 6,
    budgetMin: null,
    budgetMax: 2000,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as Profile;
}

function makeOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: "o1",
    slug: "test-opportunity",
    name: "National Hackathon",
    organization: "Some Org",
    description: "A hackathon for students interested in computer science.",
    category: "hackathon",
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

describe("computeFit — soft scoring", () => {
  it("does not false-positive match a 2-letter interest inside an unrelated word", () => {
    // Regression test: "ai" must not match inside "National" or "Fair".
    const result = computeFit(
      makeProfile({ interests: ["ai"], preferredCategories: ["other"] }),
      makeOpportunity({
        name: "IRIS National Fair",
        description: "A research fair.",
        organization: "ExSTEMplar",
        category: "research",
      })
    );
    expect(result.explanation).not.toContain("interest in ai");
  });

  it("does match a genuine whole-word interest mention", () => {
    const result = computeFit(
      makeProfile({ interests: ["ai"], preferredCategories: ["other"] }),
      makeOpportunity({
        name: "AI Robotics Challenge",
        description: "A competition focused on AI and robotics.",
        category: "innovation",
      })
    );
    expect(result.explanation).toContain("interest in ai");
  });

  it("scores higher when category matches a preferred category", () => {
    const matching = computeFit(
      makeProfile({ preferredCategories: ["hackathon"] }),
      makeOpportunity({ category: "hackathon" })
    );
    const nonMatching = computeFit(
      makeProfile({ preferredCategories: ["essay"] }),
      makeOpportunity({ category: "hackathon" })
    );
    expect(matching.fitScore).toBeGreaterThan(nonMatching.fitScore);
  });

  it("penalizes a fee that exceeds the student's budget", () => {
    const withinBudget = computeFit(
      makeProfile({ budgetMax: 5000 }),
      makeOpportunity({ applicationFee: 1000 })
    );
    const overBudget = computeFit(
      makeProfile({ budgetMax: 500 }),
      makeOpportunity({ applicationFee: 1000 })
    );
    expect(withinBudget.fitScore).toBeGreaterThan(overBudget.fitScore);
  });

  it("never scores based on prize/cash value", () => {
    const noPrize = computeFit(makeProfile(), makeOpportunity({ prizeDescription: null }));
    const bigPrize = computeFit(
      makeProfile(),
      makeOpportunity({ prizeDescription: "$100,000 cash prize" })
    );
    expect(bigPrize.fitScore).toBe(noPrize.fitScore);
  });
});
