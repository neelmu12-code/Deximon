import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteDescription =
  "Deximon is a full-stack trading card collection and marketplace platform with scanning, digital binders, listings, messaging, profiles, notifications, and reviews.";

const configuredSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.VERCEL_PROJECT_PRODUCTION_URL ??
  process.env.VERCEL_URL ??
  "https://deximon.vercel.app";
const siteUrl = configuredSiteUrl.startsWith("http")
  ? configuredSiteUrl
  : `https://${configuredSiteUrl}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Deximon — Collection and marketplace platform",
    template: "%s — Deximon",
  },
  description: siteDescription,
  applicationName: "Deximon",
  keywords: [
    "Deximon",
    "trading cards",
    "Next.js",
    "FastAPI",
    "PostgreSQL",
    "AWS Rekognition",
    "portfolio",
  ],
  openGraph: {
    type: "website",
    title: "Deximon — Cards in, cards out.",
    description: siteDescription,
    siteName: "Deximon",
  },
  twitter: {
    card: "summary_large_image",
    title: "Deximon — Cards in, cards out.",
    description: siteDescription,
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0b0b0e",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
