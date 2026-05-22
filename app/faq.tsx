const ITEMS = [
  {
    q: "What's alt text and why does it matter?",
    a: "Alt text is the written description of an image used by screen readers, indexed by search engines, and shown when an image fails to load. It's required by WCAG accessibility guidelines and increasingly important for SEO and (in some regions) legal compliance.",
  },
  {
    q: "How accurate is the AI?",
    a: "Generally good for clear photographs, product images, and diagrams. Less reliable for abstract art, photos with subtle context, or images where the meaning depends on something off-screen. Always read it before using — treat it as a fast first draft, not final copy.",
  },
  {
    q: "What image formats are supported?",
    a: "JPG, PNG, WebP, GIF, HEIC, and HEIF. Up to 4MB per image.",
  },
  {
    q: "Do you store my images?",
    a: "No. Images are sent to Google's Gemini API for analysis and discarded immediately after the alt text comes back. We log the user ID and timestamp of each generation for usage tracking — nothing else.",
  },
  {
    q: "How does pricing work?",
    a: "3 free generations per day, refilling at 00:00 UTC. If you need more, $9 buys 500 credits that never expire. One-time purchase, no subscription.",
  },
  {
    q: "Bulk processing? WordPress plugin?",
    a: "Not yet. If those would actually be useful to you, email me — concrete asks help me prioritize.",
  },
];

export function Faq() {
  return (
    <section className="mt-16">
      <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 mb-6">
        FAQ
      </h2>
      <div className="space-y-6">
        {ITEMS.map((item) => (
          <div key={item.q}>
            <h3 className="font-medium mb-1">{item.q}</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {item.a}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
