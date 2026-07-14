import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, HelpCircle } from "lucide-react";

interface BrandItem {
  id: string;
  name: string;
  subText: string;
  emoji: string;
  bgClass: string;
  textColor: string;
  width: number;
  height: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  image?: string;
}

interface BrandCollisionChamberProps {
  loginCardRef: React.RefObject<HTMLDivElement | null>;
  customLogos?: Record<string, string>;
}

export const BrandCollisionChamber: React.FC<BrandCollisionChamberProps> = ({ loginCardRef, customLogos }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [items, setItems] = useState<BrandItem[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [gravityEnabled, setGravityEnabled] = useState<boolean>(false);
  const [bounceCount, setBounceCount] = useState<number>(0);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const prevMousePos = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const mouseVelocity = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const requestRef = useRef<number | null>(null);
  const stateRef = useRef<BrandItem[]>([]);

  // 粒子轨迹及震动反馈核心状态
  const particlesRef = useRef<Array<{ x: number, y: number, vx: number, vy: number, alpha: number, size: number, color: string }>>([]);
  const [clickedStates, setClickedStates] = useState<Record<string, { scale: number; rotate: number }>>({});
  const dragStartPos = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
  const hasDragged = useRef<boolean>(false);
  const lastVibeTime = useRef<number>(0);

  // 极轻微硬件/视觉震动反馈
  const triggerCollisionVibration = () => {
    try {
      if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(10);
      }
    } catch (e) {}

    if (containerRef.current) {
      containerRef.current.classList.add("animate-vibrate-chamber");
      setTimeout(() => {
        containerRef.current?.classList.remove("animate-vibrate-chamber");
      }, 150);
    }
  };

  // 生成粒子拖尾效果
  const spawnParticles = (x: number, y: number) => {
    const colors = [
      "rgba(244, 63, 94, opacity)", // 太二 / 九毛九
      "rgba(245, 158, 11, opacity)", // 怂火锅
      "rgba(16, 185, 129, opacity)", // 山外面 / 短裤咖啡
      "rgba(14, 165, 233, opacity)",  // 潮那边
      "rgba(99, 102, 241, opacity)"   // IT99
    ];
    const count = 2;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 0.8;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 0.6 + Math.random() * 0.4,
        size: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  };

  // 碰撞时的彩色粒子喷涌
  const spawnCollisionBurst = (x: number, y: number, colorClass: string) => {
    let baseColor = "rgba(14, 165, 233, opacity)";
    if (colorClass.includes("rose")) baseColor = "rgba(244, 63, 94, opacity)";
    else if (colorClass.includes("orange")) baseColor = "rgba(249, 115, 22, opacity)";
    else if (colorClass.includes("amber")) baseColor = "rgba(245, 158, 11, opacity)";
    else if (colorClass.includes("emerald") || colorClass.includes("green")) baseColor = "rgba(16, 185, 129, opacity)";
    else if (colorClass.includes("pink")) baseColor = "rgba(236, 72, 153, opacity)";
    else if (colorClass.includes("indigo")) baseColor = "rgba(99, 102, 241, opacity)";
    else if (colorClass.includes("zinc") || colorClass.includes("stone")) baseColor = "rgba(100, 116, 139, opacity)";

    const count = 6;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * 1.8;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 0.8,
        size: 2 + Math.random() * 4,
        color: baseColor
      });
    }
  };

  const triggerCollisionFeedback = (x: number, y: number, bgClass: string) => {
    const now = performance.now();
    if (now - lastVibeTime.current > 120) {
      lastVibeTime.current = now;
      triggerCollisionVibration();
    }
    spawnCollisionBurst(x, y, bgClass);
  };

  // 10个极具九毛九集团品牌特色的卡片定义
  const initialBrands = [
    {
      id: "taier",
      name: "太二",
      subText: "酸菜鱼",
      emoji: "🐟",
      bgClass: "bg-zinc-950 border border-zinc-800 shadow-zinc-950/40",
      textColor: "text-white",
      image: "/taier.png"
    },
    {
      id: "song",
      name: "怂火锅",
      subText: "火锅厂",
      emoji: "🔥",
      bgClass: "bg-orange-500 shadow-orange-500/30",
      textColor: "text-white",
      image: "/song.png"
    },
    {
      id: "jiumaojiu",
      name: "九毛九",
      subText: "西北菜",
      emoji: "🐑",
      bgClass: "bg-rose-600 shadow-rose-600/30",
      textColor: "text-white",
      image: "/jiumaojiu.png"
    },
    {
      id: "shanwaimian",
      name: "山外面",
      subText: "酸汤火锅",
      emoji: "🍲",
      bgClass: "bg-emerald-800 shadow-emerald-800/30",
      textColor: "text-emerald-100",
      image: "/shanwaimian.png"
    },
    {
      id: "shorts",
      name: "短裤咖啡",
      subText: "SHORTS",
      emoji: "☕",
      bgClass: "bg-green-500 shadow-green-500/20",
      textColor: "text-slate-900",
      image: "/shorts.png"
    },
    {
      id: "shangxianyue",
      name: "赏鲜悦木",
      subText: "牛肉火锅",
      emoji: "🥩",
      bgClass: "bg-stone-900 border border-amber-500/20 shadow-stone-950/50",
      textColor: "text-amber-400",
      image: "/shangxianyue.jpeg"
    },
    {
      id: "chao",
      name: "潮那边",
      subText: "CHÁO",
      emoji: "⛰️",
      bgClass: "bg-indigo-950 shadow-indigo-950/40",
      textColor: "text-sky-300",
      image: "/chaonabian.png"
    },
    {
      id: "taierGJ",
      name: "太二·经典",
      subText: "雕刻大厨",
      emoji: "🔪",
      bgClass: "bg-zinc-900 shadow-zinc-950/20",
      textColor: "text-white",
      image: "/taierGJ.png"
    },
    {
      id: "unclechef",
      name: "那未大叔",
      subText: "是大厨",
      emoji: "🍳",
      bgClass: "bg-teal-700 shadow-teal-700/20",
      textColor: "text-white",
      image: "/datou.png"
    },
    {
      id: "group",
      name: "九毛九集团",
      subText: "总部",
      emoji: "💻",
      bgClass: "bg-amber-400 border-2 border-rose-500 shadow-amber-400/30",
      textColor: "text-slate-900",
      image: "/group.png"
    }
  ];

  // 初始化位置，散落放置在屏幕四周，不要重叠，且避开中央登录框
  const initializePositions = () => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;

    // 获取登录框范围
    let cardRect = { left: cw / 2 - 224, right: cw / 2 + 224, top: ch / 2 - 240, bottom: ch / 2 + 240 };
    if (loginCardRef.current && containerRef.current) {
      const cBox = containerRef.current.getBoundingClientRect();
      const lBox = loginCardRef.current.getBoundingClientRect();
      cardRect = {
        left: lBox.left - cBox.left - 20,
        right: lBox.right - cBox.left + 20,
        top: lBox.top - cBox.top - 20,
        bottom: lBox.bottom - cBox.top + 20
      };
    }

    const size = 80;
    const rad = size / 2;

    const brandItems: BrandItem[] = initialBrands.map((b, idx) => {
      // 尝试在容器空闲位置随机放置
      let x = 0;
      let y = 0;
      let attempts = 0;
      let ok = false;

      while (!ok && attempts < 100) {
        attempts++;
        // 随机在容器内摆放，边缘留出20px余量
        x = rad + Math.random() * (cw - size - rad);
        y = rad + Math.random() * (ch - size - rad);

        // 检测是否与登录框重合
        const overlapLogin =
          x + rad > cardRect.left &&
          x - rad < cardRect.right &&
          y + rad > cardRect.top &&
          y - rad < cardRect.bottom;

        if (overlapLogin) continue;

        ok = true;
      }

      // 给它一个好玩的初始随机速度
      const speedScale = 1.8 + Math.random() * 1.5;
      const angle = Math.random() * Math.PI * 2;

      const finalImage = (customLogos && customLogos[b.id]) || b.image;

      return {
        ...b,
        image: finalImage,
        width: size,
        height: size,
        radius: rad,
        mass: 1,
        x,
        y,
        vx: Math.cos(angle) * speedScale,
        vy: Math.sin(angle) * speedScale
      };
    });

    stateRef.current = brandItems;
    setItems([...brandItems]);
  };

  // 当自定义Logo改变时，动态更新当前物理舱内悬浮刚体的图片并刷新加载状态，保持碰撞状态连贯
  useEffect(() => {
    setItems(prevItems => {
      const updated = prevItems.map(item => {
        const customImage = customLogos?.[item.id];
        const defaultBrand = initialBrands.find(b => b.id === item.id);
        const finalImage = customImage || defaultBrand?.image;
        return { ...item, image: finalImage };
      });
      stateRef.current = updated;
      return updated;
    });
    setFailedImages({});
  }, [customLogos]);

  // 窗口大小变化时重新摆放
  useEffect(() => {
    initializePositions();
    window.addEventListener("resize", initializePositions);
    return () => window.removeEventListener("resize", initializePositions);
  }, []);

  // Canvas 拖尾画布尺寸初始化与更新
  useEffect(() => {
    const resizeCanvas = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  // 物理模拟引擎循环与粒子渲染
  useEffect(() => {
    const loop = () => {
      // 粒子系统重绘与动画更新 (即使暂停了物理，拖尾粒子也应当正常消散/绘制)
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const currentParticles = particlesRef.current;
          const currentItems = stateRef.current;

          for (let i = currentParticles.length - 1; i >= 0; i--) {
            const p = currentParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.015;
            p.size *= 0.98;

            if (p.alpha <= 0 || p.size <= 0.1) {
              currentParticles.splice(i, 1);
              continue;
            }

            // 粒子与 Logo 方块产生轻微排斥联动，增强科技交互感
            for (const item of currentItems) {
              const dx = p.x - item.x;
              const dy = p.y - item.y;
              const dist = Math.hypot(dx, dy);
              if (dist < item.radius + 15) {
                const force = (item.radius + 15 - dist) * 0.05;
                const angle = Math.atan2(dy, dx);
                p.vx += Math.cos(angle) * force;
                p.vy += Math.sin(angle) * force;
              }
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color.replace("opacity", p.alpha.toFixed(2));
            ctx.fill();
          }
        }
      }

      if (!isPlaying || !containerRef.current) {
        requestRef.current = requestAnimationFrame(loop);
        return;
      }

      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;

      // 提取中央登录卡片盒子
      let cardRect = { left: cw / 2 - 224, right: cw / 2 + 224, top: ch / 2 - 240, bottom: ch / 2 + 240 };
      if (loginCardRef.current && containerRef.current) {
        const cBox = containerRef.current.getBoundingClientRect();
        const lBox = loginCardRef.current.getBoundingClientRect();
        cardRect = {
          left: lBox.left - cBox.left,
          right: lBox.right - cBox.left,
          top: lBox.top - cBox.top,
          bottom: lBox.bottom - cBox.top
        };
      }

      const currentItems = [...stateRef.current];
      const elasticity = 0.88; // 反弹弹性

      // 1. 更新位置及环境碰撞 (墙体和中央盒子)
      for (let i = 0; i < currentItems.length; i++) {
        const p = currentItems[i];
        if (p.id === draggedId) continue; // 拖拽中的方块不做普通运动

        // 引入极其微弱的物理阻力 (摩擦力)
        p.vx *= 0.998;
        p.vy *= 0.998;

        // 重力机制
        if (gravityEnabled) {
          p.vy += 0.08; // 微重力
        }

        p.x += p.vx;
        p.y += p.vy;

        const r = p.radius;

        // 与浏览器视口左右边界碰撞
        if (p.x - r < 0) {
          p.x = r;
          p.vx = -p.vx * elasticity;
          setBounceCount(c => c + 1);
          triggerCollisionFeedback(p.x, p.y, p.bgClass);
        } else if (p.x + r > cw) {
          p.x = cw - r;
          p.vx = -p.vx * elasticity;
          setBounceCount(c => c + 1);
          triggerCollisionFeedback(p.x, p.y, p.bgClass);
        }

        // 与浏览器视口上下边界碰撞
        if (p.y - r < 0) {
          p.y = r;
          p.vy = -p.vy * elasticity;
          setBounceCount(c => c + 1);
          triggerCollisionFeedback(p.x, p.y, p.bgClass);
        } else if (p.y + r > ch) {
          p.y = ch - r;
          p.vy = -p.vy * elasticity;
          setBounceCount(c => c + 1);
          triggerCollisionFeedback(p.x, p.y, p.bgClass);
        }

        // 与中央登录卡片 (Static AABB Box) 进行碰撞检测与反弹
        // 核心：计算方块中心 (p.x, p.y) 到矩形盒子的最近点 (cx, cy)
        const cx = Math.max(cardRect.left, Math.min(p.x, cardRect.right));
        const cy = Math.max(cardRect.top, Math.min(p.y, cardRect.bottom));

        const distSecX = p.x - cx;
        const distSecY = p.y - cy;
        const distance = Math.sqrt(distSecX * distSecX + distSecY * distSecY);

        if (distance < r && distance > 0.001) {
          // 发生了碰撞！计算碰撞法线
          const nx = distSecX / distance;
          const ny = distSecY / distance;

          // 将其推至无碰撞位置
          p.x = cx + nx * r;
          p.y = cy + ny * r;

          // 计算新速度：法线速度反向并乘以弹性
          const vNormal = p.vx * nx + p.vy * ny;
          if (vNormal < 0) {
            // 只在朝向障碍物运动时反弹
            p.vx = p.vx - 2 * vNormal * nx * elasticity;
            p.vy = p.vy - 2 * vNormal * ny * elasticity;
            setBounceCount(c => c + 1);
            triggerCollisionFeedback(p.x, p.y, p.bgClass);
          }
        } else if (distance === 0) {
          // 万一方块中心完全跑到了卡片里，向最近的卡片边缘推出去
          const dl = Math.abs(p.x - cardRect.left);
          const dr = Math.abs(p.x - cardRect.right);
          const dt = Math.abs(p.y - cardRect.top);
          const db = Math.abs(p.y - cardRect.bottom);
          const minD = Math.min(dl, dr, dt, db);

          if (minD === dl) {
            p.x = cardRect.left - r;
            p.vx = -Math.abs(p.vx) * elasticity;
          } else if (minD === dr) {
            p.x = cardRect.right + r;
            p.vx = Math.abs(p.vx) * elasticity;
          } else if (minD === dt) {
            p.y = cardRect.top - r;
            p.vy = -Math.abs(p.vy) * elasticity;
          } else {
            p.y = cardRect.bottom + r;
            p.vy = Math.abs(p.vy) * elasticity;
          }
        }
      }

      // 2. 刚体卡片之间的双向弹性碰撞检测 (Circle-Circle)
      for (let i = 0; i < currentItems.length; i++) {
        for (let j = i + 1; j < currentItems.length; j++) {
          const a = currentItems[i];
          const b = currentItems[j];

          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = a.radius + b.radius;

          if (dist < minDist && dist > 0.1) {
            // 重叠，进行弹性碰撞反向
            const overlap = minDist - dist;
            // 物理位置修正以消除粘连
            const correctionX = (dx / dist) * overlap * 0.5;
            const correctionY = (dy / dist) * overlap * 0.5;

            if (a.id !== draggedId) {
              a.x -= correctionX;
              a.y -= correctionY;
            }
            if (b.id !== draggedId) {
              b.x += correctionX;
              b.y += correctionY;
            }

            // 弹性碰撞二维速度重构
            const nx = dx / dist;
            const ny = dy / dist;

            // 相对法线速度
            const kx = a.vx - b.vx;
            const ky = a.vy - b.vy;
            const vn = kx * nx + ky * ny;

            if (vn > 0) {
              // 只在向彼此靠近时反弹
              const impulse = (1.15 * vn) / (a.mass + b.mass);
              if (a.id !== draggedId) {
                a.vx -= impulse * b.mass * nx;
                a.vy -= impulse * b.mass * ny;
              }
              if (b.id !== draggedId) {
                b.vx += impulse * a.mass * nx;
                b.vy += impulse * a.mass * ny;
              }
              setBounceCount(c => c + 1);
              triggerCollisionFeedback((a.x + b.x) / 2, (a.y + b.y) / 2, a.bgClass);
            }
          }
        }
      }

      stateRef.current = currentItems;
      setItems([...currentItems]);
      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, gravityEnabled, draggedId]);

  // 点击 Logo 小方块时的轻微放大与自转 360 度动画，并喷洒彩色粒子
  const handleItemClick = (id: string) => {
    triggerCollisionVibration();

    const clickedItem = stateRef.current.find(item => item.id === id);
    if (clickedItem) {
      spawnCollisionBurst(clickedItem.x, clickedItem.y, clickedItem.bgClass);
    }

    setClickedStates(prev => {
      const current = prev[id] || { scale: 1.0, rotate: 0 };
      return {
        ...prev,
        [id]: {
          scale: 1.35,
          rotate: current.rotate + 360
        }
      };
    });

    // 600ms 后顺滑复原缩放大小
    setTimeout(() => {
      setClickedStates(prev => {
        if (!prev[id]) return prev;
        return {
          ...prev,
          [id]: {
            ...prev[id],
            scale: 1.0
          }
        };
      });
    }, 600);
  };

  // 鼠标移动物理跟踪与粒子粒子拖尾发生
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // 平滑、半透明粒子跟随鼠标移动轨迹发射
    spawnParticles(mx, my);

    if (!draggedId) return;

    const targetX = mx - dragOffset.current.x;
    const targetY = my - dragOffset.current.y;

    // 判断是否移动过，若微移小于 6 像素，依然判定为点击事件
    const dist = Math.hypot(targetX - dragStartPos.current.x, targetY - dragStartPos.current.y);
    if (dist > 6) {
      hasDragged.current = true;
    }

    // 计算瞬时鼠标移动速度，在释放时赋予刚体
    const now = performance.now();
    const dt = now - prevMousePos.current.time;
    if (dt > 10) {
      mouseVelocity.current = {
        x: ((targetX - prevMousePos.current.x) / dt) * 16,
        y: ((targetY - prevMousePos.current.y) / dt) * 16
      };
      // 限制最高滑行速度，避免飞出屏幕
      const maxV = 25;
      const curV = Math.sqrt(mouseVelocity.current.x ** 2 + mouseVelocity.current.y ** 2);
      if (curV > maxV) {
        mouseVelocity.current.x = (mouseVelocity.current.x / curV) * maxV;
        mouseVelocity.current.y = (mouseVelocity.current.y / curV) * maxV;
      }
    }

    prevMousePos.current = { x: targetX, y: targetY, time: now };

    // 实时更新状态
    const updated = stateRef.current.map(p => {
      if (p.id === draggedId) {
        return {
          ...p,
          x: targetX,
          y: targetY,
          vx: 0,
          vy: 0
        };
      }
      return p;
    });

    stateRef.current = updated;
    setItems(updated);
  };

  const handleMouseUp = () => {
    if (!draggedId) return;

    // 若未发生明显拖拽动作，则直接触发 Logo 块的放大旋转交互
    if (!hasDragged.current) {
      handleItemClick(draggedId);
    }

    // 赋予拖拽刚体释放时的滑动速度
    const updated = stateRef.current.map(p => {
      if (p.id === draggedId) {
        return {
          ...p,
          vx: mouseVelocity.current.x || (Math.random() - 0.5) * 2,
          vy: mouseVelocity.current.y || (Math.random() - 0.5) * 2
        };
      }
      return p;
    });

    stateRef.current = updated;
    setItems(updated);
    setDraggedId(null);
  };

  const startDrag = (e: React.MouseEvent, item: BrandItem) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    dragStartPos.current = { x: item.x, y: item.y };
    hasDragged.current = false;

    dragOffset.current = {
      x: mx - item.x,
      y: my - item.y
    };
    prevMousePos.current = {
      x: item.x,
      y: item.y,
      time: performance.now()
    };
    mouseVelocity.current = { x: 0, y: 0 };
    setDraggedId(item.id);
  };

  // 物理碰撞舱轻微抖动重置
  const handleResetPhysics = () => {
    initializePositions();
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="absolute inset-0 w-full h-full pointer-events-auto select-none overflow-hidden z-0"
    >
      {/* 粒子拖尾背景 Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-0"
      />

      {/* HUD 仪表台：可以控制重力、启停等，提高可玩性 */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-white/70 backdrop-blur-md px-3.5 py-1.5 rounded-2xl shadow-xs border border-slate-200/50 scale-90 md:scale-100 origin-top-left">
        <span className="text-[10px] font-black tracking-wider text-slate-400 font-mono uppercase">
          Collision Engine
        </span>
        <div className="h-3 w-[1px] bg-slate-300 mx-1"></div>
        
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isPlaying ? "hover:bg-slate-100 text-slate-700" : "bg-amber-100 text-amber-700 hover:bg-amber-200/80"
          }`}
          title={isPlaying ? "暂停物理循环" : "开启物理循环"}
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>

        <button
          onClick={() => setGravityEnabled(!gravityEnabled)}
          className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-colors cursor-pointer ${
            gravityEnabled ? "bg-indigo-100 text-indigo-700" : "hover:bg-slate-100 text-slate-500"
          }`}
          title="开启微地球重力"
        >
          {gravityEnabled ? "重力: 开" : "重力: 关"}
        </button>

        <button
          onClick={handleResetPhysics}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
          title="一键物理重构（随机洗牌）"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 渲染每一个可拖拽和碰撞弹跳的品牌卡片 */}
      {items.map(item => {
        const isDragging = item.id === draggedId;
        const clickedState = clickedStates[item.id] || { scale: 1.0, rotate: 0 };
        const scaleVal = isDragging ? 1.12 : clickedState.scale;
        const rotateVal = clickedState.rotate;

        return (
          <div
            key={item.id}
            onMouseDown={e => startDrag(e, item)}
            style={{
              position: "absolute",
              left: `${item.x - item.radius}px`,
              top: `${item.y - item.radius}px`,
              width: `${item.width}px`,
              height: `${item.height}px`,
              transform: `scale(${scaleVal}) rotate(${rotateVal}deg)`,
              zIndex: isDragging ? 50 : 20,
              touchAction: "none"
            }}
            className={`rounded-2xl flex flex-col items-center justify-center border transition-transform duration-75 select-none cursor-grab active:cursor-grabbing ${
              (item.image && !failedImages[item.id]) ? "bg-white border-slate-200/60 overflow-hidden p-0" : `${item.bgClass} p-2`
            } ${isDragging ? "shadow-2xl opacity-100 ring-2 ring-amber-400" : "shadow-md hover:brightness-105"}`}
          >
            {item.image && !failedImages[item.id] ? (
              <img
                src={item.image}
                alt={item.name}
                referrerPolicy="no-referrer"
                onError={() => {
                  setFailedImages(prev => ({ ...prev, [item.id]: true }));
                }}
                className="w-full h-full object-cover select-none pointer-events-none"
              />
            ) : (
              <>
                {/* 上部小图标/Emoji */}
                <span className="text-[13px] leading-none mb-1 select-none pointer-events-none">{item.emoji}</span>
                {/* 中间主品牌字 */}
                <span className={`text-[12px] font-black tracking-wide leading-none select-none pointer-events-none ${item.textColor}`}>
                  {item.name}
                </span>
                {/* 底部副标小字 */}
                <span className={`text-[8px] opacity-70 mt-0.5 select-none pointer-events-none leading-none ${item.textColor} font-sans`}>
                  {item.subText}
                </span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};
