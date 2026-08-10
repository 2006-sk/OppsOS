import type { Recommendation, EligibilityStatus } from "@/lib/enums";

// Deterministic recommendation rules (spec section 20). Pure/no DB access so
// it can be unit-tested without touching Prisma or "server-only".
//
// Eligibility is a hard gate, checked before scoring ever runs: ineligible
// always skips regardless of fit/value. Unverified can still surface as
// "consider" (there's a real, unconfirmed chance it fits) but never "do_it"
// — we don't tell a student to commit to something we couldn't confirm
// they qualify for.
export function computeRecommendation(params: {
  eligibilityStatus: EligibilityStatus;
  deadlinePassed: boolean;
  fitScore: number;
  valueScore: number;
}): Recommendation {
  const { eligibilityStatus, deadlinePassed, fitScore, valueScore } = params;

  if (eligibilityStatus === "ineligible") return "skip";
  if (deadlinePassed) return "skip";
  if (eligibilityStatus === "eligible" && fitScore >= 70 && valueScore >= 70) return "do_it";
  if (valueScore >= 50) return "consider";
  return "skip";
}
