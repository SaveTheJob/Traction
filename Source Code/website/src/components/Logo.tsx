interface LogoProps {
    className?: string; // height control mainly, e.g. "h-8"
    iconOnly?: boolean;
}

export default function Logo({ className = "h-8", iconOnly = false }: LogoProps) {
    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-full w-auto drop-shadow-sm"
            >
                <defs>
                    <linearGradient id="chevron-grad" x1="0" y1="0" x2="0" y2="24" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#2563EB" />   {/* blue-600 */}
                        <stop offset="100%" stopColor="#9333EA" /> {/* purple-600 */}
                    </linearGradient>
                </defs>
                <path d="M12 0 L0 10 L4.8 10 L12 4 L19.2 10 L24 10 Z" fill="url(#chevron-grad)" />
                <path d="M12 7 L0 17 L4.8 17 L12 11 L19.2 17 L24 17 Z" fill="url(#chevron-grad)" />
                <path d="M12 14 L0 24 L4.8 24 L12 18 L19.2 24 L24 24 Z" fill="url(#chevron-grad)" />
            </svg>
            {!iconOnly && (
                <span className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 drop-shadow-sm">
                    Traction
                </span>
            )}
        </div>
    );
}
