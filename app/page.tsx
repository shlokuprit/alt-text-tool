import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrInitCredits } from "@/lib/credits";
import { SignInButton } from "./sign-in-button";
import { UploadTool } from "./upload-tool";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ auth_error?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const params = await searchParams;
  const authError = params.auth_error;

  let credits = 0;
  if (user) {
    const state = await getOrInitCredits(user.id);
    credits = state.credits_remaining;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <main className="mx-auto max-w-2xl px-6 py-12 sm:py-20">
        <header className="mb-10 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              AI Alt-Text Generator
            </h1>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              Drop an image, get accessibility-compliant alt text in seconds.
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
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center">
            <p className="text-zinc-700 dark:text-zinc-300 mb-6">
              Sign in to generate alt text. Free tier: 3 images per day.
            </p>
            <SignInButton />
            <p className="mt-4 text-xs text-zinc-500">
              We only read your email and name. No spam.
            </p>
          </div>
        ) : (
          <UploadTool initialCredits={credits} />
        )}

        <footer className="mt-16 text-center text-xs text-zinc-500">
          Powered by Gemini 2.5 Flash &middot; built with Next.js
        </footer>
      </main>
    </div>
  );
}
