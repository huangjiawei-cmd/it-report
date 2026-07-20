import React, { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Database, Network, HelpCircle, ArrowRight, ShieldAlert, Wifi, FileWarning } from "lucide-react";
import { ReportMetrics } from "../types";

interface FaultDiagnosisPanelProps {
  month: string;
  currQiyuFile: File | null;
  prevQiyuFile: File | null;
  currBoh: Record<string, Record<string, number>>;
  prevBoh: Record<string, Record<string, number>>;
  currBackup4g: number;
  prevBackup4g: number;
  currDingTalkSessions: number;
  prevDingTalkSessions: number;
  currRenovation: number;
  currNewShops: number;
  dbStatus: "loading" | "connected" | "disconnected";
  serverIp: string;
  metrics: ReportMetrics | null;
}

export const FaultDiagnosisPanel: React.FC<FaultDiagnosisPanelProps> = ({
  month,
  currQiyuFile,
  prevQiyuFile,
  currBoh,
  prevBoh,
  currBackup4g,
  prevBackup4g,
  currDingTalkSessions,
  prevDingTalkSessions,
  currRenovation,
  currNewShops,
  dbStatus,
  serverIp,
  metrics
}) => {
  const [realOutboundIp, setRealOutboundIp] = useState<string>("检测中...");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeDbStatus, setActiveDbStatus] = useState<"loading" | "connected" | "disconnected">(dbStatus);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const fetchRealIpAndDbStatus = async () => {
    setIsRefreshing(true);
    try {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // 1) 获取真实公网出口 IP
      const ipRes = await fetch("/api/real-outbound-ip", { headers });
      if (ipRes.ok) {
        const data = await ipRes.json();
        setRealOutboundIp(data.ip || "unknown");
      } else {
        setRealOutboundIp("获取失败");
      }

      // 2) 重新检测数据库连通性
      const dbRes = await fetch("/api/test-db-connection", { headers });
      if (dbRes.ok) {
        const data = await dbRes.json();
        setActiveDbStatus(data.connected ? "connected" : "disconnected");
      } else {
        setActiveDbStatus("disconnected");
      }
    } catch (e) {
      console.error("Diagnosis fetch error:", e);
      setRealOutboundIp("网络超时");
      setActiveDbStatus("disconnected");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRealIpAndDbStatus();
  }, [month, dbStatus]);

  // 1. 自动审计各项数据指标
  const auditIssues = [];

  // 账期审计
  const [yearStr, monthStr] = month.split("-");
  const isJuly = month === "2026-07";

  // 七鱼客服会话表审计 - 只要上传过一次或大盘 metrics 中已有解析出来的数据（总数大于0），就认为已有可用数据，不报警
  const hasCurrQiyu = !!currQiyuFile || (metrics && metrics.current_qiyu_raw && metrics.current_qiyu_raw.total > 0);
  if (!hasCurrQiyu) {
    auditIssues.push({
      id: "qiyu_curr",
      type: "warning",
      title: `${monthStr}月 七鱼客服原始报表未上传`,
      desc: `系统将对该账期进行【柔性降级与留白】，展示 0 咨询量。若需要真实会话分类及满意度数据，请在下方上传该月导出的七鱼客服 Excel / CSV 报表。`,
      targetField: "curr_qiyu_file"
    });
  }

  // BOH 开停业及网络数据审计
  let totalCurrBoh = 0;
  Object.values(currBoh).forEach(b => {
    Object.values(b).forEach(v => { totalCurrBoh += v; });
  });
  if (totalCurrBoh === 0) {
    auditIssues.push({
      id: "boh_empty",
      type: "warning",
      title: `${monthStr}月 BOH 品牌基础经营及网络数据全空`,
      desc: `检测到 ${monthStr} 月堂食/外卖/营销活动会话数均为 0。请在下方点击【一键自动获取 BOH 数据】按钮，或手动输入，否则月报将呈递空白图表。`,
      targetField: "boh_data"
    });
  }

  // 4G 备份链路审计
  if (currBackup4g === 0) {
    auditIssues.push({
      id: "backup_4g",
      type: "info",
      title: `4G 备份无线链路开启数暂未填报`,
      desc: `填报值为 0。如果是真实数据（无故障启用），属于正常业务状态；如漏填请重新校验。`,
      targetField: "curr_backup_4g"
    });
  }

  // 数据库加白防火墙阻断审计 (核心突破点)
  const isIpMismatch = realOutboundIp !== "检测中..." && realOutboundIp !== "unknown" && realOutboundIp !== "获取失败" && realOutboundIp !== "网络超时" && realOutboundIp !== serverIp;
  const isDbFailed = activeDbStatus === "disconnected";

  if (isDbFailed) {
    auditIssues.push({
      id: "db_whitelist",
      type: "danger",
      title: `千康阿里云物理网关连通受阻 (防火墙安全策略拦截)`,
      desc: `虽然技术加白了 ${serverIp} 和 34.34.254.200，但由于该系统部署在 Google Cloud Serverless (Cloud Run) 动态容器中，底层公网出口 IP 并非固定，当前实际正由 [ ${realOutboundIp} ] 发起连接。由于此 IP 不在阿里云 RDS 白名单中，连接被安全防火墙阻断 (ETIMEDOUT)。`,
      targetField: "db_connection",
      solution: `请立即联系技术管理员，将当前容器实际公网出口 IP [ ${realOutboundIp} ] 临时加入阿里云数据库白名单，或直接将 Google Cloud 亚洲区该网段 (推荐 \`34.96.0.0/16\` 或 34.96.*.* ) 进行宽泛加白，以一劳永逸地解决底层 IP 漂移问题。`
    });
  }

  // 综合健康评分
  const totalWarnings = auditIssues.filter(i => i.type === "warning").length;
  const totalDangers = auditIssues.filter(i => i.type === "danger").length;
  const totalInfos = auditIssues.filter(i => i.type === "info").length;
  const healthScore = Math.max(0, 100 - (totalDangers * 40) - (totalWarnings * 15) - (totalInfos * 5));

  return (
    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition duration-200">
      {/* 折叠/展开 标题行 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl flex-none ${
            totalDangers > 0 
              ? "bg-rose-50 text-rose-600 border border-rose-100" 
              : totalWarnings > 0 
                ? "bg-amber-50 text-amber-600 border border-amber-100" 
                : "bg-emerald-50 text-emerald-600 border border-emerald-100"
          }`}>
            {totalDangers > 0 ? (
              <ShieldAlert className="h-4.5 w-4.5 animate-pulse" />
            ) : totalWarnings > 0 ? (
              <AlertTriangle className="h-4.5 w-4.5" />
            ) : (
              <CheckCircle className="h-4.5 w-4.5" />
            )}
          </div>
          <div>
            <h4 className="text-[12px] font-bold text-slate-800 flex items-center gap-1.5">
              <span>数据监控排障分析</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                totalDangers > 0 
                  ? "bg-rose-100 text-rose-700" 
                  : totalWarnings > 0 
                    ? "bg-amber-100 text-amber-700" 
                    : "bg-emerald-100 text-emerald-700"
              }`}>
                健康度: {healthScore}分
              </span>
            </h4>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              {monthStr}月（分析月）数据检查 • 出口参考: {serverIp} • 实际出口: <b className="text-indigo-600 font-bold">{realOutboundIp}</b>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchRealIpAndDbStatus}
            disabled={isRefreshing}
            className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg cursor-pointer transition disabled:opacity-50"
            title="重新诊断连通性"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`} />
          </button>
          
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border cursor-pointer transition duration-150 ${
              isExpanded 
                ? "bg-slate-200/80 hover:bg-slate-300/80 text-slate-700 border-slate-300" 
                : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-3xs"
            }`}
          >
            {isExpanded ? "收起诊断报告" : `展开诊断报告 (${auditIssues.length} 项发现)`}
          </button>
        </div>
      </div>

      {/* 展开的诊断报告详情 */}
      {isExpanded && (
        <div className="mt-4 pt-3 border-t border-slate-200/60 space-y-3">
          {/* 快速核心诊断汇总 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {/* 物理网关模块 */}
            <div className="bg-white rounded-xl p-3 border border-slate-150 shadow-3xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-indigo-500" />
                  千康物理网关 (Alibaba Cloud RDS)
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  activeDbStatus === "connected" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                }`}>
                  {activeDbStatus === "connected" ? "● 连通正常" : "● 安全策略阻断"}
                </span>
              </div>
              <p className="text-[10px] leading-relaxed text-slate-500">
                系统通过 13306 端口连接阿里云物理网关。在被防火墙阻断时，系统会自动将叫修工单、品牌占比等指标进行<b>零伪造柔性降级</b>，展现 0 叫修单（或保证 6 月基准呈递），保证前台不报错。
              </p>
            </div>

            {/* IP 漂移说明 */}
            <div className="bg-white rounded-xl p-3 border border-slate-150 shadow-3xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Network className="h-3.5 w-3.5 text-indigo-500" />
                  容器公网 IP 出口审计
                </span>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                  ⚠️ 漂移风险 (云原生)
                </span>
              </div>
              <p className="text-[10px] leading-relaxed text-slate-500">
                当前容器的物理出口 IP 为 <code className="bg-slate-100 text-rose-600 px-1 py-0.5 rounded font-bold font-mono">{realOutboundIp}</code>。在云原生微服务中，容器每次启动/重启其出口 IP 都会随机改变。加白固定单个 IP 会导致次日失效。
              </p>
            </div>
          </div>

          {/* 各项具体审计发现列表 */}
          <div className="space-y-2">
            <h5 className="text-[11px] font-bold text-slate-600">📌 详细异常审计发现:</h5>
            {auditIssues.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-2 text-emerald-800 text-[11px]">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
                <span>恭喜！当前账期数据完整，全链路校验完美无缺，可以生成 100% 完整的业务月报。</span>
              </div>
            ) : (
              auditIssues.map((issue) => (
                <div 
                  key={issue.id} 
                  className={`border rounded-xl p-3 text-[11px] ${
                    issue.type === "danger" 
                      ? "bg-rose-50/50 border-rose-150 text-rose-900" 
                      : issue.type === "warning" 
                        ? "bg-amber-50/50 border-amber-150 text-amber-900" 
                        : "bg-blue-50/50 border-blue-150 text-blue-900"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-1">
                    {issue.type === "danger" ? (
                      <XCircle className="h-3.5 w-3.5 text-rose-600 flex-none" />
                    ) : issue.type === "warning" ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-none" />
                    ) : (
                      <HelpCircle className="h-3.5 w-3.5 text-blue-600 flex-none" />
                    )}
                    <span>{issue.title}</span>
                  </div>
                  <p className="leading-relaxed text-slate-600 pl-5">{issue.desc}</p>
                  
                  {issue.solution && (
                    <div className="mt-2 pl-5 pt-2 border-t border-dashed border-slate-200">
                      <span className="font-bold text-[10px] text-slate-700 block mb-0.5 uppercase tracking-wider">🛠️ 推荐排障方案:</span>
                      <p className="text-slate-600 leading-relaxed bg-white/70 border border-slate-200/50 p-2 rounded-lg font-sans text-[10px]">
                        {issue.solution}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* 底部业务价值忠告 */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-[10.5px] text-slate-700 leading-relaxed">
            <span className="font-bold text-indigo-800 flex items-center gap-1.5 mb-1">
              <ShieldAlert className="h-4 w-4" />
              💡 运维月报「零伪造与诚实呈递」设计原则说明：
            </span>
            <span>
              当数据库未加白、或用户没有上传 ${monthStr} 月七鱼/BOH 原始表时，系统<b>绝不使用假数据硬编码或虚假填充</b>，而是通过数据库连接自愈熔断和会话安全归零机制展示真实的零值或默认基准值。
              这并非系统有 Bug，而是出于金融级月报的<b>诚实严谨原则</b>，防止在没有真实数据源的情况下凭空产生捏造的数据导致集团汇报失真。只要上传对应月份的数据表或按上方方案加白物理网关，真实业务价值将完美生成呈递。
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
