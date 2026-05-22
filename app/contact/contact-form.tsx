"use client";

import { useState } from "react";

const TOPICS = [
  { value: "feedback", label: "Feedback / feature idea" },
  { value: "bug", label: "Bug report" },
  { value: "billing", label: "Refund or billing" },
  { value: "other", label: "Something else" },
];

export function ContactForm() {
  const [topic, setTopic] = useState(TOPICS[0].value);
  const [body, setBody] = useState("");

  const subject =
    TOPICS.find((t) => t.value === topic)?.label ?? "AI Alt-Text Generator";
  const mailto = `mailto:shlokuprit@gmail.com?subject=${encodeURIComponent(
    `[${subject}] AI Alt-Text Generator`,
  )}&body=${encodeURIComponent(body)}`;

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
        Topic
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
        >
          {TOPICS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
        Message
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          placeholder="Tell me what's on your mind…"
          className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
      </label>

      <a
        href={mailto}
        className={`inline-block px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
          body.trim().length === 0
            ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-500 pointer-events-none"
            : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300"
        }`}
      >
        Open in email
      </a>
      <p className="text-xs text-zinc-500">
        This button opens your email client. Nothing is sent through our
        server.
      </p>
    </div>
  );
}
