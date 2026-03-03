import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const LAST_LIGHT_KEY = "app-last-light-config";

export default function ThemeToggle({ compact: _compact = false }: { compact?: boolean }) {
    const { backgroundConfig, setBackgroundConfig } = useTheme();

    const isDark = backgroundConfig.value === "#0B0F19";

    const toggleTheme = () => {
        if (isDark) {
            // Restore last light config, or fall back to sky
            try {
                const stored = localStorage.getItem(LAST_LIGHT_KEY);
                if (stored) {
                    setBackgroundConfig(JSON.parse(stored));
                    return;
                }
            } catch (_) { }
            setBackgroundConfig({
                value: "/wallpapers/sky.png",
                type: "image",
                overlayOpacity: 8,
                glassOpacity: 28,
            });
        } else {
            // Save current light config before going dark
            try {
                localStorage.setItem(LAST_LIGHT_KEY, JSON.stringify(backgroundConfig));
            } catch (_) { }
            setBackgroundConfig({
                value: "#0B0F19",
                type: "color",
                overlayOpacity: 0,
                glassOpacity: 15,
            });
        }
    };

    return (
        <button
            onClick={toggleTheme}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle theme"
        >
            {isDark ? (
                <Sun className="w-[17px] h-[17px]" />
            ) : (
                <Moon className="w-[17px] h-[17px]" />
            )}
        </button>
    );
}
