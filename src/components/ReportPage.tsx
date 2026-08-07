import React, { useState, useEffect, useRef, useContext } from "react";
import { ReportMetrics, SystemUser, ProjectSlide, SlideOrderConfig } from "../types";
import { ReportProjectSlide } from "./ReportProjectSlide";
import { PdfContext } from "./ReportCharts";

const BUILTIN_SLIDES_META: { index: number; id: string; title: string }[] = [
  { index: 0, id: "builtin_0", title: "封面页" },
  { index: 1, id: "builtin_1", title: "整体运维概况" },
  { index: 2, id: "builtin_2", title: "各系统数据汇总" },
  { index: 3, id: "builtin_3", title: "线上咨询问题分析" },
  { index: 4, id: "builtin_4", title: "门店服务台分析" },
  { index: 5, id: "builtin_5", title: "BOH服务分析" },
  { index: 6, id: "builtin_6", title: "硬件维修分析" },
  { index: 7, id: "builtin_7", title: "门店装修 & 第三方服务效率" },
  { index: 8, id: "builtin_8", title: "结束致谢" }
];

const getDefaultSlideOrder = (pSlides: ProjectSlide[]): SlideOrderConfig[] => {
  const order: SlideOrderConfig[] = BUILTIN_SLIDES_META.slice(0, 8).map((b) => ({
    id: b.id,
    type: "builtin",
    builtinIndex: b.index,
    title: b.title
  }));

  pSlides.forEach((p) => {
    order.push({
      id: p.id,
      type: "project",
      projectSlideId: p.id,
      title: p.title || "重点项目"
    });
  });

  order.push({
    id: BUILTIN_SLIDES_META[8].id,
    type: "builtin",
    builtinIndex: 8,
    title: BUILTIN_SLIDES_META[8].title
  });

  return order;
};

const reconcileSlideOrder = (savedOrder: SlideOrderConfig[], pSlides: ProjectSlide[]): SlideOrderConfig[] => {
  if (!savedOrder || savedOrder.length === 0) {
    return getDefaultSlideOrder(pSlides);
  }

  const validOrder: SlideOrderConfig[] = [];
  const projectMap = new Map<string, ProjectSlide>();
  pSlides.forEach((p) => projectMap.set(p.id, p));

  savedOrder.forEach((item) => {
    if (item.type === "builtin" && item.builtinIndex !== undefined) {
      const meta = BUILTIN_SLIDES_META.find((m) => m.index === item.builtinIndex);
      if (meta) {
        validOrder.push({ ...item, title: meta.title });
      }
    } else if (item.type === "project" && item.projectSlideId) {
      const p = projectMap.get(item.projectSlideId);
      if (p) {
        validOrder.push({ ...item, title: p.title || "重点项目" });
        projectMap.delete(item.projectSlideId);
      }
    }
  });

  BUILTIN_SLIDES_META.forEach((b) => {
    if (!validOrder.some((o) => o.type === "builtin" && o.builtinIndex === b.index)) {
      if (b.index === 8) {
        validOrder.push({ id: b.id, type: "builtin", builtinIndex: 8, title: b.title });
      } else {
        const closingIdx = validOrder.findIndex((o) => o.type === "builtin" && o.builtinIndex === 8);
        const insertAt = closingIdx !== -1 ? closingIdx : validOrder.length;
        validOrder.splice(insertAt, 0, { id: b.id, type: "builtin", builtinIndex: b.index, title: b.title });
      }
    }
  });

  projectMap.forEach((p) => {
    const closingIdx = validOrder.findIndex((o) => o.type === "builtin" && o.builtinIndex === 8);
    const insertAt = closingIdx !== -1 ? closingIdx : validOrder.length;
    validOrder.splice(insertAt, 0, {
      id: p.id,
      type: "project",
      projectSlideId: p.id,
      title: p.title || "重点项目"
    });
  });

  return validOrder;
};
import {
  QiyuCategoriesChart,
  QiyuCompareChart,
  BrandBohChart,
  TicketBrandsChart,
  TicketCategoriesChart,
  TicketShopRankingChart,
  RenovationChart,
  SuppliersEfficiencyChart,
  PdfContext
} from "./ReportCharts";
import { jsPDF } from "jspdf";
import { toJpeg } from "html-to-image";

const jiumaojiuLogo = "/jiumaojiu.png";
const taierLogo = "/taier.png";
const songLogo = "/song.png";
const corporateLogo = "/group.png";

