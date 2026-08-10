import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { NavBar } from "@/components/nav-bar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CandidateActions } from "@/components/candidate-actions";

const STATE_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  accepted: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
  duplicate: "bg-zinc-100 text-zinc-600",
};

export default async function AdminReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  await requireAdmin();
  const { state = "pending" } = await searchParams;

  const candidates = await prisma.discoveryCandidate.findMany({
    where: state === "all" ? {} : { state },
    include: { opportunity: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-zinc-50">
      <NavBar />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Discovery review</h1>
          <p className="text-sm text-zinc-500">
            New candidates found by the scraper. Accepting publishes the extracted opportunity into the
            student feed.
          </p>
        </div>

        <div className="flex gap-2 text-sm">
          {["pending", "accepted", "rejected", "duplicate", "all"].map((s) => (
            <a
              key={s}
              href={`/admin/review?state=${s}`}
              className={`rounded-md px-3 py-1.5 capitalize ${
                state === s ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {s}
            </a>
          ))}
        </div>

        {candidates.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 py-16 text-center text-sm text-zinc-500">
            No {state === "all" ? "" : state} candidates.
          </p>
        ) : (
          <div className="space-y-3">
            {candidates.map((c) => (
              <Card key={c.id} className="space-y-3 border-zinc-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={STATE_BADGE[c.state] ?? ""}>{c.state}</Badge>
                      {c.legitimacyConfidence != null && (
                        <span className="text-xs text-zinc-500">
                          Legitimacy confidence: {c.legitimacyConfidence}/100
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {c.extractedName ?? c.title ?? c.url}
                    </p>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-xs text-zinc-500 hover:underline"
                    >
                      {c.url}
                    </a>
                    <p className="text-xs text-zinc-400">
                      Found via query: {c.discoveredByQuery ?? "unknown"} · Provider: {c.discoveryProvider ?? "unknown"}
                    </p>
                    {c.opportunity && (
                      <p className="text-xs text-zinc-500">
                        Extracted: {c.opportunity.name} ({c.opportunity.category}) — published:{" "}
                        {String(c.opportunity.published)}
                      </p>
                    )}
                    {c.reason && <p className="text-xs text-zinc-500">Note: {c.reason}</p>}
                  </div>
                </div>
                {c.state === "pending" && (
                  <CandidateActions candidateId={c.id} hasOpportunity={Boolean(c.opportunityId)} />
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
