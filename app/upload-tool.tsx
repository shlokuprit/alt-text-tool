"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { captureEvent } from "./posthog-provider";

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_FILES = 50;

type ItemStatus = "pending" | "processing" | "done" | "error" | "skipped";

type QueueItem = {
  id: string;
  file: File;
  previewUrl: string;
  status: ItemStatus;
  altText?: string;
  error?: string;
};

type Props = {
  initialDaily: number;
  initialPaid: number;
  showPaymentSuccess: boolean;
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function csvEscape(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function UploadTool({
  initialDaily,
  initialPaid,
  showPaymentSuccess,
}: Props) {
  const [daily, setDaily] = useState(initialDaily);
  const [paid, setPaid] = useState(initialPaid);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [stopRequested, setStopRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [successBanner, setSuccessBanner] = useState(showPaymentSuccess);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const stopRequestedRef = useRef(false);

  useEffect(() => {
    stopRequestedRef.current = stopRequested;
  }, [stopRequested]);

  useEffect(() => {
    return () => {
      items.forEach((it) => URL.revokeObjectURL(it.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalCredits = daily + paid;
  const pendingCount = items.filter((i) => i.status === "pending").length;
  const doneCount = items.filter((i) => i.status === "done").length;
  const errorCount = items.filter((i) => i.status === "error").length;
  const skippedCount = items.filter((i) => i.status === "skipped").length;

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    setError(null);
    const incoming: QueueItem[] = [];
    const errors: string[] = [];
    const slotsLeft = MAX_FILES - items.length;
    const candidates = Array.from(fileList).slice(0, slotsLeft);
    if (fileList.length > slotsLeft) {
      errors.push(
        `Max ${MAX_FILES} images at a time. ${fileList.length - slotsLeft} skipped.`,
      );
    }
    for (const file of candidates) {
      if (!file.type.startsWith("image/")) {
        errors.push(`${file.name}: not an image`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        errors.push(`${file.name}: over 4MB`);
        continue;
      }
      incoming.push({
        id: makeId(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: "pending",
      });
    }
    if (incoming.length) {
      setItems((prev) => [...prev, ...incoming]);
    }
    if (errors.length) setError(errors.join(" · "));
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  }

  function clearAll() {
    items.forEach((it) => URL.revokeObjectURL(it.previewUrl));
    setItems([]);
    setError(null);
  }

  function setItemStatus(
    id: string,
    patch: Partial<Omit<QueueItem, "id" | "file" | "previewUrl">>,
  ) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  async function processAll() {
    if (processing) return;
    if (totalCredits <= 0) {
      setError("No credits left. Free credits refill at 00:00 UTC.");
      return;
    }
    setError(null);
    setProcessing(true);
    setStopRequested(false);
    stopRequestedRef.current = false;
    captureEvent("bulk_generation_started", {
      count: items.filter((i) => i.status === "pending").length,
    });

    let processedCount = 0;
    let errorCountLocal = 0;

    for (const item of items) {
      if (stopRequestedRef.current) break;
      if (item.status !== "pending") continue;

      setItemStatus(item.id, { status: "processing", error: undefined });

      try {
        const fd = new FormData();
        fd.append("image", item.file);
        const res = await fetch("/api/generate", { method: "POST", body: fd });
        const data = await res.json();

        if (res.status === 429) {
          setItemStatus(item.id, {
            status: "skipped",
            error: "Out of credits",
          });
          if (data.credits) {
            setDaily(data.credits.daily);
            setPaid(data.credits.paid);
          }
          setItems((prev) =>
            prev.map((it) =>
              it.status === "pending"
                ? { ...it, status: "skipped", error: "Out of credits" }
                : it,
            ),
          );
          setError("Credits ran out — buy more to finish this batch.");
          break;
        }

        if (!res.ok) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        setItemStatus(item.id, { status: "done", altText: data.altText });
        if (data.credits) {
          setDaily(data.credits.daily);
          setPaid(data.credits.paid);
        }
        processedCount++;
        captureEvent("alt_text_generated", {
          chars: data.altText?.length ?? 0,
          file_type: item.file.type,
          mode: "bulk",
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Generation failed";
        setItemStatus(item.id, { status: "error", error: msg });
        errorCountLocal++;
        captureEvent("alt_text_generation_failed", { message: msg });
      }
    }

    setProcessing(false);
    setStopRequested(false);
    captureEvent("bulk_generation_finished", {
      processed: processedCount,
      errors: errorCountLocal,
      stopped: stopRequestedRef.current,
    });
  }

  function stop() {
    setStopRequested(true);
    setItems((prev) =>
      prev.map((it) => (it.status === "processing" ? { ...it } : it)),
    );
  }

  async function copyAll() {
    const lines = items
      .filter((i) => i.status === "done" && i.altText)
      .map((i) => `${i.file.name}: ${i.altText}`);
    if (!lines.length) return;
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
    } catch {
      setError("Couldn't copy to clipboard.");
    }
  }

  function exportCsv() {
    const rows = [
      ["filename", "status", "alt_text", "error"],
      ...items.map((i) => [
        csvEscape(i.file.name),
        i.status,
        csvEscape(i.altText ?? ""),
        csvEscape(i.error ?? ""),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `alt-text-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  const isEmpty = items.length === 0;
  const hasDone = doneCount > 0;
  const hasResults = items.some((i) => i.status === "done" || i.status === "error");

  const summary = useMemo(() => {
    if (processing) {
      const inFlight = items.find((i) => i.status === "processing");
      return inFlight
        ? `Processing ${inFlight.file.name}…`
        : `Processing…`;
    }
    if (isEmpty) return null;
    const parts: string[] = [];
    if (pendingCount) parts.push(`${pendingCount} pending`);
    if (doneCount) parts.push(`${doneCount} done`);
    if (errorCount) parts.push(`${errorCount} error`);
    if (skippedCount) parts.push(`${skippedCount} skipped`);
    return parts.join(" · ");
  }, [processing, items, isEmpty, pendingCount, doneCount, errorCount, skippedCount]);

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
          <span className="text-zinc-600 dark:text-zinc-400">Credits today</span>
          <span className="font-mono font-semibold">{totalCredits} / 3</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
          <span>Resets at 00:00 UTC</span>
          <a
            href="mailto:shlokuprit@gmail.com?subject=Alt-text%20bulk%20plan%20waitlist&body=Hey%20%E2%80%94%20add%20me%20to%20the%20waitlist%20for%20the%20paid%20bulk%20plan.%20I%27d%20use%20it%20for%3A%0A%0A"
            className="text-zinc-700 dark:text-zinc-300 underline-offset-2 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline"
          >
            Need more? Join waitlist
          </a>
        </div>
      </div>

      <label
        htmlFor="file"
        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-6 py-10 ${
          totalCredits <= 0 || processing
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-500"
        } transition-colors`}
      >
        <span className="text-base font-medium">
          {totalCredits <= 0
            ? "No credits — buy more to keep going"
            : isEmpty
              ? "Click to choose images"
              : "Add more images"}
        </span>
        <span className="text-sm text-zinc-500">
          Up to {MAX_FILES} at a time &middot; JPG, PNG, WebP, GIF, HEIC &middot;
          4MB each
        </span>
        <input
          ref={inputRef}
          id="file"
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={totalCredits <= 0 || processing}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>

      {!isEmpty && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            {summary}
          </div>
          <div className="flex flex-wrap gap-2">
            {pendingCount > 0 && !processing && (
              <button
                onClick={processAll}
                disabled={totalCredits <= 0}
                className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-zinc-900 dark:disabled:hover:bg-zinc-100"
              >
                Generate {pendingCount === 1 ? "alt text" : `all ${pendingCount}`}
              </button>
            )}
            {processing && (
              <button
                onClick={stop}
                className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Stop
              </button>
            )}
            {hasDone && (
              <button
                onClick={copyAll}
                disabled={processing}
                className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                Copy all
              </button>
            )}
            {hasResults && (
              <button
                onClick={exportCsv}
                disabled={processing}
                className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                Export CSV
              </button>
            )}
            {!processing && (
              <button
                onClick={clearAll}
                className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 px-4 py-3 text-sm"
        >
          {error}
        </div>
      )}

      {!isEmpty && (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <QueueRow
              key={item.id}
              item={item}
              processing={processing}
              onRemove={() => removeItem(item.id)}
            />
          ))}
        </ul>
      )}
    </>
  );
}

function QueueRow({
  item,
  processing,
  onRemove,
}: {
  item: QueueItem;
  processing: boolean;
  onRemove: () => void;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (!item.altText) return;
    try {
      await navigator.clipboard.writeText(item.altText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // silent
    }
  }

  const statusBadge = (() => {
    switch (item.status) {
      case "pending":
        return (
          <span className="text-xs text-zinc-500">Pending</span>
        );
      case "processing":
        return (
          <span className="text-xs text-blue-600 dark:text-blue-400">
            Processing…
          </span>
        );
      case "done":
        return (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">
            Done
          </span>
        );
      case "error":
        return (
          <span className="text-xs text-red-600 dark:text-red-400">Error</span>
        );
      case "skipped":
        return (
          <span className="text-xs text-amber-600 dark:text-amber-400">
            Skipped
          </span>
        );
    }
  })();

  return (
    <li className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
      <div className="flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.previewUrl}
          alt={item.file.name}
          className="h-16 w-16 shrink-0 rounded-md object-cover bg-zinc-100 dark:bg-zinc-800"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p
              className="truncate text-sm font-medium"
              title={item.file.name}
            >
              {item.file.name}
            </p>
            {statusBadge}
          </div>
          {item.altText && (
            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300 leading-snug">
              {item.altText}
            </p>
          )}
          {item.error && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {item.error}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2 text-xs">
            {item.status === "done" && (
              <button
                onClick={copy}
                className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
            )}
            {item.status === "done" && item.altText && (
              <span className="text-zinc-500">{item.altText.length} chars</span>
            )}
            {!processing && item.status !== "processing" && (
              <button
                onClick={onRemove}
                className="ml-auto text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
