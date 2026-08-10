import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi();
  if (admin.error) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason : null;

  const candidate = await prisma.discoveryCandidate.findUnique({ where: { id } });
  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.discoveryCandidate.update({
    where: { id },
    data: { state: "rejected", reason, reviewedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
