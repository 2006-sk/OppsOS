import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function NavBar() {
  const session = await getSession();
  const isAdmin = session
    ? Boolean((await prisma.user.findUnique({ where: { id: session.userId }, select: { isAdmin: true } }))?.isAdmin)
    : false;

  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/opportunities" className="text-sm font-semibold tracking-tight text-zinc-900">
            Opportunity OS
          </Link>
          <nav className="flex items-center gap-5 text-sm text-zinc-600">
            <Link href="/opportunities" className="hover:text-zinc-900">
              Opportunities
            </Link>
            <Link href="/saved" className="hover:text-zinc-900">
              Saved
            </Link>
            {isAdmin && (
              <Link href="/admin/review" className="hover:text-zinc-900">
                Admin
              </Link>
            )}
          </nav>
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
