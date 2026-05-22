import { Metadata } from "next";
import { LegalShell, Section } from "../legal-shell";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch about AI Alt-Text Generator.",
};

export default function ContactPage() {
  return (
    <LegalShell title="Contact" updated="May 22, 2026">
      <p>
        Send feedback, bug reports, refund requests, or feature ideas to{" "}
        <a
          className="underline hover:text-zinc-900 dark:hover:text-zinc-100"
          href="mailto:shlokuprit@gmail.com"
        >
          shlokuprit@gmail.com
        </a>
        . I read every email and reply within 2 business days.
      </p>

      <Section heading="What I'm especially looking for">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Examples of images where the AI got the alt text wrong, so I can
            improve the prompt.
          </li>
          <li>
            Features that would make this useful for your actual workflow
            (bulk processing? a WordPress plugin? a Chrome extension?).
          </li>
          <li>Bug reports, especially with a screenshot.</li>
          <li>Refund or billing questions.</li>
        </ul>
      </Section>

      <Section heading="Or write here">
        <p>
          The form below opens your email client with the message pre-filled.
        </p>
        <ContactForm />
      </Section>
    </LegalShell>
  );
}
