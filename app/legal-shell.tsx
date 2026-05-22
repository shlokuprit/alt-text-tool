import Link from "next/link";

export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <main className="mx-auto max-w-2xl px-6 py-12 sm:py-16">
        <Link
          href="/"
          className="inline-block text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors mb-8"
        >
          ← Back
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-zinc-500">Last updated: {updated}</p>
        <div className="prose-sm mt-8 space-y-6 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          {children}
        </div>
        <footer className="mt-16 pt-8 border-t border-zinc-200 dark:border-zinc-800 flex justify-between text-xs text-zinc-500">
          <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
            AI Alt-Text Generator
          </Link>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Contact
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}

export function Section({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
        {heading}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
