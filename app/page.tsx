"use client";

import { useEffect, useRef, useState } from "react";

const MAX_BYTES = 4 * 1024 * 1024;

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [altText, setAltText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <main className="mx-auto max-w-2xl px-6 py-12 sm:py-20">
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            AI Alt-Text Generator
          </h1>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            Drop an image, get accessibility-compliant alt text in seconds.
            Free.
          </p>
        </header>

        {!file && (
          <label
            htmlFor="file"
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-6 py-16 cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors"
          >
            <span className="text-base font-medium">Click to choose an image</span>
            <span className="text-sm text-zinc-500">
              JPG, PNG, WebP, GIF, HEIC &middot; up to 4MB
            </span>
            <input
              ref={inputRef}
              id="file"
              type="file"
              accept="image/*"
              className="hidden"
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
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Generating…" : "Generate alt text"}
              </button>
              <button
                onClick={reset}
                disabled={loading}
                className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 font-medium disabled:opacity-50"
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
                className="px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
              <button
                onClick={generate}
                disabled={loading}
                className="px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                Regenerate
              </button>
              <span className="ml-auto text-zinc-500">
                {altText.length} chars
              </span>
            </div>
          </div>
        )}

        <footer className="mt-16 text-center text-xs text-zinc-500">
          Powered by Gemini 2.5 Flash &middot; built with Next.js
        </footer>
      </main>
    </div>
  );
}
