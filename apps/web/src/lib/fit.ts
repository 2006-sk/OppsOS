import type { Opportunity, Profile } from "@prisma/client";

export interface FitResult {
  fitScore: number;
  eligible: boolean;
  eligibilityReason: string | null;
  explanation: string;
}

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  return [];
}

/**
 * Deterministic, explainable v1 fit scoring (spec section 19). This is a
 * heuristic, not a ground truth — every factor here is something a human
 * reviewer could re-derive from the profile + opportunity fields, which is
 * the point: "explanation" must be honest about what drove the score.
 */
export function computeFit(profile: Profile, opportunity: Opportunity): FitResult {
  const reasons: string[] = [];

  // --- Hard eligibility gates -------------------------------------------
  if (opportunity.minGrade != null && profile.grade < opportunity.minGrade) {
    return {
      fitScore: 5,
      eligible: false,
      eligibilityReason: `Requires grade ${opportunity.minGrade}+, you're in grade ${profile.grade}.`,
      explanation: `Not eligible: requires grade ${opportunity.minGrade}+, you're in grade ${profile.grade}.`,
    };
  }
  if (opportunity.maxGrade != null && profile.grade > opportunity.maxGrade) {
    return {
      fitScore: 5,
      eligible: false,
      eligibilityReason: `Limited to grade ${opportunity.maxGrade} and below, you're in grade ${profile.grade}.`,
      explanation: `Not eligible: limited to grade ${opportunity.maxGrade} and below.`,
    };
  }

  const eligibleCountries = parseJsonArray(opportunity.eligibleCountries);
  let countryEligible = true;
  if (opportunity.countryScope === "country_specific" && eligibleCountries.length > 0) {
    countryEligible = eligibleCountries.some(
      (c) => c.toLowerCase() === profile.country.toLowerCase()
    );
    if (!countryEligible) {
      return {
        fitScore: 5,
        eligible: false,
        eligibilityReason: `Only open to: ${eligibleCountries.join(", ")}.`,
        explanation: `Not eligible: restricted to ${eligibleCountries.join(", ")}.`,
      };
    }
  }

  // --- Soft scoring (0-100) ----------------------------------------------
  let score = 0;

  const preferredCategories = parseJsonArray(profile.preferredCategories);
  if (preferredCategories.includes(opportunity.category)) {
    score += 35;
    reasons.push("matches a category you selected");
  }

  const interests = parseJsonArray(profile.interests).map((i) => i.replace(/_/g, " "));
  const haystack = `${opportunity.name} ${opportunity.description} ${opportunity.organization}`.toLowerCase();
  const interestHit = interests.find((i) => {
    const escaped = i.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`).test(haystack);
  });
  if (interestHit) {
    score += 25;
    reasons.push(`relates to your interest in ${interestHit}`);
  }

  const teamOk =
    profile.teamPreference === "either" ||
    (profile.teamPreference === "team" && opportunity.teamAllowed) ||
    (profile.teamPreference === "individual" && opportunity.individualAllowed);
  if (teamOk) {
    score += 15;
    reasons.push("matches your individual/team preference");
  }

  if (opportunity.applicationFee == null || opportunity.applicationFee === 0) {
    score += 15;
  } else if (profile.budgetMax != null && opportunity.applicationFee <= profile.budgetMax) {
    score += 15;
    reasons.push("fits your budget");
  } else if (profile.budgetMax == null) {
    score += 8;
  }

  if (opportunity.difficultyScore == null) {
    score += 5;
  } else if (profile.hoursPerWeek >= 8) {
    score += 10;
  } else if (opportunity.difficultyScore <= 50) {
    score += 10;
  } else if (opportunity.difficultyScore <= 75 && profile.hoursPerWeek >= 5) {
    score += 7;
  } else {
    score += 2;
    reasons.push("may need more hours/week than you have available");
  }

  score = Math.max(0, Math.min(100, score));

  const explanation =
    reasons.length > 0
      ? `Good match: ${reasons.join(", ")}.`
      : "Eligible, but doesn't strongly match your stated interests or preferences.";

  return { fitScore: score, eligible: true, eligibilityReason: null, explanation };
}
