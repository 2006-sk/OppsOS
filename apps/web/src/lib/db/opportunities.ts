import "server-only";
import { prisma } from "@/lib/prisma";
import { computeFit } from "@/lib/fit";
import { computeRecommendation } from "@/lib/recommendation";
import type { Opportunity, Profile } from "@prisma/client";
import type { Recommendation } from "@/lib/enums";

export interface OpportunityFilters {
  search?: string;
  category?: string; // "all" | Category
  deadlineWindow?: "30" | "90" | "later" | "none" | "all";
  difficulty?: "easy" | "medium" | "hard" | "extreme" | "all";
  team?: "individual" | "team" | "either" | "all";
  freePaid?: "free" | "paid" | "all";
  eligibleOnly?: boolean;
  saved?: "saved" | "not_saved" | "all";
}

export interface ScoredFields {
  fitScore: number;
  eligible: boolean;
  eligibilityReason: string | null;
  fitExplanation: string;
  recommendation: Recommendation;
  isSaved: boolean;
  userStatus: string | null;
  isNew: boolean;
}

export type ScoredOpportunity = Opportunity & ScoredFields;

const NEW_WINDOW_DAYS = 7;

function isDeadlineReachable(deadline: Date | null): boolean {
  if (!deadline) return true;
  return deadline.getTime() >= Date.now();
}

export function scoreOpportunity<
  T extends Opportunity & { userStates: { saved: boolean; status: string }[] },
>(opportunity: T, profile: Profile): T & ScoredFields {
  const fit = computeFit(profile, opportunity);
  const deadlinePassed = opportunity.deadline != null && !isDeadlineReachable(opportunity.deadline);
  const value = opportunity.valueScore ?? 50;

  const recommendation = computeRecommendation({
    eligible: fit.eligible,
    deadlinePassed,
    fitScore: fit.fitScore,
    valueScore: value,
  });

  const state = opportunity.userStates[0];
  const isNew =
    Date.now() - opportunity.discoveredAt.getTime() < NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  return {
    ...opportunity,
    fitScore: fit.fitScore,
    eligible: fit.eligible,
    eligibilityReason: fit.eligibilityReason,
    fitExplanation: deadlinePassed ? "The deadline for this has already passed." : fit.explanation,
    recommendation,
    isSaved: state?.saved ?? false,
    userStatus: state?.status ?? null,
    isNew,
  };
}

export async function listOpportunitiesForUser(
  userId: string,
  profile: Profile,
  filters: OpportunityFilters
): Promise<ScoredOpportunity[]> {
  const opportunities = await prisma.opportunity.findMany({
    where: { published: true },
    include: { userStates: { where: { userId } } },
    orderBy: { discoveredAt: "desc" },
  });

  let scored = opportunities.map((o) => scoreOpportunity(o, profile));

  if (filters.search) {
    const q = filters.search.toLowerCase();
    scored = scored.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.organization.toLowerCase().includes(q) ||
        o.category.toLowerCase().includes(q)
    );
  }

  if (filters.category && filters.category !== "all") {
    scored = scored.filter((o) => o.category === filters.category);
  }

  if (filters.deadlineWindow && filters.deadlineWindow !== "all") {
    const now = Date.now();
    scored = scored.filter((o) => {
      if (!o.deadline) return filters.deadlineWindow === "none";
      const days = (o.deadline.getTime() - now) / (24 * 60 * 60 * 1000);
      if (filters.deadlineWindow === "30") return days >= 0 && days <= 30;
      if (filters.deadlineWindow === "90") return days >= 0 && days <= 90;
      if (filters.deadlineWindow === "later") return days > 90;
      return true;
    });
  }

  if (filters.difficulty && filters.difficulty !== "all") {
    const target = filters.difficulty.toUpperCase();
    scored = scored.filter((o) => {
      const score = o.difficultyScore ?? 50;
      const label = score <= 25 ? "EASY" : score <= 50 ? "MEDIUM" : score <= 75 ? "HARD" : "EXTREME";
      return label === target;
    });
  }

  if (filters.team && filters.team !== "all") {
    if (filters.team === "individual") scored = scored.filter((o) => o.individualAllowed);
    if (filters.team === "team") scored = scored.filter((o) => o.teamAllowed);
    if (filters.team === "either") scored = scored.filter((o) => o.individualAllowed && o.teamAllowed);
  }

  if (filters.freePaid && filters.freePaid !== "all") {
    if (filters.freePaid === "free") {
      scored = scored.filter((o) => o.applicationFee == null || o.applicationFee === 0);
    } else {
      scored = scored.filter((o) => o.applicationFee != null && o.applicationFee > 0);
    }
  }

  if (filters.eligibleOnly) {
    scored = scored.filter((o) => o.eligible);
  }

  if (filters.saved && filters.saved !== "all") {
    scored = scored.filter((o) => (filters.saved === "saved" ? o.isSaved : !o.isSaved));
  }

  const recPriority: Record<Recommendation, number> = { do_it: 0, consider: 1, skip: 2 };
  scored.sort((a, b) => {
    const pr = recPriority[a.recommendation] - recPriority[b.recommendation];
    if (pr !== 0) return pr;
    if (b.fitScore !== a.fitScore) return b.fitScore - a.fitScore;
    return (b.valueScore ?? 0) - (a.valueScore ?? 0);
  });

  return scored;
}

export async function listNewlyFoundForUser(
  userId: string,
  profile: Profile
): Promise<ScoredOpportunity[]> {
  const all = await listOpportunitiesForUser(userId, profile, {});
  return all.filter(
    (o) =>
      o.isNew &&
      o.eligible &&
      (o.fitScore ?? 0) >= 51 &&
      (o.valueScore ?? 0) >= 51
  );
}

export async function listSavedForUser(userId: string, profile: Profile): Promise<ScoredOpportunity[]> {
  const opportunities = await prisma.opportunity.findMany({
    where: { published: true, userStates: { some: { userId, saved: true } } },
    include: { userStates: { where: { userId } } },
    orderBy: { deadline: "asc" },
  });
  return opportunities.map((o) => scoreOpportunity(o, profile));
}

export async function getOpportunityDetail(id: string, userId: string, profile: Profile) {
  const opportunity = await prisma.opportunity.findFirst({
    where: { id, published: true },
    include: {
      sources: { orderBy: { retrievedAt: "desc" } },
      requirements: true,
      pastWinners: { orderBy: { year: "desc" } },
      userStates: { where: { userId } },
    },
  });
  if (!opportunity) return null;
  return scoreOpportunity(opportunity, profile);
}
