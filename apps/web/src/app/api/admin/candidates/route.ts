import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";

export async function GET(request: NextRequest) {
  const admin = await requireAdminApi();
  if (admin.error) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const state = request.nextUrl.searchParams.get("state") ?? "pending";
  const candidates = await prisma.discoveryCandidate.findMany({
    where: state === "all" ? {} : { state },
    include: { opportunity: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ candidates });
}
