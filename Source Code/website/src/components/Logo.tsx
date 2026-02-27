interface LogoProps {
  className?: string;
  iconOnly?: boolean;
}

export default function Logo({
  className = "h-9",
  iconOnly = false,
}: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={iconOnly ? "0 0 82 100" : "0 0 410 100"}
        className="h-full w-auto shrink-0 drop-shadow-md"
      >
        <defs>
          <linearGradient id="themeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#9333EA" />
          </linearGradient>
        </defs>

        {/* Logo Mark */}
        <g transform="translate(10, 20)">
          {/* Shadow / depth layer */}
          <rect
            x="10"
            y="20"
            width="60"
            height="45"
            rx="8"
            fill="#2563EB"
            opacity="0.15"
          />
          {/* Main folder base */}
          <rect x="5" y="25" width="60" height="45" rx="8" fill="#2563EB" />
          {/* Folder handle */}
          <path
            d="M22 25 L22 18 C22 13.5 25.5 10 30 10 L45 10"
            fill="none"
            stroke="#2563EB"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Bookmark / save ribbon */}
          <path
            d="M38 8 L58 8 C60.2 8 62 9.8 62 12 L62 55 C62 57.5 59.2 59 57 57.5 L48 51 L39 57.5 C36.8 59 34 57.5 34 55 L34 12 C34 9.8 35.8 8 38 8 Z"
            fill="url(#themeGrad)"
          />
        </g>

        {/* Typography — visible on dark backgrounds */}
        {!iconOnly && (
          <text
            x="95"
            y="67"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontSize="44"
            fontWeight="800"
            fill="#e2e8f0"
            letterSpacing="-1"
          >
            SaveThe
            <tspan fill="url(#themeGrad)">Jobs</tspan>
          </text>
        )}
      </svg>
    </div>
  );
}
