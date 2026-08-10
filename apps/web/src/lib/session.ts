import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export async function getSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.userId },
    include: { profile: true },
  });
}

/** Redirects to /login if unauthenticated. Use in server components/pages. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Redirects to /onboarding if the user hasn't completed their profile yet. */
export async function requireProfile() {
  const user = await requireUser();
  if (!user.profile) redirect("/onboarding");
  return { user, profile: user.profile };
}

/** Redirects non-admins away. Use at the top of every /admin page. */
export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/opportunities");
  return user;
}
