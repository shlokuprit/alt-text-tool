"use client";

import { useEffect, useRef, useState } from "react";
import { captureEvent } from "./posthog-provider";

const MAX_BYTES = 4 * 1024 * 1024;

type Props = {
  initialDaily: number;
  initialPaid: number;
  showPaymentSuccess: boolean;
};

export function UploadTool({
  initialDaily,
  initialPaid,
  showPaymentSuccess,
}: Props) {
  const [daily, setDaily] = useState(initialDaily);
  const [paid, setPaid] = useState(initialPaid);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [altText, setAltText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [buying, setBuying] = useState(false);
  const [successBanner, setSuccessBanner] = useState(showPaymentSuccess);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function reset() {
    setFile(null);
    setAltText(null);
    setError(null);
    setCopied(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleFile(f: File | undefined | null) {
    setError(null);
    setAltText(null);
    setCopied(false);
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Please pick an image file (JPG, PNG, WebP, GIF, HEIC).");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("Image must be under 4MB.");
      return;
    }
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  }

  async function generate() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setAltText(null);
    setCopied(false);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/generate", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setAltText(data.altText);
      if (data.credits) {
        setDaily(data.credits.daily);
        setPaid(data.credits.paid);
      }
      captureEvent("alt_text_generated", {
        chars: data.altText?.length ?? 0,
        file_type: file.type,
        used_paid_credit: daily <= 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
      captureEvent("alt_text_generation_failed", {
        message: e instanceof Error ? e.message : "unknown",
      });
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!altText) return;
    try {
      await navigator.clipboard.writeText(altText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Couldn't copy to clipboard.");
    }
  }

  async function buyCredits() {
    setBuying(true);
    setError(null);
    captureEvent("checkout_started");
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setBuying(false);
    }
  }

  const totalCredits = daily + paid;
  const outOfCredits = totalCredits <= 0;

  return (
    <>
      {successBanner && (
        <div className="mb-6 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 px-4 py-3 text-sm flex items-center justify-between gap-3">
          <span>
            Payment received. Your credits should appear within ~30 seconds.
          </span>
          <button
            onClick={() => setSuccessBanner(false)}
            className="text-emerald-700 dark:text-emerald-300 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mb-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-zinc-600 dark:text-zinc-400">Credits</span>
          <span className="font-mono font-semibold">
            {totalCredits} total
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
          <span>{daily} free today · {paid} paid</span>
          <button
            onClick={buyCredits}
            disabled={buying}
            className="text-zinc-700 dark:text-zinc-300 underline-offset-2 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline disabled:opacity-50"
          >
            {buying ? "Opening checkout…" : "Buy 500 credits — $9"}
          </button>
        </div>
      </div>

      {!file && (
        <label
          htmlFor="file"
          className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-6 py-16 ${outOfCredits ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-500"} transition-colors`}
        >
          <span className="text-base font-medium">
            {outOfCredits
              ? "No credits — buy more to keep going"
              : "Click to choose an image"}
          </span>
          <span className="text-sm text-zinc-500">
            {outOfCredits
              ? "Free credits refill at 00:00 UTC."
              : "JPG, PNG, WebP, GIF, HEIC · up to 4MB"}
          </span>
          <input
            ref={inputRef}
            id="file"
            type="file"
            accept="image/*"
            className="hidden"
            disabled={outOfCredits}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
      )}

      {file && previewUrl && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Preview"
            className="max-h-80 w-full object-contain rounded-lg bg-zinc-100 dark:bg-zinc-800"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={generate}
              disabled={loading || outOfCredits}
              className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-zinc-900 dark:disabled:hover:bg-zinc-100"
            >
              {loading ? "Generating…" : "Generate alt text"}
            </button>
            <button
              onClick={reset}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
            >
              Choose different image
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 px-4 py-3 text-sm"
        >
          {error}
        </div>
      )}

      {altText && (
        <div className="mt-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">
            Generated alt text
          </div>
          <p className="text-lg leading-snug">{altText}</p>
          <div className="mt-4 flex items-center gap-3 text-sm">
            <button
              onClick={copy}
              className="px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
            <button
              onClick={generate}
              disabled={loading || outOfCredits}
              className="px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
            >
              Regenerate
            </button>
            <span className="ml-auto text-zinc-500">
              {altText.length} chars
            </span>
          </div>
        </div>
      )}
    </>
  );
}