const createDefaultProjectSlide = (monthLabel: string, index: number): ProjectSlide => {
  const monthClean = monthLabel.replace("2026-", "");
  return {
    id: `project_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: `${monthClean}重点项目推进：餐饮智能 POS 5.0 全量上线专项`,
    projectStatus: "已顺利交付",
    owner: "IT 运维组 & 软件研发部",
    summary: "为了提升门店高峰期打单与收银稳定性，本月针对智能 POS 5.0 进行了专项版本升级与全量压测，优化了异地热备与离线出单机制。",
    keyMetrics: [
      { id: "m1", label: "试点及覆盖门店", value: "85 家", trend: "覆盖太二/九毛九" },
      { id: "m2", label: "高峰期出单延时", value: "< 0.3s", trend: "性能提升 40%" },
      { id: "m3", label: "离线模式稳定性", value: "99.95%", trend: "断网无感切换" },
      { id: "m4", label: "叫修工单环比降幅", value: "-65%", trend: "故障率显著下降" }
    ],
    milestones: [
      { id: "ms1", phase: "需求分析与方案评审", date: `${monthClean}上旬`, status: "done", desc: "完成架构方案与业务评审" },
      { id: "ms2", phase: "灰度试点与压测", date: `${monthClean}中旬`, status: "done", desc: "太二 15 家重点门店试点" },
      { id: "ms3", phase: "全量上线与运维监控", date: `${monthClean}下旬`, status: "done", desc: "分批次全量推广并保持高可用" }
    ],
    contentBullets: [
      "<b>多端容灾保障：</b> 本月完成 POS 5.0 离线收银与云端同步双路接管，消除断网导致的叫号出单中断风险。",
      "<b>硬件兼容性提升：</b> 针对老旧热敏打印机驱动完成指令集精简，打印响应速度提升 35%。",
      "<b>后续持续跟进：</b> 下阶段将联动营运部门开展新功能培训，进一步降低线上客服咨询量。"
    ]
  };
};

interface ReportPageProps {
  metrics: ReportMetrics;
  month: string;
  currentUser?: SystemUser | null;
  registerExportFn?: (fn: () => Promise<void>) => void;
}

const cleanHtml = (html: string): string => {
  if (!html) return "";
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    
    // Replace all <font> tags with <span> to completely destroy any browser font-rendering quirks
    const fonts = Array.from(doc.body.getElementsByTagName("font"));
    fonts.forEach((font) => {
      const span = doc.createElement("span");
      span.innerHTML = font.innerHTML;
      font.parentNode?.replaceChild(span, font);
    });

    const allElements = doc.body.getElementsByTagName("*");
    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i];
      el.removeAttribute("style");
      el.removeAttribute("class");
      el.removeAttribute("face");
      el.removeAttribute("size");
      el.removeAttribute("color");
      el.removeAttribute("id");
    }
    return doc.body.innerHTML;
  } catch (e) {
    return html;
  }
};

interface CollaborativeInputProps {
  value: string;
  onChange: (val: string) => void;
  onFocus: () => void;
  onBlur: (val: string) => void;
  fieldKey: string;
  activeEditors: { username: string; fieldKey: string }[];
  className?: string;
  style?: React.CSSProperties;
  isBullet?: boolean;
}

const CollaborativeInput: React.FC<CollaborativeInputProps> = ({
  value,
  onChange,
  onFocus,
  onBlur,
  fieldKey,
  activeEditors,
  className,
  style,
  isBullet = false
}) => {
  const elementRef = useRef<HTMLDivElement | HTMLSpanElement | null>(null);
  const isFocusedRef = useRef<boolean>(false);

  // 监听外部 value 改变，但只有在未聚焦时才覆写 innerHTML，防止打字时光标丢失或卡顿
  useEffect(() => {
    if (elementRef.current && !isFocusedRef.current) {
      if (isBullet) {
        elementRef.current.innerText = value || "";
      } else {
        elementRef.current.innerHTML = value || "";
      }
    }
  }, [value, isBullet]);

  // 找出正在编辑该字段的其他人员
  const editor = activeEditors.find(e => e.fieldKey === fieldKey);

  const Tag = isBullet ? "span" : "div";

  return (
    <div className="relative w-full">
      {editor && (
        <div className="absolute -top-5.5 left-2 z-30 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md animate-bounce flex items-center gap-1 select-none pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          <span>{editor.username} 正在编辑</span>
        </div>
      )}
      <Tag
        ref={elementRef as any}
        contentEditable
        suppressContentEditableWarning
        onFocus={() => {
          isFocusedRef.current = true;
          onFocus();
        }}
        onInput={(e) => {
          const currentText = isBullet ? e.currentTarget.innerText : e.currentTarget.innerHTML;
          onChange(currentText);
        }}
        onBlur={(e) => {
          isFocusedRef.current = false;
          const currentText = isBullet ? e.currentTarget.innerText : e.currentTarget.innerHTML;
          onBlur(currentText);
        }}
        onPaste={isBullet ? undefined : (e) => {
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
          if (elementRef.current) {
            onChange(elementRef.current.innerHTML);
          }
        }}
        className={className}
        style={style}
      />
    </div>
  );
};

export const ReportPage: React.FC<ReportPageProps> = ({ metrics, month, currentUser, registerExportFn }) => {
  const isPdf = useContext(PdfContext);
  const [customLogos, setCustomLogos] = useState<Record<string, string>>({});

  useEffect(() => {
    // 1. 先尝试快速从 localStorage 加载，保证秒开体验
    try {
      const saved = localStorage.getItem("custom_brand_logos");
      if (saved) {
        setCustomLogos(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to parse custom brand logos in ReportPage:", e);
    }

    // 2. 异步从后端同步最新的全局自定义品牌 Logo，保持团队各成员浏览器显示一致
    const fetchServerLogos = async () => {
      try {
        const res = await fetch("/api/custom-logos");
        if (res.ok) {
          const data = await res.json();
          if (data.customLogos) {
            setCustomLogos(data.customLogos);
            localStorage.setItem("custom_brand_logos", JSON.stringify(data.customLogos));
          }
        }
      } catch (err) {
        console.error("Failed to fetch custom logos from server in ReportPage:", err);
      }
    };
    fetchServerLogos();
  }, []);

  // Navigation mode state - default to false (全览模式 / Scroll mode) per user preference
  const [isPptMode, setIsPptMode] = useState<boolean>(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [failedLogos, setFailedLogos] = useState<Record<string, boolean>>({});

  // Listen to print event to dynamically mount print-specific DOM nodes only during printing,
  // preventing constant 0-width off-screen chart renders during typing.
  useEffect(() => {
    const handleBeforePrint = () => setIsPrinting(true);
    const handleAfterPrint = () => setIsPrinting(false);
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  // Editable Commentary States
  const [slide2Bullets, setSlide2Bullets] = useState<string[]>([]);
  const [slide4Comment, setSlide4Comment] = useState<string>("");
  const [slide5Comment, setSlide5Comment] = useState<string>("");
  const [slide6Comment, setSlide6Comment] = useState<string>("");
  const [slide7Comment, setSlide7Comment] = useState<string>("");
  const [slide8Comment, setSlide8Comment] = useState<string>("");

  // 动态重点项目专页清单状态（从 localStorage 恢复）
  const [customProjectSlides, setCustomProjectSlides] = useState<ProjectSlide[]>(() => {
    try {
      const saved = localStorage.getItem(`${metrics.curr_month_label}_customProjectSlides`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  // 动态 PPT 页面自定义排序清单状态
  const [slideOrder, setSlideOrder] = useState<SlideOrderConfig[]>(() => {
    try {
      const saved = localStorage.getItem(`${metrics.curr_month_label}_slideOrder`);
      if (saved) {
        const parsed = JSON.parse(saved);
        return reconcileSlideOrder(parsed, customProjectSlides);
      }
    } catch (e) {}
    return getDefaultSlideOrder(customProjectSlides);
  });

  // 动态计算总页数（直接跟随 slideOrder 的元素数量）
  const totalSlides = slideOrder.length;

  // 当 customProjectSlides 发生增加或减少时，自动收敛同步 slideOrder 保持数据一致性
  useEffect(() => {
    setSlideOrder((prev) => reconcileSlideOrder(prev, customProjectSlides));
  }, [customProjectSlides]);

  const saveSlideOrder = (nextOrder: SlideOrderConfig[]) => {
    setSlideOrder(nextOrder);
    try {
      localStorage.setItem(`${metrics.curr_month_label}_slideOrder`, JSON.stringify(nextOrder));
    } catch (e) {}
    localEditsRef.current.slideOrder = nextOrder;
  };

  // 拖拽排序状态与 Handler 引擎
  const [draggedSlideIdx, setDraggedSlideIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedSlideIdx(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, dropTargetIdx: number) => {
    e.preventDefault();
    if (draggedSlideIdx === null || draggedSlideIdx === dropTargetIdx) return;

    const nextOrder = [...slideOrder];
    const [removed] = nextOrder.splice(draggedSlideIdx, 1);
    nextOrder.splice(dropTargetIdx, 0, removed);

    setDraggedSlideIdx(null);
    saveSlideOrder(nextOrder);
    setCurrentSlideIndex(dropTargetIdx);
  };

  const handleMoveSlide = (fromIdx: number, direction: -1 | 1) => {
    const toIdx = fromIdx + direction;
    if (toIdx < 0 || toIdx >= slideOrder.length) return;

    const nextOrder = [...slideOrder];
    const [removed] = nextOrder.splice(fromIdx, 1);
    nextOrder.splice(toIdx, 0, removed);

    saveSlideOrder(nextOrder);
    setCurrentSlideIndex(toIdx);
  };

  const handleResetSlideOrder = () => {
    if (window.confirm("确定要恢复默认页面顺序吗？")) {
      const defaultOrder = getDefaultSlideOrder(customProjectSlides);
      saveSlideOrder(defaultOrder);
      setCurrentSlideIndex(0);
    }
  };

  // 实时在线协同与定位气泡同步引擎 (基于 HTTP Heartbeat Polling 达到 Firebase Firestore 的同步体验)
  const [activeEditors, setActiveEditors] = useState<{ username: string; fieldKey: string }[]>([]);
  const [editingField, setEditingField] = useState<string | null>(null);

  // 专门用来存储正处于 Focus 编辑状态下的临时内容，不触发任何 React 重渲染，从而绝对不卡顿，且输入时没有警告
  const localEditsRef = useRef<{
    slide2Bullets: string[];
    slide4Comment: string;
    slide5Comment: string;
    slide6Comment: string;
    slide7Comment: string;
    slide8Comment: string;
    customProjectSlides: ProjectSlide[];
    slideOrder: SlideOrderConfig[];
  }>({
    slide2Bullets: [],
    slide4Comment: "",
    slide5Comment: "",
    slide6Comment: "",
    slide7Comment: "",
    slide8Comment: "",
    customProjectSlides: [],
    slideOrder: []
  });

  // 当 React 的主 state 发生更新（如后端同步或组件初次加载）时，同步备份至临时 ref (仅限非 focus 状态，避免在打字时被覆盖)
  useEffect(() => {
    if (!editingField || !editingField.startsWith("slide2Bullet")) {
      localEditsRef.current.slide2Bullets = [...slide2Bullets];
    }
    if (editingField !== "slide4Comment") {
      localEditsRef.current.slide4Comment = slide4Comment;
    }
    if (editingField !== "slide5Comment") {
      localEditsRef.current.slide5Comment = slide5Comment;
    }
    if (editingField !== "slide6Comment") {
      localEditsRef.current.slide6Comment = slide6Comment;
    }
    if (editingField !== "slide7Comment") {
      localEditsRef.current.slide7Comment = slide7Comment;
    }
    if (editingField !== "slide8Comment") {
      localEditsRef.current.slide8Comment = slide8Comment;
    }
    localEditsRef.current.customProjectSlides = customProjectSlides;
    localEditsRef.current.slideOrder = slideOrder;
  }, [slide2Bullets, slide4Comment, slide5Comment, slide6Comment, slide7Comment, slide8Comment, customProjectSlides, slideOrder, editingField]);

  // 持久化与项目专页操作
  const saveProjectSlides = (nextSlides: ProjectSlide[]) => {
    setCustomProjectSlides(nextSlides);
    try {
      localStorage.setItem(`${metrics.curr_month_label}_customProjectSlides`, JSON.stringify(nextSlides));
    } catch (e) {}
    localEditsRef.current.customProjectSlides = nextSlides;
  };

  const handleAddProjectSlide = () => {
    const newSlide = createDefaultProjectSlide(metrics.curr_month_label, customProjectSlides.length + 1);
    const nextSlides = [...customProjectSlides, newSlide];
    saveProjectSlides(nextSlides);

    // 计算插入到 slideOrder 倒数第二个位置（结束页之前）
    const newOrder = reconcileSlideOrder(slideOrder, nextSlides);
    saveSlideOrder(newOrder);

    const newTargetIdx = newOrder.findIndex((s) => s.projectSlideId === newSlide.id);
    setCurrentSlideIndex(newTargetIdx !== -1 ? newTargetIdx : newOrder.length - 2);
    setIsPptMode(true);
  };

  const handleDeleteProjectSlide = (id: string) => {
    if (window.confirm("确定要删除此项目专页吗？删除后不可恢复。")) {
      const nextSlides = customProjectSlides.filter((s) => s.id !== id);
      saveProjectSlides(nextSlides);

      const nextOrder = slideOrder.filter((s) => s.projectSlideId !== id);
      saveSlideOrder(nextOrder);

      if (currentSlideIndex >= nextOrder.length) {
        setCurrentSlideIndex(Math.max(0, nextOrder.length - 1));
      }
    }
  };

  const handleUpdateProjectSlide = (id: string, updated: Partial<ProjectSlide>) => {
    const nextSlides = customProjectSlides.map((s) => {
      if (s.id === id) {
        return { ...s, ...updated };
      }
      return s;
    });
    saveProjectSlides(nextSlides);

    if (updated.title) {
      const nextOrder = slideOrder.map((s) => {
        if (s.projectSlideId === id) {
          return { ...s, title: updated.title! };
        }
        return s;
      });
      saveSlideOrder(nextOrder);
    }
  };

  // 使用 refs 保持对状态的最新引用，避免定时器闭包访问陈旧状态，并且不触发 useEffect 的多余重启
  const stateRefs = useRef({
    editingField,
    month,
    username: currentUser?.username || "未知成员"
  });

  useEffect(() => {
    stateRefs.current = {
      editingField,
      month,
      username: currentUser?.username || "未知成员"
    };
  }, [editingField, month, currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    let isSubscribed = true;

    const performSync = async () => {
      const current = stateRefs.current;
      const payload: any = {
        month: current.month,
        username: current.username,
        editingField: current.editingField
      };

      // 仅在当前用户正在编辑该文本框或操作专页时，才将客户端最新内容提交至后端进行多端实时合流
      payload.clientComments = {
        slide2Bullets: localEditsRef.current.slide2Bullets,
        slide4Comment: localEditsRef.current.slide4Comment,
        slide5Comment: localEditsRef.current.slide5Comment,
        slide6Comment: localEditsRef.current.slide6Comment,
        slide7Comment: localEditsRef.current.slide7Comment,
        slide8Comment: localEditsRef.current.slide8Comment,
        customProjectSlides: localEditsRef.current.customProjectSlides,
        slideOrder: localEditsRef.current.slideOrder
      };

      try {
        const res = await fetch("/api/collaboration/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          if (!isSubscribed) return;

          // 1) 同步其他在线协同成员的位置信息
          if (data.activeEditors) {
            setActiveEditors(data.activeEditors);
          }

          // 2) 同步来自服务器的中央评论状态 (避开当前用户正在聚焦编辑的文本框，防止输入冲突)
          if (data.serverComments) {
            const sc = data.serverComments;
            const focused = stateRefs.current.editingField;

            if (sc.slide2Bullets && Array.isArray(sc.slide2Bullets) && sc.slide2Bullets.some(b => isNonEmptyText(b)) && !focused?.startsWith("slide2Bullet")) {
              setSlide2Bullets(sc.slide2Bullets.filter(b => isNonEmptyText(b)));
            }
            if (sc.slide4Comment !== undefined && isNonEmptyText(sc.slide4Comment) && focused !== "slide4Comment") {
              setSlide4Comment(cleanHtml(sc.slide4Comment));
            }
            if (sc.slide5Comment !== undefined && isNonEmptyText(sc.slide5Comment) && focused !== "slide5Comment") {
              setSlide5Comment(cleanHtml(sc.slide5Comment));
            }
            if (sc.slide6Comment !== undefined && isNonEmptyText(sc.slide6Comment) && focused !== "slide6Comment") {
              setSlide6Comment(cleanHtml(sc.slide6Comment));
            }
            if (sc.slide7Comment !== undefined && isNonEmptyText(sc.slide7Comment) && focused !== "slide7Comment") {
              setSlide7Comment(cleanHtml(sc.slide7Comment));
            }
            if (sc.slide8Comment !== undefined && isNonEmptyText(sc.slide8Comment) && focused !== "slide8Comment") {
              setSlide8Comment(cleanHtml(sc.slide8Comment));
            }
            if (sc.customProjectSlides !== undefined && !focused?.startsWith("project_")) {
              // 项目专页数据通过协同同步引擎跨设备同步（服务器端持久化）
              setCustomProjectSlides(sc.customProjectSlides);
            }
            if (sc.slideOrder !== undefined) {
              setSlideOrder(reconcileSlideOrder(sc.slideOrder, localEditsRef.current.customProjectSlides));
            }
          }
        }
      } catch (err) {
        console.warn("协作心跳同步失败:", err);
      }
    };

    // 触发首次即时同步
    performSync();

    // 设定 1.5 秒的心跳频率
    const timer = setInterval(() => {
      performSync();
    }, 1500);

    return () => {
      isSubscribed = false;
      clearInterval(timer);

      // 组件卸载时释放本人的编辑锁
      const current = stateRefs.current;
      fetch("/api/collaboration/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: current.month,
          username: current.username,
          editingField: null
        })
      }).catch(() => {});
    };
  }, [month, currentUser]);

  // PDF Exporting States
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportStep, setExportStep] = useState<string>("");

  const handleExportPDF = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportProgress(0);
    setExportStep("正在初始化高保真 PDF 渲染引擎并适应图表尺寸...");

    // 关键等待：给动态挂载到 DOM 树的 pdf-generation-deck 一个大约 800 毫秒的时间进行图表宽高的自适应测算，
    // 确保 Recharts 能够渲染出正确的分辨率，同时平时无需占用主 DOM 树和产生任何 0 宽高警告
    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [1120, 700],
        compress: true
      });

      for (let idx = 0; idx < totalSlides; idx++) {
        setExportStep(`正在捕捉并转换第 ${idx + 1} / ${totalSlides} 页报告...`);
        setExportProgress(Math.round((idx / totalSlides) * 100));

        const element = document.getElementById(`pdf-target-slide-${idx}`);
        if (!element) {
          console.warn(`Headless target slide ${idx} not found`);
          continue;
        }

        await new Promise((resolve) => setTimeout(resolve, 100));

        const imgData = await toJpeg(element, {
          quality: 0.95, // High fidelity quality to eliminate compression artifacts and blurriness
          pixelRatio: 2.5, // 2.5x resolution ensures crisp text and vector charts
          backgroundColor: "#ffffff"
        });

        if (idx > 0) {
          pdf.addPage([1120, 700], "landscape");
        }

        pdf.addImage(imgData, "JPEG", 0, 0, 1120, 700, undefined, "FAST");
      }

      setExportStep("正在打包生成 PDF 文件...");
      setExportProgress(100);

      const filename = `九毛九IT运维月报_${metrics.curr_month_label}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error("Programmatic PDF Export failed:", err);
      alert(`PDF 生成失败: ${(err as Error).message || "未知错误"}`);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setExportStep("");
    }
  };

  // Use a ref to always point to the latest handleExportPDF containing the latest state values without causing infinite re-renders
  const exportFnRef = useRef(handleExportPDF);
  useEffect(() => {
    exportFnRef.current = handleExportPDF;
  }); // Runs on every render to ensure the latest states are always captured

  useEffect(() => {
    if (registerExportFn) {
      const stableWrapper = async () => {
        await exportFnRef.current();
      };
      registerExportFn(stableWrapper);
    }
  }, [registerExportFn]);

  // Default values generator helper based on current month and dynamic metrics (eliminates all hardcoded fake data)
  const getDefaultValues = (monthLabel: string, m: ReportMetrics) => {
    const monthClean = monthLabel.replace("2026-", "");
    
    const renovationCount = m.current_renwood_count ?? 0;
    const newShopsCount = m.current_new_shops ?? 0;

    const qiyuTotal = m.current_qiyu_raw?.total ?? 0;
    const qiyuValid = m.current_qiyu_raw?.valid ?? 0;
    const qiyuInvalid = m.current_qiyu_raw?.invalid ?? 0;
    const qiyuUnreplied = m.current_qiyu_raw?.unreplied ?? 0;
    const qiyuAvgFirst = m.current_qiyu_raw?.avg_first_reply ?? 0;
    const qiyuAvgReply = m.current_qiyu_raw?.avg_reply ?? 0;

    const ticketsTotal = m.current_month_tickets_total ?? 0;
    const ticketsAvgDays = m.current_month_avg_days ?? 0;
    const ticketsCompAvgDays = m.compare_month_avg_days ?? 0;

    const haivCount = m.supplier_splits?.haiv?.count ?? 0;
    const haivDays = m.supplier_splits?.haiv?.days ?? 0;
    const qingCount = m.supplier_splits?.qing?.count ?? 0;
    const qingDays = m.supplier_splits?.qing?.days ?? 0;
    const dvsCount = m.supplier_splits?.dvs?.count ?? 0;
    const dvsDays = m.supplier_splits?.dvs?.days ?? 0;

    const defaultBullets = [
      `${monthClean}太二完成 ${renovationCount} 家 5.0 版本旧改门店装修；截至当月底，累计开业改造门店多端对齐。`,
      `${monthClean}门店服务台累计受理会话 ${qiyuTotal} 条，其中有效留言 ${qiyuValid} 条、访客工单为 ${qiyuInvalid} 条。`,
      `本月新增九毛九/太二门店 POS 最小化可用，配合运维组持续进行稳定性维护，逐步分批次上线。`,
      `${monthClean}三品牌基础数据维护工作稳步推进，运维团队全力保障节假日促销期各大核心品牌系统的低变动高可用运行。`,
      `叫修工单共计 ${ticketsTotal} 单，平均完结时长 ${ticketsAvgDays} 天，较上月 ${ticketsCompAvgDays} 天整体平稳可控。`
    ];

    const defaultS4 = `与 <b>菜品调整、打印机出单、POS相关的咨询量</b> 仍维持在主导水位。<br/>针对 <b>“打印机出单”</b> 及 <b>“菜品上下架调整”</b> 咨询，本月运维组已对接品牌营运团队，固化系统出单口配置并细化配置指引，后续会逐步向全量门店推广，降低服务台响应负荷。`;

    const defaultS5 = `<b>服务台响应时效监测：</b><br/>1. <b>首响与响应时长：</b> ${monthClean}平均首次响应时长为 ${qiyuAvgFirst}s，平均响应时间为 ${qiyuAvgReply}s，整体时效指标处于标准承诺（SLA）时效波动范围以内。<br/>2. <b>满意度保障：</b> 本月整体满意度评价持续保持优良水平，下阶段运维组将重点提升智能问答库的匹配率，帮助服务台实现高频常规问题自主分流，缩短人工作业时长。`;

    const defaultS6 = `<b>数据分发趋势分析：</b><br/>${monthClean}三品牌基础手工数据维护量下发频次有所收窄，主要是因为各大核心品牌在 <b>节假日黄金周大促前夕</b> 提前完成了大规模版本、优惠券、键位及点单口逻辑配置，后续进入高可用、低变动维护状态。`;

    const defaultS7 = `<b>硬件故障分类诊断：</b><br/>1. <b>故障类型大盘：</b> 监控类（${m.ticket_cate_distribution?.["监控类"] ?? 0}单）、打印机类（${m.ticket_cate_distribution?.["打印机类"] ?? 0}单）、影音类（${m.ticket_cate_distribution?.["影音类"] ?? 0}单）位居前列。<br/>2. <b>极端门店及治理：</b> 叫修 Top 门店由于高客流量损耗及设备超期服役，运维组已联动签约服务商开展主动预防性保养（点检），并在下月排班计划中列入置换目录。`;

    const defaultS8 = `<b>供应链与装修效率审计：</b><br/>1. <b>门店装修旧改：</b> 本月累计完成太二 ${renovationCount} 家（旧改）和 ${newShopsCount} 家（新开店）软硬件配套配置，开业交付合格率 100%。<br/>2. <b>服务商时效监控：</b> 戴伟斯（${dvsCount}单/${dvsDays}天）、擎苍（${qingCount}单/${qingDays}天）、海灏（${haivCount}单/${haivDays}天）均严格按服务等级协议要求保质按时履约完结工单。`;

    return {
      bullets: defaultBullets,
      s4: defaultS4,
      s5: defaultS5,
      s6: defaultS6,
      s7: defaultS7,
      s8: defaultS8
    };
  };

  const getPrevMonthLabel = (currLabel: string): string => {
    try {
      const cleaned = currLabel.replace("月", "").trim();
      if (cleaned.includes("-")) {
        const [yearStr, monthStr] = cleaned.split("-");
        const year = parseInt(yearStr, 10);
        const monthNum = parseInt(monthStr, 10);
        if (isNaN(year) || isNaN(monthNum)) return "";
        
        const prevDate = new Date(year, monthNum - 2, 1);
        const prevYear = prevDate.getFullYear();
        const prevMonth = prevDate.getMonth() + 1;
        return `${prevYear}-${String(prevMonth).padStart(2, "0")}月`;
      } else {
        const monthNum = parseInt(cleaned, 10);
        if (isNaN(monthNum)) return "";
        const prevMonthNum = monthNum === 1 ? 12 : monthNum - 1;
        return `${prevMonthNum}月`;
      }
    } catch (e) {
      return "";
    }
  };

  // 智能文本判定辅助，防止空HTML或纯空格造成的白框
  const isNonEmptyText = (str: string | null | undefined): boolean => {
    if (!str) return false;
    const stripped = str.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").trim();
    return stripped.length > 0;
  };

  // Load from localStorage, inherited prev month, or defaults on mount and whenever current month label changes
  useEffect(() => {
    const monthLabel = metrics.curr_month_label;
    const defaults = getDefaultValues(monthLabel, metrics);
    const prevLabel = getPrevMonthLabel(monthLabel);

    const serverComments = (metrics as any).custom_comments;

    // Helper: 智能解析或继承评语，绝对不返回空字符串
    const resolveCommentText = (
      key: "slide4Comment" | "slide5Comment" | "slide6Comment" | "slide7Comment" | "slide8Comment",
      defaultValue: string
    ): string => {
      // 1. 如果服务器侧有当前月份的非空自定义内容
      if (serverComments && isNonEmptyText(serverComments[key])) {
        return cleanHtml(serverComments[key]);
      }

      // 2. 如果本地 localStorage 有当前月份的非空保存内容
      const currentLocal = localStorage.getItem(`${monthLabel}_${key}`);
      if (isNonEmptyText(currentLocal)) {
        return cleanHtml(currentLocal!);
      }

      // 3. 自动继承【上一个月 (prevLabel)】的数据或保存的评论内容！
      if (prevLabel) {
        const prevLocal = localStorage.getItem(`${prevLabel}_${key}`);
        if (isNonEmptyText(prevLocal)) {
          return cleanHtml(prevLocal!);
        }
      }

      // 4. 回退使用系统针对当前月份数据计算出的默认模版
      return defaultValue;
    };

    // Helper: 智能解析或继承 Bullet Lists
    const resolveBulletsText = (): string[] => {
      if (serverComments && Array.isArray(serverComments.slide2Bullets) && serverComments.slide2Bullets.some(b => isNonEmptyText(b))) {
        return serverComments.slide2Bullets.filter(b => isNonEmptyText(b));
      }
      const currentLocal = localStorage.getItem(`${monthLabel}_slide2Bullets`);
      if (currentLocal) {
        try {
          const parsed = JSON.parse(currentLocal);
          if (Array.isArray(parsed) && parsed.some(b => isNonEmptyText(b))) {
            return parsed.filter(b => isNonEmptyText(b));
          }
        } catch (e) {}
      }
      if (prevLabel) {
        const prevLocal = localStorage.getItem(`${prevLabel}_slide2Bullets`);
        if (prevLocal) {
          try {
            const parsedPrev = JSON.parse(prevLocal);
            if (Array.isArray(parsedPrev) && parsedPrev.some(b => isNonEmptyText(b))) {
              return parsedPrev.filter(b => isNonEmptyText(b));
            }
          } catch (e) {}
        }
      }
      return defaults.bullets;
    };

    try {
      setSlide2Bullets(resolveBulletsText());
      setSlide4Comment(resolveCommentText("slide4Comment", defaults.s4));
      setSlide5Comment(resolveCommentText("slide5Comment", defaults.s5));
      setSlide6Comment(resolveCommentText("slide6Comment", defaults.s6));
      setSlide7Comment(resolveCommentText("slide7Comment", defaults.s7));
      setSlide8Comment(resolveCommentText("slide8Comment", defaults.s8));
    } catch (e) {
      console.error("Failed to load or resolve comments", e);
      setSlide2Bullets(defaults.bullets);
      setSlide4Comment(defaults.s4);
      setSlide5Comment(defaults.s5);
      setSlide6Comment(defaults.s6);
      setSlide7Comment(defaults.s7);
      setSlide8Comment(defaults.s8);
    }
  }, [
    metrics.curr_month_label,
    metrics.current_month_tickets_total,
    metrics.current_qiyu_raw?.total,
    metrics.current_renwood_count,
    metrics.current_new_shops
  ]);

  // Persisting state setter helpers
  const saveBullets = (next: string[]) => {
    setSlide2Bullets(next);
    try {
      localStorage.setItem(`${metrics.curr_month_label}_slide2Bullets`, JSON.stringify(next));
    } catch (e) {}
  };

  const saveSlide4Comment = (text: string) => {
    let cleaned = cleanHtml(text);
    if (!isNonEmptyText(cleaned)) {
      const defaults = getDefaultValues(metrics.curr_month_label, metrics);
      cleaned = defaults.s4;
    }
    setSlide4Comment(cleaned);
    try {
      localStorage.setItem(`${metrics.curr_month_label}_slide4Comment`, cleaned);
    } catch (e) {}
  };

  const saveSlide5Comment = (text: string) => {
    let cleaned = cleanHtml(text);
    if (!isNonEmptyText(cleaned)) {
      const defaults = getDefaultValues(metrics.curr_month_label, metrics);
      cleaned = defaults.s5;
    }
    setSlide5Comment(cleaned);
    try {
      localStorage.setItem(`${metrics.curr_month_label}_slide5Comment`, cleaned);
    } catch (e) {}
  };

  const saveSlide6Comment = (text: string) => {
    let cleaned = cleanHtml(text);
    if (!isNonEmptyText(cleaned)) {
      const defaults = getDefaultValues(metrics.curr_month_label, metrics);
      cleaned = defaults.s6;
    }
    setSlide6Comment(cleaned);
    try {
      localStorage.setItem(`${metrics.curr_month_label}_slide6Comment`, cleaned);
    } catch (e) {}
  };

  const saveSlide7Comment = (text: string) => {
    let cleaned = cleanHtml(text);
    if (!isNonEmptyText(cleaned)) {
      const defaults = getDefaultValues(metrics.curr_month_label, metrics);
      cleaned = defaults.s7;
    }
    setSlide7Comment(cleaned);
    try {
      localStorage.setItem(`${metrics.curr_month_label}_slide7Comment`, cleaned);
    } catch (e) {}
  };

  const saveSlide8Comment = (text: string) => {
    let cleaned = cleanHtml(text);
    if (!isNonEmptyText(cleaned)) {
      const defaults = getDefaultValues(metrics.curr_month_label, metrics);
      cleaned = defaults.s8;
    }
    setSlide8Comment(cleaned);
    try {
      localStorage.setItem(`${metrics.curr_month_label}_slide8Comment`, cleaned);
    } catch (e) {}
  };

  // 单个分析框：手动载入上月文本
  const handleLoadPrevComment = (
    key: "slide4Comment" | "slide5Comment" | "slide6Comment" | "slide7Comment" | "slide8Comment",
    defaultValue: string
  ) => {
    const prevLabel = getPrevMonthLabel(metrics.curr_month_label);
    if (!prevLabel) {
      alert("未找到上个月标识");
      return;
    }
    const prevValue = localStorage.getItem(`${prevLabel}_${key}`);
    if (isNonEmptyText(prevValue)) {
      const cleaned = cleanHtml(prevValue!);
      if (key === "slide4Comment") saveSlide4Comment(cleaned);
      else if (key === "slide5Comment") saveSlide5Comment(cleaned);
      else if (key === "slide6Comment") saveSlide6Comment(cleaned);
      else if (key === "slide7Comment") saveSlide7Comment(cleaned);
      else if (key === "slide8Comment") saveSlide8Comment(cleaned);
    } else {
      alert(`未检索到 ${prevLabel} 的历史保存文字，已自动应用系统生成的默认分析模版`);
      if (key === "slide4Comment") saveSlide4Comment(defaultValue);
      else if (key === "slide5Comment") saveSlide5Comment(defaultValue);
      else if (key === "slide6Comment") saveSlide6Comment(defaultValue);
      else if (key === "slide7Comment") saveSlide7Comment(defaultValue);
      else if (key === "slide8Comment") saveSlide8Comment(defaultValue);
    }
  };

  // Reset function
  const handleResetToDefault = () => {
    const month = metrics.curr_month_label;
    const defaults = getDefaultValues(month, metrics);
    saveBullets(defaults.bullets);
    saveSlide4Comment(defaults.s4);
    saveSlide5Comment(defaults.s5);
    saveSlide6Comment(defaults.s6);
    saveSlide7Comment(defaults.s7);
    saveSlide8Comment(defaults.s8);
  };

  // Growth Rate helper (with + / - signs)
  const calcHb = (curr: number, prev: number) => {
    if (!prev || prev === 0) return "+0.0%";
    const pct = (((curr - prev) / prev) * 100).toFixed(1);
    const num = parseFloat(pct);
    if (num >= 0) return `+${pct}%`;
    return `${pct}%`;
  };

  // Helper render for individual slides based on dynamic slideOrder
  const renderSlide = (slidePosIndex: number) => {
    const slideConfig = slideOrder[slidePosIndex];
    if (!slideConfig) return null;

    const pageIndex = slidePosIndex;
    const pageNumStr = String(pageIndex + 1).padStart(2, "0");
    const totalNumStr = String(totalSlides).padStart(2, "0");

    if (slideConfig.type === "project" && slideConfig.projectSlideId) {
      const pSlide = customProjectSlides.find((s) => s.id === slideConfig.projectSlideId);
      if (!pSlide) return null;
      return (
        <ReportProjectSlide
          key={pSlide.id}
          slide={pSlide}
          pageIndex={pageIndex}
          totalPages={totalSlides}
          onUpdate={(updated) => handleUpdateProjectSlide(pSlide.id, updated)}
          onDelete={() => handleDeleteProjectSlide(pSlide.id)}
        />
      );
    }

    switch (slideConfig.builtinIndex) {
      case 0:
        // SLIDE 1: Cover Slide
        return (
          <div className="relative w-full h-full flex flex-col justify-between p-16 select-none bg-white">
            {/* Elegant overlapping abstract CSS rings mimicking PDF Slide 1 */}
            <div className="absolute top-1/4 right-10 w-[380px] h-[380px] rounded-full border-[20px] border-[#2F3EE4]/5 flex items-center justify-center animate-pulse duration-[8000ms]" />
            <div className="absolute top-[28%] right-20 w-[280px] h-[280px] rounded-full border-[10px] border-[#8A94F8]/10 flex items-center justify-center" />
            <div className="absolute top-[34%] right-[140px] w-[160px] h-[160px] rounded-full bg-gradient-to-tr from-[#2F3EE4]/5 to-[#8A94F8]/5 blur-lg" />
            <div className="absolute top-10 right-10 w-24 h-24 border border-indigo-100 rounded-full opacity-40" />

            {/* Slide Header */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-400 font-bold tracking-widest">九毛九集团 IT OPERATIONS</span>
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
            </div>

            {/* Slide Main Content */}
            <div className="my-auto relative z-10">
              <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold font-sans tracking-wide mb-4">
                📋 IT OPERATION MONTHLY REPORT
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-slate-800 font-sans tracking-tight leading-tight">
                2026年{metrics.curr_month_label.replace("月", "")}月 IT 运维月报
              </h1>
              <div className="w-20 h-1.5 bg-[#2F3EE4] mt-6 rounded-full" />
            </div>

            {/* Slide Footer */}
            <div className="flex justify-between items-end border-t border-slate-100 pt-6">
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Report Entity</span>
                <span className="text-sm font-semibold text-slate-700">九毛九集团-餐厅体验部</span>
              </div>
            </div>
          </div>
        );

      case 1:
        // SLIDE 2: 整体运维概况
        return (
          <div className="w-full h-full flex flex-col justify-between px-12 py-8 bg-white relative">
            <div>
              {/* PPT Title Header */}
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-6 relative">
                <div className="w-2.5 h-6 bg-[#2F3EE4] rounded-sm" />
                <h2 className="text-xl font-bold text-slate-800 tracking-tight font-sans">整体运维概况</h2>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-mono tracking-wider">PAGE {pageNumStr} / {totalNumStr}</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-sans font-semibold">99_IT</span>
                </div>
              </div>

                {/* 4 Brand Logos Grid */}
                <div className="grid grid-cols-4 gap-8 mb-6">
                <div className="border border-slate-150 rounded-2xl p-3 h-[145px] flex items-center justify-center bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-200 transition-all shadow-xs overflow-hidden">
                  {!failedLogos["jiumaojiu"] ? (
                    <img
                      src={customLogos["jiumaojiu"] || jiumaojiuLogo}
                      alt="九毛九"
                      onError={() => setFailedLogos(prev => ({ ...prev, jiumaojiu: true }))}
                      className="max-h-[95%] max-w-[95%] object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full bg-rose-600 rounded-xl text-white font-bold p-3 shadow-sm select-none">
                      <span className="text-3xl mb-1">🐑</span>
                      <span className="text-base tracking-wider font-sans font-semibold">九毛九西北菜</span>
                    </div>
                  )}
                </div>

                <div className="border border-slate-150 rounded-2xl p-3 h-[145px] flex items-center justify-center bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-200 transition-all shadow-xs overflow-hidden">
                  {!failedLogos["taier"] ? (
                    <img
                      src={customLogos["taier"] || taierLogo}
                      alt="太二"
                      onError={() => setFailedLogos(prev => ({ ...prev, taier: true }))}
                      className="max-h-[95%] max-w-[95%] object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full bg-zinc-950 rounded-xl text-white font-bold p-3 shadow-sm border border-zinc-800 select-none">
                      <span className="text-3xl mb-1">🐟</span>
                      <span className="text-base tracking-wider font-sans font-semibold">太二酸菜鱼</span>
                    </div>
                  )}
                </div>

                <div className="border border-slate-150 rounded-2xl p-3 h-[145px] flex items-center justify-center bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-200 transition-all shadow-xs overflow-hidden">
                  {!failedLogos["song"] ? (
                    <img
                      src={customLogos["song"] || songLogo}
                      alt="怂"
                      onError={() => setFailedLogos(prev => ({ ...prev, song: true }))}
                      className="max-h-[95%] max-w-[95%] object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full bg-orange-500 rounded-xl text-white font-bold p-3 shadow-sm select-none">
                      <span className="text-3xl mb-1">🔥</span>
                      <span className="text-base tracking-wider font-sans font-semibold">怂火锅厂</span>
                    </div>
                  )}
                </div>

                <div className="border border-slate-150 rounded-2xl p-3 h-[145px] flex items-center justify-center bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-200 transition-all shadow-xs overflow-hidden">
                  {!failedLogos["group"] ? (
                    <img
                      src={customLogos["group"] || corporateLogo}
                      alt="Corporate9"
                      onError={() => setFailedLogos(prev => ({ ...prev, group: true }))}
                      className="max-h-[95%] max-w-[95%] object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full bg-amber-400 rounded-xl text-slate-900 font-bold p-3 shadow-sm border-2 border-rose-500 select-none">
                      <span className="text-3xl mb-1">💻</span>
                      <span className="text-base tracking-wider font-sans font-bold">九毛九集团总部</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Core Conclusions bullet points */}
              <div className="space-y-4 pl-2 mb-8">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <h3 className="text-xs uppercase font-bold text-slate-500 tracking-wider flex items-center gap-2">
                    <span>📋 本月核心结论概要</span>
                  </h3>
                  {!isPdf && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          const next = [...slide2Bullets, "点击此处编辑新增结论..."];
                          setSlide2Bullets(next);
                          saveBullets(next);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition cursor-pointer shadow-3xs"
                      >
                        + 新增结论
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const defaults = getDefaultValues(metrics.curr_month_label, metrics);
                          setSlide2Bullets(defaults.bullets);
                          saveBullets(defaults.bullets);
                        }}
                        className="text-slate-500 hover:text-slate-700 font-medium bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md transition cursor-pointer"
                      >
                        恢复默认结论
                      </button>
                    </div>
                  )}
                </div>

                {slide2Bullets.length === 0 ? (
                  <div className="py-6 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <p className="text-xs text-slate-500 mb-3">当前月份暂无核心结论条目</p>
                    {!isPdf && (
                      <button
                        type="button"
                        onClick={() => {
                          const defaults = getDefaultValues(metrics.curr_month_label, metrics);
                          setSlide2Bullets(defaults.bullets);
                          saveBullets(defaults.bullets);
                        }}
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-xl transition cursor-pointer shadow-sm"
                      >
                        ✨ 自动生成 / 恢复本月核心结论
                      </button>
                    )}
                  </div>
                ) : (
                  <ul className="space-y-3.5">
                    {slide2Bullets.map((text, idx) => (
                      <li key={idx} className="flex gap-3 text-sm text-slate-700 leading-relaxed relative group">
                        <span className="flex-none font-mono font-bold text-indigo-600 bg-indigo-50 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 text-xs">
                          {idx + 1}
                        </span>
                        <div className="relative flex-1">
                          <CollaborativeInput
                            value={text}
                            onChange={(val) => {
                              localEditsRef.current.slide2Bullets[idx] = val;
                            }}
                            onFocus={() => setEditingField(`slide2Bullet_${idx}`)}
                            onBlur={(val) => {
                              setEditingField(null);
                              const next = [...slide2Bullets];
                              next[idx] = val;
                              setSlide2Bullets(next);
                              saveBullets(next);
                            }}
                            fieldKey={`slide2Bullet_${idx}`}
                            activeEditors={activeEditors}
                            className="hover:bg-amber-50/50 px-2 py-0.5 rounded transition duration-150 cursor-text outline-none focus:bg-amber-50 focus:ring-1 focus:ring-amber-300 w-full block"
                            isBullet={true}
                          />
                        </div>
                        {!isPdf && (
                          <button
                            type="button"
                            onClick={() => {
                              const next = slide2Bullets.filter((_, i) => i !== idx);
                              setSlide2Bullets(next);
                              saveBullets(next);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-xs text-rose-400 hover:text-rose-600 px-1.5 py-0.5 rounded transition cursor-pointer self-start mt-0.5"
                            title="删除此条结论"
                          >
                            ✕
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Bottom Disclaimer */}
            <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-3 flex justify-between font-mono">
              <span />
              <span>CONFIDENTIAL</span>
            </div>
          </div>
        );

      case 2:
        // SLIDE 3: 各系统数据汇总
        return (
          <div className="w-full h-full flex flex-col justify-between px-12 py-8 bg-white relative">
            <div>
              {/* PPT Title Header */}
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-6 relative">
                <div className="w-2.5 h-6 bg-[#2F3EE4] rounded-sm" />
                <h2 className="text-xl font-bold text-slate-800 tracking-tight font-sans">各系统数据汇总</h2>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-mono tracking-wider">PAGE {pageNumStr} / {totalNumStr}</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-sans font-semibold">99_IT</span>
                </div>
              </div>

              {/* Colorful Table strictly styled as shown in user PDF Slide 3 with increased text size & padding */}
              <div className="overflow-hidden rounded-2xl border border-slate-200/85 mb-10 shadow-xs mt-4">
                <table className="w-full border-collapse text-center text-slate-700">
                  <thead>
                    {/* Header Row: Peach/Coral Background */}
                    <tr className="bg-[#FCE6D6] text-[#59341B] font-bold text-base border-b border-slate-200">
                      <th className="py-5 px-5 border-r border-slate-200/60 font-sans">月份</th>
                      <th className="py-5 px-5 border-r border-slate-200/60 font-sans">门店装修</th>
                      <th className="py-5 px-5 border-r border-slate-200/60 font-sans">总数据维护</th>
                      <th className="py-5 px-5 border-r border-slate-200/60 font-sans">叫修工单</th>
                      <th className="py-5 px-5 border-r border-slate-200/60 font-sans">七鱼会话</th>
                      <th className="py-5 px-5 border-r border-slate-200/60 font-sans">钉钉会话</th>
                      <th className="py-5 px-5 border-slate-200/60 font-sans">4G备线接管宽带</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Previous Month Row: Soft Blue Background */}
                    <tr className="bg-[#E8F0F8] text-slate-800 font-medium hover:bg-indigo-50/20 border-b border-slate-200/60 text-[14px]">
                      <td className="py-6 px-5 border-r border-slate-200/40 font-bold">{metrics.prev_month_label}</td>
                      <td className="py-6 px-5 border-r border-slate-200/40 leading-relaxed whitespace-pre-line">
                        {metrics.compare_month_renovation_count}家(旧改){"\n"}{metrics.compare_month_new_shops}家(新店)
                      </td>
                      <td className="py-6 px-5 border-r border-slate-200/40 font-mono font-bold">
                        {metrics.prev_boh_total.toLocaleString()}次
                      </td>
                      <td className="py-6 px-5 border-r border-slate-200/40 font-mono font-bold">
                        {metrics.compare_month_tickets_total}单
                      </td>
                      <td className="py-6 px-5 border-r border-slate-200/40 font-mono font-bold">
                        {metrics.compare_qiyu_raw.total.toLocaleString()}条
                      </td>
                      <td className="py-6 px-5 border-r border-slate-200/40 font-mono font-bold">
                        {(metrics.prev_dingtalk_sessions ?? 0).toLocaleString()}条
                      </td>
                      <td className="py-6 px-5 border-slate-200/40 font-mono font-bold">
                        {metrics.prev_backup_4g}次
                      </td>
                    </tr>

                    {/* Current Month Row: Soft Blue Background */}
                    <tr className="bg-[#E8F0F8] text-indigo-900 font-medium hover:bg-indigo-50/20 border-b border-slate-200/60 text-[14px]">
                      <td className="py-6 px-5 border-r border-slate-200/40 font-bold">{metrics.curr_month_label}</td>
                      <td className="py-6 px-5 border-r border-slate-200/40 leading-relaxed whitespace-pre-line">
                        {metrics.current_renwood_count}家(旧改){"\n"}{metrics.current_new_shops}家(新店)
                      </td>
                      <td className="py-6 px-5 border-r border-slate-200/40 font-mono font-bold text-[#C55A11]">
                        {metrics.curr_boh_total.toLocaleString()}次
                      </td>
                      <td className="py-6 px-5 border-r border-slate-200/40 font-mono font-bold text-indigo-700">
                        {metrics.current_month_tickets_total}单
                      </td>
                      <td className="py-6 px-5 border-r border-slate-200/40 font-mono font-bold text-[#C55A11]">
                        {metrics.current_qiyu_raw.total.toLocaleString()}条
                      </td>
                      <td className="py-6 px-5 border-r border-slate-200/40 font-mono font-bold text-[#C55A11]">
                        {(metrics.curr_dingtalk_sessions ?? 0).toLocaleString()}条
                      </td>
                      <td className="py-6 px-5 border-slate-200/40 font-mono font-bold text-indigo-700">
                        {metrics.curr_backup_4g}次
                      </td>
                    </tr>

                    {/* MOM Row: Soft Blue Background */}
                    <tr className="bg-[#E8F0F8] text-slate-800 font-bold hover:bg-indigo-50/20 text-[14px]">
                      <td className="py-6 px-5 border-r border-slate-200/40">环比</td>
                      <td className="py-6 px-5 border-r border-slate-200/40 font-mono text-indigo-600 leading-relaxed whitespace-pre-line">
                        {calcHb(metrics.current_renwood_count ?? 0, metrics.compare_month_renovation_count ?? 0)}(旧改)
                        {"\n"}
                        {calcHb(metrics.current_new_shops ?? 0, metrics.compare_month_new_shops ?? 0)}(新店)
                      </td>
                      <td className="py-6 px-5 border-r border-slate-200/40 font-mono text-[#C55A11]">
                        {calcHb(metrics.curr_boh_total, metrics.prev_boh_total)}
                      </td>
                      <td className="py-6 px-5 border-r border-slate-200/40 font-mono text-indigo-600">
                        {calcHb(metrics.current_month_tickets_total, metrics.compare_month_tickets_total)}
                      </td>
                      <td className="py-6 px-5 border-r border-slate-200/40 font-mono text-[#C55A11]">
                        {calcHb(metrics.current_qiyu_raw.total, metrics.compare_qiyu_raw.total)}
                      </td>
                      <td className="py-6 px-5 border-r border-slate-200/40 font-mono text-[#C55A11]">
                        {calcHb(metrics.curr_dingtalk_sessions ?? 0, metrics.prev_dingtalk_sessions ?? 0)}
                      </td>
                      <td className="py-6 px-5 border-slate-200/40 font-mono text-indigo-600">
                        {calcHb(metrics.curr_backup_4g, metrics.prev_backup_4g)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Note in explicit blue as shown in Slide 3 */}
              <div className="text-sm text-[#0066FF] font-medium leading-relaxed bg-blue-50/50 border border-blue-200/60 rounded-2xl p-5 mb-14 shadow-3xs">
                🔹 <b>注：</b> “叫修工单”指通过叫修小程序下单的IT硬件问题；“七鱼会话”指门店服务台实时咨询；“钉钉会话”指钉钉门店群的线上咨询。
              </div>
            </div>

            {/* Bottom Footer */}
            <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-3 flex justify-between font-mono">
              <span></span>
              <span>CONFIDENTIAL</span>
            </div>
          </div>
        );

      case 3:
        // SLIDE 4: 线上咨询问题分析
        return (
          <div className="w-full h-full flex flex-col justify-between px-12 py-8 bg-white relative">
            <div>
              {/* PPT Title Header */}
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-4 relative">
                <div className="w-2.5 h-6 bg-[#2F3EE4] rounded-sm" />
                <h2 className="text-xl font-bold text-slate-800 tracking-tight font-sans">线上咨询问题分析</h2>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-mono tracking-wider">PAGE {pageNumStr} / {totalNumStr}</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-sans font-semibold">99_IT</span>
                </div>
              </div>

              {/* Subheader */}
              <div className="mb-3 text-center">
                <h4 className="text-sm font-bold text-slate-700">
                  📊 {metrics.curr_month_label}门店问题分析
                </h4>
              </div>

              {/* Chart container */}
              <div className="h-[310px] w-full mb-5">
                <QiyuCategoriesChart
                  current={metrics.current_categories}
                  compare={metrics.compare_categories}
                  prevLabel={metrics.prev_month_label}
                  currLabel={metrics.curr_month_label}
                />
              </div>

              {/* Commentary commentary box (Editable) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-[#C55A11] uppercase tracking-wider flex items-center gap-1.5">
                    <div className="w-1.5 h-3 bg-[#C55A11] rounded-xs" />
                    <span>分析 &amp; 优化措施:</span>
                  </h3>
                  {!isPdf && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => handleLoadPrevComment("slide4Comment", getDefaultValues(metrics.curr_month_label, metrics).s4)}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold bg-indigo-50 hover:bg-indigo-100 px-2.5 py-0.5 rounded-md transition cursor-pointer shadow-3xs"
                        title="载入上月该项保存的分析文字"
                      >
                        📋 继承上月分析
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const defaults = getDefaultValues(metrics.curr_month_label, metrics);
                          saveSlide4Comment(defaults.s4);
                        }}
                        className="text-slate-500 hover:text-slate-700 font-medium bg-slate-100 hover:bg-slate-200 px-2.5 py-0.5 rounded-md transition cursor-pointer"
                        title="恢复当前月份基于数据生成的默认分析"
                      >
                         恢复默认分析
                      </button>
                    </div>
                  )}
                </div>
                <CollaborativeInput
                  value={slide4Comment}
                  onChange={(val) => {
                    localEditsRef.current.slide4Comment = val;
                  }}
                  onFocus={() => setEditingField("slide4Comment")}
                  onBlur={(val) => {
                    setEditingField(null);
                    saveSlide4Comment(val);
                  }}
                  fieldKey="slide4Comment"
                  activeEditors={activeEditors}
                  className="editable-commentary p-4 bg-slate-50 border border-dashed border-slate-200 hover:border-indigo-300 text-xs text-slate-700 rounded-xl leading-relaxed cursor-text outline-none transition-colors focus:bg-amber-50/30 focus:border-indigo-400 shadow-3xs"
                  style={{ fontFamily: '"Inter", "PingFang SC", "Lantinghei SC", "Helvetica Neue", "Microsoft YaHei", sans-serif' }}
                  isBullet={false}
                />
              </div>
            </div>

            {/* Bottom Footer */}
            <div className="text-[10px] text-slate-300 text-right font-mono border-t border-slate-50 pt-2">
            </div>
          </div>
        );

      case 4:
        // SLIDE 5: 门店服务台分析 (4月、5月会话对比)
        return (
          <div className="w-full h-full flex flex-col justify-between px-12 py-8 bg-white relative">
            <div>
              {/* PPT Title Header */}
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-5 relative">
                <div className="w-2.5 h-6 bg-[#2F3EE4] rounded-sm" />
                <h2 className="text-xl font-bold text-slate-800 tracking-tight font-sans">门店服务台分析</h2>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-mono tracking-wider">PAGE {pageNumStr} / {totalNumStr}</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-sans font-semibold">99_IT</span>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-6 mb-5">
                {/* Horizontal Bar Chart (4月、5月会话对比) */}
                <div className="col-span-6 flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-600 block mb-2.5 text-center">📊 {metrics.prev_month_label}、{metrics.curr_month_label}会话对比</span>
                  <div className="h-[325px] w-full">
                    <QiyuCompareChart
                      current={metrics.current_qiyu_raw}
                      compare={metrics.compare_qiyu_raw}
                      prevLabel={metrics.prev_month_label}
                      currLabel={metrics.curr_month_label}
                    />
                  </div>
                </div>

                {/* ⏱️ Two cards side-by-side representing the response stats */}
                <div className="col-span-6 grid grid-cols-2 gap-4">
                  {/* Card 1: Comparison Month */}
                  <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs flex flex-col justify-between h-[350px]">
                    <div className="bg-slate-100 text-slate-700 text-sm font-bold py-3 px-3 text-center border-b border-slate-200 flex-none">
                      {metrics.prev_month_label}平均响应
                    </div>
                    <div className="p-4 bg-slate-50/30 text-center flex-1 flex flex-col justify-center gap-4">
                      <div>
                        <span className="block text-xs text-slate-400 font-semibold mb-1">平均响应时长</span>
                        <span className="text-3xl font-black text-indigo-700 font-mono">{(metrics.compare_qiyu_raw.avg_reply || 0).toFixed(2)}s</span>
                      </div>
                      <div className="border-t border-slate-100 pt-4">
                        <span className="block text-xs text-slate-400 font-semibold mb-1">平均会话时长</span>
                        <span className="text-3xl font-black text-[#C55A11] font-mono">{(metrics.compare_qiyu_raw.avg_session_duration || 0).toFixed(2)}s</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 py-4 px-3.5 text-[11.5px] text-slate-500 font-mono leading-relaxed border-t border-slate-100 flex-none space-y-1">
                      <div className="flex justify-between">
                        <span>30s应答率:</span>
                        <span className="font-bold text-slate-700">{((metrics.compare_qiyu_raw.reply_30s_pct ?? 0.331) * 100).toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>答问比:</span>
                        <span className="font-bold text-slate-700">{((metrics.compare_qiyu_raw.answer_to_question_ratio ?? 0.5948) * 100).toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>相对满意度:</span>
                        <span className="font-bold text-slate-700">{((metrics.compare_qiyu_raw.relative_satisfaction ?? 0.75) * 100).toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Current Month */}
                  <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs flex flex-col justify-between h-[350px]">
                    <div className="bg-indigo-50/50 text-indigo-900 text-sm font-bold py-3 px-3 text-center border-b border-slate-200 flex-none">
                      {metrics.curr_month_label}平均响应
                    </div>
                    <div className="p-4 bg-indigo-50/10 text-center flex-1 flex flex-col justify-center gap-4">
                      <div>
                        <span className="block text-xs text-slate-400 font-semibold mb-1">平均响应时长</span>
                        <span className="text-3xl font-black text-indigo-700 font-mono">{(metrics.current_qiyu_raw.avg_reply || 0).toFixed(2)}s</span>
                        {metrics.compare_qiyu_raw.avg_reply && metrics.current_qiyu_raw.avg_reply && (
                          <span className={`text-[11px] ml-1 font-bold font-mono ${metrics.current_qiyu_raw.avg_reply > metrics.compare_qiyu_raw.avg_reply ? 'text-red-500' : 'text-emerald-600'}`}>
                            {metrics.current_qiyu_raw.avg_reply > metrics.compare_qiyu_raw.avg_reply ? '+' : ''}
                            {((metrics.current_qiyu_raw.avg_reply - metrics.compare_qiyu_raw.avg_reply) / metrics.compare_qiyu_raw.avg_reply * 100).toFixed(2)}% 
                            {metrics.current_qiyu_raw.avg_reply > metrics.compare_qiyu_raw.avg_reply ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                      <div className="border-t border-slate-100 pt-4">
                        <span className="block text-xs text-slate-400 font-semibold mb-1">平均会话时长</span>
                        <span className="text-3xl font-black text-[#C55A11] font-mono">{(metrics.current_qiyu_raw.avg_session_duration || 0).toFixed(2)}s</span>
                        {metrics.compare_qiyu_raw.avg_session_duration && metrics.current_qiyu_raw.avg_session_duration && (
                          <span className={`text-[11px] ml-1 font-bold font-mono ${metrics.current_qiyu_raw.avg_session_duration > metrics.compare_qiyu_raw.avg_session_duration ? 'text-red-500' : 'text-emerald-600'}`}>
                            {metrics.current_qiyu_raw.avg_session_duration > metrics.compare_qiyu_raw.avg_session_duration ? '+' : ''}
                            {((metrics.current_qiyu_raw.avg_session_duration - metrics.compare_qiyu_raw.avg_session_duration) / metrics.compare_qiyu_raw.avg_session_duration * 100).toFixed(2)}% 
                            {metrics.current_qiyu_raw.avg_session_duration > metrics.compare_qiyu_raw.avg_session_duration ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="bg-indigo-50/20 py-4 px-3.5 text-[11.5px] text-slate-500 font-mono leading-relaxed border-t border-slate-100 flex-none space-y-1">
                      <div className="flex justify-between items-center">
                        <span>30s应答率:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800">{((metrics.current_qiyu_raw.reply_30s_pct ?? 0.4565) * 100).toFixed(2)}%</span>
                          {metrics.compare_qiyu_raw.reply_30s_pct !== undefined && metrics.current_qiyu_raw.reply_30s_pct !== undefined && (
                            <span className={`text-[10px] font-bold ${metrics.current_qiyu_raw.reply_30s_pct > metrics.compare_qiyu_raw.reply_30s_pct ? 'text-emerald-600' : 'text-red-500'}`}>
                              {metrics.current_qiyu_raw.reply_30s_pct > metrics.compare_qiyu_raw.reply_30s_pct ? '↑' : '↓'}
                              {Math.abs((metrics.current_qiyu_raw.reply_30s_pct - metrics.compare_qiyu_raw.reply_30s_pct) * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>答问比:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800">{((metrics.current_qiyu_raw.answer_to_question_ratio ?? 0.7071) * 100).toFixed(2)}%</span>
                          {metrics.compare_qiyu_raw.answer_to_question_ratio !== undefined && metrics.current_qiyu_raw.answer_to_question_ratio !== undefined && (
                            <span className={`text-[10px] font-bold ${metrics.current_qiyu_raw.answer_to_question_ratio > metrics.compare_qiyu_raw.answer_to_question_ratio ? 'text-emerald-600' : 'text-red-500'}`}>
                              {metrics.current_qiyu_raw.answer_to_question_ratio > metrics.compare_qiyu_raw.answer_to_question_ratio ? '↑' : '↓'}
                              {Math.abs((metrics.current_qiyu_raw.answer_to_question_ratio - metrics.compare_qiyu_raw.answer_to_question_ratio) * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>相对满意度:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800">{((metrics.current_qiyu_raw.relative_satisfaction ?? 0.9921) * 100).toFixed(2)}%</span>
                          {metrics.compare_qiyu_raw.relative_satisfaction !== undefined && metrics.current_qiyu_raw.relative_satisfaction !== undefined && (
                            <span className={`text-[10px] font-bold ${metrics.current_qiyu_raw.relative_satisfaction > metrics.compare_qiyu_raw.relative_satisfaction ? 'text-emerald-600' : 'text-red-500'}`}>
                              {metrics.current_qiyu_raw.relative_satisfaction > metrics.compare_qiyu_raw.relative_satisfaction ? '↑' : '↓'}
                              {Math.abs((metrics.current_qiyu_raw.relative_satisfaction - metrics.compare_qiyu_raw.relative_satisfaction) * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Editable Commentary */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-[#C55A11] uppercase tracking-wider flex items-center gap-1.5">
                    <div className="w-1.5 h-3 bg-[#C55A11] rounded-xs" />
                    <span>分析 &amp; 优化措施:</span>
                  </h3>
                  {!isPdf && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => handleLoadPrevComment("slide5Comment", getDefaultValues(metrics.curr_month_label, metrics).s5)}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold bg-indigo-50 hover:bg-indigo-100 px-2.5 py-0.5 rounded-md transition cursor-pointer shadow-3xs"
                        title="载入上月该项保存的分析文字"
                      >
                        📋 继承上月分析
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const defaults = getDefaultValues(metrics.curr_month_label, metrics);
                          saveSlide5Comment(defaults.s5);
                        }}
                        className="text-slate-500 hover:text-slate-700 font-medium bg-slate-100 hover:bg-slate-200 px-2.5 py-0.5 rounded-md transition cursor-pointer"
                        title="恢复当前月份基于数据生成的默认分析"
                      >
                         恢复默认分析
                      </button>
                    </div>
                  )}
                </div>
                <CollaborativeInput
                  value={slide5Comment}
                  onChange={(val) => {
                    localEditsRef.current.slide5Comment = val;
                  }}
                  onFocus={() => setEditingField("slide5Comment")}
                  onBlur={(val) => {
                    setEditingField(null);
                    saveSlide5Comment(val);
                  }}
                  fieldKey="slide5Comment"
                  activeEditors={activeEditors}
                  className="editable-commentary p-4 bg-slate-50 border border-dashed border-slate-200 hover:border-indigo-300 text-xs text-slate-700 rounded-xl leading-relaxed cursor-text outline-none transition-colors focus:bg-amber-50/30 focus:border-indigo-400 shadow-3xs"
                  style={{ fontFamily: '"Inter", "PingFang SC", "Lantinghei SC", "Helvetica Neue", "Microsoft YaHei", sans-serif' }}
                  isBullet={false}
                />
              </div>
            </div>

            {/* Bottom Footer */}
            <div className="text-[10px] text-slate-300 text-right font-mono border-t border-slate-50 pt-2">
            </div>
          </div>
        );

      case 5:
        // SLIDE 6: 数据维护分析 (堂食/外卖/营销活动)
        return (
          <div className="w-full h-full flex flex-col justify-between px-12 py-8 bg-white relative">
            <div>
              {/* PPT Title Header */}
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-4 relative">
                <div className="w-2.5 h-6 bg-[#2F3EE4] rounded-sm" />
                <h2 className="text-xl font-bold text-slate-800 tracking-tight font-sans">数据维护分析</h2>
                <div className="ml-auto flex items-center gap-4">
                  {/* Stats Labels on Top Right as in PDF */}
                  <div className="flex gap-3 text-[11px] font-bold text-slate-500 font-sans">
                    <span>{metrics.prev_month_label}总数据: <b className="text-indigo-600 font-mono">{metrics.prev_boh_total.toLocaleString()}</b> 次</span>
                    <span className="text-slate-300">|</span>
                    <span>{metrics.curr_month_label}总数据: <b className="text-[#C55A11] font-mono">{metrics.curr_boh_total.toLocaleString()}</b> 次</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono tracking-wider">PAGE {pageNumStr} / {totalNumStr}</span>
                </div>
              </div>

              <div className="mb-2 text-center">
                <h4 className="text-xs font-bold text-slate-700">📋 三品牌数据维护分析</h4>
              </div>

              {/* Three brand charts side-by-side array */}
              <div className="grid grid-cols-3 gap-6 mb-5">
                {/* 太二 */}
                <div className="bg-slate-50/50 border border-slate-100/80 rounded-xl p-4 shadow-2xs">
                  <div className="flex justify-between items-center border-b border-slate-200/60 pb-1.5 mb-2.5">
                    <span className="text-xs font-bold text-slate-800">太二</span>
                    <span className="text-[9px] font-bold text-slate-400 font-mono uppercase">TAIER BOH</span>
                  </div>
                  <div className="h-[270px]">
                    <BrandBohChart
                      current={metrics.curr_boh_data["太二"]}
                      compare={metrics.prev_boh_data["太二"]}
                      prevLabel={metrics.prev_month_label}
                      currLabel={metrics.curr_month_label}
                    />
                  </div>
                </div>

                {/* 怂 */}
                <div className="bg-slate-50/50 border border-slate-100/80 rounded-xl p-4 shadow-2xs">
                  <div className="flex justify-between items-center border-b border-slate-200/60 pb-1.5 mb-2.5">
                    <span className="text-xs font-bold text-slate-800">怂</span>
                    <span className="text-[9px] font-bold text-slate-400 font-mono uppercase">SONG BOH</span>
                  </div>
                  <div className="h-[270px]">
                    <BrandBohChart
                      current={metrics.curr_boh_data["怂"]}
                      compare={metrics.prev_boh_data["怂"]}
                      prevLabel={metrics.prev_month_label}
                      currLabel={metrics.curr_month_label}
                    />
                  </div>
                </div>

                {/* 九毛九 */}
                <div className="bg-slate-50/50 border border-slate-100/80 rounded-xl p-4 shadow-2xs">
                  <div className="flex justify-between items-center border-b border-slate-200/60 pb-1.5 mb-2.5">
                    <span className="text-xs font-bold text-slate-800">九毛九</span>
                    <span className="text-[9px] font-bold text-slate-400 font-mono uppercase">99_GROUP</span>
                  </div>
                  <div className="h-[270px]">
                    <BrandBohChart
                      current={metrics.curr_boh_data["九毛九"]}
                      compare={metrics.prev_boh_data["九毛九"]}
                      prevLabel={metrics.prev_month_label}
                      currLabel={metrics.curr_month_label}
                    />
                  </div>
                </div>
              </div>

              {/* Commentary */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-[#C55A11] uppercase tracking-wider flex items-center gap-1.5">
                    <div className="w-1.5 h-3 bg-[#C55A11] rounded-xs" />
                    <span>分析 &amp; 优化措施:</span>
                  </h3>
                  {!isPdf && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleLoadPrevComment("slide6Comment", getDefaultValues(metrics.curr_month_label, metrics).s6)}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold bg-indigo-50 hover:bg-indigo-100 px-2.5 py-0.5 rounded-md transition cursor-pointer shadow-3xs"
                      title="载入上月该项保存的分析文字"
                    >
                      📋 继承上月分析
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const defaults = getDefaultValues(metrics.curr_month_label, metrics);
                        saveSlide6Comment(defaults.s6);
                      }}
                      className="text-slate-500 hover:text-slate-700 font-medium bg-slate-100 hover:bg-slate-200 px-2.5 py-0.5 rounded-md transition cursor-pointer"
                      title="恢复当前月份基于数据生成的默认分析"
                    >
                      ✨ 恢复默认分析
                    </button>
                  </div>
                  )}
                </div>
                <CollaborativeInput
                  value={slide6Comment}
                  onChange={(val) => {
                    localEditsRef.current.slide6Comment = val;
                  }}
                  onFocus={() => setEditingField("slide6Comment")}
                  onBlur={(val) => {
                    setEditingField(null);
                    saveSlide6Comment(val);
                  }}
                  fieldKey="slide6Comment"
                  activeEditors={activeEditors}
                  className="editable-commentary p-4 bg-slate-50 border border-dashed border-slate-200 hover:border-indigo-300 text-xs text-slate-700 rounded-xl leading-relaxed cursor-text outline-none transition-colors focus:bg-amber-50/30 focus:border-indigo-400 shadow-3xs"
                  style={{ fontFamily: '"Inter", "PingFang SC", "Lantinghei SC", "Helvetica Neue", "Microsoft YaHei", sans-serif' }}
                  isBullet={false}
                />
              </div>
            </div>

            {/* Bottom Footer */}
            <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-2 flex justify-between font-mono">
              <span></span>
              <span>CONFIDENTIAL</span>
            </div>
          </div>
        );

      case 6:
        // SLIDE 7: 硬件维修分析
        return (
          <div className="w-full h-full flex flex-col justify-between px-12 py-8 bg-white relative">
            <div>
              {/* PPT Title Header */}
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-4 relative">
                <div className="w-2.5 h-6 bg-[#2F3EE4] rounded-sm" />
                <h2 className="text-xl font-bold text-slate-800 tracking-tight font-sans">硬件维修分析</h2>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-mono tracking-wider">PAGE {pageNumStr} / {totalNumStr}</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-sans font-semibold">99_IT</span>
                </div>
              </div>

              {/* Grid with bordered groupings as shown in PDF Page 7 */}
              <div className="grid grid-cols-12 gap-6 mb-5">
                {/* Left group box with title: 门店报修数排行 (Top 5) & 问题类型分布 */}
                <div className="col-span-8 border border-slate-200 rounded-xl p-4.5 bg-slate-50/30 shadow-2xs">
                  <span className="text-[11px] font-bold text-indigo-700 block mb-2.5 font-sans">📊 门店叫修系统分类及单量排行 (千康系统)</span>
                  <div className="grid grid-cols-2 gap-5">
                    {/* Categories distribution table */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-1.5 text-center">故障大类数量占比</span>
                      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-3xs">
                        <table className="w-full text-[10px] text-center border-collapse">
                          <thead>
                            <tr className="bg-[#FCE6D6] text-[#59341B] font-bold border-b border-slate-200">
                              <th className="py-1.5 px-2 text-left font-sans border-r border-slate-200/50">故障大类</th>
                              <th className="py-1.5 px-2 font-sans border-r border-slate-200/50">叫修单量</th>
                              <th className="py-1.5 px-2 font-sans">数量占比</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(metrics.ticket_cate_distribution)
                              .sort((a, b) => (b[1] as number) - (a[1] as number))
                              .map(([category, count]) => {
                                const values = Object.values(metrics.ticket_cate_distribution) as number[];
                                const total = values.reduce((sum: number, v: number) => sum + v, 0) || 1;
                                const countNum = count as number;
                                const pct = ((countNum / total) * 100).toFixed(1) + "%";
                                return (
                                  <tr key={category} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                    <td className="py-1.5 px-2 text-left font-medium text-slate-700 flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full flex-none" />
                                      {category}
                                    </td>
                                    <td className="py-1.5 px-2 font-semibold text-slate-800 font-mono">{countNum}</td>
                                    <td className="py-1.5 px-2 font-medium text-indigo-600 font-mono">{pct}</td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Ranking distribution */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-1.5 text-center">报修 Top 5 门店监测</span>
                      <div className="h-[240px] w-full">
                        <TicketShopRankingChart ranking={metrics.ticket_shop_ranking} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right group box: 各品牌报修数量 */}
                <div className="col-span-4 border border-slate-200 rounded-xl p-4.5 bg-slate-50/30 flex flex-col shadow-2xs">
                  <span className="text-[11px] font-bold text-[#C55A11] block mb-2.5 font-sans">📊 核心三大品牌叫修单量分布</span>
                  <div className="h-[240px] w-full my-auto">
                    <TicketBrandsChart distribution={metrics.ticket_brand_distribution} />
                  </div>
                </div>
              </div>

              {/* Commentary */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-[#C55A11] uppercase tracking-wider flex items-center gap-1.5">
                    <div className="w-1.5 h-3 bg-[#C55A11] rounded-xs" />
                    <span>分析 &amp; 优化措施:</span>
                  </h3>
                  {!isPdf && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleLoadPrevComment("slide7Comment", getDefaultValues(metrics.curr_month_label, metrics).s7)}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold bg-indigo-50 hover:bg-indigo-100 px-2.5 py-0.5 rounded-md transition cursor-pointer shadow-3xs"
                      title="载入上月该项保存的分析文字"
                    >
                      📋 继承上月分析
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const defaults = getDefaultValues(metrics.curr_month_label, metrics);
                        saveSlide7Comment(defaults.s7);
                      }}
                      className="text-slate-500 hover:text-slate-700 font-medium bg-slate-100 hover:bg-slate-200 px-2.5 py-0.5 rounded-md transition cursor-pointer"
                      title="恢复当前月份基于数据生成的默认分析"
                    >
                      ✨ 恢复默认分析
                    </button>
                  </div>
                  )}
                </div>
                <CollaborativeInput
                  value={slide7Comment}
                  onChange={(val) => {
                    localEditsRef.current.slide7Comment = val;
                  }}
                  onFocus={() => setEditingField("slide7Comment")}
                  onBlur={(val) => {
                    setEditingField(null);
                    saveSlide7Comment(val);
                  }}
                  fieldKey="slide7Comment"
                  activeEditors={activeEditors}
                  className="editable-commentary p-4 bg-slate-50 border border-dashed border-slate-200 hover:border-indigo-300 text-xs text-slate-700 rounded-xl leading-relaxed cursor-text outline-none transition-colors focus:bg-amber-50/30 focus:border-indigo-400 shadow-3xs"
                  style={{ fontFamily: '"Inter", "PingFang SC", "Lantinghei SC", "Helvetica Neue", "Microsoft YaHei", sans-serif' }}
                  isBullet={false}
                />
              </div>
            </div>

            {/* Bottom Footer */}
            <div className="text-[10px] text-slate-300 text-right font-mono border-t border-slate-50 pt-2">
              * 工单系统: 叫修工单拉取自千康报修系统数据库。
            </div>
          </div>
        );

      case 7:
        // SLIDE 8: 门店装修& 第三方服务效率
        return (
          <div className="w-full h-full flex flex-col justify-between px-12 py-8 bg-white relative">
            <div>
              {/* PPT Title Header */}
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-4 relative">
                <div className="w-2.5 h-6 bg-[#2F3EE4] rounded-sm" />
                <h2 className="text-xl font-bold text-slate-800 tracking-tight font-sans">门店装修 &amp; 第三方服务效率</h2>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-mono tracking-wider">PAGE {pageNumStr} / {totalNumStr}</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-sans font-semibold">99_IT</span>
                </div>
              </div>

              {/* Side-by-side charts */}
              <div className="grid grid-cols-2 gap-6 mb-5">
                {/* Left Card: 旧改门店数 */}
                <div className="border border-slate-200/80 rounded-xl p-4.5 bg-slate-50/20 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-700 block mb-2 text-center">🛠️ 当月门店开业情况</span>
                  <div className="h-[275px] w-full">
                    <RenovationChart
                      renovationCount={metrics.current_renwood_count}
                      newShopsCount={metrics.current_new_shops}
                    />
                  </div>
                </div>

                {/* Right Card: 第三方供应商效能对比 */}
                <div className="border border-slate-200/80 rounded-xl p-4.5 bg-slate-50/20 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-700 block mb-2 text-center">📈 第三方IT维修</span>
                  <div className="h-[275px] w-full">
                    <SuppliersEfficiencyChart splits={metrics.supplier_splits} />
                  </div>
                </div>
              </div>

              {/* Commentary */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-[#C55A11] uppercase tracking-wider flex items-center gap-1.5">
                    <div className="w-1.5 h-3 bg-[#C55A11] rounded-xs" />
                    <span>分析 &amp; 优化措施:</span>
                  </h3>
                  {!isPdf && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleLoadPrevComment("slide8Comment", getDefaultValues(metrics.curr_month_label, metrics).s8)}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold bg-indigo-50 hover:bg-indigo-100 px-2.5 py-0.5 rounded-md transition cursor-pointer shadow-3xs"
                      title="载入上月该项保存的分析文字"
                    >
                      📋 继承上月分析
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const defaults = getDefaultValues(metrics.curr_month_label, metrics);
                        saveSlide8Comment(defaults.s8);
                      }}
                      className="text-slate-500 hover:text-slate-700 font-medium bg-slate-100 hover:bg-slate-200 px-2.5 py-0.5 rounded-md transition cursor-pointer"
                      title="恢复当前月份基于数据生成的默认分析"
                    >
                      ✨ 恢复默认分析
                    </button>
                  </div>
                  )}
                </div>
                <CollaborativeInput
                  value={slide8Comment}
                  onChange={(val) => {
                    localEditsRef.current.slide8Comment = val;
                  }}
                  onFocus={() => setEditingField("slide8Comment")}
                  onBlur={(val) => {
                    setEditingField(null);
                    saveSlide8Comment(val);
                  }}
                  fieldKey="slide8Comment"
                  activeEditors={activeEditors}
                  className="editable-commentary p-4 bg-slate-50 border border-dashed border-slate-200 hover:border-indigo-300 text-xs text-slate-700 rounded-xl leading-relaxed cursor-text outline-none transition-colors focus:bg-amber-50/30 focus:border-indigo-400 shadow-3xs"
                  style={{ fontFamily: '"Inter", "PingFang SC", "Lantinghei SC", "Helvetica Neue", "Microsoft YaHei", sans-serif' }}
                  isBullet={false}
                />
              </div>
            </div>

            {/* Bottom Footer */}
            <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-2 flex justify-between font-mono">
              <span></span>
              <span>CONFIDENTIAL</span>
            </div>
          </div>
        );

      case 8:
        // 最后一页：致谢结束页
        return (
          <div className="relative w-full h-full flex flex-col justify-between p-16 select-none bg-white">
            {/* Elegant abstract closing artwork */}
            <div className="absolute top-1/4 right-0 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-[#2F3EE4]/10 to-[#8A94F8]/5 blur-3xl" />
            <div className="absolute top-1/3 right-12 w-28 h-28 border-[12px] border-[#2F3EE4]/10 rounded-full" />
            <div className="absolute top-12 right-24 w-12 h-12 border border-[#2F3EE4]/20 rounded-full animate-bounce duration-[4000ms]" />

            {/* Slide Header */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-400 font-bold tracking-widest">九毛九集团 IT OPERATIONS</span>
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
            </div>

            {/* Slide Main Content */}
            <div className="my-auto relative z-10">
              <h1 className="text-5xl font-black text-slate-800 font-sans tracking-tight leading-tight">
                谢谢观看！
              </h1>
              <div className="w-16 h-1.5 bg-[#C55A11] mt-6 rounded-full" />
              <p className="text-sm text-slate-500 mt-4 font-sans max-w-sm leading-relaxed">
                如有任何运维疑问，请随时向我们联系，谢谢！
              </p>
            </div>

            {/* Slide Footer */}
            <div className="flex justify-between items-end border-t border-slate-100 pt-6">
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Department</span>
                <span className="text-sm font-semibold text-slate-700">九毛九集团-餐厅体验部</span>
              </div>
              <div className="text-right">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Page</span>
                <span className="text-sm font-semibold text-indigo-600 font-mono font-bold">
                  PAGE {pageNumStr} / {totalNumStr}
                </span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 📺 SCREEN DISPLAY ONLY */}
      <div className="print:hidden space-y-6">
        {/* 👑 Mode Switcher and Slide Control Center */}
        <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">月报可视化</h3>
              <p className="text-[11px] text-slate-400 font-medium">当前共 {totalSlides} 页报告</p>
            </div>
          </div>

          {/* View Toggle Buttons + Add Project Slide */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setIsPptMode(true)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isPptMode
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                PPT 演讲模式
              </button>
              <button
                onClick={() => setIsPptMode(false)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  !isPptMode
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
                全览模式 (长屏滚动)
              </button>
            </div>

            <button
              onClick={handleAddProjectSlide}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer hover:shadow-md active:scale-95"
            >
              <span className="text-sm font-black text-indigo-200">+</span>
              <span>新增重点项目专页</span>
            </button>
          </div>
        </div>

        {/* 🔀 Slide Reorder Drag & Drop Navigation Bar */}
        <div className="bg-white border border-slate-200/80 p-3 rounded-2xl shadow-xs space-y-2">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center text-xs px-1 gap-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <span className="text-base">↕️</span>
              <span>PPT 页面自由拖拽排序</span>
              <span className="text-[11px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-semibold">
                按住 ⠿ 拖动调整页序
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
                例如：把 09 拖到第二页下面，序号与右上角 PAGE 即自动变 03
              </span>
              <button
                type="button"
                onClick={handleResetSlideOrder}
                className="text-[11px] text-slate-500 hover:text-indigo-600 font-medium px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white transition cursor-pointer shadow-3xs"
              >
                恢复默认顺序
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-thin">
            {slideOrder.map((item, idx) => {
              const pageStr = String(idx + 1).padStart(2, "0");
              const isSelected = currentSlideIndex === idx;
              const isDragging = draggedSlideIdx === idx;

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, idx)}
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-sans transition-all select-none cursor-grab active:cursor-grabbing ${
                    isDragging
                      ? "opacity-40 border-dashed border-indigo-400 bg-indigo-50"
                      : isSelected
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-700"
                  }`}
                >
                  <span className={`font-mono font-bold text-[11px] cursor-grab ${isSelected ? "text-indigo-200" : "text-slate-400 hover:text-slate-600"}`}>
                    ⠿
                  </span>
                  <span className="font-mono font-extrabold opacity-90">
                    {pageStr}.
                  </span>
                  <span className="font-semibold max-w-[110px] truncate" title={item.title}>
                    {item.title}
                  </span>

                  {/* Micro step arrows for accessibility & precise move */}
                  <div className="flex items-center gap-0.5 ml-1 opacity-70 hover:opacity-100">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveSlide(idx, -1);
                      }}
                      className={`px-1 py-0.2 rounded disabled:opacity-20 text-[9px] cursor-pointer ${
                        isSelected ? "hover:bg-white/20 text-white" : "hover:bg-slate-200 text-slate-600"
                      }`}
                      title="向前移动"
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      disabled={idx === slideOrder.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveSlide(idx, 1);
                      }}
                      className={`px-1 py-0.2 rounded disabled:opacity-20 text-[9px] cursor-pointer ${
                        isSelected ? "hover:bg-white/20 text-white" : "hover:bg-slate-200 text-slate-600"
                      }`}
                      title="向后移动"
                    >
                      ▶
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 📺 The main slides frame */}
        {isPptMode ? (
          <div className="flex flex-col items-center gap-4">
            {/* PPT slide container */}
            <div className="w-full max-w-[1120px] aspect-[16/10] sm:aspect-[16/9] bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden relative transition-all duration-300">
              {renderSlide(currentSlideIndex)}
            </div>

            {/* Pagination Controls bar */}
            <div className="flex items-center justify-between w-full max-w-[1120px] bg-slate-50 border border-slate-200/50 px-4 py-2 rounded-xl">
              <button
                disabled={currentSlideIndex === 0}
                onClick={() => setCurrentSlideIndex(prev => prev - 1)}
                className="px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-xs font-bold rounded-lg border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
              >
                ◀ 上一页
              </button>

              {/* Centered slide indicator index buttons */}
              <div className="hidden sm:flex items-center gap-1.5 flex-wrap justify-center">
                {Array.from({ length: totalSlides }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`w-6 h-6 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${
                      currentSlideIndex === idx
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200/60"
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              <button
                disabled={currentSlideIndex === totalSlides - 1}
                onClick={() => setCurrentSlideIndex(prev => prev + 1)}
                className="px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                下一页 ▶
              </button>
            </div>
          </div>
        ) : (
          /* Continuous scroll mode rendering all slides stacked vertically */
          <div className="space-y-12">
            {Array.from({ length: totalSlides }).map((_, idx) => (
              <div
                key={idx}
                className="w-full max-w-[1120px] aspect-[16/10] sm:aspect-[16/9] bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden relative mx-auto"
              >
                {renderSlide(idx)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🖨️ DEDICATED PRINT CONTAINER */}
      {isPrinting && (
        <PdfContext.Provider value={true}>
          <div className="hidden print:block bg-white">
            {Array.from({ length: totalSlides }).map((_, idx) => (
              <div key={idx} className="print-slide-page">
                <div className="print-slide-content">
                  {renderSlide(idx)}
                </div>
              </div>
            ))}
          </div>
        </PdfContext.Provider>
      )}

      {/* 📥 DEDICATED OFF-SCREEN PDF GENERATION CONTAINER */}
      {isExporting && (
        <PdfContext.Provider value={true}>
          <div 
            id="pdf-generation-deck"
            className="no-print"
            style={{ 
              position: "fixed", 
              left: "-10000px", 
              top: "0", 
              width: "1120px", 
              height: "700px",
              pointerEvents: "none",
              zIndex: -1
            }}
          >
            {Array.from({ length: totalSlides }).map((_, idx) => (
              <div 
                key={idx} 
                id={`pdf-target-slide-${idx}`}
                style={{ 
                  width: "1120px", 
                  height: "700px", 
                  backgroundColor: "#ffffff",
                  overflow: "hidden",
                  position: "relative",
                  display: "block"
                }}
              >
                {renderSlide(idx)}
              </div>
            ))}
          </div>
        </PdfContext.Provider>
      )}

      {/* 🔄 GORGEOUS PDF EXPORT LOADING DIALOG */}
      {isExporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl max-w-md w-full mx-4 text-center">
            <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              {/* Outer spinning ring */}
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin" />
              {/* Inner pulsing circle */}
              <div className="w-16 h-16 rounded-full bg-indigo-500/15 flex items-center justify-center text-indigo-400">
                <svg className="w-8 h-8 animate-bounce" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </div>
            </div>
            
            <h3 className="text-white text-lg font-extrabold tracking-tight mb-2">
              正在生成无损高规 PDF 报告
            </h3>
            <p className="text-slate-400 text-xs mb-6 font-mono">
              {exportStep}
            </p>

            {/* Progress bar */}
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-3">
              <div 
                className="bg-indigo-500 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
              <span>PROGRESS</span>
              <span>{exportProgress}%</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
