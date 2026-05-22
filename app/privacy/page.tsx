import { Metadata } from "next";
import { LegalShell, Section } from "../legal-shell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How AI Alt-Text Generator handles your data.",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="May 22, 2026">
      <p>
        This page explains what data AI Alt-Text Generator (&quot;the
        Service&quot;) collects about you, why, and what we do with it. It
        applies to the website at{" "}
        <code>alt-text-tool-seven.vercel.app</code> and any subdomain we may
        host the Service on.
      </p>

      <Section heading="Who we are">
        <p>
          The Service is run by Shlok Uprit, an individual based in India. You
          can reach us at{" "}
          <a
            className="underline hover:text-zinc-900 dark:hover:text-zinc-100"
            href="mailto:shlokuprit@gmail.com"
          >
            shlokuprit@gmail.com
          </a>
          .
        </p>
      </Section>

      <Section heading="What we collect">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Account info</strong>: when you sign in with Google, we
            receive your email address, name, and a Google account identifier.
            We do not request access to anything else.
          </li>
          <li>
            <strong>Usage records</strong>: for each alt-text generation we log
            your account ID, the timestamp, and your current credit balance. We
            do not store the image itself or the alt text we generated.
          </li>
          <li>
            <strong>Payment records</strong>: if you purchase credits, our
            payment provider stores your billing details. We receive a
            confirmation of the purchase (order ID, amount, your account ID)
            but never your card number.
          </li>
          <li>
            <strong>Analytics</strong>: we use PostHog to track anonymous
            pageviews and events (such as &quot;alt text generated&quot;) to
            understand which features are used. Logged-in users are identified
            in PostHog by account ID and email.
          </li>
          <li>
            <strong>Server logs</strong>: standard request metadata (IP
            address, user-agent, timestamp) is logged by our hosting provider
            (Vercel) for security and debugging. These are not kept
            indefinitely.
          </li>
        </ul>
      </Section>

      <Section heading="What we don't store">
        <p>
          We <strong>do not store images</strong> you upload. The image is sent
          to Google&apos;s Gemini API for analysis and is discarded from our
          server memory after the alt text is returned. Google&apos;s own
          retention applies to anything sent to their API — see{" "}
          <a
            className="underline hover:text-zinc-900 dark:hover:text-zinc-100"
            href="https://ai.google.dev/gemini-api/terms"
            target="_blank"
            rel="noopener"
          >
            Gemini API terms
          </a>
          .
        </p>
        <p>
          We do not store the alt text we return either — once it&apos;s sent
          back to your browser, our server forgets it.
        </p>
      </Section>

      <Section heading="Third parties we share data with">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Google</strong> — for sign-in. Receives a request to verify
            your identity when you log in.
          </li>
          <li>
            <strong>Google Gemini API</strong> — receives the image you upload
            for the purpose of generating alt text.
          </li>
          <li>
            <strong>Supabase</strong> — hosts our database and authentication.
            Receives your account info and usage records.
          </li>
          <li>
            <strong>Polar.sh</strong> — processes payments. Receives your
            billing info if you purchase credits.
          </li>
          <li>
            <strong>Vercel</strong> — hosts the application. Receives request
            logs.
          </li>
          <li>
            <strong>PostHog</strong> — collects anonymous and identified
            analytics events.
          </li>
        </ul>
        <p>
          We do not sell your data, and we do not share it with anyone outside
          of the providers above without your consent or unless required by
          law.
        </p>
      </Section>

      <Section heading="Cookies">
        <p>
          We use first-party session cookies (set by Supabase) to keep you
          signed in. We don&apos;t use third-party advertising cookies.
        </p>
      </Section>

      <Section heading="Your rights">
        <p>
          You can request a copy of your data, correct it, or delete your
          account at any time by emailing{" "}
          <a
            className="underline hover:text-zinc-900 dark:hover:text-zinc-100"
            href="mailto:shlokuprit@gmail.com"
          >
            shlokuprit@gmail.com
          </a>
          . Account deletion removes your usage records and payment events;
          purchase receipts may be retained for the period required by tax
          law.
        </p>
      </Section>

      <Section heading="Children">
        <p>
          The Service is not intended for users under 13. If you believe a
          child has signed up, email us and we&apos;ll delete the account.
        </p>
      </Section>

      <Section heading="Changes to this policy">
        <p>
          We&apos;ll update this page when we change how we handle data, and
          we&apos;ll update the &quot;last updated&quot; date at the top.
          Material changes will be announced on the home page.
        </p>
      </Section>
    </LegalShell>
  );
}
