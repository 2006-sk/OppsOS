import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireProfile } from "@/lib/session";
import { getOpportunityDetail } from "@/lib/db/opportunities";
import { NavBar } from "@/components/nav-bar";
import { ScoreBar } from "@/components/score-bar";
import { SaveButton } from "@/components/save-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CATEGORY_LABELS, RECOMMENDATION_LABELS, type Category } from "@/lib/enums";

function fmtDate(d: Date | null): string {
  if (!d) return "Not published";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

const recBadgeVariant: Record<string, string> = {
  do_it: "bg-emerald-600 text-white hover:bg-emerald-600",
  consider: "bg-amber-500 text-white hover:bg-amber-500",
  skip: "bg-zinc-400 text-white hover:bg-zinc-400",
};

function JsonList({ value }: { value: unknown }) {
  if (!value) return <p className="text-sm text-zinc-500">Not documented yet — check the official source.</p>;
  const items = Array.isArray(value) ? value : [String(value)];
  if (items.length === 0)
    return <p className="text-sm text-zinc-500">Not documented yet — check the official source.</p>;
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700">
      {items.map((item, i) => (
        <li key={i}>{typeof item === "string" ? item : JSON.stringify(item)}</li>
      ))}
    </ul>
  );
}

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { profile } = await requireProfile();
  const { id } = await params;
  const o = await getOpportunityDetail(id, profile.userId, profile);
  if (!o) notFound();

  const officialSource = o.sources.find((s) => s.isOfficial) ?? o.sources[0];
  const otherSources = o.sources.filter((s) => s.id !== officialSource?.id);

  return (
    <div className="min-h-screen bg-zinc-50">
      <NavBar />
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{CATEGORY_LABELS[o.category as Category] ?? o.category}</Badge>
            {o.isNew && <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50">Newly discovered</Badge>}
            {!o.eligible && (
              <Badge variant="outline" className="border-red-200 text-red-600">
                Not eligible: {o.eligibilityReason}
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{o.name}</h1>
          <p className="text-zinc-500">{o.organization}</p>
          <div className="flex items-center gap-3 pt-1">
            <SaveButton opportunityId={o.id} initialSaved={o.isSaved} />
            <a
              href={o.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900"
            >
              Official website <ExternalLink className="size-3.5" />
            </a>
          </div>
        </div>

        <Card className="border-zinc-200 p-5">
          <h2 className="mb-2 text-sm font-semibold text-zinc-900">What is it?</h2>
          <p className="text-sm leading-6 text-zinc-700">{o.description}</p>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-zinc-500">Country eligibility</dt>
              <dd className="text-zinc-800">
                {o.countryScope === "global"
                  ? "Global"
                  : Array.isArray(o.eligibleCountries)
                    ? (o.eligibleCountries as string[]).join(", ")
                    : "Not specified"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Grade/age eligibility</dt>
              <dd className="text-zinc-800">
                {o.minGrade || o.maxGrade
                  ? `Grade ${o.minGrade ?? "?"}–${o.maxGrade ?? "?"}`
                  : o.minAge || o.maxAge
                    ? `Age ${o.minAge ?? "?"}–${o.maxAge ?? "?"}`
                    : "Not specified"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Individual/team</dt>
              <dd className="text-zinc-800">
                {o.individualAllowed && o.teamAllowed
                  ? `Individual or team (${o.teamSizeMin ?? "?"}–${o.teamSizeMax ?? "?"})`
                  : o.teamAllowed
                    ? `Team (${o.teamSizeMin ?? "?"}–${o.teamSizeMax ?? "?"})`
                    : "Individual"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Deadline</dt>
              <dd className="text-zinc-800">{fmtDate(o.deadline)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Status</dt>
              <dd className="capitalize text-zinc-800">{o.status.replace(/_/g, " ")}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Cost</dt>
              <dd className="text-zinc-800">
                {o.applicationFee == null
                  ? "Not specified"
                  : o.applicationFee === 0
                    ? "Free"
                    : `${o.feeCurrency ?? ""} ${o.applicationFee}`}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Prize/outcome</dt>
              <dd className="text-zinc-800">{o.prizeDescription ?? "Not specified"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Last verified</dt>
              <dd className="text-zinc-800">{fmtDate(o.lastVerifiedAt)}</dd>
            </div>
          </div>
        </Card>

        <Card className="border-zinc-200 p-5">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <ScoreBar kind="difficulty" score={o.difficultyScore ?? 50} />
            <ScoreBar kind="fit" score={o.fitScore} />
            <ScoreBar kind="value" score={o.valueScore ?? 50} />
          </div>
        </Card>

        <div className="space-y-5">
          <section>
            <h2 className="mb-1 text-sm font-semibold text-zinc-900">A. Why this may be worth doing</h2>
            <p className="text-sm leading-6 text-zinc-700">{o.fitExplanation}</p>
          </section>
          <Separator />
          <section>
            <h2 className="mb-1 text-sm font-semibold text-zinc-900">B. Why it is difficult</h2>
            <p className="text-sm leading-6 text-zinc-700">
              Rated at {o.difficultyScore ?? 50}/100 internally.{" "}
              {o.teamSizeMax && o.teamSizeMax > 1 ? "Requires coordinating a team submission. " : ""}
              {o.applicationFee != null && o.applicationFee > 0
                ? "There is an entry fee, which raises the commitment bar. "
                : ""}
              See the official rules for the exact judging bar.
            </p>
          </section>
          <Separator />
          <section>
            <h2 className="mb-1 text-sm font-semibold text-zinc-900">C. What they judge</h2>
            <JsonList value={o.requirements?.judgingCriteria} />
          </section>
          <Separator />
          <section>
            <h2 className="mb-1 text-sm font-semibold text-zinc-900">D. What you need to submit</h2>
            <JsonList value={o.requirements?.submissionRequirements} />
          </section>
          <Separator />
          <section>
            <h2 className="mb-1 text-sm font-semibold text-zinc-900">E. Competition stages</h2>
            <JsonList value={o.requirements?.stages} />
          </section>
          <Separator />
          <section>
            <h2 className="mb-1 text-sm font-semibold text-zinc-900">F. Previous winners/projects</h2>
            {o.pastWinners.length === 0 ? (
              <p className="text-sm text-zinc-500">No verified past winners on file yet.</p>
            ) : (
              <ul className="space-y-2 text-sm text-zinc-700">
                {o.pastWinners.map((w) => (
                  <li key={w.id}>
                    {w.year ? `${w.year} — ` : ""}
                    {w.winnerName ?? "Unnamed"}
                    {w.projectTitle ? `: ${w.projectTitle}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <Separator />
          <section>
            <h2 className="mb-1 text-sm font-semibold text-zinc-900">G. Key dates</h2>
            <dl className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <dt className="text-zinc-500">Opens</dt>
                <dd className="text-zinc-800">{fmtDate(o.opensAt)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Deadline</dt>
                <dd className="text-zinc-800">{fmtDate(o.deadline)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Closes</dt>
                <dd className="text-zinc-800">{fmtDate(o.closesAt)}</dd>
              </div>
            </dl>
          </section>
          <Separator />
          <section>
            <h2 className="mb-1 text-sm font-semibold text-zinc-900">H. Recommendation</h2>
            <Badge className={`${recBadgeVariant[o.recommendation]} text-sm`}>
              {RECOMMENDATION_LABELS[o.recommendation]}
            </Badge>
            <p className="mt-2 text-sm leading-6 text-zinc-700">{o.fitExplanation}</p>
          </section>
        </div>

        <Card className="border-zinc-200 p-5">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">Sources</h2>
          {officialSource && (
            <div className="mb-3">
              <a
                href={officialSource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm font-medium text-zinc-900 hover:underline"
              >
                Official source <ExternalLink className="size-3.5" />
              </a>
              <p className="text-xs text-zinc-500">
                Checked: {officialSource.retrievedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          )}
          {otherSources.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Other sources</p>
              {otherSources.map((s) => (
                <div key={s.id}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-zinc-700 hover:underline"
                  >
                    {s.title ?? s.url}
                  </a>
                  <p className="text-xs text-zinc-500">
                    Checked: {s.retrievedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <p className="text-center text-xs text-zinc-400">
          <Link href="/opportunities" className="hover:underline">
            ← Back to all opportunities
          </Link>
        </p>
      </main>
    </div>
  );
}
