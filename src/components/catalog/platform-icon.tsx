import { cn } from "@/lib/utils";

/** Glifos de marca em SVG inline (lucide removeu ícones de marca). */
const PATHS: Record<string, { gradient: string; path: React.ReactNode }> = {
  instagram: {
    gradient: "from-[#f58529] via-[#dd2a7b] to-[#8134af]",
    path: (
      <>
        <rect x="2" y="2" width="20" height="20" rx="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.4" cy="6.6" r="1.3" fill="currentColor" />
      </>
    ),
  },
  tiktok: {
    gradient: "from-[#25f4ee] via-[#1c1c24] to-[#fe2c55]",
    path: (
      <path
        d="M15 3c.4 2.4 1.9 4 4.2 4.3v3.1c-1.5.1-2.9-.3-4.2-1.1v5.6c0 3.4-2.6 5.6-5.7 5.1-2.6-.4-4.4-2.7-4.1-5.4.3-2.4 2.4-4.2 4.9-4v3.2c-.4-.1-.9-.1-1.3 0-1 .3-1.6 1.2-1.4 2.2.2.9 1.1 1.6 2.1 1.4 1-.1 1.7-1 1.7-2V3H15z"
        fill="currentColor"
      />
    ),
  },
  youtube: {
    gradient: "from-[#ff0000] to-[#c4302b]",
    path: (
      <>
        <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M10.5 9.2l4.3 2.8-4.3 2.8V9.2z" fill="currentColor" />
      </>
    ),
  },
  facebook: {
    gradient: "from-[#1877f2] to-[#0a4bb3]",
    path: (
      <path
        d="M13.5 21v-7h2.3l.4-2.8h-2.7V9.4c0-.8.3-1.4 1.5-1.4h1.3V5.5c-.6-.1-1.4-.2-2.3-.2-2.3 0-3.8 1.4-3.8 3.9v2H8v2.8h2.4V21h3.1z"
        fill="currentColor"
      />
    ),
  },
  kwai: {
    gradient: "from-[#ff6a00] to-[#ff2d55]",
    path: (
      <>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M9 7v10M9 12l5-5M9 12l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </>
    ),
  },
  telegram: {
    gradient: "from-[#2aabee] to-[#229ed9]",
    path: (
      <path
        d="M21 5L3 12l5 1.8L17 8l-6.5 7.2v3.3l2.8-2.9 3.9 2.9L21 5z"
        fill="currentColor"
      />
    ),
  },
  twitter: {
    gradient: "from-[#1c1c24] to-[#3a3a44]",
    path: (
      <path
        d="M4 4l6.3 8.4L4.4 20h1.9l4.8-5.3L15.1 20H20l-6.6-8.9L19.3 4h-1.9l-4.5 5-3.7-5H4z"
        fill="currentColor"
      />
    ),
  },
  spotify: {
    gradient: "from-[#1db954] to-[#128a3e]",
    path: (
      <>
        <circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M7.5 9.6c3-.7 6.2-.4 8.8 1M8 12.4c2.4-.5 4.9-.3 7 .9M8.4 15c1.8-.4 3.7-.2 5.3.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </>
    ),
  },
  twitch: {
    gradient: "from-[#9146ff] to-[#6441a5]",
    path: (
      <path
        d="M5 3l-1 4v11h4v3l3-3h4l5-5V3H5zm14 9l-3 3h-4l-3 3v-3H6V5h13v7zm-6-5v4M16 7v4"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
        strokeLinejoin="round"
      />
    ),
  },
  outros: {
    gradient: "from-primary to-primary-strong",
    path: (
      <>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" stroke="currentColor" strokeWidth="1.6" fill="none" />
      </>
    ),
  },
};

export function PlatformIcon({
  platform,
  size = 44,
  className,
}: {
  platform: string;
  size?: number;
  className?: string;
}) {
  const def = PATHS[platform] ?? PATHS.outros;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg",
        def.gradient,
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" style={{ width: size * 0.55, height: size * 0.55 }}>
        {def.path}
      </svg>
    </span>
  );
}
