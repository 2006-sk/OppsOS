import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScoreBar } from "@/components/score-bar";
import { SaveButton } from "@/components/save-button";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS, RECOMMENDATION_LABELS, type Category } from "@/lib/enums";
import type { OpportunityCardData } from "@/lib/opportunity-card-data";

function formatDeadline(deadline: string | null): string {
  if (!deadline) return "No deadline published";
  const d = new Date(deadline);
  const days = Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  const formatted = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (days < 0) return `${formatted} (closed)`;
  if (days === 0) return `${formatted} (today)`;
  return `${formatted} (${days}d)`;
}

function teamModeLabel(individual: boolean, team: boolean): string {
  if (individual && team) return "Individual or Team";
  if (team) return "Team";
  if (individual) return "Individual";
  return "Unspecified";
}

const recBadgeVariant: Record<string, string> = {
  do_it: "bg-emerald-600 text-white hover:bg-emerald-600",
  consider: "bg-amber-500 text-white hover:bg-amber-500",
  skip: "bg-zinc-400 text-white hover:bg-zinc-400",
};

export function OpportunityCard({ opportunity }: { opportunity: OpportunityCardData }) {
  const o = opportunity;
  return (
    <Card className="group border-zinc-200 p-5 shadow-none transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {o.isNew && (
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                Newly discovered
              </Badge>
            )}
            <Badge variant="outline" className="text-zinc-600">
              {CATEGORY_LABELS[o.category as Category] ?? o.category}
            </Badge>
            {!o.eligible && (
              <Badge variant="outline" className="border-red-200 text-red-600">
                Not eligible
              </Badge>
            )}
          </div>
          <h3 className="truncate text-base font-semibold text-zinc-900">{o.name}</h3>
          <p className="text-sm text-zinc-500">{o.organization}</p>
        </div>
        <Badge className={`shrink-0 ${recBadgeVariant[o.recommendation]}`}>
          {RECOMMENDATION_LABELS[o.recommendation]}
        </Badge>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-zinc-600">{o.description}</p>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-500">
        <span>Deadline: {formatDeadline(o.deadline)}</span>
        <span>{teamModeLabel(o.individualAllowed, o.teamAllowed)}</span>
        {o.prizeDescription && <span className="truncate">{o.prizeDescription}</span>}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <ScoreBar kind="difficulty" score={o.difficultyScore} size="sm" />
        <ScoreBar kind="fit" score={o.fitScore} size="sm" />
        <ScoreBar kind="value" score={o.valueScore} size="sm" />
      </div>

      <div className="mt-5 flex items-center gap-2">
        <Button
          render={<Link href={`/opportunities/${o.id}`} />}
          nativeButton={false}
          size="sm"
          className="flex-1"
        >
          View details
        </Button>
        <SaveButton opportunityId={o.id} initialSaved={o.isSaved} />
      </div>
    </Card>
  );
}
