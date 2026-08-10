import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { statusUpdateSchema } from "@/lib/validators";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = statusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { id } = await params;
  const opportunity = await prisma.opportunity.findUnique({ where: { id } });
  if (!opportunity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const state = await prisma.userOpportunityState.upsert({
    where: { userId_opportunityId: { userId: session.userId, opportunityId: id } },
    create: { userId: session.userId, opportunityId: id, saved: true, status: parsed.data.status },
    update: { status: parsed.data.status, saved: true },
  });

  return NextResponse.json({ status: state.status, saved: state.saved });
}
