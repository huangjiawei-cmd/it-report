import React, { createContext, useContext } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer as RechartsResponsiveContainer,
} from "recharts";
import { QiyuRaw, BohBrandDetails, SupplierSplits } from "../types";

export const PdfContext = createContext<boolean>(false);

// Safe, zero-boundary, debounced wrapper around Recharts ResponsiveContainer 
// to completely silence "The width(0) and height(0) of chart should be greater than 0" console warnings
// and prevent layout engine locks/typing performance lags.
const ResponsiveContainer = ({ children, pdfWidth, pdfHeight, ...props }: any) => {
  const isPdf = useContext(PdfContext);

  const finalWidth = isPdf && pdfWidth ? pdfWidth : (props.width || "100%");
  const finalHeight = isPdf && pdfHeight ? pdfHeight : (props.height || "100%");

  return (
    <RechartsResponsiveContainer
      minWidth={0}
      minHeight={0}
      debounce={isPdf ? 0 : 50}
      {...props}
      width={finalWidth}
      height={finalHeight}
    >
      {children}
    </RechartsResponsiveContainer>
  );
};

// PPT Classic Business Color Scheme
const COLOR_COMP_BLUE = "#5B9BD5"; // Steel Blue for comparison (4月/上月)
const COLOR_CURR_RED = "#C55A11";  // Terracotta Red for current analysis (5月/本月)

// Supplier specific colors to match Slide 8
const COLOR_HAI_HAOV = "#4F81BD"; // Blue-gray
const COLOR_QING_CANG = "#C0504D"; // Red
const COLOR_DAVIS = "#9BBB59";     // Green

