import type { VerificationTier } from "@/lib/types";

const TIER_CONFIG: Record<
  Exclude<VerificationTier, "none">,
  { label: string; className: string; title: string }
> = {
  meme: {
    label: "✓",
    className: "bg-neutral-400",
    title: "Community verified",
  },
  govt: {
    label: "✓",
    className: "bg-sky-500",
    title: "Verified government-affiliated account",
  },
  govt_authority: {
    label: "✓",
    className: "bg-amber-500",
    title: "Verified government authority",
  },
  cosmic: {
    label: "✦",
    className: "bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-400",
    title: "Mishrin — creator of cosmos",
  },
};

/**
 * A small round tick, sized and colored by tier — same visual language as
 * Instagram/Twitter's verification badges, just with more tiers. Renders
 * nothing for `tier: "none"` (the vast majority of profiles).
 */
export default function VerificationBadge({
  tier,
  size = "sm",
}: {
  tier: VerificationTier;
  size?: "sm" | "md";
}) {
  if (tier === "none") return null;

  const config = TIER_CONFIG[tier];
  const dimension = size === "sm" ? "h-4 w-4 text-[10px]" : "h-5 w-5 text-xs";

  return (
    <span
      title={config.title}
      aria-label={config.title}
      className={`inline-flex ${dimension} shrink-0 items-center justify-center rounded-full font-bold text-white ${config.className} ${
        tier === "cosmic" ? "shadow-[0_0_6px_rgba(168,85,247,0.7)]" : ""
      }`}
    >
      {config.label}
    </span>
  );
}
