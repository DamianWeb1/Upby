import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "UPBY",
    short_name: "UPBY",
    description: "Log your wins and losses, build your streak, and see your progress.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f1e7",
    theme_color: "#2864f0",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
