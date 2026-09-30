import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "LoomTrack — Powerloom production & wages" },
      { name: "description", content: "Track daily loom production, piece-rate wages, income, expenses and deliveries." },
      { property: "og:title", content: "LoomTrack — Powerloom production & wages" },
      { property: "og:description", content: "Track daily loom production, piece-rate wages, income, expenses and deliveries." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
