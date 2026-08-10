// Single source of truth for the string "enums" SQLite can't enforce
// natively (see the note at the top of prisma/schema.prisma). Keep this in
// sync with apps/scraper/app/utils/enums.py.

export const CATEGORIES = [
  "research",
  "olympiad",
  "essay",
  "entrepreneurship",
  "innovation",
  "environment",
  "fellowship",
  "summer_program",
  "internship",
  "hackathon",
  "scholarship",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  research: "Research",
  olympiad: "Olympiad",
  essay: "Essay",
  entrepreneurship: "Entrepreneurship",
  innovation: "Innovation",
  environment: "Environment",
  fellowship: "Fellowship",
  summer_program: "Summer Program",
  internship: "Internship",
  hackathon: "Hackathon",
  scholarship: "Scholarship",
  other: "Other",
};

export const INTERESTS = [
  "science",
  "engineering",
  "computer_science",
  "ai",
  "mathematics",
  "physics",
  "chemistry",
  "biology",
  "environment",
  "economics",
  "finance",
  "entrepreneurship",
  "writing",
  "debate_policy",
  "research",
  "social_impact",
] as const;
export type Interest = (typeof INTERESTS)[number];

export const INTEREST_LABELS: Record<Interest, string> = {
  science: "Science",
  engineering: "Engineering",
  computer_science: "Computer Science",
  ai: "AI",
  mathematics: "Mathematics",
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
  environment: "Environment",
  economics: "Economics",
  finance: "Finance",
  entrepreneurship: "Entrepreneurship",
  writing: "Writing",
  debate_policy: "Debate/Policy",
  research: "Research",
  social_impact: "Social Impact",
};

export const TEAM_PREFERENCES = ["individual", "team", "either"] as const;
export type TeamPreference = (typeof TEAM_PREFERENCES)[number];

export const OPPORTUNITY_STATUSES = [
  "open",
  "upcoming",
  "closed",
  "results_announced",
  "unknown",
] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

export const USER_STATES = ["interested", "doing", "completed", "skipped"] as const;
export type UserState = (typeof USER_STATES)[number];

export const USER_STATE_LABELS: Record<UserState, string> = {
  interested: "Interested",
  doing: "Doing",
  completed: "Completed",
  skipped: "Skipped",
};

export const RECOMMENDATIONS = ["do_it", "consider", "skip"] as const;
export type Recommendation = (typeof RECOMMENDATIONS)[number];

export const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  do_it: "DO IT",
  consider: "CONSIDER",
  skip: "SKIP",
};
