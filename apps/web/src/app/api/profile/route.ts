import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { profileSchema } from "@/lib/validators";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { userId: session.userId } });
  return NextResponse.json({ profile });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const profile = await prisma.profile.upsert({
    where: { userId: session.userId },
    create: {
      userId: session.userId,
      name: data.name,
      educationLevel: data.educationLevel,
      grade: data.grade ?? null,
      dateOfBirth: data.dateOfBirth ?? null,
      collegeYear: data.collegeYear ?? null,
      major: data.major ?? null,
      country: data.country,
      state: data.state ?? null,
      city: data.city ?? null,
      school: data.school ?? null,
      interests: data.interests,
      preferredCategories: data.preferredCategories,
      teamPreference: data.teamPreference,
      hoursPerWeek: data.hoursPerWeek,
      budgetMin: data.budgetMin ?? null,
      budgetMax: data.budgetMax ?? null,
    },
    update: {
      name: data.name,
      educationLevel: data.educationLevel,
      grade: data.grade ?? null,
      dateOfBirth: data.dateOfBirth ?? null,
      collegeYear: data.collegeYear ?? null,
      major: data.major ?? null,
      country: data.country,
      state: data.state ?? null,
      city: data.city ?? null,
      school: data.school ?? null,
      interests: data.interests,
      preferredCategories: data.preferredCategories,
      teamPreference: data.teamPreference,
      hoursPerWeek: data.hoursPerWeek,
      budgetMin: data.budgetMin ?? null,
      budgetMax: data.budgetMax ?? null,
    },
  });

  return NextResponse.json({ profile });
}
