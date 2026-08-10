import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi();
  if (admin.error) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason : "Marked as duplicate";

  const candidate = await prisma.discoveryCandidate.findUnique({ where: { id } });
  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // A duplicate's own draft opportunity (if any) never needs to go live —
  // it was created unpublished and stays that way; delete it to keep the
  // opportunities table free of near-duplicate rows.
  await prisma.$transaction(async (tx) => {
    if (candidate.opportunityId) {
      await tx.opportunity.deleteMany({ where: { id: candidate.opportunityId, published: false } });
    }
    await tx.discoveryCandidate.update({
      where: { id },
      data: { state: "duplicate", reason, reviewedAt: new Date(), opportunityId: null },
    });
  });

  return NextResponse.json({ ok: true });
}
