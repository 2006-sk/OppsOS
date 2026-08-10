import { describe, expect, it } from "vitest";
import { barFilledSegments, difficultyLabel, fitLabel, valueLabel } from "@/lib/scoring";

describe("difficultyLabel", () => {
  it("maps score ranges to labels at boundaries", () => {
    expect(difficultyLabel(0)).toBe("EASY");
    expect(difficultyLabel(25)).toBe("EASY");
    expect(difficultyLabel(26)).toBe("MEDIUM");
    expect(difficultyLabel(50)).toBe("MEDIUM");
    expect(difficultyLabel(51)).toBe("HARD");
    expect(difficultyLabel(75)).toBe("HARD");
    expect(difficultyLabel(76)).toBe("EXTREME");
    expect(difficultyLabel(100)).toBe("EXTREME");
  });

  it("clamps out-of-range scores", () => {
    expect(difficultyLabel(-50)).toBe("EASY");
    expect(difficultyLabel(500)).toBe("EXTREME");
  });
});

describe("fitLabel", () => {
  it("maps score ranges to labels", () => {
    expect(fitLabel(10)).toBe("POOR");
    expect(fitLabel(40)).toBe("OKAY");
    expect(fitLabel(60)).toBe("GOOD");
    expect(fitLabel(90)).toBe("GREAT");
  });
});

describe("valueLabel", () => {
  it("maps score ranges to labels", () => {
    expect(valueLabel(10)).toBe("LOW");
    expect(valueLabel(40)).toBe("MEDIUM");
    expect(valueLabel(60)).toBe("HIGH");
    expect(valueLabel(90)).toBe("EXCEPTIONAL");
  });
});

describe("barFilledSegments", () => {
  it("fills proportionally to score out of 10 segments", () => {
    expect(barFilledSegments(0)).toBe(1); // never fully empty
    expect(barFilledSegments(50)).toBe(5);
    expect(barFilledSegments(100)).toBe(10);
  });
});
