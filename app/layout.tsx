import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./auth.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://getupby.vercel.app"),
  title: {
    default: "UPBY | How much are you up by?",
    template: "%s | UPBY",
  },
  description: "Log your wins and losses, build your streak, and see your progress.",
  applicationName: "UPBY",
  openGraph: {
    title: "UPBY | How much are you up by?",
    description: "Log your wins and losses, build your streak, and see your progress.",
    url: "/",
    siteName: "UPBY",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "UPBY progress tracker" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "UPBY | How much are you up by?",
    description: "Log your wins and losses, build your streak, and see your progress.",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f1e7",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
