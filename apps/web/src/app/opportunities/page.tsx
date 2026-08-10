import { requireProfile } from "@/lib/session";
import {
  listOpportunitiesForUser,
  pickBestForYou,
  pickComingSoon,
  pickHiddenGems,
  pickMajor,
  pickNewlyDiscovered,
  type OpportunityFilters,
  type ScoredOpportunity,
} from "@/lib/db/opportunities";
import { toCardData } from "@/lib/opportunity-card-data";
import { NavBar } from "@/components/nav-bar";
import { OpportunityFilters as FiltersBar } from "@/components/opportunity-filters";
import { OpportunityCard } from "@/components/opportunity-card";

function Section({
  title,
  subtitle,
  opportunities,
}: {
  title: string;
  subtitle?: string;
  opportunities: ScoredOpportunity[];
}) {
  if (opportunities.length === 0) return null;
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{title}</h2>
        {subtitle && <p className="text-xs text-zinc-400">{subtitle}</p>}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {opportunities.map((o) => (
          <OpportunityCard key={o.id} opportunity={toCardData(o)} />
        ))}
      </div>
    </section>
  );
}

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { profile } = await requireProfile();
  const sp = await searchParams;

  const filters: OpportunityFilters = {
    search: sp.search,
    category: sp.category,
    deadlineWindow: sp.deadline as OpportunityFilters["deadlineWindow"],
    difficulty: sp.difficulty as OpportunityFilters["difficulty"],
    team: sp.team as OpportunityFilters["team"],
    freePaid: sp.freePaid as OpportunityFilters["freePaid"],
    saved: sp.saved as OpportunityFilters["saved"],
  };

  const hasActiveFilters = Object.values(sp).some(Boolean);
  const opportunities = await listOpportunitiesForUser(profile.userId, profile, filters);

  return (
    <div className="min-h-screen bg-zinc-50">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-10">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Opportunities</h1>
          <p className="text-sm text-zinc-500">
            What&apos;s worth pursuing right now, ranked for you — not everything that exists.
          </p>
        </div>

        <FiltersBar />

        {!hasActiveFilters && (
          <>
            <Section title="Best For You" opportunities={pickBestForYou(opportunities)} />
            <Section
              title="Hidden Gems"
              subtitle="Legitimate and worth doing — just less crowded, not lower quality."
              opportunities={pickHiddenGems(opportunities)}
            />
            <Section title="Major" opportunities={pickMajor(opportunities)} />
            <Section title="Newly Discovered" opportunities={pickNewlyDiscovered(opportunities)} />
            <Section title="Coming Soon" opportunities={pickComingSoon(opportunities)} />
          </>
        )}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            All opportunities ({opportunities.length})
          </h2>
          {opportunities.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-300 py-16 text-center text-sm text-zinc-500">
              No opportunities match these filters yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {opportunities.map((o) => (
                <OpportunityCard key={o.id} opportunity={toCardData(o)} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
