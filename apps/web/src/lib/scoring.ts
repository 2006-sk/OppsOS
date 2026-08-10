// Numeric (0-100) internal scores -> user-facing labels + bar fill.
// UI components must import ONLY the label/bar helpers below, never render
// a raw score. Keep thresholds in sync with apps/scraper/app/ranking/labels.py.

export type DifficultyLabel = "EASY" | "MEDIUM" | "HARD" | "EXTREME";
export type FitLabel = "POOR" | "OKAY" | "GOOD" | "GREAT";
export type ValueLabel = "LOW" | "MEDIUM" | "HIGH" | "EXCEPTIONAL";

function bucket<T extends string>(score: number, labels: [T, T, T, T]): T {
  const clamped = Math.max(0, Math.min(100, score));
  if (clamped <= 25) return labels[0];
  if (clamped <= 50) return labels[1];
  if (clamped <= 75) return labels[2];
  return labels[3];
}

export function difficultyLabel(score: number): DifficultyLabel {
  return bucket(score, ["EASY", "MEDIUM", "HARD", "EXTREME"]);
}

export function fitLabel(score: number): FitLabel {
  return bucket(score, ["POOR", "OKAY", "GOOD", "GREAT"]);
}

export function valueLabel(score: number): ValueLabel {
  return bucket(score, ["LOW", "MEDIUM", "HIGH", "EXCEPTIONAL"]);
}

/** Number of filled segments (out of `segments`) for a 0-100 score bar. */
export function barFilledSegments(score: number, segments = 10): number {
  const clamped = Math.max(0, Math.min(100, score));
  return Math.max(1, Math.round((clamped / 100) * segments));
}
