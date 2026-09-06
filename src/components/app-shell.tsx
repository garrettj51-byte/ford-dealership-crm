import Link from "next/link";
import { Search } from "lucide-react";
import { UserSwitcher } from "@/components/user-switcher";
import { Toaster } from "@/components/toaster";

type Person = { id: string; name: string };

export function AppShell({
  people,
  currentUser,
  children,
}: {
  people: Person[];
  currentUser: Person;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col bg-[var(--app-bg)]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[var(--ford-navy)] text-white">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
          <Link href="/" className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold tracking-[0.22em] text-white/70">
              JESS FORD
            </div>
            <div className="text-base font-semibold leading-tight tracking-tight">
              Floor CRM
            </div>
          </Link>
          <Link
            href="/search"
            aria-label="Search leads"
            className="inline-flex size-9 items-center justify-center rounded-lg text-white/90 hover:bg-white/10"
          >
            <Search className="size-5" />
          </Link>
          <UserSwitcher people={people} currentUserId={currentUser.id} />
        </div>
        <div className="bg-[#001a3a] px-4 py-1 text-center text-[11px] text-white/65">
          Demo auth — pick who you are. Not for production.
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        {children}
      </main>
      <Toaster />
    </div>
  );
}
