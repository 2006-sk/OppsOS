import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const opportunity = await prisma.opportunity.findUnique({ where: { id } });
  if (!opportunity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.userOpportunityState.findUnique({
    where: { userId_opportunityId: { userId: session.userId, opportunityId: id } },
  });

  const state = await prisma.userOpportunityState.upsert({
    where: { userId_opportunityId: { userId: session.userId, opportunityId: id } },
    create: { userId: session.userId, opportunityId: id, saved: true, status: "interested" },
    update: { saved: !(existing?.saved ?? false) },
  });

  return NextResponse.json({ saved: state.saved, status: state.status });
}
