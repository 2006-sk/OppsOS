import type { ScoredOpportunity } from "@/lib/db/opportunities";
import type { Recommendation, EligibilityStatus } from "@/lib/enums";

// Client-safe, JSON-serializable shape for passing scored opportunities from
// server components to client components (dates as ISO strings).
export interface OpportunityCardData {
  id: string;
  slug: string;
  name: string;
  organization: string;
  description: string;
  category: string;
  deadline: string | null;
  status: string;
  prizeDescription: string | null;
  individualAllowed: boolean;
  teamAllowed: boolean;
  difficultyScore: number;
  fitScore: number;
  valueScore: number;
  recommendation: Recommendation;
  isSaved: boolean;
  userStatus: string | null;
  isNew: boolean;
  eligibilityStatus: EligibilityStatus;
  eligibilityReasons: string[];
  classification: string;
}

export function toCardData(o: ScoredOpportunity): OpportunityCardData {
  return {
    id: o.id,
    slug: o.slug,
    name: o.name,
    organization: o.organization,
    description: o.description,
    category: o.category,
    deadline: o.deadline ? o.deadline.toISOString() : null,
    status: o.status,
    prizeDescription: o.prizeDescription,
    individualAllowed: o.individualAllowed,
    teamAllowed: o.teamAllowed,
    difficultyScore: o.difficultyScore ?? 50,
    fitScore: o.fitScore,
    valueScore: o.valueScore ?? 50,
    recommendation: o.recommendation,
    isSaved: o.isSaved,
    userStatus: o.userStatus,
    isNew: o.isNew,
    eligibilityStatus: o.eligibilityStatus,
    eligibilityReasons: o.eligibilityReasons,
    classification: o.classification,
  };
}
