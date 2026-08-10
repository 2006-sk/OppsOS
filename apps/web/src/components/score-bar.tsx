import { barFilledSegments, difficultyLabel, fitLabel, valueLabel } from "@/lib/scoring";

type Kind = "difficulty" | "fit" | "value";

const KIND_META: Record<
  Kind,
  { title: string; labelFn: (score: number) => string; colors: Record<string, string> }
> = {
  difficulty: {
    title: "Difficulty",
    labelFn: difficultyLabel,
    colors: {
      EASY: "bg-zinc-300",
      MEDIUM: "bg-amber-400",
      HARD: "bg-orange-500",
      EXTREME: "bg-red-600",
    },
  },
  fit: {
    title: "Fit",
    labelFn: fitLabel,
    colors: {
      POOR: "bg-zinc-300",
      OKAY: "bg-zinc-400",
      GOOD: "bg-emerald-400",
      GREAT: "bg-emerald-600",
    },
  },
  value: {
    title: "Value",
    labelFn: valueLabel,
    colors: {
      LOW: "bg-zinc-300",
      MEDIUM: "bg-zinc-400",
      HIGH: "bg-amber-500",
      EXCEPTIONAL: "bg-violet-600",
    },
  },
};

export function ScoreBar({
  kind,
  score,
  segments = 10,
  showTitle = true,
  size = "md",
}: {
  kind: Kind;
  score: number;
  segments?: number;
  showTitle?: boolean;
  size?: "sm" | "md";
}) {
  const meta = KIND_META[kind];
  const label = meta.labelFn(score);
  const filled = barFilledSegments(score, segments);
  const color = meta.colors[label];
  const segHeight = size === "sm" ? "h-1.5" : "h-2";

  return (
    <div className="space-y-1">
      {showTitle && (
        <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
          <span>{meta.title}</span>
          <span className="tracking-wide text-zinc-700">{label}</span>
        </div>
      )}
      <div className="flex gap-0.5" role="img" aria-label={`${meta.title}: ${label}`}>
        {Array.from({ length: segments }, (_, i) => (
          <div
            key={i}
            className={`flex-1 rounded-sm ${segHeight} ${i < filled ? color : "bg-zinc-150 bg-zinc-100"}`}
          />
        ))}
      </div>
    </div>
  );
}
