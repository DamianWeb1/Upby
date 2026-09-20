import type { Metadata } from "next";
import FounderDashboard from "./FounderDashboard";

export const metadata: Metadata = {
  title: "Founder Dashboard",
  robots: { index: false, follow: false },
};

export default function FounderPage() {
  return <FounderDashboard />;
}
