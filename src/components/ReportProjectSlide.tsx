import React, { useContext } from "react";
import { ProjectSlide, ProjectMilestone, ProjectMetric } from "../types";
import { PdfContext } from "./ReportCharts";

interface ReportProjectSlideProps {
  slide: ProjectSlide;
  pageIndex: number;
  totalPages: number;
  onUpdate: (updated: Partial<ProjectSlide>) => void;
  onDelete: () => void;
}

export const ReportProjectSlide: React.FC<ReportProjectSlideProps> = ({
  slide,
  pageIndex,
  totalPages,
  onUpdate,
  onDelete,
}) => {
  const isPdf = useContext(PdfContext);
  const handleTitleChange = (e: React.FocusEvent<HTMLHeadingElement>) => {
    const text = e.currentTarget.innerText;
    if (text !== slide.title) {
      onUpdate({ title: text });
    }
  };

  const handleSummaryChange = (e: React.FocusEvent<HTMLParagraphElement>) => {
    const text = e.currentTarget.innerText;
    if (text !== slide.summary) {
      onUpdate({ summary: text });
    }
  };

  const handleOwnerChange = (e: React.FocusEvent<HTMLSpanElement>) => {
    const text = e.currentTarget.innerText;
    if (text !== slide.owner) {
      onUpdate({ owner: text });
    }
  };

  const handleStatusChange = (e: React.FocusEvent<HTMLSpanElement>) => {
    const text = e.currentTarget.innerText;
    if (text !== slide.projectStatus) {
      onUpdate({ projectStatus: text });
    }
  };

  const handleMetricChange = (mId: string, field: keyof ProjectMetric, value: string) => {
    const nextMetrics = slide.keyMetrics.map((m) => {
      if (m.id === mId) {
        return { ...m, [field]: value };
      }
      return m;
    });
    onUpdate({ keyMetrics: nextMetrics });
  };

  const handleMilestoneChange = (msId: string, field: keyof ProjectMilestone, value: any) => {
    const nextMilestones = slide.milestones.map((ms) => {
      if (ms.id === msId) {
        return { ...ms, [field]: value };
      }
      return ms;
    });
    onUpdate({ milestones: nextMilestones });
  };

  const handleBulletChange = (index: number, value: string) => {
    const nextBullets = [...slide.contentBullets];
    nextBullets[index] = value;
    onUpdate({ contentBullets: nextBullets });
  };

  const handleAddBullet = () => {
    onUpdate({
      contentBullets: [
        ...slide.contentBullets,
        "<b>新增推进要点：</b> 请在此输入重点项目进展或成果说明。",
      ],
    });
  };

  const handleDeleteBullet = (index: number) => {
    const nextBullets = slide.contentBullets.filter((_, i) => i !== index);
    onUpdate({ contentBullets: nextBullets });
  };

  const handleAddMilestone = () => {
    const newMs: ProjectMilestone = {
      id: `ms_${Date.now()}`,
      phase: "新推进节点",
      date: "当月中旬",
      status: "doing",
      desc: "请在此输入阶段性推进描述",
    };
    onUpdate({ milestones: [...slide.milestones, newMs] });
  };

  const handleDeleteMilestone = (id: string) => {
    onUpdate({ milestones: slide.milestones.filter((ms) => ms.id !== id) });
  };

  return (
    <div className="w-full h-full flex flex-col justify-between px-12 py-8 bg-white relative">
      <div>
        {/* PPT Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-4 relative">
          <div className="w-2.5 h-6 bg-[#2F3EE4] rounded-sm flex-none" />
          <h2
            contentEditable
            suppressContentEditableWarning
            onBlur={handleTitleChange}
            className="text-xl font-bold text-slate-800 tracking-tight font-sans hover:bg-amber-50/60 focus:bg-amber-50 px-2 py-0.5 rounded outline-none transition cursor-text flex-1"
          >
            {slide.title || "重点项目推进专项"}
          </h2>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[10px] text-slate-400 font-mono tracking-wider">
              PAGE {String(pageIndex + 1).padStart(2, "0")} / {String(totalPages).padStart(2, "0")}
            </span>
            <span
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => onUpdate({ categoryTag: e.currentTarget.innerText })}
              className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-full font-sans font-semibold outline-none hover:bg-indigo-100 cursor-text"
              title="点击编辑角标"
            >
              {slide.categoryTag || "项目专项"}
            </span>
            {!isPdf && (
              <button
                type="button"
                onClick={onDelete}
                className="text-xs text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer"
                title="删除此项目专页"
              >
                <span>🗑️</span>
                <span>删除专页</span>
              </button>
            )}
          </div>
        </div>

        {/* Project Metadata Banner */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg flex-none shadow-sm">
              🚀
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => onUpdate({ ownerLabel: e.currentTarget.innerText })}
                  className="text-xs text-slate-400 font-semibold outline-none hover:bg-amber-50 rounded px-1"
                >
                  {slide.ownerLabel || "责任团队/负责人:"}
                </span>
                <span
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={handleOwnerChange}
                  className="text-xs font-bold text-slate-700 bg-white border border-slate-200/80 px-2 py-0.5 rounded outline-none hover:border-indigo-300"
                >
                  {slide.owner}
                </span>
                <span
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => onUpdate({ statusLabel: e.currentTarget.innerText })}
                  className="text-xs text-slate-400 font-semibold ml-2 outline-none hover:bg-amber-50 rounded px-1"
                >
                  {slide.statusLabel || "项目当前状态:"}
                </span>
                <span
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={handleStatusChange}
                  className="text-xs font-extrabold text-indigo-700 bg-indigo-100/80 px-2.5 py-0.5 rounded-full outline-none hover:bg-indigo-200"
                >
                  {slide.projectStatus}
                </span>
              </div>
              <p
                contentEditable
                suppressContentEditableWarning
                onBlur={handleSummaryChange}
                className="text-xs text-slate-600 leading-relaxed outline-none hover:bg-amber-50/50 p-1 rounded"
              >
                {slide.summary}
              </p>
            </div>
          </div>
        </div>

        {/* 4 Key Metric Cards */}
        <div className="grid grid-cols-4 gap-4 mb-5">
          {slide.keyMetrics.map((m) => (
            <div
              key={m.id}
              className="border border-slate-200/90 rounded-2xl p-3.5 bg-gradient-to-br from-white to-slate-50/50 hover:border-indigo-300 transition shadow-xs flex flex-col justify-between"
            >
              <div
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleMetricChange(m.id, "label", e.currentTarget.innerText)}
                className="text-[11px] font-bold text-slate-500 outline-none hover:bg-amber-50 rounded px-1"
              >
                {m.label}
              </div>
              <div
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleMetricChange(m.id, "value", e.currentTarget.innerText)}
                className="text-2xl font-black text-indigo-700 font-mono my-1.5 outline-none hover:bg-amber-50 rounded px-1"
              >
                {m.value}
              </div>
              {m.trend !== undefined && (
                <div
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleMetricChange(m.id, "trend", e.currentTarget.innerText)}
                  className="text-[10px] font-bold text-emerald-600 font-mono outline-none hover:bg-amber-50 rounded px-1"
                >
                  {m.trend}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Middle Section: Left Milestones + Right Core Bullets */}
        <div className="grid grid-cols-12 gap-5 mb-4">
          {/* Milestones Time Progress */}
          <div className="col-span-5 border border-slate-200/80 rounded-2xl p-4 bg-slate-50/30 flex flex-col justify-between shadow-2xs">
            <div className="flex justify-between items-center mb-3">
              <span
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => onUpdate({ milestonesTitle: e.currentTarget.innerText })}
                className="text-xs font-bold text-slate-800 flex items-center gap-1.5 outline-none hover:bg-amber-50 rounded px-1"
              >
                {slide.milestonesTitle || "🗓️ 项目推进里程碑节点"}
              </span>
              {!isPdf && (
                <button
                  type="button"
                  onClick={handleAddMilestone}
                  className="text-[10px] bg-white border border-slate-200 text-indigo-600 font-bold px-2 py-0.5 rounded-lg hover:bg-indigo-50 transition cursor-pointer"
                >
                  + 加节点
                </button>
              )}
            </div>
            <div className="space-y-3 my-auto">
              {slide.milestones.map((ms) => (
                <div key={ms.id} className="flex items-start gap-2.5 text-xs group relative">
                  <button
                    type="button"
                    onClick={() => {
                      const nextStatus =
                        ms.status === "done" ? "doing" : ms.status === "doing" ? "todo" : "done";
                      handleMilestoneChange(ms.id, "status", nextStatus);
                    }}
                    className={`mt-0.5 flex-none w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer transition ${
                      ms.status === "done"
                        ? "bg-emerald-500 text-white"
                        : ms.status === "doing"
                        ? "bg-indigo-600 text-white animate-pulse"
                        : "bg-slate-200 text-slate-500"
                    }`}
                    title="点击切换节点状态 (完成/推进中/待启动)"
                  >
                    {ms.status === "done" ? "✓" : ms.status === "doing" ? "▶" : "·"}
                  </button>
                  <div className="flex-1 min-w-0 bg-white border border-slate-200/60 p-2 rounded-xl shadow-2xs">
                    <div className="flex justify-between items-center mb-0.5">
                      <span
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleMilestoneChange(ms.id, "phase", e.currentTarget.innerText)}
                        className="font-bold text-slate-800 outline-none hover:bg-amber-50 rounded px-1"
                      >
                        {ms.phase}
                      </span>
                      <span
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleMilestoneChange(ms.id, "date", e.currentTarget.innerText)}
                        className="text-[10px] font-mono text-slate-400 outline-none hover:bg-amber-50 rounded px-1"
                      >
                        {ms.date}
                      </span>
                    </div>
                    <p
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handleMilestoneChange(ms.id, "desc", e.currentTarget.innerText)}
                      className="text-[11px] text-slate-500 leading-tight outline-none hover:bg-amber-50 rounded px-1"
                    >
                      {ms.desc}
                    </p>
                  </div>
                  {!isPdf && (
                    <button
                      type="button"
                      onClick={() => handleDeleteMilestone(ms.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 font-bold px-1 transition text-xs"
                      title="删除节点"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Core Content Bullets */}
          <div className="col-span-7 border border-slate-200/80 rounded-2xl p-4 bg-slate-50/30 flex flex-col justify-between shadow-2xs">
            <div className="flex justify-between items-center mb-3">
              <span
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => onUpdate({ bulletsTitle: e.currentTarget.innerText })}
                className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 outline-none hover:bg-amber-50 rounded px-1"
              >
                {slide.bulletsTitle || "📋 项目核心成果与保障措施"}
              </span>
              {!isPdf && (
                <button
                  type="button"
                  onClick={handleAddBullet}
                  className="text-[10px] bg-white border border-slate-200 text-indigo-600 font-bold px-2 py-0.5 rounded-lg hover:bg-indigo-50 transition cursor-pointer"
                >
                  + 添加要点
                </button>
              )}
            </div>
            <div className="space-y-2.5 my-auto">
              {slide.contentBullets.map((bullet, bIdx) => (
                <div key={bIdx} className="flex items-start gap-2 group relative">
                  <span className="flex-none text-indigo-600 font-bold text-xs mt-0.5">•</span>
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleBulletChange(bIdx, e.currentTarget.innerHTML)}
                    dangerouslySetInnerHTML={{ __html: bullet }}
                    className="flex-1 text-xs text-slate-700 leading-relaxed bg-white border border-slate-200/60 p-2.5 rounded-xl outline-none hover:border-indigo-300 focus:bg-amber-50/50 shadow-2xs"
                  />
                  {!isPdf && (
                    <button
                      type="button"
                      onClick={() => handleDeleteBullet(bIdx)}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 font-bold px-1.5 transition text-xs"
                      title="删除此要点"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-2 flex justify-between font-mono">
        <span
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onUpdate({ footerLeft: e.currentTarget.innerText })}
          className="outline-none hover:bg-amber-50 rounded px-1"
        >
          {slide.footerLeft || "九毛九集团 IT 专项保障目录"}
        </span>
        <span
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onUpdate({ footerRight: e.currentTarget.innerText })}
          className="outline-none hover:bg-amber-50 rounded px-1"
        >
          {slide.footerRight || "CONFIDENTIAL"}
        </span>
      </div>
    </div>
  );
};
