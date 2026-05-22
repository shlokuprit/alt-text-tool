import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PosthogProvider } from "./posthog-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://alt-text-tool-seven.vercel.app";
const siteTitle = "AI Alt-Text Generator for Bloggers";
const siteDescription =
  "Upload an image, get accessibility-friendly alt text in seconds. Free 3 per day. Built for bloggers, WordPress, and Shopify.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s — AI Alt-Text Generator",
  },
  description: siteDescription,
  applicationName: "AI Alt-Text Generator",
  authors: [{ name: "Shlok Uprit" }],
  keywords: [
    "alt text generator",
    "ai alt text",
    "accessibility",
    "wordpress alt text",
    "wcag",
    "image description",
    "screen reader",
  ],
  openGraph: {
    type: "website",
    url: siteUrl,
    title: siteTitle,
    description: siteDescription,
    siteName: "AI Alt-Text Generator",
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PosthogProvider>{children}</PosthogProvider>
      </body>
    </html>
  );
}
