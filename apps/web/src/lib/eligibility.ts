import type { Opportunity, Profile } from "@prisma/client";
import type { EligibilityStatus } from "@/lib/enums";

export interface EligibilityResult {
  status: EligibilityStatus;
  // For ineligible: the specific disqualifying fact. For unverified: what
  // couldn't be confirmed. For eligible: the confirming facts (or, if the
  // opportunity states no restriction at all, a note saying so).
  reasons: string[];
}

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  return [];
}

function ineligible(reason: string): EligibilityResult {
  return { status: "ineligible", reasons: [reason] };
}

function computeAge(dateOfBirth: Date | null, now: Date = new Date()): number | null {
  if (!dateOfBirth) return null;
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = now.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }
  return age;
}

/**
 * Deterministic eligibility gate, evaluated per (profile, opportunity) at
 * read time — same tier as fitScore, never stored on Opportunity. This is
 * intentionally separate from src/lib/fit.ts: eligibility is a hard gate,
 * not a ranking input, and must never be compensated for by a high fit or
 * value score. "Never invent facts" applies here too — we only conclude
 * ineligible/eligible from what was actually extracted; anything we cannot
 * confirm from the profile against a stated requirement is "unverified",
 * not silently assumed either way.
 */
export function evaluateEligibility(profile: Profile, opportunity: Opportunity): EligibilityResult {
  const unverifiedReasons: string[] = [];
  const passReasons: string[] = [];

  // --- Education level -----------------------------------------------
  const educationLevels = parseJsonArray(opportunity.educationLevels);
  if (educationLevels.length > 0 && !educationLevels.includes(profile.educationLevel)) {
    return ineligible(
      `Open to ${educationLevels.join(", ")}, not ${profile.educationLevel.replace(/_/g, " ")}.`
    );
  }

  // A stated grade range implies a school-targeted opportunity. If the
  // profile isn't school-level and the opportunity didn't separately
  // confirm undergraduates are welcome, that's a real mismatch.
  const targetsSchoolGrades = opportunity.minGrade != null || opportunity.maxGrade != null;
  const isSchoolProfile = profile.educationLevel === "middle_school" || profile.educationLevel === "high_school";
  if (targetsSchoolGrades && !isSchoolProfile && !educationLevels.includes(profile.educationLevel)) {
    const range = [opportunity.minGrade, opportunity.maxGrade].filter((g) => g != null).join("–");
    return ineligible(`This is for school students (grade ${range}); you're ${profile.educationLevel.replace(/_/g, " ")}.`);
  }

  // --- Grade gate -------------------------------------------------------
  if (profile.grade != null) {
    if (opportunity.minGrade != null && profile.grade < opportunity.minGrade) {
      return ineligible(`Requires grade ${opportunity.minGrade}+, you're in grade ${profile.grade}.`);
    }
    if (opportunity.maxGrade != null && profile.grade > opportunity.maxGrade) {
      return ineligible(`Limited to grade ${opportunity.maxGrade} and below, you're in grade ${profile.grade}.`);
    }
    if (targetsSchoolGrades) {
      passReasons.push(`grade ${profile.grade} is within the eligible range`);
    }
  } else if (targetsSchoolGrades && isSchoolProfile) {
    unverifiedReasons.push("could not confirm your grade against this opportunity's grade requirement");
  }

  // --- Age gate -----------------------------------------------------------
  const age = computeAge(profile.dateOfBirth);
  const targetsAge = opportunity.minAge != null || opportunity.maxAge != null;
  if (age != null) {
    if (opportunity.minAge != null && age < opportunity.minAge) {
      return ineligible(`Requires age ${opportunity.minAge}+, you're ${age}.`);
    }
    if (opportunity.maxAge != null && age > opportunity.maxAge) {
      return ineligible(`Limited to age ${opportunity.maxAge} and under, you're ${age}.`);
    }
    if (targetsAge) passReasons.push(`age ${age} is within the eligible range`);
  } else if (targetsAge) {
    unverifiedReasons.push("could not confirm your age (add your date of birth) against this opportunity's age requirement");
  }

  // --- Country / citizenship ----------------------------------------------
  const eligibleCountries = parseJsonArray(opportunity.eligibleCountries);
  if (opportunity.countryScope === "country_specific" && eligibleCountries.length > 0) {
    const match = eligibleCountries.some((c) => c.toLowerCase() === profile.country.toLowerCase());
    if (!match) return ineligible(`Only open to: ${eligibleCountries.join(", ")}.`);
    passReasons.push(`open to your country (${profile.country})`);
  }

  // citizenshipRequirements is checked against profile.country as a proxy —
  // onboarding does not yet collect citizenship separately from
  // country/residence, so this can't distinguish the two.
  const citizenshipRequirements = parseJsonArray(opportunity.citizenshipRequirements);
  if (citizenshipRequirements.length > 0) {
    const match = citizenshipRequirements.some((c) => c.toLowerCase() === profile.country.toLowerCase());
    if (!match) return ineligible(`Restricted to citizens of: ${citizenshipRequirements.join(", ")}.`);
  }

  // --- Nomination gates -----------------------------------------------
  // These can't be resolved from the profile at all — only the student's
  // school/institution can confirm them.
  if (opportunity.schoolNominationRequired) {
    unverifiedReasons.push("requires nomination by your school — check with your counselor");
  }
  if (opportunity.institutionNominationRequired) {
    unverifiedReasons.push("requires nomination by your institution");
  }

  if (unverifiedReasons.length > 0) {
    return { status: "unverified", reasons: unverifiedReasons };
  }

  return {
    status: "eligible",
    reasons: passReasons.length > 0 ? passReasons : ["no stated grade, age, or country restriction found"],
  };
}
