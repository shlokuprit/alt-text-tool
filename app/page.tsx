import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrInitCredits } from "@/lib/credits";
import { SignInButton } from "./sign-in-button";
import { UploadTool } from "./upload-tool";
import { Faq } from "./faq";
import { IdentifyUser } from "./posthog-provider";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ auth_error?: string; payment?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const params = await searchParams;
  const authError = params.auth_error;
  const paymentSuccess = params.payment === "success";

  let daily = 0;
  let paid = 0;
  if (user) {
    const state = await getOrInitCredits(user.id);
    daily = state.daily;
    paid = state.paid;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {user && <IdentifyUser userId={user.id} email={user.email} />}
      <main className="mx-auto max-w-2xl px-6 py-12 sm:py-20">
        <header className="mb-10 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              AI alt text for bloggers
            </h1>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              Upload an image. Get accessibility-friendly alt text in under 3
              seconds. Free 3 per day, $9 for 500 more.
            </p>
          </div>
          {user && (
            <form action="/auth/sign-out" method="post">
              <button
                type="submit"
                className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Sign out
              </button>
            </form>
          )}
        </header>

        {authError && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 px-4 py-3 text-sm"
          >
            Sign-in error: {authError}
          </div>
        )}

        {!user ? (
          <>
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center">
              <p className="text-zinc-700 dark:text-zinc-300 mb-6">
                Sign in to start. Free tier: 3 images per day.
              </p>
              <SignInButton />
              <p className="mt-4 text-xs text-zinc-500">
                We only read your email and name. No spam.
              </p>
            </div>

            <section className="mt-12">
              <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 mb-4">
                How it works
              </h2>
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="font-mono text-zinc-500 shrink-0">1.</span>
                  <span>Drop a blog image (JPG, PNG, WebP, GIF, or HEIC).</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-zinc-500 shrink-0">2.</span>
                  <span>
                    AI generates concise alt text following accessibility best
                    practices (under 125 chars, no &quot;image of&quot; prefix,
                    captures readable text).
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-zinc-500 shrink-0">3.</span>
                  <span>
                    Copy it into WordPress, Shopify, Ghost, or wherever your
                    images live.
                  </span>
                </li>
              </ol>
            </section>
          </>
        ) : (
          <UploadTool
            initialDaily={daily}
            initialPaid={paid}
            showPaymentSuccess={paymentSuccess}
          />
        )}

        <Faq />

        <footer className="mt-16 pt-8 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p>
              Built by{" "}
              <a
                href="https://github.com/shlokuprit"
                className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                target="_blank"
                rel="noopener"
              >
                @shlokuprit
              </a>{" "}
              &middot; Powered by Gemini 2.0 Flash
            </p>
            <nav className="flex gap-4">
              <a
                href="/privacy"
                className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                Privacy
              </a>
              <a
                href="/terms"
                className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                Terms
              </a>
              <a
                href="/contact"
                className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                Contact
              </a>
            </nav>
          </div>
        </footer>
      </main>
    </div>
  );
}
