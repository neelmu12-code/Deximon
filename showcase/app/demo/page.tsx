import type { Metadata } from "next";
import { DemoApp } from "@/components/DemoApp";

export const metadata: Metadata = {
  title: "Interactive demo",
  description:
    "Explore Deximon's scanner, digital binder, marketplace, listings, profiles, conversations, notifications, and reviews with local sample data.",
};

export default function DemoPage() {
  return <DemoApp />;
}

