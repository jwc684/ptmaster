import { cn } from "@/lib/utils";

interface PtMasterLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "full" | "icon";
  className?: string;
}

const sizePresets = {
  sm: { icon: "h-6 w-6", text: "text-base", gap: "gap-2" },
  md: { icon: "h-8 w-8", text: "text-xl", gap: "gap-2.5" },
  lg: { icon: "h-12 w-12", text: "text-3xl", gap: "gap-3" },
};

export function PtMasterLogo({
  size = "md",
  variant = "full",
  className,
}: PtMasterLogoProps) {
  const preset = sizePresets[size];

  return (
    <div className={cn("flex items-center", preset.gap, className)}>
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(preset.icon, "flex-shrink-0")}
      >
        {/* Dumbbell bar */}
        <rect x="4" y="14" width="24" height="4" fill="currentColor" />
        {/* Left weight plates */}
        <rect x="2" y="9" width="5" height="14" fill="currentColor" />
        <rect x="7" y="11" width="3" height="10" fill="currentColor" />
        {/* Right weight plates */}
        <rect x="25" y="9" width="5" height="14" fill="currentColor" />
        <rect x="22" y="11" width="3" height="10" fill="currentColor" />
      </svg>
      {variant === "full" && (
        <span
          className={cn(
            preset.text,
            "font-bold tracking-tight whitespace-nowrap"
          )}
          style={{ fontFamily: "var(--font-ibm-plex-sans), sans-serif" }}
        >
          PT Master
        </span>
      )}
    </div>
  );
}
