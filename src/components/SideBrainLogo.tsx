import { cn } from "@/lib/utils";

interface SideBrainLogoProps {
  className?: string;
  sizeClass?: string;
}

const SideBrainLogo = ({ className, sizeClass = "text-sm" }: SideBrainLogoProps) => {
  return (
    <span className={cn("inline-flex items-baseline tracking-tight", sizeClass, className)}>
      <span style={{ fontWeight: 400, letterSpacing: "-0.01em" }}>side</span>
      <span style={{ fontWeight: 700, letterSpacing: "-0.02em" }}>brain</span>
    </span>
  );
};

export default SideBrainLogo;
