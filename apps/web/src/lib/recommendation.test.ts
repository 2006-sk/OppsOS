import { describe, expect, it } from "vitest";
import { computeRecommendation } from "@/lib/recommendation";

describe("computeRecommendation", () => {
  it("skips ineligible opportunities regardless of scores", () => {
    expect(
      computeRecommendation({ eligible: false, deadlinePassed: false, fitScore: 100, valueScore: 100 })
    ).toBe("skip");
  });

  it("skips when the deadline has passed", () => {
    expect(
      computeRecommendation({ eligible: true, deadlinePassed: true, fitScore: 90, valueScore: 90 })
    ).toBe("skip");
  });

  it("recommends do_it when fit and value are both strong", () => {
    expect(
      computeRecommendation({ eligible: true, deadlinePassed: false, fitScore: 75, valueScore: 80 })
    ).toBe("do_it");
  });

  it("recommends consider when value is strong but fit is not", () => {
    expect(
      computeRecommendation({ eligible: true, deadlinePassed: false, fitScore: 40, valueScore: 60 })
    ).toBe("consider");
  });

  it("skips low value, low fit opportunities", () => {
    expect(
      computeRecommendation({ eligible: true, deadlinePassed: false, fitScore: 30, valueScore: 20 })
    ).toBe("skip");
  });

  it("is exactly at the do_it boundary at 70/70", () => {
    expect(
      computeRecommendation({ eligible: true, deadlinePassed: false, fitScore: 70, valueScore: 70 })
    ).toBe("do_it");
  });
});
