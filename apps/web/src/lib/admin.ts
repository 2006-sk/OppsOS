import "server-only";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function requireAdminApi() {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" as const, status: 401 as const, user: null };
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user?.isAdmin) return { error: "Forbidden" as const, status: 403 as const, user: null };
  return { error: null, status: 200 as const, user };
}
