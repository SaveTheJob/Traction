import { Check, Edit2, Image as ImageIcon, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "../context/ThemeContext";

// Add a hook to persist the selected background theme
function useAppTheme() {
    const [themeConfig, setThemeConfig] = useState<{ value: string; type: 'color' | 'image' }>(() => {
        try {
            const stored = localStorage.getItem("app-theme-config");
            return stored ? JSON.parse(stored) : { value: "/wallpapers/default.jpeg", type: "image" };
        } catch (e) {
            return { value: "/wallpapers/default.jpeg", type: "image" };
        }
    });

    useEffect(() => {
        // Apply logic to document root
        if (themeConfig.type === 'image') {
            document.documentElement.style.setProperty("--primary-gradient", `url('${themeConfig.value}')`);
        } else {
            document.documentElement.style.setProperty("--primary-gradient", themeConfig.value);
        }
        localStorage.setItem("app-theme-config", JSON.stringify(themeConfig));
    }, [themeConfig]);

    return { themeConfig, setThemeConfig };
}

export default function ThemeCustomizer() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentView, setCurrentView] = useState<'appearance' | 'themes'>('appearance');
    const { theme: _theme, setThemeMode: _setThemeMode } = useTheme(); // dark-only, kept for API compat
    const { themeConfig, setThemeConfig } = useAppTheme();
    const sidebarRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1920;
                    const MAX_HEIGHT = 1080;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    // Compress to jpeg at 80% quality to save storage
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                    try {
                        setThemeConfig({ value: compressedBase64, type: "image" });
                    } catch (err) {
                        alert("Image is too large to save! Please choose a smaller image.");
                    }
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
        // Reset input so the same file can be uploaded again if needed
        if (event.target) {
            event.target.value = '';
        }
    };

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    // Prevent scrolling when open on mobile
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    const colorThemes = [
        { id: "blue", top: "#0A58CA", bottom: "#87B2E3", gradient: "linear-gradient(135deg, #0A58CA, #87B2E3)" }, // Blue
        { id: "grey", top: "#C5C7CA", bottom: "#E0E2E5", gradient: "linear-gradient(135deg, #C5C7CA, #E0E2E5)" }, // Light Grey
        { id: "slate_blue", top: "#4A72B2", bottom: "#AEC2DF", gradient: "linear-gradient(135deg, #4A72B2, #AEC2DF)" }, // Slate Blue
        { id: "slate", top: "#555A67", bottom: "#B8BCC6", gradient: "linear-gradient(135deg, #555A67, #B8BCC6)" }, // Slate
        { id: "olive", top: "#626E69", bottom: "#C4C9C6", gradient: "linear-gradient(135deg, #626E69, #C4C9C6)" }, // Olive
        { id: "teal", top: "#137466", bottom: "#86CDC5", gradient: "linear-gradient(135deg, #137466, #86CDC5)" }, // Teal
        { id: "green", top: "#4B812B", bottom: "#B6D69D", gradient: "linear-gradient(135deg, #4B812B, #B6D69D)" }, // Green
        { id: "khaki", top: "#727756", bottom: "#CFD2BC", gradient: "linear-gradient(135deg, #727756, #CFD2BC)" }, // Khaki
        { id: "gold", top: "#A9851F", bottom: "#E3CAA2", gradient: "linear-gradient(135deg, #A9851F, #E3CAA2)" }, // Gold
        { id: "orange", top: "#BD6F20", bottom: "#F1C598", gradient: "linear-gradient(135deg, #BD6F20, #F1C598)" }, // Orange
        { id: "brown", top: "#906155", bottom: "#D5BEB8", gradient: "linear-gradient(135deg, #906155, #D5BEB8)" }, // Brown
        { id: "rose", top: "#AB4C5A", bottom: "#F3A9B3", gradient: "linear-gradient(135deg, #AB4C5A, #F3A9B3)" }, // Rose
        { id: "dusty", top: "#8A6965", bottom: "#E0CDC9", gradient: "linear-gradient(135deg, #8A6965, #E0CDC9)" }, // Dusty Rose
        { id: "pink", top: "#9C4291", bottom: "#EBA3E0", gradient: "linear-gradient(135deg, #9C4291, #EBA3E0)" }, // Pink
        { id: "purple", top: "#65499C", bottom: "#C2A7F1", gradient: "linear-gradient(135deg, #65499C, #C2A7F1)" }, // Purple
    ];

    const themeCategories = [
        { id: "default", title: "Default", img: "/wallpapers/default.jpeg", isUpload: false },
        { id: "upload", title: "Upload an image", icon: <ImageIcon className="w-8 h-8 opacity-70" />, isUpload: true },
        { id: "solid", title: "Solid colours", color: "#B8A5D8", isUpload: false },
        { id: "rising", title: "Rising artists", img: "/wallpapers/christian-boragine-w6UZD2RUq4o-unsplash.jpg", isUpload: false },
        { id: "asian", title: "Asian and Pacific Islander artists", img: "/wallpapers/city-lights-through-rain-window.jpg", isUpload: false },
        { id: "native", title: "Native American artists", img: "/wallpapers/doncoombez-OLv0kaeekGo-unsplash (1).jpg", isUpload: false },
        { id: "lgbtq", title: "LGBTQ+ artists", img: "/wallpapers/evgeni-tcherkasski-kow5jLC9IPI-unsplash.jpg", isUpload: false },
        { id: "latino", title: "Latino artists", img: "/wallpapers/kristaps-ungurs-MivRywDQOjs-unsplash.jpg", isUpload: false },
        { id: "black", title: "Black artists", img: "/wallpapers/liana-s-BV9vbI8ZkZM-unsplash.jpg", isUpload: false },
        { id: "landscapes", title: "Landscapes", img: "/wallpapers/nastia-petruk-FkM3BDS8F3E-unsplash.jpg", isUpload: false },
        { id: "textures", title: "Textures", img: "/wallpapers/nguyen-vanh-1m8E6OTLzRk-unsplash.jpg", isUpload: false },
    ];

    return (
        <>
            {/* Hidden File Input for Custom Wallpapers */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileUpload}
            />

            {/* Floating Action Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-40 bg-white dark:bg-[#1e293b] text-slate-700 dark:text-[#8ab4f8] p-4 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:scale-110 active:scale-95 transition-all duration-300 ring-1 ring-black/5 dark:ring-white/10 group flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800"
                title="Customise Traction"
            >
                <Edit2 className="w-[18px] h-[18px]" strokeWidth={2.5} />
            </button>

            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
            />

            {/* Sidebar Panel */}
            <div
                ref={sidebarRef}
                className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[360px] bg-white dark:bg-[#1e293b] text-slate-900 dark:text-slate-100 shadow-2xl transition-transform duration-300 ease-out transform flex flex-col m-4 rounded-[24px] border border-slate-200 dark:border-white/5 ${isOpen ? "translate-x-0" : "translate-x-[120%]"
                    }`}
                style={{
                    height: "calc(100vh - 32px)", /* Account for 16px top/bottom margins */
                    boxShadow: "-10px 10px 40px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)",
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 px-5 shrink-0">
                    <div className="flex items-center gap-3">
                        {currentView === 'themes' && (
                            <button
                                onClick={() => setCurrentView('appearance')}
                                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-white transition-colors flex items-center justify-center -ml-1 border border-transparent dark:border-white/20"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                            </button>
                        )}
                        <h2 className="text-[14px] font-medium text-slate-900 dark:text-white tracking-wide">
                            {currentView === 'appearance' ? "Customise Traction" : "Themes"}
                        </h2>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                        <X className="w-[18px] h-[18px]" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-5 pb-5 scrollbar-hide">
                    {currentView === 'appearance' ? (
                        /* Appearance Section */
                        <section className="space-y-4">
                            <h3 className="text-[13px] font-medium text-slate-700 dark:text-white/90 px-1 pt-4">Appearance</h3>

                            {/* Theme Image Card */}
                            <div className="bg-slate-50 dark:bg-[#0f172a] rounded-[20px] p-2 border border-slate-200 dark:border-slate-700/50 mb-2">
                                <div className="aspect-[16/9] w-full bg-slate-200 dark:bg-[#1e2330] rounded-[16px] overflow-hidden shadow-inner relative group border-2 border-slate-300 dark:border-[#125881]">

                                    {/* App Frame Mockup */}
                                    <div className="absolute inset-x-0 top-0 h-[22%] bg-black/40 backdrop-blur-md border-b border-white/10 flex items-center px-3 gap-1.5 z-10 transition-colors"
                                        style={themeConfig.type === 'color' ? { backgroundColor: themeConfig.value, opacity: 0.8 } : {}}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                                    </div>

                                    {/* Display current theme or default image */}
                                    {themeConfig.type === 'image' && themeConfig.value !== 'default' ? (
                                        <img
                                            src={themeConfig.value}
                                            alt="Current theme"
                                            className="absolute inset-0 w-full h-full object-cover"
                                        />
                                    ) : themeConfig.type === 'color' && themeConfig.value !== 'default' ? (
                                        <div className="absolute inset-0 w-full h-full" style={{ background: themeConfig.value }} />
                                    ) : (
                                        <img
                                            src="/wallpapers/default.jpeg"
                                            alt="Default theme"
                                            className="absolute inset-0 w-full h-full object-cover"
                                        />
                                    )}
                                </div>

                                <button
                                    onClick={() => setCurrentView('themes')}
                                    className="w-full mt-4 bg-blue-600 dark:bg-[#125881] hover:bg-blue-700 dark:hover:bg-[#186a9d] text-white py-[9px] rounded-lg text-[13px] font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <ImageIcon className="w-[18px] h-[18px]" strokeWidth={2} />
                                    Change theme
                                </button>
                            </div>


                            {/* Colors Grid */}
                            <div className="grid grid-cols-4 gap-[10px]">
                                {colorThemes.map((color, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setThemeConfig({ value: color.gradient, type: 'color' })}
                                        className={`aspect-square rounded-[18px] bg-slate-50 dark:bg-[#0f172a] hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center transition-all p-[10px] relative ${themeConfig.value === color.gradient ? "border-0 shadow-inner" : "shadow-sm border border-slate-200 dark:border-slate-700/50"
                                            }`}
                                    >
                                        <div className={`w-full h-full rounded-full overflow-hidden shadow-sm shadow-black/40 ${(themeConfig.type === 'color' && themeConfig.value === color.gradient) ? "ring-2 ring-blue-500 dark:ring-white ring-offset-2 ring-offset-white dark:ring-offset-[#293041]" : ""}`}>
                                            <div className="h-1/2 w-full" style={{ backgroundColor: color.top }} />
                                            <div className="h-1/2 w-full" style={{ backgroundColor: color.bottom }} />
                                        </div>
                                    </button>
                                ))}

                                {/* Custom Color Button */}
                                <button
                                    onClick={() => setThemeConfig({ value: "/wallpapers/default.jpeg", type: "image" })}
                                    className={`aspect-square rounded-[18px] flex items-center justify-center transition-all relative shadow-inner ${themeConfig.value === "/wallpapers/default.jpeg"
                                        ? "bg-blue-600 dark:bg-[#125881]"
                                        : "bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-800"
                                        }`}
                                >
                                    <Edit2 className={`w-5 h-5 ${themeConfig.value === "/wallpapers/default.jpeg" ? "text-white" : "text-blue-500 dark:text-[#8ab4f8]"}`} strokeWidth={2.5} />
                                    {themeConfig.value === "/wallpapers/default.jpeg" && (
                                        <div className="absolute top-1 right-1 bg-white text-[#125881] rounded-full p-0.5 shadow-md transform translate-x-1.5 -translate-y-1.5">
                                            <Check className="w-[9px] h-[9px]" strokeWidth={4} />
                                        </div>
                                    )}
                                </button>
                            </div>

                            <div className="h-px w-full bg-slate-200 dark:bg-[#40485a] mt-6 mb-2" />

                            {/* Reset Button */}
                            <button
                                onClick={() => setThemeConfig({ value: "/wallpapers/default.jpeg", type: "image" })}
                                className="w-full flex items-center justify-between py-3 px-1 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors group"
                            >
                                <span className="text-[13px] font-medium text-slate-700 dark:text-[#e8eaed]">Reset to default</span>
                                <div className="p-1.5 rounded-full group-hover:bg-slate-200 dark:group-hover:bg-white/10 transition-colors">
                                    <RotateCcw className="w-4 h-4 text-slate-500 dark:text-[#e8eaed]" strokeWidth={2} />
                                </div>
                            </button>
                        </section>
                    ) : (
                        /* Themes Section */
                        <div className="grid grid-cols-2 gap-4 pb-4">
                            {themeCategories.map((cat) => (
                                <div
                                    key={cat.id}
                                    className="flex flex-col gap-2 group cursor-pointer"
                                    onClick={() => {
                                        if (cat.id === "default") {
                                            setThemeConfig({ value: "/wallpapers/default.jpeg", type: "image" });
                                        } else if (cat.isUpload) {
                                            fileInputRef.current?.click();
                                        } else if (cat.id === "solid") {
                                            setCurrentView("appearance");
                                        } else if (cat.img) {
                                            setThemeConfig({ value: cat.img, type: "image" });
                                        }
                                    }}
                                >
                                    <div className={`aspect-square rounded-2xl overflow-hidden relative shadow-sm transition-all duration-300 ${cat.isUpload ? "bg-slate-100 dark:bg-[#1e293b] border border-slate-200 dark:border-white/5 group-hover:bg-slate-200 dark:group-hover:bg-slate-800 flex items-center justify-center" : ""
                                        } ${!cat.isUpload && !cat.color ? "border border-slate-200 dark:border-white/10 group-hover:border-slate-300 dark:group-hover:border-white/30" : ""
                                        }`}>
                                        {cat.img && (
                                            <>
                                                <img src={cat.img} alt={cat.title} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                            </>
                                        )}
                                        {cat.color && (
                                            <div className="w-full h-full" style={{ backgroundColor: cat.color }} />
                                        )}
                                        {cat.icon && (
                                            <div className="text-slate-500 dark:text-white group-hover:scale-110 transition-transform duration-300">
                                                {/* Upload icon uses custom SVG to match Chrome exactly */}
                                                {cat.isUpload ? (
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                                ) : cat.icon}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[12.5px] font-medium text-slate-700 dark:text-white/90 text-center leading-tight">
                                        {cat.title}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
