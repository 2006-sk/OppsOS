import type { Recommendation } from "@/lib/enums";

// Deterministic recommendation rules (spec section 20). Pure/no DB access so
// it can be unit-tested without touching Prisma or "server-only".
export function computeRecommendation(params: {
  eligible: boolean;
  deadlinePassed: boolean;
  fitScore: number;
  valueScore: number;
}): Recommendation {
  const { eligible, deadlinePassed, fitScore, valueScore } = params;

  if (!eligible) return "skip";
  if (deadlinePassed) return "skip";
  if (fitScore >= 70 && valueScore >= 70) return "do_it";
  if (valueScore >= 50) return "consider";
  return "skip";
}
