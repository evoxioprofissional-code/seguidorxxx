import { cn } from "@/lib/utils";

export function Logo({
  className,
  showText = true,
  size = 32,
}: {
  className?: string;
  showText?: boolean;
  size?: number;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-primary-soft via-primary to-primary-strong glow"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="text-white"
          style={{ width: size * 0.58, height: size * 0.58 }}
        >
          <path
            d="M6 5l6 7-6 7M18 5l-6 7 6 7"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {showText && (
        <span className="text-lg font-bold tracking-tight text-fg">
          Seguidor<span className="text-gradient">X</span>
        </span>
      )}
    </div>
  );
}
