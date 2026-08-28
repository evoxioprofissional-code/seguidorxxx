import { cn } from "@/lib/utils";

export function Logo({
  className,
  showText = true,
  size = 30,
}: {
  className?: string;
  showText?: boolean;
  size?: number;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className="relative flex items-center justify-center rounded-lg"
        style={{
          width: size,
          height: size,
          background: "var(--primary)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="text-black"
          style={{ width: size * 0.6, height: size * 0.6 }}
        >
          <path
            d="M6 5l6 7-6 7M18 5l-6 7 6 7"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {showText && (
        <span className="text-[1.05rem] font-semibold tracking-tight text-fg">
          Seguidor<span className="text-primary">X</span>
        </span>
      )}
    </div>
  );
}
