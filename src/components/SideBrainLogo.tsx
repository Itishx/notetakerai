import { cn } from "@/lib/utils";

interface SideBrainLogoProps {
  className?: string;
  sizeClass?: string;
}

const SideBrainLogo = ({ className, sizeClass = "text-sm" }: SideBrainLogoProps) => {
  return (
    <span className={cn("inline-flex items-baseline", sizeClass, className)}>
      <span style={{ fontFamily: "'TimesNewRomanMT', 'Times New Roman', Georgia, serif", fontStyle: "italic" }}>
        side
      </span>
      <span style={{ fontFamily: "'BeVietnam', 'Be Vietnam Pro', sans-serif", fontWeight: 800 }}>
        brain
      </span>
    </span>
  );
};

export default SideBrainLogo;
