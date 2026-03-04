import { Image as ImageIcon, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import type { ToastMessage } from "./Toast";
import ToastContainer from "./Toast";

export default function ThemeCustomizer() {
  const [isOpen, setIsOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [currentView, setCurrentView] = useState<"appearance" | "themes">(
    "appearance",
  );
  const { backgroundConfig: themeConfig, setBackgroundConfig: setThemeConfig } =
    useTheme();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addToast = useCallback(
    (message: string, type: ToastMessage["type"] = "error") => {
      const id = Date.now().toString();
      setToasts((prev) => [...prev, { id, message, type }]);
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
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
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          // Compress to jpeg at 80% quality to save storage
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.8);
          try {
            setThemeConfig({ value: compressedBase64, type: "image" });
          } catch (err) {
            addToast(
              "Image is too large to save! Please choose a smaller image.",
              "error",
            );
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
    // Reset input so the same file can be uploaded again if needed
    if (event.target) {
      event.target.value = "";
    }
  };

  // Listen for external open event (from sidebar button)
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-theme-customizer", handleOpen);
    return () =>
      window.removeEventListener("open-theme-customizer", handleOpen);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
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

  const themeCategories = [
    {
      id: "sky",
      title: "Sky",
      img: "/wallpapers/sky.png",
    },
    {
      id: "puzzg",
      title: "Puzzle Green",
      img: "/wallpapers/puzzg.png",
    },
    {
      id: "puzzo",
      title: "Puzzle Orange",
      img: "/wallpapers/puzzo.png",
    },
    {
      id: "flowers",
      title: "Flowers",
      img: "/wallpapers/Flowers.jpg",
    },
    {
      id: "aurora",
      title: "Aurora",
      img: "/wallpapers/aurora.jpg",
    },
    {
      id: "stars",
      title: "Stars",
      img: "/wallpapers/Stars.jpg",
    },
    {
      id: "droplets",
      title: "Droplets",
      img: "/wallpapers/Droplets.jpg",
    },
    {
      id: "procks",
      title: "Procks",
      img: "/wallpapers/Procks.jpg",
    },
    {
      id: "greenaven",
      title: "Green Avenue",
      img: "/wallpapers/Greenaven.jpg",
    },
    {
      id: "birdingo",
      title: "Birdingo",
      img: "/wallpapers/Birdingo.jpg",
    },
    {
      id: "sflar",
      title: "Solar Flare",
      img: "/wallpapers/Sflar.jpg",
    },
    {
      id: "liana",
      title: "Liana",
      img: "/wallpapers/Liana.jpg",
    },
    {
      id: "slade",
      title: "Slade",
      img: "/wallpapers/Slade.jpg",
    },
    {
      id: "baven",
      title: "Baven",
      img: "/wallpapers/baven.jpg",
    },
    {
      id: "particles",
      title: "Particles",
      img: "/wallpapers/particles.jpg",
    },
    {
      id: "upload",
      title: "Upload",
      isUpload: true,
      icon: <ImageIcon className="w-8 h-8 opacity-70" />,
    },
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

      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Sidebar Panel */}
      <div
        ref={sidebarRef}
        className={`fixed inset-y-0 right-0 z-50 w-[calc(100%-2rem)] max-w-[360px] bg-[#1e293b] text-slate-100 shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transform flex flex-col m-4 rounded-[24px] border border-white/5 ${
          isOpen ? "translate-x-0" : "translate-x-[120%]"
        }`}
        style={{
          maxHeight:
            "calc(100vh - 32px)" /* Account for 16px top/bottom margins, allow scrolling if needed */,
          boxShadow:
            "-10px 10px 40px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-5 shrink-0">
          <div className="flex items-center gap-3">
            {currentView === "themes" && (
              <button
                onClick={() => setCurrentView("appearance")}
                className="p-1 rounded-full hover:bg-white/10 text-white transition-colors flex items-center justify-center -ml-1 border border-white/20"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
            )}
            <h2 className="text-[18px] font-medium text-white tracking-wide">
              {currentView === "appearance" ? "Customise SaveTheJob" : "Themes"}
            </h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 pb-5">
          {currentView === "appearance" ? (
            /* Appearance Section */
            <section className="space-y-4 pb-8">
              {/* Theme Image Card */}
              <div className="bg-[#0f172a] rounded-[20px] p-2 border border-slate-700/50 mb-2">
                <div className="aspect-[16/9] w-full bg-[#1e2330] rounded-[16px] overflow-hidden shadow-inner relative group border-2 border-[#125881]">
                  {/* App Frame Mockup */}
                  <div
                    className="absolute inset-x-0 top-0 h-[22%] bg-black/40 backdrop-blur-md border-b border-white/10 flex items-center px-3 gap-1.5 z-10 transition-colors"
                    style={
                      themeConfig.type === "color"
                        ? { backgroundColor: themeConfig.value, opacity: 0.8 }
                        : {}
                    }
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                    <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                    <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                  </div>

                  {themeConfig.type === "image" ? (
                    <img
                      src={themeConfig.value}
                      alt="Current theme"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 w-full h-full"
                      style={{ background: themeConfig.value }}
                    />
                  )}
                </div>

                <button
                  onClick={() => setCurrentView("themes")}
                  className="w-full mt-4 bg-[#125881] hover:bg-[#186a9d] text-white py-[9px] rounded-lg text-[13px] font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <ImageIcon className="w-[18px] h-[18px]" strokeWidth={2} />
                  Change Background
                </button>
              </div>

              {/* Reset Button */}
              <button
                onClick={() =>
                  setThemeConfig({
                    value: "/wallpapers/sky.png",
                    type: "image",
                    glassOpacity: 28,
                  })
                }
                className="w-full flex items-center justify-between py-3 px-1 text-white hover:bg-white/5 rounded-lg transition-colors group"
              >
                <span className="text-[15px] font-bold text-[#e8eaed]">
                  Reset to default
                </span>
                <div className="p-1.5 rounded-full group-hover:bg-white/10 transition-colors">
                  <RotateCcw
                    className="w-4 h-4 text-[#e8eaed]"
                    strokeWidth={2}
                  />
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
                    if (cat.id === "sky") {
                      setThemeConfig({
                        value: "/wallpapers/sky.png",
                        type: "image",
                        showNoise: false,
                        showGeometric: false,
                      });
                    } else if (cat.id === "default") {
                      setThemeConfig({
                        value: "#0B0F19",
                        type: "color",
                        glassOpacity: 15,
                      });
                    } else if (cat.isUpload) {
                      fileInputRef.current?.click();
                    } else if ((cat as any).config) {
                      setThemeConfig({
                        ...(cat as any).config,
                        glassOpacity: themeConfig.glassOpacity,
                      });
                    } else if ((cat as any).img) {
                      setThemeConfig({
                        value: (cat as any).img,
                        type: "image",
                      });
                    }
                  }}
                >
                  <div
                    className={`aspect-square rounded-2xl overflow-hidden relative shadow-sm transition-all duration-300 ${
                      cat.isUpload
                        ? "bg-[#1e293b] border border-white/5 group-hover:bg-slate-800 flex items-center justify-center"
                        : ""
                    } ${
                      !cat.isUpload && !(cat as any).img
                        ? "border border-white/10 group-hover:border-white/30"
                        : ""
                    }`}
                  >
                    {(cat as any).img ? (
                      <img
                        src={(cat as any).img}
                        alt={cat.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (cat as any).config?.type === "mesh" ||
                      (cat as any).config?.type === "color" ? (
                      <div
                        className="w-full h-full"
                        style={{ background: (cat as any).config.value }}
                      />
                    ) : null}

                    {(cat.isUpload || (cat as any).icon) && (
                      <div className="text-white group-hover:scale-110 transition-transform duration-300">
                        {cat.isUpload ? (
                          <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                        ) : (
                          (cat as any).icon
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-[12.5px] font-medium text-white/90 text-center leading-tight">
                    {cat.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
