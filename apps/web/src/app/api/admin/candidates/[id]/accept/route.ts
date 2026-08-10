import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi();
  if (admin.error) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const { id } = await params;
  const candidate = await prisma.discoveryCandidate.findUnique({ where: { id } });
  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!candidate.opportunityId) {
    return NextResponse.json(
      { error: "This candidate has no extracted opportunity to publish yet." },
      { status: 409 }
    );
  }

  await prisma.$transaction([
    prisma.opportunity.update({ where: { id: candidate.opportunityId }, data: { published: true } }),
    prisma.discoveryCandidate.update({
      where: { id },
      data: { state: "accepted", reviewedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
