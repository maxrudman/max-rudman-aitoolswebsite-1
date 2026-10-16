import { NavBar } from "@/components/NavBar";
import { requireUser } from "@/lib/auth";

// Every page in this group requires a signed-in user.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:shadow">
        Skip to content
      </a>
      <NavBar username={user.username} />
      <main id="main" className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
    </>
  );
}
