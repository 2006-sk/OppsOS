import { z } from "zod";
import { CATEGORIES, EDUCATION_LEVELS, INTERESTS, TEAM_PREFERENCES } from "@/lib/enums";

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const profileSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    educationLevel: z.enum(EDUCATION_LEVELS),
    // Only meaningful for middle_school/high_school — enforced below since
    // it depends on educationLevel.
    grade: z.coerce.number().int().min(1).max(12).optional().nullable(),
    dateOfBirth: z.coerce.date().optional().nullable(),
    // Only meaningful for undergraduate.
    collegeYear: z.coerce.number().int().min(1).max(7).optional().nullable(),
    major: z.string().trim().max(200).optional().nullable(),
    country: z.string().trim().min(1).max(100),
    state: z.string().trim().max(100).optional().nullable(),
    city: z.string().trim().max(100).optional().nullable(),
    school: z.string().trim().max(200).optional().nullable(),
    interests: z.array(z.enum(INTERESTS)).min(1, "Pick at least one interest"),
    preferredCategories: z.array(z.enum(CATEGORIES)).min(1, "Pick at least one category"),
    teamPreference: z.enum(TEAM_PREFERENCES),
    hoursPerWeek: z.coerce.number().int().min(0).max(80),
    budgetMin: z.coerce.number().int().min(0).optional().nullable(),
    budgetMax: z.coerce.number().int().min(0).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const isSchool = data.educationLevel === "middle_school" || data.educationLevel === "high_school";
    if (isSchool && data.grade == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["grade"],
        message: "Grade is required for middle/high school students.",
      });
    }
    if (data.educationLevel === "undergraduate" && data.collegeYear == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["collegeYear"],
        message: "College year is required for undergraduates.",
      });
    }
  });

export const statusUpdateSchema = z.object({
  status: z.enum(["interested", "doing", "completed", "skipped"]),
});
