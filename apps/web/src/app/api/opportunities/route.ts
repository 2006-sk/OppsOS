import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { listOpportunitiesForUser, type OpportunityFilters } from "@/lib/db/opportunities";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { userId: session.userId } });
  if (!profile) return NextResponse.json({ error: "Profile required" }, { status: 409 });

  const sp = request.nextUrl.searchParams;
  const filters: OpportunityFilters = {
    search: sp.get("search") ?? undefined,
    category: sp.get("category") ?? undefined,
    deadlineWindow: (sp.get("deadline") as OpportunityFilters["deadlineWindow"]) ?? undefined,
    difficulty: (sp.get("difficulty") as OpportunityFilters["difficulty"]) ?? undefined,
    team: (sp.get("team") as OpportunityFilters["team"]) ?? undefined,
    freePaid: (sp.get("freePaid") as OpportunityFilters["freePaid"]) ?? undefined,
    eligibleOnly: sp.get("eligibleOnly") === "true",
    saved: (sp.get("saved") as OpportunityFilters["saved"]) ?? undefined,
  };

  const opportunities = await listOpportunitiesForUser(session.userId, profile, filters);
  return NextResponse.json({ opportunities });
}
