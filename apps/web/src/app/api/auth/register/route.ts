import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createSessionToken, hashPassword, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/auth";
import { registerSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const userCount = await prisma.user.count();
  const user = await prisma.user.create({
    data: { email, passwordHash, isAdmin: userCount === 0 },
  });

  const token = await createSessionToken(user.id);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);

  return NextResponse.json({ ok: true });
}
