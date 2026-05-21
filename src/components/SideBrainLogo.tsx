import { cn } from "@/lib/utils";

interface SideBrainLogoProps {
  className?: string;
  sizeClass?: string;
}

const SideBrainLogo = ({ className, sizeClass = "text-sm" }: SideBrainLogoProps) => {
  return (
    <span className={cn("inline-flex items-baseline tracking-tight", sizeClass, className)}>
      <span style={{ fontWeight: 800, letterSpacing: "-0.03em" }}>Braino</span>
    </span>
  );
};

export default SideBrainLogo;
