import React, { useRef, useState } from "react";
import { RotateCcw, Trash2, Settings2, X, Sparkles } from "lucide-react";

interface BrandConfig {
  id: string;
  name: string;
  subText: string;
  emoji: string;
  defaultImage: string;
}

const BRANDS: BrandConfig[] = [
  { id: "taier", name: "太二", subText: "酸菜鱼", emoji: "🐟", defaultImage: "/taier.png" },
  { id: "song", name: "怂火锅", subText: "火锅厂", emoji: "🔥", defaultImage: "/song.png" },
  { id: "jiumaojiu", name: "九毛九", subText: "西北菜", emoji: "🐑", defaultImage: "/jiumaojiu.png" },
  { id: "shanwaimian", name: "山外面", subText: "酸汤火锅", emoji: "🍲", defaultImage: "/shanwaimian.png" },
  { id: "shorts", name: "短裤咖啡", subText: "SHORTS", emoji: "☕", defaultImage: "/shorts.png" },
  { id: "shangxianyue", name: "赏鲜悦木", subText: "牛肉火锅", emoji: "🥩", defaultImage: "/shangxianyue.jpeg" },
  { id: "chao", name: "潮那边", subText: "CHÁO", emoji: "⛰️", defaultImage: "/chaonabian.png" },
  { id: "taierGJ", name: "太二国际", subText: "经典国际", emoji: "🔪", defaultImage: "/taierGJ.png" },
  { id: "unclechef", name: "大头DT", subText: "大头DT", emoji: "🍳", defaultImage: "/datou.png" },
  { id: "group", name: "九毛九集团", subText: "总部", emoji: "💻", defaultImage: "/group.png" }
];

interface LogoCustomizerProps {
  customLogos: Record<string, string>;
  onUpdateLogo: (brandId: string, base64: string) => void;
  onResetLogo: (brandId: string) => void;
  onResetAll: () => void;
}

export const LogoCustomizer: React.FC<LogoCustomizerProps> = ({
  customLogos,
  onUpdateLogo,
  onResetLogo,
  onResetAll
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleItemClick = (brandId: string) => {
    setActiveBrandId(brandId);
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeBrandId) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("请上传有效的图片文件 (png/jpg/jpeg/webp)！");
      return;
    }

    // Limit file size to 2.5MB to avoid localStorage quota issues
    if (file.size > 2.5 * 1024 * 1024) {
      setErrorMsg("图片文件过大 (限 2.5MB 内)，请压缩后重新上传。");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        onUpdateLogo(activeBrandId, base64);
      }
    };
    reader.onerror = () => {
      setErrorMsg("读取文件失败，请重试。");
    };
    reader.readAsDataURL(file);

    // Reset input value
    e.target.value = "";
  };

  const hasAnyCustom = Object.keys(customLogos).length > 0;

  return (
    <>
      {/* Sleek Floating Trigger Button - Positioned beautifully in the top-right corner of the screen */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:bg-slate-50 transition-all duration-200 cursor-pointer text-xs font-semibold text-slate-700 hover:text-slate-900 pointer-events-auto"
        id="logo-customizer-trigger"
      >
        <span className="relative flex h-2 w-2">
          {hasAnyCustom && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${hasAnyCustom ? "bg-amber-500" : "bg-slate-300"}`}></span>
        </span>
        <Settings2 className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-500 ${isOpen ? "rotate-90 text-amber-500" : ""}`} />
        <span>自定义品牌 Logo</span>
      </button>

      {/* Floating Settings Card Panel */}
      {isOpen && (
        <div 
          className="fixed top-18 right-4 z-50 w-[360px] bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.12)] pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-200"
          id="logo-customizer-panel"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-xs font-bold text-slate-800 tracking-tight">
                品牌 Logo 替换中心
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              {hasAnyCustom && (
                <button
                  onClick={onResetAll}
                  className="flex items-center gap-1 text-[10px] font-bold text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100/60 px-2 py-0.5 rounded-md transition cursor-pointer"
                  title="恢复全部默认Logo"
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                  <span>重置</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 text-left mb-3.5 leading-relaxed">
            点击下方品牌图标，上传本地图片进行<strong>永久替换</strong>。更改将立即同步至登录页背景刚体及月报看板中。
          </p>

          {errorMsg && (
            <div className="mb-3 bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-semibold p-2 rounded-xl">
              {errorMsg}
            </div>
          )}

          {/* Compact Grid of 10 Logos */}
          <div className="grid grid-cols-5 gap-3 mb-1">
            {BRANDS.map((brand) => {
              const hasCustom = !!customLogos[brand.id];
              const logoSrc = customLogos[brand.id] || brand.defaultImage;

              return (
                <div
                  key={brand.id}
                  onClick={() => handleItemClick(brand.id)}
                  className="group relative flex flex-col items-center justify-start cursor-pointer select-none"
                  title={`点击替换 ${brand.name} Logo`}
                >
                  {/* The Uniform Squircle Logo Card - Matches the perfect rounded squircle proportions from the screenshot */}
                  <div
                    className={`relative w-12 h-12 rounded-[14px] flex items-center justify-center transition-all duration-200 overflow-hidden ${
                      hasCustom
                        ? "border border-amber-400 bg-amber-50/15 shadow-[0_4px_12px_rgba(245,158,11,0.12)]"
                        : "border border-slate-200/60 bg-slate-50/50 group-hover:bg-white group-hover:border-amber-300 shadow-xs"
                    }`}
                  >
                    {/* Reset single button */}
                    {hasCustom && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onResetLogo(brand.id);
                        }}
                        className="absolute top-0.5 right-0.5 z-20 p-0.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-xs transition"
                        title="恢复默认"
                      >
                        <Trash2 className="h-2 w-2" />
                      </button>
                    )}

                    {/* Logo Preview Image */}
                    <img
                      src={logoSrc}
                      alt={brand.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 object-contain select-none pointer-events-none transition-transform group-hover:scale-105 duration-200"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const fallbackSpan = e.currentTarget.nextElementSibling as HTMLSpanElement;
                        if (fallbackSpan) fallbackSpan.style.display = "block";
                      }}
                    />
                    <span className="hidden text-lg select-none pointer-events-none">
                      {brand.emoji}
                    </span>

                    {/* Active Indicator Dot */}
                    {hasCustom && (
                      <span className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                    )}
                  </div>

                  {/* Label */}
                  <span className="text-[9px] font-bold text-slate-500 tracking-tight leading-normal mt-1.5 group-hover:text-amber-600 truncate w-full text-center px-0.5 transition-colors">
                    {brand.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>
      )}
    </>
  );
};