// Custom Chart Tooltip styling
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 p-2 shadow-md rounded-xl text-[11px] text-slate-700 font-medium">
        <p className="font-bold mb-1 text-slate-900">{label}</p>
        {payload.map((p: any, idx: number) => (
          <p key={idx} style={{ color: p.color || p.fill }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Elegant, ultra-clean custom top labels to prevent crowded/overlapping numbers
const renderCustomBarLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (value === undefined || value === null || value === 0) return null;
  // Format numbers >= 1000 to "X.Yk" to prevent horizontal text overlapping
  const formattedValue = value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value;
  return (
    <text
      x={x + width / 2}
      y={y - 8}
      fill="#1e293b" // slate-800 for high visibility
      fontSize={13.5} // increased by 20%+ from 11 for high visibility
      fontWeight="bold" // bold label
      textAnchor="middle"
    >
      {formattedValue}
    </text>
  );
};

// Elegant, ultra-clean custom right labels for horizontal bar charts
const renderCustomRightLabel = (props: any) => {
  const { x, y, width, height, value } = props;
  if (value === undefined || value === null || value === 0) return null;
  const formattedValue = value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value;
  return (
    <text
      x={x + width + 8}
      y={y + height / 2 + 4}
      fill="#1e293b" // slate-800 for high visibility
      fontSize={13.5} // increased by 20%+ from 11 for high visibility
      fontWeight="bold" // bold label
      textAnchor="start"
    >
      {formattedValue}
    </text>
  );
};

// 1. Slide 4: 线上咨询问题分析 - Vertical Grouped Bar Chart with top labels
interface QiyuCategoriesProps {
  current: Record<string, number>;
  compare: Record<string, number>;
  prevLabel: string;
  currLabel: string;
}
export const QiyuCategoriesChart: React.FC<QiyuCategoriesProps> = ({
  current,
  compare,
  prevLabel,
  currLabel
}) => {
  const data = Object.keys(current).map(key => ({
    name: key,
    [prevLabel]: compare[key] || 0,
    [currLabel]: current[key] || 0
  }));

  // Sort descending by current month values
  data.sort((a, b) => b[currLabel] - a[currLabel]);

  return (
    <ResponsiveContainer width="100%" height="100%" pdfWidth={1024} pdfHeight={310}>
      <BarChart 
        data={data} 
        margin={{ top: 25, right: 15, left: -15, bottom: 5 }}
        barGap={14}
        barCategoryGap="35%"
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
        <XAxis dataKey="name" stroke="#4b5563" fontSize={10.5} tickLine={false} />
        <YAxis stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend verticalAlign="bottom" height={36} iconSize={12} iconType="rect" />
        <Bar
          dataKey={prevLabel}
          fill={COLOR_COMP_BLUE}
          radius={[1, 1, 0, 0]}
          barSize={14}
          label={renderCustomBarLabel}
          isAnimationActive={false}
        />
        <Bar
          dataKey={currLabel}
          fill={COLOR_CURR_RED}
          radius={[1, 1, 0, 0]}
          barSize={14}
          label={renderCustomBarLabel}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

// 2. Slide 5: 4月、5月会话对比 - Horizontal Grouped Bar Chart
interface QiyuCompareProps {
  current: QiyuRaw;
  compare: QiyuRaw;
  prevLabel: string;
  currLabel: string;
}
export const QiyuCompareChart: React.FC<QiyuCompareProps> = ({
  current,
  compare,
  prevLabel,
  currLabel
}) => {
  const mapKeys = [
    { label: "会话总量", key: "total" },
    { label: "有效会话", key: "valid" },
    { label: "无效会话", key: "invalid" },
    { label: "未回复会话", key: "unreplied" }
  ];

  const data = mapKeys.map(item => ({
    name: item.label,
    [prevLabel]: (compare as any)[item.key] || 0,
    [currLabel]: (current as any)[item.key] || 0
  }));

  return (
    <ResponsiveContainer width="100%" height="100%" pdfWidth={500} pdfHeight={325}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 15, right: 50, left: 20, bottom: 5 }}
        barGap={3}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
        <XAxis type="number" stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" stroke="#4b5563" fontSize={11} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend verticalAlign="bottom" height={36} iconSize={12} iconType="rect" />
        <Bar
          dataKey={prevLabel}
          fill={COLOR_COMP_BLUE}
          barSize={10}
          label={renderCustomRightLabel}
          isAnimationActive={false}
        />
        <Bar
          dataKey={currLabel}
          fill={COLOR_CURR_RED}
          barSize={10}
          label={renderCustomRightLabel}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

// Custom label specifically for Slide 6 Brand BOH Chart to make numbers larger and separated
const renderBrandBohLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (value === undefined || value === null || value === 0) return null;
  const formattedValue = value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value;
  return (
    <text
      x={x + width / 2}
      y={y - 8}
      fill="#475569"
      fontSize={12.5} // increased from 10 to 12.5 (25% increase)
      fontWeight="700"
      textAnchor="middle"
    >
      {formattedValue}
    </text>
  );
};

// 3. Slide 6: 数据维护分析 - Grouped Bar Charts for individual brands
interface BrandBohProps {
  current: BohBrandDetails;
  compare: BohBrandDetails;
  prevLabel: string;
  currLabel: string;
}
export const BrandBohChart: React.FC<BrandBohProps> = ({
  current,
  compare,
  prevLabel,
  currLabel
}) => {
  const categories: ("堂食" | "外卖" | "营销活动")[] = ["堂食", "外卖", "营销活动"];

  const data = categories.map(cat => ({
    name: cat,
    [prevLabel]: compare[cat] || 0,
    [currLabel]: current[cat] || 0
  }));

  return (
    <ResponsiveContainer width="100%" height="100%" pdfWidth={310} pdfHeight={270}>
      <BarChart 
        data={data} 
        margin={{ top: 30, right: 10, left: -20, bottom: 5 }}
        barGap={14}
        barCategoryGap="28%"
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
        <XAxis dataKey="name" stroke="#4b5563" fontSize={11} tickLine={false} />
        <YAxis stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend verticalAlign="bottom" height={28} iconSize={10} iconType="rect" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
        <Bar
          dataKey={prevLabel}
          fill={COLOR_COMP_BLUE}
          radius={[1, 1, 0, 0]}
          barSize={14}
          label={renderBrandBohLabel}
          isAnimationActive={false}
        />
        <Bar
          dataKey={currLabel}
          fill={COLOR_CURR_RED}
          radius={[1, 1, 0, 0]}
          barSize={14}
          label={renderBrandBohLabel}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

// 4. Slide 7 (Right): 各品牌报修数量 - Horizontal Bar Chart
interface TicketBrandsProps {
  distribution: Record<string, number>;
}
export const TicketBrandsChart: React.FC<TicketBrandsProps> = ({ distribution }) => {
  // Sort brands so that 太二 is at the bottom, or order exactly as in Slide 7: 太二, 九毛九, 怂 from bottom to top
  const data = [
    { name: "太二", "报修数量": distribution["太二"] || 0 },
    { name: "九毛九", "报修数量": distribution["九毛九"] || 0 },
    { name: "怂", "报修数量": distribution["怂"] || 0 }
  ];

  return (
    <ResponsiveContainer width="100%" height="100%" pdfWidth={329} pdfHeight={240}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 20, right: 50, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
        <XAxis type="number" stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" stroke="#4b5563" fontSize={11} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="报修数量"
          fill={COLOR_HAI_HAOV}
          barSize={12}
          label={renderCustomRightLabel}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

// 5. Slide 7 (Top Left): 问题类型分布 (监控类, 打印机类, etc.) - Horizontal Bar Chart
interface TicketCategoriesProps {
  distribution: Record<string, number>;
}
export const TicketCategoriesChart: React.FC<TicketCategoriesProps> = ({ distribution }) => {
  const data = Object.entries(distribution).map(([key, val]) => ({
    name: key,
    "数量": Number(val)
  }));

  // Sort descending
  data.sort((a, b) => b["数量"] - a["数量"]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 10, right: 45, left: 15, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
        <XAxis type="number" stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" stroke="#4b5563" fontSize={11} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="数量"
          fill={COLOR_HAI_HAOV}
          barSize={10}
          label={renderCustomRightLabel}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

// 6. Slide 7 (Bottom Left): 门店报修数排行 (Top 5) - Vertical Bar Chart
interface TicketShopRankingProps {
  ranking: Record<string, number>;
}
export const TicketShopRankingChart: React.FC<TicketShopRankingProps> = ({ ranking }) => {
  const data = Object.entries(ranking).map(([key, val]) => ({
    name: key.length > 14 ? key.substring(0, 14) + "..." : key,
    tickets: Number(val)
  })).sort((a: { name: string; tickets: number }, b: { name: string; tickets: number }) => b.tickets - a.tickets); // Sort descending so that the highest shop is at the top

  return (
    <ResponsiveContainer width="100%" height="100%" pdfWidth={327} pdfHeight={240}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 10, right: 40, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
        <XAxis type="number" stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          stroke="#4b5563"
          fontSize={10.5}
          tickLine={false}
          axisLine={false}
          width={135}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          name="报修单量"
          dataKey="tickets"
          fill={COLOR_HAI_HAOV}
          radius={[0, 2, 2, 0]}
          barSize={14}
          label={renderCustomRightLabel}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

// 7. Slide 8 (Left): 旧改与开业新店数
interface RenovationProps {
  renovationCount: number;
  newShopsCount: number;
}
export const RenovationChart: React.FC<RenovationProps> = ({
  renovationCount,
  newShopsCount
}) => {
  const data = [
    { name: "旧改开业", "数量": renovationCount },
    { name: "新开", "数量": newShopsCount }
  ];

  return (
    <ResponsiveContainer width="100%" height="100%" pdfWidth={500} pdfHeight={275}>
      <BarChart data={data} margin={{ top: 20, right: 15, left: -15, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
        <XAxis dataKey="name" stroke="#4b5563" fontSize={11} tickLine={false} />
        <YAxis stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="数量"
          fill={COLOR_HAI_HAOV}
          radius={[1, 1, 0, 0]}
          barSize={28}
          label={renderCustomBarLabel}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

// 8. Slide 8 (Right): 第三方供应商运维效率效能监控 (Grouped by metric with three series: 海灏, 擎苍, 戴伟斯)
interface SuppliersProps {
  splits: SupplierSplits;
}
export const SuppliersEfficiencyChart: React.FC<SuppliersProps> = ({ splits }) => {
  const countData = [
    { name: "海灏", "接单单量": splits.haiv?.count || 60 },
    { name: "擎苍", "接单单量": splits.qing?.count || 25 },
    { name: "戴伟斯", "接单单量": splits.dvs?.count || 88 }
  ];

  const daysData = [
    { name: "海灏", "平均完成天数": Number((splits.haiv?.days || 3.6).toFixed(1)) },
    { name: "擎苍", "平均完成天数": Number((splits.qing?.days || 1.3).toFixed(1)) },
    { name: "戴伟斯", "平均完成天数": Number((splits.dvs?.days || 1.8).toFixed(1)) }
  ];

  return (
    <div className="grid grid-cols-2 gap-5 h-full w-full">
      {/* Count Chart */}
      <div className="flex flex-col h-full justify-between">
        <span className="text-[10px] font-bold text-slate-500 block mb-2.5 text-center">📊 派单接单量 (单)</span>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%" pdfWidth={240} pdfHeight={230}>
            <BarChart data={countData} margin={{ top: 20, right: 10, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#4b5563" fontSize={10} tickLine={false} />
              <YAxis stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="接单单量"
                fill={COLOR_HAI_HAOV}
                radius={[1, 1, 0, 0]}
                barSize={18}
                label={renderBrandBohLabel}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Days Chart */}
      <div className="flex flex-col h-full justify-between">
        <span className="text-[10px] font-bold text-slate-500 block mb-2.5 text-center">⏱️ 平均完成时效 (天)</span>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%" pdfWidth={240} pdfHeight={230}>
            <BarChart data={daysData} margin={{ top: 20, right: 10, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#4b5563" fontSize={10} tickLine={false} />
              <YAxis stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="平均完成天数"
                fill={COLOR_QING_CANG}
                radius={[1, 1, 0, 0]}
                barSize={18}
                label={renderBrandBohLabel}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
