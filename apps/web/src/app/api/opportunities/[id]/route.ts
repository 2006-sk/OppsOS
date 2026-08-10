import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getOpportunityDetail } from "@/lib/db/opportunities";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { userId: session.userId } });
  if (!profile) return NextResponse.json({ error: "Profile required" }, { status: 409 });

  const { id } = await params;
  const opportunity = await getOpportunityDetail(id, session.userId, profile);
  if (!opportunity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ opportunity });
}
