import Link from "next/link";
import { requireProfile } from "@/lib/session";
import { listSavedForUser } from "@/lib/db/opportunities";
import { NavBar } from "@/components/nav-bar";
import { ScoreBar } from "@/components/score-bar";
import { StatusSelect } from "@/components/status-select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS, type Category } from "@/lib/enums";
import type { ScoredOpportunity } from "@/lib/db/opportunities";

function SavedCard({ o }: { o: ScoredOpportunity }) {
  return (
    <Card className="flex items-center justify-between gap-4 border-zinc-200 p-4">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs text-zinc-600">
            {CATEGORY_LABELS[o.category as Category] ?? o.category}
          </Badge>
          {o.deadline && (
            <span className="text-xs text-zinc-500">
              Due {o.deadline.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
        <p className="truncate text-sm font-medium text-zinc-900">{o.name}</p>
        <div className="max-w-[160px]">
          <ScoreBar kind="difficulty" score={o.difficultyScore ?? 50} size="sm" showTitle={false} />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusSelect opportunityId={o.id} status={o.userStatus ?? "interested"} />
        <Button
          render={<Link href={`/opportunities/${o.id}`} />}
          nativeButton={false}
          size="sm"
          variant="outline"
        >
          Open
        </Button>
      </div>
    </Card>
  );
}

function Section({ title, items }: { title: string; items: ScoredOpportunity[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        {title} ({items.length})
      </h2>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 py-8 text-center text-sm text-zinc-500">
          Nothing here yet.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((o) => (
            <SavedCard key={o.id} o={o} />
          ))}
        </div>
      )}
    </section>
  );
}

export default async function SavedPage() {
  const { profile } = await requireProfile();
  const saved = await listSavedForUser(profile.userId, profile);

  const doing = saved.filter((o) => o.userStatus === "doing");
  const interested = saved.filter((o) => o.userStatus === "interested" || !o.userStatus);
  const completed = saved.filter((o) => o.userStatus === "completed");

  return (
    <div className="min-h-screen bg-zinc-50">
      <NavBar />
      <main className="mx-auto max-w-3xl space-y-10 px-4 py-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Saved</h1>
          <p className="text-sm text-zinc-500">Track what you&apos;re doing, considering, and have finished.</p>
        </div>
        <Section title="Doing" items={doing} />
        <Section title="Interested" items={interested} />
        <Section title="Completed" items={completed} />
      </main>
    </div>
  );
}
