import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  BarChart4,
  FileText,
  UploadCloud,
  Calendar,
  Printer,
  Download,
  Database,
  TrendingUp,
  Sliders,
  CheckCircle,
  HelpCircle,
  Loader2,
  Lock,
  CloudLightning,
  User,
  LogIn,
  LogOut,
  Eye,
  EyeOff,
  ShieldCheck,
  Users,
  UserPlus,
  Trash2,
  Edit3,
  Save,
  Key,
  AlertTriangle,
  Shield,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  History,
  Cpu,
  HardDrive,
  Terminal,
  Activity,
  RefreshCw
} from "lucide-react";
import { ReportMetrics, BohData, SystemUser, AuditLogEntry } from "./types";
import { ReportPage } from "./components/ReportPage";
import { FaultDiagnosisPanel } from "./components/FaultDiagnosisPanel";
import { BrandCollisionChamber } from "./components/BrandCollisionChamber";
import { LogoCustomizer } from "./components/LogoCustomizer";

export default function App() {
  const loginCardRef = useRef<HTMLDivElement>(null);
  // 1. 系统用户和权限状态管理
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>(() => {
    try {
      const saved = localStorage.getItem("system_users");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // 确保后台专用管理员账户总是改成 admin / 85201166
          const hasAdmin = parsed.some(u => u.username === "admin");
          if (!hasAdmin) {
            parsed.unshift({ id: "1", username: "admin", password: "85201166", role: "管理员" });
          } else {
            // 确保 admin 的密码总是 85201166
            const adminUser = parsed.find(u => u.username === "admin");
            if (adminUser) {
              adminUser.password = "85201166";
              adminUser.role = "管理员";
            }
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return [
      { id: "1", username: "admin", password: "85201166", role: "管理员" },
      { id: "2", username: "writer", password: "85201166", role: "撰写人" },
    ];
  });

  const [currentUser, setCurrentUser] = useState<SystemUser | null>(() => {
    try {
      const saved = localStorage.getItem("current_user");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    const isLoggedIn = localStorage.getItem("it_admin_logged_in") === "true";
    if (isLoggedIn) {
      return { id: "1", username: "admin", password: "85201166", role: "管理员" };
    }
    return null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem("it_admin_logged_in") === "true";
    } catch (e) {
      return false;
    }
  });

  const [loginUsername, setLoginUsername] = useState(() => {
    try {
      return localStorage.getItem("remembered_username") || "";
    } catch (e) {
      return "";
    }
  });
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // 保存系统用户列表到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem("system_users", JSON.stringify(systemUsers));
    } catch (e) {
      console.error(e);
    }
  }, [systemUsers]);

  // 1.5. 审计日志状态与记录
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem("system_audit_logs");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  });

  const [auditLogExpanded, setAuditLogExpanded] = useState(false);

  const addAuditLog = useCallback((action: string, details: string) => {
    const operator = currentUser?.username || "系统";
    const newEntry: AuditLogEntry = {
      id: String(Date.now() + Math.random()),
      timestamp: new Date().toISOString(),
      operator,
      action,
      details
    };
    setAuditLogs(prev => {
      const updated = [newEntry, ...prev];
      localStorage.setItem("system_audit_logs", JSON.stringify(updated));
      return updated;
    });
  }, [currentUser]);

  const lastSavedValuesRef = useRef<{
    month: string;
    currBackup4g: any;
    prevBackup4g: any;
    currDingTalkSessions: any;
    prevDingTalkSessions: any;
    currRenovation: any;
    currNewShops: any;
    prevRenovation: any;
    prevNewShops: any;
    currBoh: any;
    prevBoh: any;
  } | null>(null);

  // 选项卡状态 (config: 数据录入, preview: 月报预览, users: 账号管理, system: 系统健康与运维)
  const [activeTab, setActiveTab] = useState<"config" | "preview" | "users" | "system">("config");

  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  const fetchSystemHealth = useCallback(async () => {
    setLoadingHealth(true);
    setHealthError(null);
    try {
      const res = await fetch("/api/admin/system-health");
      if (!res.ok) throw new Error("获取健康状态失败");
      const data = await res.json();
      setSystemHealth(data);
    } catch (err: any) {
      setHealthError(err.message || "请求健康状态失败");
    } finally {
      setLoadingHealth(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "system") {
      fetchSystemHealth();
    }
  }, [activeTab, fetchSystemHealth]);

  const handleLogout = useCallback(() => {
    try {
      localStorage.removeItem("it_admin_logged_in");
      localStorage.removeItem("current_user");
    } catch (e) {
      console.error(e);
    }
    setCurrentUser(null);
    setIsAuthenticated(false);
    setIsCustomizerUnlocked(false);
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    // 模拟安全验证延迟
    await new Promise((resolve) => setTimeout(resolve, 800));

    const normalizedUser = loginUsername.trim().toLowerCase();
    const normalizedPass = loginPassword.trim();

    // 在系统用户列表中匹配账号与密码
    const matchedUser = systemUsers.find(
      (u) => u.username.toLowerCase() === normalizedUser && u.password === normalizedPass
    );

    if (matchedUser) {
      try {
        localStorage.setItem("it_admin_logged_in", "true");
        localStorage.setItem("current_user", JSON.stringify(matchedUser));
        localStorage.setItem("remembered_username", matchedUser.username);
      } catch (err) {
        console.error(err);
      }
      setCurrentUser(matchedUser);
      setIsAuthenticated(true);
      setIsCustomizerUnlocked(false);
      setActiveTab("config");
    } else {
      setLoginError("安全校验失败：账号或密码错误。");
    }
    setLoginLoading(false);
  };

  // 账号管理辅助表单状态及操作
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"管理员" | "撰写人">("撰写人");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userActionError, setUserActionError] = useState<string | null>(null);
  const [userActionSuccess, setUserActionSuccess] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const handleTogglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleAddOrUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserActionError(null);
    setUserActionSuccess(null);

    const trimmedUser = newUsername.trim();
    const trimmedPass = newPassword.trim();

    if (!trimmedUser || !trimmedPass) {
      setUserActionError("用户名和密码不能为空。");
      return;
    }

    if (editingUserId) {
      // 编辑已有用户
      let hasError = false;
      setSystemUsers(prev => {
        return prev.map(u => {
          if (u.id === editingUserId) {
            if (u.username === "admin" && newRole !== "管理员") {
              setUserActionError("系统安全规则：禁止修改内置 'admin' 的管理员权限。");
              hasError = true;
              return u;
            }
            return { ...u, username: trimmedUser, password: trimmedPass, role: newRole };
          }
          return u;
        });
      });
      if (!hasError) {
        setUserActionSuccess("用户账号修改成功！");
        addAuditLog("修改账号", `修改了系统账号: ${trimmedUser} (新角色: ${newRole})`);
        setEditingUserId(null);
        setNewUsername("");
        setNewPassword("");
        setNewRole("撰写人");
      }
    } else {
      // 创建新用户
      const isDuplicate = systemUsers.some(u => u.username.toLowerCase() === trimmedUser.toLowerCase());
      if (isDuplicate) {
        setUserActionError("该账号用户名已存在，请重新输入。");
        return;
      }

      const newUser: SystemUser = {
        id: String(Date.now()),
        username: trimmedUser,
        password: trimmedPass,
        role: newRole
      };

      setSystemUsers(prev => [...prev, newUser]);
      setUserActionSuccess("成功创建新账户！");
      addAuditLog("创建账号", `创建了系统账号: ${trimmedUser} (角色: ${newRole})`);
      setNewUsername("");
      setNewPassword("");
      setNewRole("撰写人");
    }
  };

  const handleEditUserClick = (user: SystemUser) => {
    setEditingUserId(user.id);
    setNewUsername(user.username);
    setNewPassword(user.password);
    setNewRole(user.role);
    setUserActionError(null);
    setUserActionSuccess(null);
  };

  const handleDeleteUser = (userId: string) => {
    const userToDelete = systemUsers.find(u => u.id === userId);
    if (!userToDelete) return;

    if (userToDelete.username === "admin") {
      alert("安全规则警告：不可删除内置系统超级管理员 'admin'。");
      return;
    }

    if (currentUser && userToDelete.id === currentUser.id) {
      alert("安全规则警告：您不能删除当前正在登录的账号。");
      return;
    }

    setSystemUsers(prev => prev.filter(u => u.id !== userId));
    setUserActionSuccess(`已成功删除账户：${userToDelete.username}`);
    addAuditLog("删除账号", `删除了系统账号: ${userToDelete.username} (原角色: ${userToDelete.role})`);
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setNewUsername("");
    setNewPassword("");
    setNewRole("撰写人");
    setUserActionError(null);
    setUserActionSuccess(null);
  };

  const isMonthLocked = (monthStr: string) => {
    if (monthStr === "2026-06") return false;
    if (!/^\d{4}-\d{2}$/.test(monthStr)) return false;
    const [mYear, mMonth] = monthStr.split("-").map(Number);
    const d = new Date();
    const curYear = d.getFullYear();
    const curMonth = d.getMonth() + 1;
    return (curYear * 12 + curMonth) < (mYear * 12 + mMonth + 1);
  };

  // 1. 从 localStorage 加载账期，保持刷新后的账期状态并进行未解锁校准
  const [month, setMonth] = useState(() => {
    try {
      const saved = localStorage.getItem("selected_month") || "2026-06";
      if (saved !== "2026-06" && isMonthLocked(saved)) {
        return "2026-06";
      }
      return saved;
    } catch (e) {
      return "2026-06";
    }
  });

  const [customLogos, setCustomLogos] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("custom_brand_logos");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [isCustomizerUnlocked, setIsCustomizerUnlocked] = useState<boolean>(false);
  const [hoverProgress, setHoverProgress] = useState<number>(0);
  const hoverTimerRef = useRef<any>(null);
  const hoverIntervalRef = useRef<any>(null);

  const handleIT99MouseEnter = () => {
    if (isCustomizerUnlocked) return;
    setHoverProgress(0);
    const startTime = Date.now();
    const duration = 5000;

    hoverIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.floor((elapsed / duration) * 100));
      setHoverProgress(pct);
    }, 50);

    hoverTimerRef.current = setTimeout(() => {
      setIsCustomizerUnlocked(true);
      setHoverProgress(0);
      if (hoverIntervalRef.current) {
        clearInterval(hoverIntervalRef.current);
        hoverIntervalRef.current = null;
      }
    }, duration);
  };

  const handleIT99MouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (hoverIntervalRef.current) {
      clearInterval(hoverIntervalRef.current);
      hoverIntervalRef.current = null;
    }
    setHoverProgress(0);
  };

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (hoverIntervalRef.current) clearInterval(hoverIntervalRef.current);
    };
  }, []);

  const updateCustomLogo = (brandId: string, base64Data: string) => {
    setCustomLogos(prev => {
      const updated = { ...prev, [brandId]: base64Data };
      localStorage.setItem("custom_brand_logos", JSON.stringify(updated));
      return updated;
    });
  };

  const resetCustomLogo = (brandId: string) => {
    setCustomLogos(prev => {
      const updated = { ...prev };
      delete updated[brandId];
      localStorage.setItem("custom_brand_logos", JSON.stringify(updated));
      return updated;
    });
  };

  const resetAllLogos = () => {
    setCustomLogos({});
    localStorage.removeItem("custom_brand_logos");
  };

  const getInitialDraft = <T,>(key: string, defaultValue: T): T => {
    try {
      const saved = localStorage.getItem(`draft_${month}_${key}`);
      if (saved !== null) {
        if (saved === "") return "" as any;
        return typeof defaultValue === "number" ? (Number(saved) as any) : JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Failed to parse initial draft for month:", e);
    }
    const isJune = month === "2026-06";
    if (!isJune) {
      if (
        key === "curr_backup_4g" ||
        key === "prev_backup_4g" ||
        key === "curr_dingtalk_sessions" ||
        key === "prev_dingtalk_sessions" ||
        key === "prev_renwood_count" ||
        key === "prev_new_shops" ||
        key === "curr_renwood_count" ||
        key === "curr_new_shops"
      ) {
        return "" as any;
      }
      if (key === "prev_boh" || key === "curr_boh") {
        return {
          "太二": { "堂食": 0, "外卖": 0, "营销活动": 0 },
          "九毛九": { "堂食": 0, "外卖": 0, "营销活动": 0 },
          "怂": { "堂食": 0, "外卖": 0, "营销活动": 0 }
        } as any;
      }
    }
    return defaultValue;
  };

  const isFutureMonth = useCallback(() => {
    if (!/^\d{4}-\d{2}$/.test(month)) return false;
    const [selYear, selMonth] = month.split("-").map(Number);
    const now = new Date();
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth() + 1; // 1-indexed

    if (selYear > nowYear) return true;
    if (selYear === nowYear && selMonth > nowMonth) return true;
    return false;
  }, [month]);

  // 2. 补录基准期 (上期数据) - 通过草稿值初始化，防刷新重置
  const [prevBackup4g, setPrevBackup4g] = useState<number | string>(() => getInitialDraft("prev_backup_4g", 40));
  const [prevDingTalkSessions, setPrevDingTalkSessions] = useState<number | string>(() => getInitialDraft("prev_dingtalk_sessions", 350));
  const [prevBoh, setPrevBoh] = useState<BohData>(() => getInitialDraft("prev_boh", {
    "太二": { "堂食": 3816, "外卖": 2144, "营销活动": 317 },
    "九毛九": { "堂食": 569, "外卖": 557, "营销活动": 68 },
    "怂": { "堂食": 423, "外卖": 117, "营销活动": 259 }
  }));

  // 3. 填报分析期 (当期数据) - 通过草稿值初始化，防刷新重置
  const [currBackup4g, setCurrBackup4g] = useState<number | string>(() => getInitialDraft("curr_backup_4g", 45));
  const [currDingTalkSessions, setCurrDingTalkSessions] = useState<number | string>(() => getInitialDraft("curr_dingtalk_sessions", 480));
  const [currBoh, setCurrBoh] = useState<BohData>(() => getInitialDraft("curr_boh", {
    "太二": { "堂食": 3950, "外卖": 2200, "营销活动": 290 },
    "九毛九": { "堂食": 580, "外卖": 540, "营销活动": 75 },
    "怂": { "堂食": 460, "外卖": 130, "营销活动": 240 }
  }));

  // 3.5 门店装修补录
  const [prevRenovation, setPrevRenovation] = useState<number | string>(() => getInitialDraft("prev_renwood_count", 0));
  const [prevNewShops, setPrevNewShops] = useState<number | string>(() => getInitialDraft("prev_new_shops", 2));
  const [currRenovation, setCurrRenovation] = useState<number | string>(() => getInitialDraft("curr_renwood_count", 0));
  const [currNewShops, setCurrNewShops] = useState<number | string>(() => getInitialDraft("curr_new_shops", 2));

  // 4. 客服会话 Excel 文件上传状态
  const [prevQiyuFile, setPrevQiyuFile] = useState<File | null>(null);
  const [currQiyuFile, setCurrQiyuFile] = useState<File | null>(null);

  // 5. 核心计算与渲染大盘状态
  const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [exportPDFTrigger, setExportPDFTrigger] = useState<(() => Promise<void>) | null>(null);
  const [serverIp, setServerIp] = useState<string>("获取中...");
  const [dbStatus, setDbStatus] = useState<"loading" | "connected" | "disconnected">("loading");
  const [loadedMonth, setLoadedMonth] = useState<string>(() => month);

  const registerExportPDF = useCallback((fn: () => Promise<void>) => {
    setExportPDFTrigger(() => fn);
  }, []);

  // BOH 自动获取接口交互状态
  const [isFetchingBoh, setIsFetchingBoh] = useState<boolean>(false);
  const [fetchBohMessage, setFetchBohMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleFetchBoh = async () => {
    setIsFetchingBoh(true);
    setFetchBohMessage(null);
    try {
      const response = await fetch("/api/fetch-boh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ month })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP 错误 ${response.status}`);
      }

      const data = await response.json();
      if (data.status === "success") {
        setCurrBoh(data.curr);
        setPrevBoh(data.prev);
        setFetchBohMessage({
          type: "success",
          text: `🎉 一键自动获取成功！已成功从 BOH 后台抓取并自动填充 [${data.curr_month}] 当月及 [${data.prev_month}] 上月的 3 个品牌 BOH 数据！`
        });
      } else {
        throw new Error("后端抓取服务未成功返回数据");
      }
    } catch (err: any) {
      console.error("一键获取 BOH 失败:", err);
      setFetchBohMessage({
        type: "error",
        text: `❌ 自动获取失败：${err.message || "请求服务器或爬虫网关发生异常"}`
      });
    } finally {
      setIsFetchingBoh(false);
    }
  };

  // 6. BOH 数据填报修改辅助函数
  const handleBohChange = (
    period: "prev" | "curr",
    brand: "太二" | "九毛九" | "怂",
    category: "堂食" | "外卖" | "营销活动",
    val: number
  ) => {
    if (period === "prev") {
      setPrevBoh(prev => ({
        ...prev,
        [brand]: {
          ...prev[brand],
          [category]: val
        }
      }));
    } else {
      setCurrBoh(prev => ({
        ...prev,
        [brand]: {
          ...prev[brand],
          [category]: val
        }
      }));
    }
  };

  // 7. 一键调用全栈数据管道进行清洗汇总
  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("month", month);
    formData.append("curr_backup_4g", String(currBackup4g));
    formData.append("prev_backup_4g", String(prevBackup4g));
    formData.append("curr_dingtalk_sessions", String(currDingTalkSessions));
    formData.append("prev_dingtalk_sessions", String(prevDingTalkSessions));
    formData.append("curr_renwood_count", String(currRenovation));
    formData.append("curr_new_shops", String(currNewShops));
    formData.append("prev_renwood_count", String(prevRenovation));
    formData.append("prev_new_shops", String(prevNewShops));
    formData.append("curr_boh_json", JSON.stringify(currBoh));
    formData.append("prev_boh_json", JSON.stringify(prevBoh));
    formData.append("is_submit", "true");

    if (prevQiyuFile) {
      formData.append("prev_qiyu_file", prevQiyuFile);
    }
    if (currQiyuFile) {
      formData.append("curr_qiyu_file", currQiyuFile);
    }

    try {
      const res = await fetch("/api/pipeline/run", {
        method: "POST",
        body: formData
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const errorText = await res.text();
        console.warn("Non-JSON Response received. Length:", errorText.length);

        if (errorText.includes("Cookie check") || errorText.includes("Redirect to") || errorText.includes("cookie")) {
          // Trigger dynamic zeroed state gracefully adhering to Zero Fake Data principles
          const [currYearStr, currMonthStr] = month.split("-");
          const currYear = parseInt(currYearStr, 10);
          const currMonth = parseInt(currMonthStr, 10);
          const prevDate = new Date(currYear, currMonth - 2, 1);
          const prevYear = prevDate.getFullYear();
          const prevMonth = prevDate.getMonth() + 1;
          const prev_month_label = `${prevYear}-${String(prevMonth).padStart(2, "0")}月`;
          const curr_month_label = `${currYear}-${String(currMonth).padStart(2, "0")}月`;

          const fallbackMetrics: ReportMetrics = {
            prev_month_label,
            curr_month_label,
            curr_boh_total: 0,
            prev_boh_total: 0,
            current_month_tickets_total: 0,
            compare_month_tickets_total: 0,
            current_month_avg_days: 0,
            compare_month_avg_days: 0,
            compare_month_qiyu_valid: 0,
            current_qiyu_raw: { total: 0, valid: 0, invalid: 0, unreplied: 0, avg_first_reply: 0, avg_reply: 0, avg_session_duration: 0 },
            compare_qiyu_raw: { total: 0, valid: 0, invalid: 0, unreplied: 0, avg_first_reply: 0, avg_reply: 0, avg_session_duration: 0 },
            current_categories: { "打印机出单调整": 0, "菜品上下架调整": 0, "请求提供数据": 0, "POS/KVS问题": 0, "电脑与软件问题": 0, "优惠券及键位问题": 0, "网络问题": 0 },
            compare_categories: { "打印机出单调整": 0, "菜品上下架调整": 0, "请求提供数据": 0, "POS/KVS问题": 0, "电脑与软件问题": 0, "优惠券及键位问题": 0, "网络问题": 0 },
            curr_boh_data: currBoh,
            prev_boh_data: prevBoh,
            ticket_brand_distribution: {},
            ticket_cate_distribution: {},
            ticket_shop_ranking: {},
            supplier_splits: {
              "haiv": { count: 0, days: 0 },
              "qing": { count: 0, days: 0 },
              "dvs": { count: 0, days: 0 }
            },
            current_renwood_count: currRenovation,
            current_new_shops: currNewShops,
            compare_month_renovation_count: prevRenovation,
            compare_month_new_shops: prevNewShops,
            curr_backup_4g: currBackup4g,
            prev_backup_4g: prevBackup4g,
            curr_dingtalk_sessions: currDingTalkSessions,
            prev_dingtalk_sessions: prevDingTalkSessions
          };
          setMetrics(fallbackMetrics);
          setError("sandbox-cookie-blocked");
          setActiveTab("preview");
          addAuditLog("执行一键生成月报", `在沙箱隔离状态下，一键生成了 ${month} 账期的本地 IT 运维月报预览数据。`);
          // Smooth scroll to view the report immediately
          setTimeout(() => {
            document.getElementById("report-anchor")?.scrollIntoView({ behavior: "smooth" });
          }, 300);
          return;
        }

        throw new Error(`网关响应异常 (HTTP ${res.status}): 返回了非 JSON 格式内容。可能服务正在启动、处于断开重连中，或遭遇了底层网关超时。`);
      }

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.detail || "自动化清洗网关内部解析出现偏差");
      }

      setMetrics(resData.metrics);
      if (resData.metrics.curr_backup_4g !== undefined) setCurrBackup4g(resData.metrics.curr_backup_4g);
      if (resData.metrics.prev_backup_4g !== undefined) setPrevBackup4g(resData.metrics.prev_backup_4g);
      if (resData.metrics.curr_dingtalk_sessions !== undefined) setCurrDingTalkSessions(resData.metrics.curr_dingtalk_sessions);
      if (resData.metrics.prev_dingtalk_sessions !== undefined) setPrevDingTalkSessions(resData.metrics.prev_dingtalk_sessions);
      if (resData.metrics.current_renwood_count !== undefined) setCurrRenovation(resData.metrics.current_renwood_count);
      if (resData.metrics.current_new_shops !== undefined) setCurrNewShops(resData.metrics.current_new_shops);
      if (resData.metrics.compare_month_renovation_count !== undefined) setPrevRenovation(resData.metrics.compare_month_renovation_count);
      if (resData.metrics.compare_month_new_shops !== undefined) setPrevNewShops(resData.metrics.compare_month_new_shops);
      if (resData.metrics.curr_boh_data) setCurrBoh(resData.metrics.curr_boh_data);
      if (resData.metrics.prev_boh_data) setPrevBoh(resData.metrics.prev_boh_data);
      stateMonthRef.current = month;
      setActiveTab("preview");
      addAuditLog("执行一键生成月报", `成功通过数据清洗管道，一键生成了 ${month} 账期的 IT 运维月报。`);
      
      // 平滑滚动至报表可视区域
      setTimeout(() => {
        document.getElementById("report-anchor")?.scrollIntoView({ behavior: "smooth" });
      }, 300);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "动态网络数据清洗故障，请检查文件或联系运维组");
    } finally {
      setLoading(false);
    }
  };

  // 7.2. 账期切换全局互斥锁，用于阻断 React 异步状态批量更新时的中间脏数据交叉覆盖
  const isChangingMonthRef = useRef(false);

  // 7.5. 使用 useRef 维持填报状态的最新引用，防止 autoPrefetch/triggerFallbackMetrics 发生 React 闭包依赖性无限循环
  const stateRef = useRef({
    currBoh,
    prevBoh,
    currBackup4g,
    prevBackup4g,
    currDingTalkSessions,
    prevDingTalkSessions,
    currRenovation,
    currNewShops,
    prevRenovation,
    prevNewShops
  });

  useEffect(() => {
    stateRef.current = {
      currBoh,
      prevBoh,
      currBackup4g,
      prevBackup4g,
      currDingTalkSessions,
      prevDingTalkSessions,
      currRenovation,
      currNewShops,
      prevRenovation,
      prevNewShops
    };
  }, [
    currBoh,
    prevBoh,
    currBackup4g,
    prevBackup4g,
    currDingTalkSessions,
    prevDingTalkSessions,
    currRenovation,
    currNewShops,
    prevRenovation,
    prevNewShops
  ]);

  const prevMonthRef = useRef<string>(month);
  const stateMonthRef = useRef<string>(month);

  // 一次性自愈清理器：自动检测并清除历史版本中由于异步渲染批处理导致的 2026-07 账期草稿污染，保持各月份草稿数据独立干净
  useEffect(() => {
    try {
      const targetMonths = ["2026-07", "2026-08", "2026-09"];
      for (const m of targetMonths) {
        const draftCurr4g = localStorage.getItem(`draft_${m}_curr_backup_4g`);
        const draftCurrDing = localStorage.getItem(`draft_${m}_curr_dingtalk_sessions`);
        // 若当前月份的核心数据指标（本月）不小心等于 6 月的实际数据（83 或 992），说明属于需要修护的历史残留脏数据，一键清空
        if (draftCurr4g === "83" || draftCurrDing === "992") {
          localStorage.removeItem(`draft_${m}_curr_backup_4g`);
          localStorage.removeItem(`draft_${m}_curr_dingtalk_sessions`);
          localStorage.removeItem(`draft_${m}_curr_boh`);
          localStorage.removeItem(`draft_${m}_curr_renwood_count`);
          localStorage.removeItem(`draft_${m}_curr_new_shops`);
          
          // 若上月基准也被污染成了 May 的数据 (118 或 562)，也一并清除，从而令新月份能通过 Fallback 机制完美且准确地继承 6 月的最新实际值
          const draftPrev4g = localStorage.getItem(`draft_${m}_prev_backup_4g`);
          const draftPrevDing = localStorage.getItem(`draft_${m}_prev_dingtalk_sessions`);
          if (draftPrev4g === "118" || draftPrevDing === "562" || draftPrev4g === "40") {
            localStorage.removeItem(`draft_${m}_prev_backup_4g`);
            localStorage.removeItem(`draft_${m}_prev_dingtalk_sessions`);
            localStorage.removeItem(`draft_${m}_prev_boh`);
            localStorage.removeItem(`draft_${m}_prev_renwood_count`);
            localStorage.removeItem(`draft_${m}_prev_new_shops`);
          }
        }
      }
    } catch (e) {
      console.error("Failed to run draft self-healing cleanup:", e);
    }
  }, []);

  // 一次性挂载：获取服务器公网出口IP及测试千康数据库连接状态
  useEffect(() => {
    const fetchIp = async () => {
      try {
        const res = await fetch("/api/server-ip");
        if (res.ok) {
          const data = await res.json();
          if (data.ip) setServerIp(data.ip);
        }
      } catch (err) {
        console.error("Failed to fetch server outbound IP:", err);
      }
    };
    fetchIp();

    const testDb = async () => {
      try {
        const res = await fetch("/api/test-db-connection");
        if (res.ok) {
          const data = await res.json();
          if (data.connected) {
            setDbStatus("connected");
          } else {
            setDbStatus("disconnected");
          }
        } else {
          setDbStatus("disconnected");
        }
      } catch (err) {
        console.error("Test DB connection error:", err);
        setDbStatus("disconnected");
      }
    };
    testDb();
  }, []);

  // 8. 辅助函数：触发降级备用数据，保证零崩溃高可用
  const triggerFallbackMetrics = useCallback((targetMonth?: string) => {
    const activeMonth = targetMonth || month;
    const [currYearStr, currMonthStr] = activeMonth.split("-");
    const currYear = parseInt(currYearStr, 10);
    const currMonth = parseInt(currMonthStr, 10);
    const prevDate = new Date(currYear, currMonth - 2, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth() + 1;
    const prev_month_label = `${prevYear}-${String(prevMonth).padStart(2, "0")}月`;
    const curr_month_label = `${currYear}-${String(currMonth).padStart(2, "0")}月`;

    const {
      currBoh: sCurrBoh,
      prevBoh: sPrevBoh,
      currBackup4g: sCurrBackup4g,
      prevBackup4g: sPrevBackup4g,
      currDingTalkSessions: sCurrDingTalkSessions,
      prevDingTalkSessions: sPrevDingTalkSessions,
      currRenovation: sCurrRenovation,
      currNewShops: sCurrNewShops,
      prevRenovation: sPrevRenovation,
      prevNewShops: sPrevNewShops
    } = stateRef.current;

    setMetrics({
      prev_month_label,
      curr_month_label,
      curr_boh_total: 0,
      prev_boh_total: 0,
      current_month_tickets_total: 0,
      compare_month_tickets_total: 0,
      current_month_avg_days: 0,
      compare_month_avg_days: 0,
      compare_month_qiyu_valid: 0,
      current_qiyu_raw: { total: 0, valid: 0, invalid: 0, unreplied: 0, avg_first_reply: 0, avg_reply: 0, avg_session_duration: 0 },
      compare_qiyu_raw: { total: 0, valid: 0, invalid: 0, unreplied: 0, avg_first_reply: 0, avg_reply: 0, avg_session_duration: 0 },
      current_categories: { "打印机出单调整": 0, "菜品上下架调整": 0, "请求提供数据": 0, "POS/KVS问题": 0, "电脑与软件问题": 0, "优惠券及键位问题": 0, "网络问题": 0 },
      compare_categories: { "打印机出单调整": 0, "菜品上下架调整": 0, "请求提供数据": 0, "POS/KVS问题": 0, "电脑与软件问题": 0, "优惠券及键位问题": 0, "网络问题": 0 },
      curr_boh_data: sCurrBoh,
      prev_boh_data: sPrevBoh,
      ticket_brand_distribution: {},
      ticket_cate_distribution: {},
      ticket_shop_ranking: {},
      supplier_splits: {
        haiv: { count: 0, days: 0 },
        qing: { count: 0, days: 0 },
        dvs: { count: 0, days: 0 }
      },
      current_renwood_count: Number(sCurrRenovation || 0),
      current_new_shops: Number(sCurrNewShops || 0),
      compare_month_renovation_count: Number(sPrevRenovation || 0),
      compare_month_new_shops: Number(sPrevNewShops || 0),
      curr_backup_4g: Number(sCurrBackup4g || 0),
      prev_backup_4g: Number(sPrevBackup4g || 0),
      curr_dingtalk_sessions: Number(sCurrDingTalkSessions || 0),
      prev_dingtalk_sessions: Number(sPrevDingTalkSessions || 0)
    });
  }, [month]);

  // 9. 自动预拉取数据大盘，提供无缝前台高可用接入体验
  const autoPrefetch = useCallback(async (targetMonth: string, activeDraftData?: any) => {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("month", targetMonth);
    formData.append("is_submit", "false");

    const isJune = targetMonth === "2026-06";

    // Read the latest local drafts for targetMonth and append them, so the server can compute matching metrics
    const getDraftStr = (key: string, defaultValue: string) => {
      // 优先取传入的同步权威草稿（解决 React 异步更新时的 race condition）
      if (activeDraftData && activeDraftData[key] !== undefined) {
        const val = activeDraftData[key];
        if (typeof val === "object") return JSON.stringify(val);
        return String(val);
      }
      try {
        const saved = localStorage.getItem(`draft_${targetMonth}_${key}`);
        if (saved !== null) return saved;
      } catch (e) {}
      if (!isJune) {
        if (key === "curr_boh" || key === "prev_boh") {
          return JSON.stringify({
            "太二": { "堂食": 0, "外卖": 0, "营销活动": 0 },
            "九毛九": { "堂食": 0, "外卖": 0, "营销活动": 0 },
            "怂": { "堂食": 0, "外卖": 0, "营销活动": 0 }
          });
        }
        return "";
      }
      return defaultValue;
    };

    formData.append("curr_backup_4g", getDraftStr("curr_backup_4g", "45"));
    formData.append("prev_backup_4g", getDraftStr("prev_backup_4g", "40"));
    formData.append("curr_dingtalk_sessions", getDraftStr("curr_dingtalk_sessions", "480"));
    formData.append("prev_dingtalk_sessions", getDraftStr("prev_dingtalk_sessions", "350"));
    formData.append("curr_renwood_count", getDraftStr("curr_renwood_count", "0"));
    formData.append("curr_new_shops", getDraftStr("curr_new_shops", "2"));
    formData.append("prev_renwood_count", getDraftStr("prev_renwood_count", "0"));
    formData.append("prev_new_shops", getDraftStr("prev_new_shops", "2"));

    const defaultPrevBoh = {
      "太二": { "堂食": 3816, "外卖": 2144, "营销活动": 317 },
      "九毛九": { "堂食": 569, "外卖": 557, "营销活动": 68 },
      "怂": { "堂食": 423, "外卖": 117, "营销活动": 259 }
    };
    const defaultCurrBoh = {
      "太二": { "堂食": 3950, "外卖": 2200, "营销活动": 290 },
      "九毛九": { "堂食": 580, "外卖": 540, "营销活动": 75 },
      "怂": { "堂食": 460, "外卖": 130, "营销活动": 240 }
    };

    formData.append("curr_boh_json", getDraftStr("curr_boh", JSON.stringify(defaultCurrBoh)));
    formData.append("prev_boh_json", getDraftStr("prev_boh", JSON.stringify(defaultPrevBoh)));

    try {
      const res = await fetch("/api/pipeline/run", {
        method: "POST",
        body: formData
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        if (text.includes("Cookie check") || text.includes("Redirect to") || text.includes("cookie")) {
          setError("sandbox-cookie-blocked");
        } else {
          setError("api-server-loading");
        }
        return;
      }

      const resData = await res.json();
      if (res.ok && resData.metrics) {
        // 始终加载并渲染该月份的大盘分析数据
        setMetrics(resData.metrics);

        // 仅在服务器存在已被用户显式暂存或提交的该月份配置时，才同步灌回输入框状态中
        if (resData.has_saved_config) {
          if (resData.metrics.curr_backup_4g !== undefined) setCurrBackup4g(resData.metrics.curr_backup_4g);
          if (resData.metrics.prev_backup_4g !== undefined) setPrevBackup4g(resData.metrics.prev_backup_4g);
          if (resData.metrics.curr_dingtalk_sessions !== undefined) setCurrDingTalkSessions(resData.metrics.curr_dingtalk_sessions);
          if (resData.metrics.prev_dingtalk_sessions !== undefined) setPrevDingTalkSessions(resData.metrics.prev_dingtalk_sessions);
          if (resData.metrics.current_renwood_count !== undefined) setCurrRenovation(resData.metrics.current_renwood_count);
          if (resData.metrics.current_new_shops !== undefined) setCurrNewShops(resData.metrics.current_new_shops);
          if (resData.metrics.compare_month_renwood_count !== undefined) setPrevRenovation(resData.metrics.compare_month_renwood_count);
          if (resData.metrics.compare_month_new_shops !== undefined) setPrevNewShops(resData.metrics.compare_month_new_shops);
          if (resData.metrics.curr_boh_data) setCurrBoh(resData.metrics.curr_boh_data);
          if (resData.metrics.prev_boh_data) setPrevBoh(resData.metrics.prev_boh_data);
        }
        stateMonthRef.current = targetMonth;
      }
    } catch (e) {
      console.warn("[Auto-Prefetch] Silent Fallback Triggered:", e);
    } finally {
      setLoading(false);
      isChangingMonthRef.current = false;
    }
  }, []);

  const getPreviousMonthString = (currMonth: string): string => {
    try {
      const [yearStr, monthStr] = currMonth.split("-");
      const year = parseInt(yearStr, 10);
      const monthNum = parseInt(monthStr, 10);
      if (isNaN(year) || isNaN(monthNum)) return "";
      const prevDate = new Date(year, monthNum - 2, 1);
      const prevYear = prevDate.getFullYear();
      const prevMonth = prevDate.getMonth() + 1;
      return `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
    } catch (e) {
      return "";
    }
  };

  // 9.5. 本地草稿管理器：切换月份或初始化时，优先载入本地已保存的草稿填报内容以防闪烁/丢失
  const loadDraftsForMonth = useCallback((targetMonth: string) => {
    // 对非 2026-06 的 2026-07 等账期，执行被污染的历史数据检测与高精准物理清洗
    if (targetMonth === "2026-07") {
      const hasPollutedDraft = localStorage.getItem("draft_2026-07_curr_backup_4g") === "83" &&
                              localStorage.getItem("draft_2026-07_curr_dingtalk_sessions") === "992";
      if (hasPollutedDraft) {
        console.log("检测到被 2026-06 历史数据污染的 2026-07 脏草稿，正在执行自动清洗归零...");
        localStorage.removeItem("draft_2026-07_curr_backup_4g");
        localStorage.removeItem("draft_2026-07_curr_dingtalk_sessions");
        localStorage.removeItem("draft_2026-07_curr_renwood_count");
        localStorage.removeItem("draft_2026-07_curr_new_shops");
        localStorage.removeItem("draft_2026-07_curr_boh");
        
        localStorage.removeItem("draft_2026-07_prev_backup_4g");
        localStorage.removeItem("draft_2026-07_prev_dingtalk_sessions");
        localStorage.removeItem("draft_2026-07_prev_renwood_count");
        localStorage.removeItem("draft_2026-07_prev_new_shops");
        localStorage.removeItem("draft_2026-07_prev_boh");
      }
    }

    const getDraft = (monthKey: string, key: string, defaultValue: any) => {
      try {
        const saved = localStorage.getItem(`draft_${monthKey}_${key}`);
        if (saved !== null) {
          if (saved === "") return "";
          return typeof defaultValue === "number" ? Number(saved) : JSON.parse(saved);
        }
      } catch (e) {
        console.warn("Failed to parse draft for month:", e);
      }
      return defaultValue;
    };

    const prevMonthStr = getPreviousMonthString(targetMonth);

    // --- BASELINE (上个月) Defaults ---
    let defaultPrevBackup4g: any = "";
    let defaultPrevDingTalk: any = "";
    let defaultPrevRenwood: any = "";
    let defaultPrevNewShops: any = "";
    let defaultPrevBoh = {
      "太二": { "堂食": 0, "外卖": 0, "营销活动": 0 },
      "九毛九": { "堂食": 0, "外卖": 0, "营销活动": 0 },
      "怂": { "堂食": 0, "外卖": 0, "营销活动": 0 }
    };

    if (targetMonth === "2026-06") {
      // June's baseline is May
      defaultPrevBackup4g = 40;
      defaultPrevDingTalk = 350;
      defaultPrevRenwood = 0;
      defaultPrevNewShops = 2;
      defaultPrevBoh = {
        "太二": { "堂食": 3816, "外卖": 2144, "营销活动": 317 },
        "九毛九": { "堂食": 569, "外卖": 557, "营销活动": 68 },
        "怂": { "堂食": 423, "外卖": 117, "营销活动": 259 }
      };
    } else {
      defaultPrevBackup4g = "";
      defaultPrevDingTalk = "";
      defaultPrevRenwood = "";
      defaultPrevNewShops = "";
      defaultPrevBoh = {
        "太二": { "堂食": 0, "外卖": 0, "营销活动": 0 },
        "九毛九": { "堂食": 0, "外卖": 0, "营销活动": 0 },
        "怂": { "堂食": 0, "外卖": 0, "营销活动": 0 }
      };
    }

    const prevBackup4gVal = getDraft(targetMonth, "prev_backup_4g", getDraft(prevMonthStr, "curr_backup_4g", defaultPrevBackup4g));
    const prevDingTalkVal = getDraft(targetMonth, "prev_dingtalk_sessions", getDraft(prevMonthStr, "curr_dingtalk_sessions", defaultPrevDingTalk));
    const prevRenwoodVal = getDraft(targetMonth, "prev_renwood_count", getDraft(prevMonthStr, "curr_renwood_count", defaultPrevRenwood));
    const prevNewShopsVal = getDraft(targetMonth, "prev_new_shops", getDraft(prevMonthStr, "curr_new_shops", defaultPrevNewShops));
    const prevBohVal = getDraft(targetMonth, "prev_boh", getDraft(prevMonthStr, "curr_boh", defaultPrevBoh));

    setPrevBackup4g(prevBackup4gVal);
    setPrevDingTalkSessions(prevDingTalkVal);
    setPrevRenovation(prevRenwoodVal);
    setPrevNewShops(prevNewShopsVal);
    setPrevBoh(prevBohVal);

    // --- CURRENT ANALYSIS PERIOD (本月) Defaults ---
    let defaultCurrBackup4g: any = "";
    let defaultCurrDingTalk: any = "";
    let defaultCurrRenwood: any = "";
    let defaultCurrNewShops: any = "";
    let defaultCurrBoh = {
      "太二": { "堂食": 0, "外卖": 0, "营销活动": 0 },
      "九毛九": { "堂食": 0, "外卖": 0, "营销活动": 0 },
      "怂": { "堂食": 0, "外卖": 0, "营销活动": 0 }
    };

    if (targetMonth === "2026-06") {
      defaultCurrBackup4g = 83;
      defaultCurrDingTalk = 992;
      defaultCurrRenwood = 20;
      defaultCurrNewShops = 2;
      defaultCurrBoh = {
        "太二": { "堂食": 3848, "外卖": 1793, "营销活动": 223 },
        "九毛九": { "堂食": 405, "外卖": 778, "营销活动": 40 },
        "怂": { "堂食": 241, "外卖": 111, "营销活动": 9 }
      };
    } else {
      defaultCurrBackup4g = "";
      defaultCurrDingTalk = "";
      defaultCurrRenwood = "";
      defaultCurrNewShops = "";
      defaultCurrBoh = {
        "太二": { "堂食": 0, "外卖": 0, "营销活动": 0 },
        "九毛九": { "堂食": 0, "外卖": 0, "营销活动": 0 },
        "怂": { "堂食": 0, "外卖": 0, "营销活动": 0 }
      };
    }

    const currBackup4gVal = getDraft(targetMonth, "curr_backup_4g", defaultCurrBackup4g);
    const currDingTalkVal = getDraft(targetMonth, "curr_dingtalk_sessions", defaultCurrDingTalk);
    const currRenwoodVal = getDraft(targetMonth, "curr_renwood_count", defaultCurrRenwood);
    const currNewShopsVal = getDraft(targetMonth, "curr_new_shops", defaultCurrNewShops);
    const currBohVal = getDraft(targetMonth, "curr_boh", defaultCurrBoh);

    setCurrBackup4g(currBackup4gVal);
    setCurrDingTalkSessions(currDingTalkVal);
    setCurrRenovation(currRenwoodVal);
    setCurrNewShops(currNewShopsVal);
    setCurrBoh(currBohVal);

    setLoadedMonth(targetMonth);
    stateMonthRef.current = targetMonth;

    return {
      curr_boh: currBohVal,
      prev_boh: prevBohVal,
      curr_backup_4g: currBackup4gVal,
      prev_backup_4g: prevBackup4gVal,
      curr_dingtalk_sessions: currDingTalkVal,
      prev_dingtalk_sessions: prevDingTalkVal,
      curr_renwood_count: currRenwoodVal,
      curr_new_shops: currNewShopsVal,
      prev_renwood_count: prevRenwoodVal,
      prev_new_shops: prevNewShopsVal
    };
  }, []);

  // 9.5.5. 账期切换监听器：当用户切换分析月份时，自动加载草稿并触发无感知数据预拉取
  useEffect(() => {
    if (/^\d{4}-\d{2}$/.test(month)) {
      const drafts = loadDraftsForMonth(month);
      autoPrefetch(month, drafts);
    }
  }, [month, loadDraftsForMonth, autoPrefetch]);

  // 9.6. 实时草稿持久化监听器：只要用户修改了任何字段，自动秒级保存至 localStorage 对应的月份中
  useEffect(() => {
    // 只有当 loadedMonth 锁定的月份与当前激活月份一致时，且当前未处于切换账期中，才允许写入。
    // 这避免了切换月份时，由于 React 状态异步更新尚未完成而用上月的数据交叉覆盖/污染新月份的草稿
    if (/^\d{4}-\d{2}$/.test(month) && loadedMonth === month && !isChangingMonthRef.current) {
      localStorage.setItem("selected_month", month);
      localStorage.setItem(`draft_${month}_prev_backup_4g`, String(prevBackup4g));
      localStorage.setItem(`draft_${month}_prev_dingtalk_sessions`, String(prevDingTalkSessions));
      localStorage.setItem(`draft_${month}_prev_boh`, JSON.stringify(prevBoh));
      localStorage.setItem(`draft_${month}_curr_backup_4g`, String(currBackup4g));
      localStorage.setItem(`draft_${month}_curr_dingtalk_sessions`, String(currDingTalkSessions));
      localStorage.setItem(`draft_${month}_curr_boh`, JSON.stringify(currBoh));
      localStorage.setItem(`draft_${month}_prev_renwood_count`, String(prevRenovation));
      localStorage.setItem(`draft_${month}_prev_new_shops`, String(prevNewShops));
      localStorage.setItem(`draft_${month}_curr_renwood_count`, String(currRenovation));
      localStorage.setItem(`draft_${month}_curr_new_shops`, String(currNewShops));
    }
  }, [
    month,
    loadedMonth,
    prevBackup4g,
    prevDingTalkSessions,
    prevBoh,
    currBackup4g,
    currDingTalkSessions,
    currBoh,
    prevRenovation,
    prevNewShops,
    currRenovation,
    currNewShops
  ]);

  // 9.7. 审计日志：手动修改账期核心数据增量监听器
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    if (loadedMonth !== month || isChangingMonthRef.current) return;
    if (!lastSavedValuesRef.current || lastSavedValuesRef.current.month !== month) {
      // 刚加载或切换月份时，初始化比对基准
      lastSavedValuesRef.current = {
        month,
        currBackup4g,
        prevBackup4g,
        currDingTalkSessions,
        prevDingTalkSessions,
        currRenovation,
        currNewShops,
        prevRenovation,
        prevNewShops,
        currBoh: JSON.stringify(currBoh),
        prevBoh: JSON.stringify(prevBoh)
      };
      return;
    }

    const timer = setTimeout(() => {
      const prevVal = lastSavedValuesRef.current;
      if (!prevVal) return;

      const changes: string[] = [];
      if (prevVal.currBackup4g !== currBackup4g) {
        changes.push(`本期4G备份天数: ${prevVal.currBackup4g} -> ${currBackup4g}`);
      }
      if (prevVal.prevBackup4g !== prevBackup4g) {
        changes.push(`上期4G备份天数: ${prevVal.prevBackup4g} -> ${prevBackup4g}`);
      }
      if (prevVal.currDingTalkSessions !== currDingTalkSessions) {
        changes.push(`本期会议数: ${prevVal.currDingTalkSessions} -> ${currDingTalkSessions}`);
      }
      if (prevVal.prevDingTalkSessions !== prevDingTalkSessions) {
        changes.push(`上期会议数: ${prevVal.prevDingTalkSessions} -> ${prevDingTalkSessions}`);
      }
      if (prevVal.currRenovation !== currRenovation) {
        changes.push(`本期翻新门店数: ${prevVal.currRenovation} -> ${currRenovation}`);
      }
      if (prevVal.currNewShops !== currNewShops) {
        changes.push(`本期新开门店数: ${prevVal.currNewShops} -> ${currNewShops}`);
      }
      if (prevVal.prevRenovation !== prevRenovation) {
        changes.push(`上期翻新门店数: ${prevVal.prevRenovation} -> ${prevRenovation}`);
      }
      if (prevVal.prevNewShops !== prevNewShops) {
        changes.push(`上期新开门店数: ${prevVal.prevNewShops} -> ${prevNewShops}`);
      }
      if (JSON.stringify(currBoh) !== prevVal.currBoh) {
        changes.push(`本期BOH核心数据有更新`);
      }
      if (JSON.stringify(prevBoh) !== prevVal.prevBoh) {
        changes.push(`上期BOH核心数据有更新`);
      }

      if (changes.length > 0) {
        addAuditLog(
          "手动修改账期核心数据",
          `修改了 ${month} 账期的业务指标数据。变更细节:\n${changes.map(c => `• ${c}`).join("\n")}`
        );

        // 更新比对基准
        lastSavedValuesRef.current = {
          month,
          currBackup4g,
          prevBackup4g,
          currDingTalkSessions,
          prevDingTalkSessions,
          currRenovation,
          currNewShops,
          prevRenovation,
          prevNewShops,
          currBoh: JSON.stringify(currBoh),
          prevBoh: JSON.stringify(prevBoh)
        };
      }
    }, 3000); // 3秒防抖防洪，减少写日志频率

    return () => clearTimeout(timer);
  }, [
    month,
    loadedMonth,
    currBackup4g,
    prevBackup4g,
    currDingTalkSessions,
    prevDingTalkSessions,
    currRenovation,
    currNewShops,
    prevRenovation,
    prevNewShops,
    currBoh,
    prevBoh,
    isAuthenticated,
    currentUser,
    addAuditLog
  ]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-tr from-sky-100/60 via-amber-50/70 to-emerald-100/50 font-sans antialiased relative overflow-hidden px-4 py-8 select-none">
        {/* Beautiful pastel ambient mesh glow rings mimicking Screenshot 2 */}
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-sky-200/40 rounded-full blur-[130px] pointer-events-none"></div>
        <div className="absolute bottom-[-20%] left-[-15%] w-[600px] h-[600px] bg-emerald-100/50 rounded-full blur-[140px] pointer-events-none"></div>
        <div className="absolute top-[-10%] left-[20%] w-[400px] h-[400px] bg-amber-100/50 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none"></div>

        {/* Brand Collision Physics Chamber - floating and bouncing around the card */}
        <BrandCollisionChamber loginCardRef={loginCardRef} customLogos={customLogos} />

        {/* Custom Logo Customizer added above the login card - only if unlocked! */}
        {isCustomizerUnlocked && (
          <LogoCustomizer
            customLogos={customLogos}
            onUpdateLogo={updateCustomLogo}
            onResetLogo={resetCustomLogo}
            onResetAll={resetAllLogos}
          />
        )}

        <div ref={loginCardRef} className="w-full max-w-md bg-white/95 backdrop-blur-xl border border-white/80 rounded-[32px] p-8 md:p-10 shadow-[0_32px_80px_rgba(148,163,184,0.18),0_4px_16px_rgba(148,163,184,0.04)] relative z-10 text-center pointer-events-auto">
          
          {/* Custom brand calendar-style tag matching Screenshot 2 perfectly */}
          <div 
            onMouseEnter={handleIT99MouseEnter}
            onMouseLeave={handleIT99MouseLeave}
            className="relative inline-flex flex-col items-center justify-center w-16 h-16 shadow-[0_12px_28px_rgba(244,63,94,0.15),0_4px_10px_rgba(244,63,94,0.08)] rounded-2xl overflow-hidden mb-5 select-none animate-bounce duration-[3000ms] cursor-help hover:scale-105 active:scale-95 transition-all"
          >
            <div className="bg-rose-500 text-white text-[10px] font-black w-full py-1 text-center font-sans tracking-widest">
              IT
            </div>
            <div className="bg-amber-400 text-slate-900 text-2xl font-black w-full flex-1 flex items-center justify-center font-mono">
              99
            </div>

            {/* Subtle Progress Bar */}
            {hoverProgress > 0 && (
              <div 
                className="absolute bottom-0 left-0 h-1.5 bg-rose-600 transition-all duration-75 z-30 shadow-[0_0_8px_rgba(220,38,38,0.5)]"
                style={{ width: `${hoverProgress}%` }}
              />
            )}

            {/* Glowing ring while hovering */}
            {hoverProgress > 0 && (
              <div className="absolute inset-0 border-2 border-rose-500/40 rounded-2xl pointer-events-none animate-pulse" />
            )}

            {/* Tooltip hint that counts down */}
            {hoverProgress > 0 && (
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md text-white text-[9px] font-bold px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap z-50 pointer-events-none">
                🚀 解锁配置中心 {Math.ceil((5000 - (hoverProgress / 100) * 5000) / 1000)}s...
              </div>
            )}
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">IT运维月报系统</h2>
            <div className="mt-2.5">
              <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 px-3.5 py-1 rounded-full font-bold inline-block">
                餐厅体验部
              </span>
            </div>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-5 text-left">
            {loginError && (
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3.5 text-rose-600 text-xs text-center font-bold flex items-center justify-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 pl-1">账号</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="请输入工作邮箱/账号"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/80 text-slate-800 rounded-2xl text-xs focus:ring-4 focus:ring-amber-400/20 focus:border-amber-400 transition-all outline-none font-medium placeholder-slate-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 pl-1">密码</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full pl-11 pr-12 py-3 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/80 text-slate-800 rounded-2xl text-xs focus:ring-4 focus:ring-amber-400/20 focus:border-amber-400 transition-all outline-none font-medium placeholder-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none text-white font-extrabold rounded-2xl shadow-[0_12px_24px_rgba(245,158,11,0.22)] hover:shadow-[0_12px_28px_rgba(245,158,11,0.32)] transition-all duration-150 text-xs flex items-center justify-center gap-2 cursor-pointer mt-5"
            >
              {loginLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>正在验证系统网关...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>登 录</span>
                </>
              )}
            </button>
          </form>


        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-gray-800 pb-20">
      
      {/* HEADER SECTION (仅在屏幕显示，打印时由于最外层容器选择而隐藏) */}
      <header className="no-print bg-white border-b border-slate-200 py-5 shadow-xs sticky top-0 z-50 transition duration-200">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center space-x-3.5">
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-md shadow-indigo-100">
              <BarChart4 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-950 tracking-tight flex items-center gap-2">
                九毛九集团IT运维
              </h1>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-end md:items-center gap-2 md:gap-4">
            {currentUser && (
              <div className="flex items-center space-x-2 font-mono text-[11px] text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-2xs">
                <span className="text-slate-400">当前用户:</span>
                <span className="font-bold text-indigo-600">{currentUser.username}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  currentUser.role === "管理员" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                }`}>
                  {currentUser.role}
                </span>
              </div>
            )}
            <div className="flex items-center space-x-2 font-mono text-[11px] text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-2xs">
              <span className="text-slate-400">服务器出口IP:</span>
              <span className="text-indigo-600 font-bold selection:bg-indigo-100">{serverIp}</span>
            </div>
            <div className="flex items-center space-x-2 font-mono text-[11px] text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-2xs">
              <Database className="h-3.5 w-3.5 text-indigo-600" />
              <span>千康数据库: {
                dbStatus === "loading" ? (
                  <b className="text-amber-500 animate-pulse">● 正在检测...</b>
                ) : dbStatus === "connected" ? (
                  <b className="text-emerald-600">● 连通成功</b>
                ) : (
                  <b className="text-red-500">● 连通失败</b>
                )
              }</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center space-x-1.5 font-mono text-[11px] text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 px-3 py-1.5 rounded-lg border border-rose-200 shadow-2xs cursor-pointer transition duration-150"
              title="退出登录"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="font-bold">退出登录</span>
            </button>
          </div>
        </div>
      </header>

      {/* TABS CONTAINER & DIAGNOSTICS COCKPIT */}
      <div className="no-print max-w-7xl mx-auto px-6 mt-6 space-y-4">
        <div className="bg-slate-100 p-1.5 rounded-2xl flex w-full max-w-full md:max-w-3xl shadow-2xs border border-slate-200/50">
          <button
            type="button"
            onClick={() => setActiveTab("config")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 md:px-5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer whitespace-nowrap ${
              activeTab === "config"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50/50"
            }`}
          >
            <Sliders className="h-4 w-4 shrink-0" />
            数据录入与配置
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 md:px-5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer relative whitespace-nowrap ${
              activeTab === "preview"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50/50"
            }`}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span>运维月报预览与导出</span>
            {metrics && (
              <span className="relative flex h-2 w-2 shrink-0 ml-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
          </button>
          {currentUser?.role === "管理员" && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab("users")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 md:px-5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer whitespace-nowrap ${
                  activeTab === "users"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50/50"
                }`}
              >
                <Users className="h-4 w-4 shrink-0" />
                账号与权限管理
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("system")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 md:px-5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer whitespace-nowrap ${
                  activeTab === "system"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50/50"
                }`}
              >
                <Activity className="h-4 w-4 shrink-0" />
                系统健康与运维
              </button>
            </>
          )}
        </div>

        <div className="w-full">
          <FaultDiagnosisPanel
            month={month}
            currQiyuFile={currQiyuFile}
            prevQiyuFile={prevQiyuFile}
            currBoh={currBoh}
            prevBoh={prevBoh}
            currBackup4g={currBackup4g}
            prevBackup4g={prevBackup4g}
            currDingTalkSessions={currDingTalkSessions}
            prevDingTalkSessions={prevDingTalkSessions}
            currRenovation={currRenovation}
            currNewShops={currNewShops}
            dbStatus={dbStatus}
            serverIp={serverIp}
            metrics={metrics}
          />
        </div>
      </div>

      {/* CORE CONTROL PILOT CABIN (no-print 仅在浏览器渲染) */}
      {activeTab === "config" && (
        <main className="no-print max-w-7xl mx-auto px-6 mt-6">
        
        <form onSubmit={handleGenerateReport} className="relative bg-white rounded-2xl shadow-sm border border-slate-200/75 p-8 space-y-8">
          {loading && (
            <div className="absolute inset-0 bg-white/75 backdrop-blur-xs flex flex-col items-center justify-center z-40 rounded-2xl transition-all duration-200">
              <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-3" />
              <p className="text-slate-800 text-xs font-bold animate-pulse">系统正在处理核心填报数据中...</p>
              <p className="text-slate-400 text-[10px] mt-1">请稍候，系统正在实时校准账期配置与缓存指标</p>
            </div>
          )}
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-6">
            <div className="flex items-center space-x-3">
              <Sliders className="h-5 w-5 text-indigo-600" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">1. IT运维月报数据核心配置页</h2>
                <p className="text-xs text-slate-400 mt-0.5">请输入和补充指定月份的数据，系统会自动生成。</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-3">
                <label className="text-xs font-bold text-slate-500 font-mono">📅 分析月份:</label>
                <select
                  value={month}
                  onChange={(e) => {
                    const newMonth = e.target.value;
                    if (isMonthLocked(newMonth)) {
                      alert(`账期 ${newMonth} 尚未解锁！当前最新可填报账期为 2026-06`);
                      return;
                    }
                    if (newMonth !== month) {
                      isChangingMonthRef.current = true;
                      setLoading(true);
                      setMetrics(null);
                      setMonth(newMonth);
                    }
                  }}
                  className="w-[140px] px-3.5 py-2 text-xs font-bold font-mono border border-slate-200 rounded-xl text-center bg-slate-50 text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition duration-150 shadow-xs cursor-pointer"
                >
                  {["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12"].map((mOpt) => {
                    const locked = isMonthLocked(mOpt);
                    return (
                      <option key={mOpt} value={mOpt} disabled={locked}>
                        {mOpt}{locked ? " (🔒未解锁)" : ""}
                      </option>
                    );
                  })}
                </select>
                {loading && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-150 rounded-xl text-indigo-700 font-medium text-xs animate-pulse">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                    <span>加载账期数据中...</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleFetchBoh}
                disabled={isFetchingBoh}
                className={`px-4.5 py-2 rounded-xl text-xs font-bold tracking-tight transition duration-150 flex items-center gap-2 shadow-xs cursor-pointer active:scale-97 select-none ${
                  isFetchingBoh
                    ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                    : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 active:bg-emerald-200/60"
                }`}
              >
                {isFetchingBoh ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600 mr-0.5" />
                    正在自动抓取 BOH 核心数据...
                  </>
                ) : (
                  <>
                    <CloudLightning className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                    一键自动获取 BOH 数据
                  </>
                )}
              </button>
            </div>
          </div>

          {fetchBohMessage && (
            <div
              className={`p-4 rounded-2xl text-xs leading-relaxed flex items-center justify-between border shadow-2xs transition-all duration-300 ${
                fetchBohMessage.type === "success"
                  ? "bg-emerald-50/70 border-emerald-100/80 text-emerald-900"
                  : "bg-rose-50/70 border-rose-100/80 text-rose-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{fetchBohMessage.type === "success" ? "✨" : "⚠️"}</span>
                <span className="font-medium">{fetchBohMessage.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setFetchBohMessage(null)}
                className="text-slate-400 hover:text-slate-600 font-bold ml-4 cursor-pointer text-[11px] hover:scale-105 transition-transform"
              >
                ✕ 忽略
              </button>
            </div>
          )}

          {/* DUAL COCKPIT BOH FILLING */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* LEFT BOX: 上月补录 (基准期) */}
            <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 font-mono">
                  📅 上个月运维数据填充
                </span>
                <span className="text-[10px] bg-slate-200/80 px-2.5 py-1 rounded-full text-slate-600 font-bold uppercase tracking-wider">
                  Baseline Period
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">📡 4G 备用宽带网络接管次数 (上月):</label>
                  <input
                    type="number"
                    value={prevBackup4g}
                    onChange={(e) => setPrevBackup4g(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">💬 钉钉会话数 (上月):</label>
                  <input
                    type="number"
                    value={prevDingTalkSessions}
                    onChange={(e) => setPrevDingTalkSessions(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">🛠️ 门店旧改开业数 (上月):</label>
                  <input
                    type="number"
                    value={prevRenovation}
                    onChange={(e) => setPrevRenovation(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">🏢 门店新开业数 (上月):</label>
                  <input
                    type="number"
                    value={prevNewShops}
                    onChange={(e) => setPrevNewShops(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition shadow-xs"
                  />
                </div>
              </div>

              <span className="block text-xs font-bold text-slate-600 mb-2">📋 BOH 基础数据维护下发频率 (上月):</span>
              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold">
                      <th className="p-2 border border-slate-200">品牌</th>
                      <th className="p-2 border border-slate-200">堂食维护</th>
                      <th className="p-2 border border-slate-200">外卖维护</th>
                      <th className="p-2 border border-slate-200">营销活动</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(["太二", "九毛九", "怂"] as const).map(brand => (
                      <tr key={brand}>
                        <td className="p-2 border border-slate-200 font-bold bg-slate-50/50">{brand}</td>
                        <td className="p-1 border border-slate-200">
                          <input
                            type="number"
                            value={prevBoh[brand]["堂食"]}
                            onChange={(e) => handleBohChange("prev", brand, "堂食", Number(e.target.value))}
                            className="w-full p-1.5 text-center text-xs border border-transparent hover:border-indigo-200 focus:bg-indigo-50/20 focus:border-indigo-300 rounded-lg transition duration-150 font-mono"
                          />
                        </td>
                        <td className="p-1 border border-slate-200">
                          <input
                            type="number"
                            value={prevBoh[brand]["外卖"]}
                            onChange={(e) => handleBohChange("prev", brand, "外卖", Number(e.target.value))}
                            className="w-full p-1.5 text-center text-xs border border-transparent hover:border-indigo-200 focus:bg-indigo-50/20 focus:border-indigo-300 rounded-lg transition duration-150 font-mono"
                          />
                        </td>
                        <td className="p-1 border border-slate-200">
                          <input
                            type="number"
                            value={prevBoh[brand]["营销活动"]}
                            onChange={(e) => handleBohChange("prev", brand, "营销活动", Number(e.target.value))}
                            className="w-full p-1.5 text-center text-xs border border-transparent hover:border-indigo-200 focus:bg-indigo-50/20 focus:border-indigo-300 rounded-lg transition duration-150 font-mono"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT BOX: 当月填报 (分析期) */}
            <div className="bg-indigo-50/10 rounded-2xl p-6 border border-indigo-100/60 shadow-xs">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-3 mb-4">
                <span className="text-xs font-bold text-indigo-600 flex items-center gap-1.5 font-mono">
                  📅 本月核心数据填充
                </span>
                <span className="text-[10px] bg-indigo-100 px-2.5 py-1 rounded-full text-indigo-700 font-bold uppercase tracking-wider">
                  Analysis Period
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">📡 4G 备用宽带网络接管次数 (当月):</label>
                  <input
                    type="number"
                    value={currBackup4g}
                    onChange={(e) => setCurrBackup4g(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">💬 钉钉会话数 (当月):</label>
                  <input
                    type="number"
                    value={currDingTalkSessions}
                    onChange={(e) => setCurrDingTalkSessions(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">🛠️ 门店旧改开业数 (当月):</label>
                  <input
                    type="number"
                    value={currRenovation}
                    onChange={(e) => setCurrRenovation(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">🏢 门店新开业数 (当月):</label>
                  <input
                    type="number"
                    value={currNewShops}
                    onChange={(e) => setCurrNewShops(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition shadow-xs"
                  />
                </div>
              </div>

              <span className="block text-xs font-bold text-slate-600 mb-2">📋 BOH 基础数据维护下发频率 (当月):</span>
              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs bg-white border border-indigo-100/60 rounded-xl overflow-hidden shadow-xs">
                  <thead>
                    <tr className="bg-indigo-50/40 text-indigo-700 font-bold border-b border-indigo-100">
                      <th className="p-2 border border-indigo-100">品牌</th>
                      <th className="p-2 border border-indigo-100">堂食维护</th>
                      <th className="p-2 border border-indigo-100">外卖维护</th>
                      <th className="p-2 border border-indigo-100">营销活动</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(["太二", "九毛九", "怂"] as const).map(brand => (
                      <tr key={brand}>
                        <td className="p-2 border border-indigo-100 font-bold bg-indigo-50/20">{brand}</td>
                        <td className="p-1 border border-indigo-100">
                          <input
                            type="number"
                            value={currBoh[brand]["堂食"]}
                            onChange={(e) => handleBohChange("curr", brand, "堂食", Number(e.target.value))}
                            className="w-full p-1.5 text-center text-xs border border-transparent hover:border-indigo-200 focus:bg-indigo-50/20 focus:border-indigo-300 rounded-lg transition duration-150 font-mono"
                          />
                        </td>
                        <td className="p-1 border border-indigo-100">
                          <input
                            type="number"
                            value={currBoh[brand]["外卖"]}
                            onChange={(e) => handleBohChange("curr", brand, "外卖", Number(e.target.value))}
                            className="w-full p-1.5 text-center text-xs border border-transparent hover:border-indigo-200 focus:bg-indigo-50/20 focus:border-indigo-300 rounded-lg transition duration-150 font-mono"
                          />
                        </td>
                        <td className="p-1 border border-indigo-100">
                          <input
                            type="number"
                            value={currBoh[brand]["营销活动"]}
                            onChange={(e) => handleBohChange("curr", brand, "营销活动", Number(e.target.value))}
                            className="w-full p-1.5 text-center text-xs border border-transparent hover:border-indigo-200 focus:bg-indigo-50/20 focus:border-indigo-300 rounded-lg transition duration-150 font-mono"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* 🔗 DATA ENTRY LINKS CONTAINER (Disguised as buttons for easy entry) */}
          <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-200/80 shadow-xs mb-6">
            <div className="flex items-center space-x-2.5 border-b border-slate-200 pb-3 mb-4">
              <Database className="h-5 w-5 text-indigo-500" />
              <div>
                <h3 className="text-xs font-bold text-slate-700">外部数据源 & 快捷填报链接</h3>
                <p className="text-[10px] text-slate-400">点击下方按钮可直接跳转到相应的数据源进行导出和提取。</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <a
                href="https://dtgzrjjsyxgs.qiyukf.com/madmin/session/homeReal"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3.5 bg-white hover:bg-indigo-50/20 border border-slate-200 hover:border-indigo-300 rounded-xl transition duration-150 shadow-2xs group"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg group-hover:bg-indigo-100/50 transition">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate">七鱼会话平台</p>
                    <p className="text-[9px] text-slate-400 truncate">在线会话实时监控</p>
                  </div>
                </div>
                <TrendingUp className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-500 transition shrink-0 ml-1" />
              </a>

              <a
                href="https://alidocs.dingtalk.com/i/nodes/NDoBb60VLQvgG6GXSBjXR0zDJlemrZQ3?utm_scene=person_space"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3.5 bg-white hover:bg-emerald-50/20 border border-slate-200 hover:border-emerald-300 rounded-xl transition duration-150 shadow-2xs group"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg group-hover:bg-emerald-100/50 transition">
                    <Database className="h-4 w-4" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate">旧改/开业数据表</p>
                    <p className="text-[9px] text-slate-400 truncate">钉钉智能文档表格</p>
                  </div>
                </div>
                <TrendingUp className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-500 transition shrink-0 ml-1" />
              </a>

              <a
                href="https://alidocs.dingtalk.com/i/nodes/1OQX0akWmxjrB6BvSvwMOx708GlDd3mE?utm_scene=person_space"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3.5 bg-white hover:bg-amber-50/20 border border-slate-200 hover:border-amber-300 rounded-xl transition duration-150 shadow-2xs group"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="bg-amber-50 text-amber-600 p-1.5 rounded-lg group-hover:bg-amber-100/50 transition">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate">门店网络异常登记</p>
                    <p className="text-[9px] text-slate-400 truncate">钉钉网络异常报告</p>
                  </div>
                </div>
                <TrendingUp className="h-3.5 w-3.5 text-slate-400 group-hover:text-amber-500 transition shrink-0 ml-1" />
              </a>
            </div>
          </div>

          {/* SECTIONS: FILE UPLOAD (OPTIONAL & HEAVILY CACHED) */}
          <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center space-x-2.5 border-b border-slate-200 pb-3 mb-4">
              <UploadCloud className="h-5 w-5 text-slate-500" />
              <div>
                <h3 className="text-xs font-bold text-slate-700">2. 七鱼客服数据上传</h3>
                <p className="text-[10px] text-slate-400">支持上传原始导出的 .xlsx 表格，数据自动保存然后自动生成。</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="flex flex-col">
                <label className="text-[11px] font-bold text-slate-500 mb-1.5">📥 上月七鱼原始 Excel 会话总表:</label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={(e) => setPrevQiyuFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 file:cursor-pointer border border-slate-200 p-1.5 rounded-xl bg-white shadow-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  {prevQiyuFile && <span className="absolute right-3.5 top-3 text-[10px] text-emerald-600 font-semibold">✓ 已就绪</span>}
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-[11px] font-bold text-slate-500 mb-1.5">📥 当月七鱼原始 Excel 会话总表:</label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={(e) => setCurrQiyuFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 file:cursor-pointer border border-slate-200 p-1.5 rounded-xl bg-white shadow-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  {currQiyuFile && <span className="absolute right-3.5 top-3 text-[10px] text-emerald-600 font-semibold">✓ 已就绪</span>}
                </div>
              </div>

            </div>
          </div>

          {/* ACTION LAUNCH BUTTON */}
          <div className="pt-2">
            {isFutureMonth() ? (
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-2 text-amber-800 text-xs">
                  <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md text-[10px] tracking-wide uppercase flex-none">
                    ⚠️ 账期未到
                  </span>
                  <span>现实时间尚未到达该分析月份（{month}），一键生成按钮已禁用。</span>
                </div>
                <button
                  type="button"
                  disabled
                  className="px-5 py-2.5 bg-slate-200 text-slate-400 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-not-allowed border border-slate-300/50"
                >
                  <Lock className="h-4 w-4 text-slate-400" />
                  <span>一键生成月报 (已锁定)</span>
                </button>
              </div>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-350 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 transition duration-200 text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>生成中，请稍等</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    <span>一键生成IT运维月报</span>
                  </>
                )}
              </button>
            )}
          </div>

        </form>

        {/* ERROR BOX */}
        {error && error === "sandbox-cookie-blocked" ? (
          <div className="mt-6 bg-indigo-50/80 border border-indigo-200/80 p-6 rounded-2xl shadow-xs text-slate-700 text-xs">
            <div className="flex items-start gap-4">
              <span className="font-bold text-indigo-700 bg-indigo-100/80 px-2.5 py-1 rounded-lg text-[10px] tracking-wide uppercase flex-none">
                🛡️ 安全沙箱提示
              </span>
              <div className="flex-1">
                <h4 className="font-bold text-slate-900 text-sm mb-1">
                  浏览器拦截了预览环境安全 Cookie 会话
                </h4>
                <p className="leading-relaxed text-slate-500 mb-3">
                  检测到您的浏览器（常见于 Safari 或具有高安全机制的 Chrome/iOS）在 iframe 容器中限制了第三方 SameSite Cookie 的建立。
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition cursor-pointer"
                  >
                    🚀 在新标签页打开应用 (推荐，彻底规避 iframe 浏览器限制)
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      // 引导弹窗进行 cookie check 授权
                      window.open("/api/pipeline/run?return_url=" + encodeURIComponent(window.location.href), "_blank");
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl shadow-xs transition cursor-pointer"
                  >
                    🔑 尝试快速授权安全 Cookie
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : error && (
          <div className="mt-6 bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start space-x-3 text-amber-800 text-xs shadow-xs">
            <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">错误诊断</span>
            <p className="flex-1 leading-relaxed font-mono">{error}</p>
          </div>
        )}

      </main>
      )}

      {/* ANCHOR TO SCROLL */}
      <div id="report-anchor" className="h-4" />

      {/* REPORT PRESENTATION VIEWER (仅在预览选项卡渲染) */}
      {activeTab === "preview" && (
        <div className="max-w-7xl mx-auto px-6 mt-6">
          {metrics ? (
            <div className="bg-slate-900 rounded-3xl py-10 px-6 sm:px-10 shadow-2xl border border-slate-950 relative overflow-hidden">
              {/* Decorative background grid inside dark mode container */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-20"></div>
              
              {loading && (
                <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center z-50 transition-all duration-200 rounded-3xl">
                  <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
                  <p className="text-white text-sm font-bold animate-pulse">系统正在为您拉取最新账期报表数据...</p>
                  <p className="text-slate-400 text-xs mt-2">请稍候，数据流及分析文本正在极速加载中</p>
                </div>
              )}
              
              <div className="relative z-10">
                {/* IN-SITE VIEW CONTROLS */}
                <div className="no-print bg-white/5 backdrop-blur-md rounded-2xl p-5 mb-8 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-400 border border-indigo-500/20">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-white text-sm font-bold">
                        IT运维月报（{month} 账期已生成）
                      </h3>
                    </div>
                  </div>
                  <button
                    onClick={() => exportPDFTrigger && exportPDFTrigger()}
                    disabled={!exportPDFTrigger}
                    className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-800 font-bold text-white text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition duration-150 cursor-pointer shadow-indigo-500/20"
                  >
                    <Download className="h-4 w-4" />
                    <span>保存并下载 PDF</span>
                  </button>
                </div>

                {/* REPORT RENDER DECK */}
                <ReportPage metrics={metrics} month={month} currentUser={currentUser} registerExportFn={registerExportPDF} />
              </div>
            </div>
          ) : (
            <div className="no-print text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200/80 flex flex-col items-center justify-center shadow-xs max-w-3xl mx-auto my-10 px-6">
              {/* Custom brand calendar-style tag matching Screenshot 3 perfectly */}
              <div className="relative inline-flex flex-col items-center justify-center w-14 h-14 shadow-[0_12px_28px_rgba(244,63,94,0.15),0_4px_10px_rgba(244,63,94,0.08)] rounded-xl overflow-hidden mb-5 select-none animate-bounce duration-[3000ms]">
                <div className="bg-[#FF4D6A] text-white text-[9px] font-black w-full py-0.5 text-center font-sans tracking-widest">
                  IT
                </div>
                <div className="bg-[#FFC20E] text-slate-900 text-xl font-black w-full flex-1 flex items-center justify-center font-mono">
                  99
                </div>
              </div>
              <h3 className="text-sm font-bold text-slate-800">暂无就绪的运维月报</h3>
              <p className="text-xs text-slate-400 mt-1.5 max-w-md leading-relaxed">
                当前账期（{month}）的数据配置尚未进行计算。请先前往录入页面，补充完整指标后点击“一键生成IT运维月报”
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("config")}
                className="mt-6 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition duration-150 cursor-pointer"
              >
                前往数据录入与配置
              </button>
            </div>
          )}
        </div>
      )}

      {/* 账号与权限管理页面 (仅在管理员且是 users 选项卡时渲染) */}
      {activeTab === "users" && currentUser?.role === "管理员" && (
        <main className="no-print max-w-7xl mx-auto px-6 mt-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/75 p-8 space-y-8">
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-6">
              <Users className="h-5 w-5 text-indigo-600" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">系统账号与权限管理</h2>
                <p className="text-xs text-slate-400 mt-0.5">此模块仅管理员可见。可对系统登录账户（撰写人、管理员）进行增删改查及密码配置管理。</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* 左侧：新增/编辑账号表单 */}
              <div className="lg:col-span-1 bg-slate-50/70 p-6 rounded-2xl border border-slate-200/60 shadow-2xs h-fit">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-indigo-500" />
                  {editingUserId ? "编辑已有账户" : "新增系统账户"}
                </h3>

                <form onSubmit={handleAddOrUpdateUser} className="space-y-4">
                  {userActionError && (
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-3.5 text-rose-600 text-xs font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                      <span>{userActionError}</span>
                    </div>
                  )}
                  {userActionSuccess && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 text-emerald-600 text-xs font-semibold flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>{userActionSuccess}</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500">账号登录名</label>
                    <input
                      type="text"
                      required
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="例如: admin, writer1"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 text-slate-800 rounded-xl text-xs focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition outline-none font-medium placeholder-slate-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500">登录密码</label>
                    <input
                      type="text"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="设置安全密码"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 text-slate-800 rounded-xl text-xs focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition outline-none font-mono font-medium placeholder-slate-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500">角色权限 (安全定级)</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as "管理员" | "撰写人")}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 text-slate-800 rounded-xl text-xs focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition outline-none font-medium cursor-pointer"
                    >
                      <option value="撰写人">撰写人 (看不到账号密码管理页面)</option>
                      <option value="管理员">管理员 (完整访问及管理权限)</option>
                    </select>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-xl text-xs transition duration-150 cursor-pointer shadow-sm shadow-indigo-100"
                    >
                      {editingUserId ? "保 存" : "创 建"}
                    </button>
                    {editingUserId && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs transition duration-150 cursor-pointer"
                      >
                        取消编辑
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* 右侧：账户列表 */}
              <div className="lg:col-span-2">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  现有系统账户列表 ({systemUsers.length})
                </h3>

                <div className="overflow-hidden border border-slate-100 rounded-2xl shadow-3xs bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">账号名称</th>
                        <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">安全密码 (明文展示)</th>
                        <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">角色权限</th>
                        <th className="py-3 px-4 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">操作行为</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {systemUsers.map((user) => {
                        const isSelf = currentUser && user.id === currentUser.id;
                        const isSystemAdmin = user.username === "admin";
                        const showPass = visiblePasswords[user.id] ?? false;

                        return (
                          <tr key={user.id} className="hover:bg-slate-50/40 transition">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center space-x-2.5">
                                <div className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                                  user.role === "管理员" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                                }`}>
                                  {user.username.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                    <span>{user.username}</span>
                                    {isSelf && (
                                      <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.2 rounded-md font-extrabold border border-indigo-100">
                                        您当前
                                      </span>
                                    )}
                                    {isSystemAdmin && (
                                      <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.2 rounded-md font-extrabold border border-amber-100">
                                        内置
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs">
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-slate-700 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                                  {showPass ? user.password : "••••••••"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleTogglePasswordVisibility(user.id)}
                                  className="text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer"
                                  title={showPass ? "隐藏密码" : "显示密码"}
                                >
                                  {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                user.role === "管理员"
                                  ? "bg-amber-50 border-amber-200 text-amber-800"
                                  : "bg-blue-50 border-blue-200 text-blue-800"
                              }`}>
                                <ShieldCheck className="h-3 w-3 shrink-0" />
                                {user.role}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleEditUserClick(user)}
                                  className="p-1.5 bg-slate-50 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200/60 hover:border-indigo-100 rounded-lg transition cursor-pointer"
                                  title="编辑账户信息"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(user.id)}
                                  disabled={isSystemAdmin || isSelf}
                                  className="p-1.5 bg-slate-50 text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed hover:text-rose-600 hover:bg-rose-50 border border-slate-200/60 hover:border-rose-100 rounded-lg transition cursor-pointer"
                                  title={isSystemAdmin ? "内置超级管理员禁止删除" : isSelf ? "当前登录账号禁止删除" : "删除该账号"}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 操作审计日志 (仅管理员可见) */}
            <div className="border-t border-slate-100 pt-6">
              <div className="bg-slate-50/50 rounded-2xl border border-slate-200/50 overflow-hidden">
                {/* 摺疊欄標頭 */}
                <button
                  type="button"
                  onClick={() => setAuditLogExpanded(!auditLogExpanded)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition duration-150 cursor-pointer text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                      <History className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-800">系统操作审计日志</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        按时间倒序记录一键生成、核心数据更改、账号删除等安全敏感操作，确保系统全流程可追溯。
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-[10px] font-bold bg-slate-200/60 text-slate-600 px-2 py-0.5 rounded-full">
                      {auditLogs.length} 条记录
                    </span>
                    {auditLogExpanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* 摺疊內容 */}
                {auditLogExpanded && (
                  <div className="border-t border-slate-100 p-6 space-y-4">
                    {auditLogs.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        暂无任何操作审计日志记录。
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm("确定要永久清除所有的操作审计日志吗？该操作不可撤销。")) {
                                setAuditLogs([]);
                                localStorage.removeItem("system_audit_logs");
                              }
                            }}
                            className="px-3 py-1.5 border border-rose-200 hover:border-rose-300 bg-white hover:bg-rose-50/50 text-rose-600 font-bold rounded-lg text-[10px] transition duration-150 cursor-pointer"
                          >
                            清空日志历史
                          </button>
                        </div>

                        <div className="overflow-hidden border border-slate-100 rounded-xl bg-white">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="py-2.5 px-4 text-[9px] font-bold uppercase tracking-wider text-slate-400 w-1/5">操作时间</th>
                                <th className="py-2.5 px-4 text-[9px] font-bold uppercase tracking-wider text-slate-400 w-1/12">操作人</th>
                                <th className="py-2.5 px-4 text-[9px] font-bold uppercase tracking-wider text-slate-400 w-1/6">关键行为</th>
                                <th className="py-2.5 px-4 text-[9px] font-bold uppercase tracking-wider text-slate-400">操作详情 / 变更项</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                              {auditLogs.map((log) => {
                                let badgeClass = "bg-slate-50 border-slate-200 text-slate-600";
                                if (log.action === "执行一键生成月报") {
                                  badgeClass = "bg-indigo-50 border-indigo-100 text-indigo-700";
                                } else if (log.action === "手动修改账期核心数据") {
                                  badgeClass = "bg-amber-50 border-amber-200 text-amber-700";
                                } else if (log.action === "删除账号") {
                                  badgeClass = "bg-rose-50 border-rose-200 text-rose-700";
                                } else if (log.action === "创建账号") {
                                  badgeClass = "bg-emerald-50 border-emerald-100 text-emerald-700";
                                } else if (log.action === "修改账号") {
                                  badgeClass = "bg-sky-50 border-sky-100 text-sky-700";
                                }

                                return (
                                  <tr key={log.id} className="hover:bg-slate-50/30 transition">
                                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                                      {new Date(log.timestamp).toLocaleString("zh-CN", {
                                        year: "numeric",
                                        month: "2-digit",
                                        day: "2-digit",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        second: "2-digit"
                                      })}
                                    </td>
                                    <td className="py-3 px-4">
                                      <span className="font-semibold text-slate-800">{log.operator}</span>
                                    </td>
                                    <td className="py-3 px-4">
                                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeClass}`}>
                                        {log.action}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 font-sans text-[11px] leading-relaxed text-slate-600">
                                      <div className="whitespace-pre-line font-medium text-slate-600 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                                        {log.details}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* 系统健康状态与运维页面 (仅管理员可见) */}
      {activeTab === "system" && currentUser?.role === "管理员" && (
        <main className="no-print max-w-7xl mx-auto px-6 mt-6 pb-12">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/75 p-8 space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-6 gap-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">系统健康状态与容器运维面板</h2>
                  <p className="text-xs text-slate-400 mt-0.5">实时监控运行状态，诊断存储持久化挂载情况，一键下载迁移快照和备份脚本。</p>
                </div>
              </div>
              <button
                type="button"
                onClick={fetchSystemHealth}
                disabled={loadingHealth}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100/80 active:bg-indigo-200/50 text-indigo-600 font-bold rounded-xl text-xs transition duration-150 cursor-pointer border border-indigo-100/70 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingHealth ? "animate-spin" : ""}`} />
                {loadingHealth ? "正在更新..." : "刷新运维诊断数据"}
              </button>
            </div>

            {healthError && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-rose-600 text-xs font-semibold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                <span>运维诊断失败: {healthError}</span>
              </div>
            )}

            {systemHealth ? (
              <div className="space-y-8">
                {/* 1. 顶部持久化报警与挂载提示卡片 */}
                <div className={`p-5 rounded-2xl border transition duration-150 ${
                  systemHealth.mountStatus?.isDataDirMounted 
                    ? "bg-emerald-50/50 border-emerald-100 text-emerald-800" 
                    : "bg-amber-50/50 border-amber-200 text-amber-800"
                }`}>
                  <div className="flex items-start gap-3">
                    <HardDrive className={`h-5 w-5 mt-0.5 shrink-0 ${
                      systemHealth.mountStatus?.isDataDirMounted ? "text-emerald-600" : "text-amber-600 animate-pulse"
                    }`} />
                    <div className="space-y-1 text-xs">
                      <h3 className="font-bold text-sm">数据存储持久化挂载诊断</h3>
                      <p className="font-medium leading-relaxed opacity-90">{systemHealth.mountStatus?.mountCheckMessage}</p>
                      <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3.5 font-mono text-[11px] text-slate-500 bg-white/60 p-3 rounded-lg border border-slate-200/50">
                        <div><span className="font-bold text-slate-700">实际存储路径:</span> {systemHealth.mountStatus?.storagePath}</div>
                        <div><span className="font-bold text-slate-700">挂载状态:</span> {systemHealth.mountStatus?.isDataDirMounted ? "✔ 已持久化挂载" : "⚠ 临时目录运行"}</div>
                        <div><span className="font-bold text-slate-700">目录可写状态:</span> {systemHealth.mountStatus?.dataDirWritable ? "✔ 健康(可读写)" : "❌ 异常(无写入权限)"}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. 状态指标卡片网格 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* CPU 与负载 */}
                  <div className="bg-slate-50/60 p-5 rounded-2xl border border-slate-200/50 space-y-4 shadow-2xs">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-slate-500" />
                      CPU 核心与负载
                    </h3>
                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-medium">处理器型号</span>
                        <span className="font-semibold text-slate-800 text-right truncate max-w-[150px]" title={systemHealth.cpu?.model}>
                          {systemHealth.cpu?.model}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-100 pt-2.5">
                        <span className="text-slate-400 font-medium">物理核心数</span>
                        <span className="font-mono font-semibold text-slate-800">{systemHealth.cpu?.cores} 核</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-100 pt-2.5">
                        <span className="text-slate-400 font-medium">系统平均负载 (1/5/15m)</span>
                        <span className="font-mono font-bold text-indigo-600">
                          {systemHealth.cpu?.load1Min} / {systemHealth.cpu?.load5Min} / {systemHealth.cpu?.load15Min}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 服务器内存监控 */}
                  <div className="bg-slate-50/60 p-5 rounded-2xl border border-slate-200/50 space-y-4 shadow-2xs">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-slate-500" />
                      服务器物理内存 (系统)
                    </h3>
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-baseline">
                        <span className="text-slate-400 font-medium">系统内存占用率</span>
                        <span className="font-mono font-black text-indigo-600">{systemHealth.systemMemory?.usagePct}%</span>
                      </div>
                      <div className="w-full bg-slate-200/70 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${systemHealth.systemMemory?.usagePct}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between font-mono text-[10px] text-slate-400 border-t border-slate-100 pt-2">
                        <span>已用: {systemHealth.systemMemory?.used}</span>
                        <span>空闲: {systemHealth.systemMemory?.free}</span>
                        <span>总量: {systemHealth.systemMemory?.total}</span>
                      </div>
                    </div>
                  </div>

                  {/* 容器与 Node 进程环境 */}
                  <div className="bg-slate-50/60 p-5 rounded-2xl border border-slate-200/50 space-y-4 shadow-2xs">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-slate-500" />
                      Node 进程与容器环境
                    </h3>
                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-medium">Node.js 版本</span>
                        <span className="font-mono font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-100">
                          {systemHealth.nodeVersion}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-100 pt-2.5">
                        <span className="text-slate-400 font-medium">运行平台 / 架构</span>
                        <span className="font-semibold text-slate-800 uppercase font-mono">{systemHealth.platform}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-100 pt-2.5">
                        <span className="text-slate-400 font-medium">Node 进程堆内存使用</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {systemHealth.processMemory?.heapUsed} / {systemHealth.processMemory?.heapTotal}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-100 pt-2.5">
                        <span className="text-slate-400 font-medium">容器连续运行时间</span>
                        <span className="font-medium text-slate-800 font-mono text-xs">
                          {Math.floor(systemHealth.uptime / 3600)} 小时 {Math.floor((systemHealth.uptime % 3600) / 60)} 分钟
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. 系统备份与迁移数据区 */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <div className="flex items-center space-x-2">
                    <Database className="h-4 w-4 text-indigo-600" />
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                      系统数据快照与安全迁移中心
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-4xl">
                    为了防止云服务器意外缩容或容器被动清理导致的数据丢失，管理员可在此处执行主动式离线备份。
                    下载导出的快照文件，并在新实例或迁移后的容器内挂载数据目录，即可无缝还原整个系统的配置和记录。
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    {/* 导出配置快照 */}
                    <div className="p-6 rounded-2xl border border-slate-200/60 bg-slate-50/40 flex flex-col justify-between space-y-4 hover:border-indigo-100 hover:bg-indigo-50/10 transition duration-150">
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                          导出系统配置快照 (JSON)
                        </span>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          一键将当前所有的账期门店指标、七鱼智能导入参数、多级审核标记和管理员账户缓存等数据整体打包为离线配置文件（report_storage_export.json）。
                        </p>
                      </div>
                      <a
                        href="/api/admin/export-config"
                        download="report_storage_export.json"
                        className="w-fit flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm transition duration-150 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        下载配置快照 JSON
                      </a>
                    </div>

                    {/* 下载自动备份脚本 */}
                    <div className="p-6 rounded-2xl border border-slate-200/60 bg-slate-50/40 flex flex-col justify-between space-y-4 hover:border-slate-300 hover:bg-slate-100/30 transition duration-150">
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                          生成 Linux 自动数据备份脚本 (sh)
                        </span>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          为运维系统自动生成的 shell 脚本（backup_report_system.sh）。可直接将其作为 Linux 宿主机的定时任务（crontab），自动为持久卷下的存储文件执行多副本灾备归档。
                        </p>
                      </div>
                      <a
                        href="/api/admin/download-backup-sh"
                        download="backup_report_system.sh"
                        className="w-fit flex items-center justify-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white font-bold rounded-xl text-xs shadow-sm transition duration-150 cursor-pointer"
                      >
                        <Terminal className="h-3.5 w-3.5" />
                        下载备份 Shell 脚本
                      </a>
                    </div>
                  </div>
                </div>

                {/* 4. 服务器配置推荐规范 */}
                <div className="border-t border-slate-100 pt-6">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Terminal className="h-4 w-4 text-indigo-500" />
                      💡 生产环境快速部署运维命令指南
                    </h4>
                    <p className="text-xs text-slate-400">项目根目录下已同步生成《IT运维月报系统服务器部署规范文档.md》，供运维部门存档并直接对接上服务器标准规范：</p>
                    <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-[11px] space-y-1.5 overflow-x-auto leading-relaxed shadow-inner">
                      <div><span className="text-emerald-400"># 1. 编译并打包容器镜像</span></div>
                      <div>docker build -t it-report-system:latest .</div>
                      <div className="pt-2"><span className="text-emerald-400"># 2. 生产环境启动容器 (映射 3000 端口并挂载宿主机持久数据卷，传入存储文件环境变量)</span></div>
                      <div>docker run -d -p 3000:3000 \</div>
                      <div>&nbsp;&nbsp;--name ams-monthly-report \</div>
                      <div>&nbsp;&nbsp;-v /opt/monthly-report-data:/app/data \</div>
                      <div>&nbsp;&nbsp;-e STORAGE_FILE_PATH=/app/data/report_storage.json \</div>
                      <div>&nbsp;&nbsp;it-report-system:latest</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <p className="text-xs">正在收集系统性能指标与挂载情况，请稍等...</p>
              </div>
            )}
          </div>
        </main>
      )}

    </div>
  );
}
