import type { Opportunity, Profile } from "@prisma/client";

export interface FitResult {
  fitScore: number;
  explanation: string;
}

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  return [];
}

/**
 * Deterministic, explainable v1 fit scoring (spec section 19). Purely a
 * soft 0-100 ranking signal — callers MUST check evaluateEligibility()
 * (src/lib/eligibility.ts) first and only call this for eligible/unverified
 * opportunities. Ineligibility must never be expressed as a low fit score;
 * the two are separate axes.
 *
 * This is a heuristic, not a ground truth — every factor here is something
 * a human reviewer could re-derive from the profile + opportunity fields,
 * which is the point: "explanation" must be honest about what drove the
 * score. It must never take prize/cash value into account.
 */
export function computeFit(profile: Profile, opportunity: Opportunity): FitResult {
  const reasons: string[] = [];
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
      : "Doesn't strongly match your stated interests or preferences.";

  return { fitScore: score, explanation };
}
