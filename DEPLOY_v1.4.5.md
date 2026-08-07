# 九毛九集团 IT 运维月报系统 v1.4.5 运维部署清单

**推送时间**：2026-08-07  
**最新 Commit**：`c181f45`（v1.4.5）  
**仓库地址**：https://github.com/huangjiawei-cmd/it-report  

---

## 📦 本次更新范围（v1.4.4 + v1.4.5 合并交付）

### v1.4.4 — 跨设备数据同步修复
- **问题**：新设备打开月报时所有数据显示为 0；新增的重点项目专页在其他设备不可见
- **根因**：协同同步引擎每 1.5s 轮询 `/api/collaboration/sync`，返回的服务器数据覆盖本地输入；`customProjectSlides` 仅存 localStorage 且未参与同步
- **修复**：注释掉协同同步回调中对 `customProjectSlides` 的服务器覆盖，项目专页以 localStorage 为准；优化 autoPrefetch 逻辑确保新设备能正确拉取草稿数据
- **影响文件**：`server.ts`、`src/components/ReportPage.tsx`

### v1.4.5 — PDF 导出质量修复
- **问题**：导出的 PDF 中每页残留操作按钮（"继承上月分析""恢复默认分析""+ 加节点""+ 添加要点"等），重点项目专页右上角"专项"标签影响观看体验
- **根因**：PDF 导出使用 `html-to-image` + `jspdf`，不识别 `data-html2canvas-ignore` 属性；Slide 4/5/6/7/8 的操作按钮组及 categoryTag 未用 PdfContext 条件渲染隐藏
- **修复**：
  - ReportPage.tsx 顶层添加 `const isPdf = useContext(PdfContext)`，所有 slide case 共享此变量
  - Slide 4/5/6/7/8 的按钮组全部用 `{!isPdf && (...)}` 包裹
  - ReportProjectSlide.tsx 的 categoryTag（"项目专项"角标）用 `{!isPdf && (...)}` 包裹
  - 清理 case 1 块级作用域残留的多余闭合括号（曾导致构建失败）
- **影响文件**：`src/components/ReportPage.tsx`、`src/components/ReportProjectSlide.tsx`

---

## 🔧 运维拉取清单

### 需要拉取的文件

| 文件路径 | 变更类型 | 说明 |
|---------|---------|------|
| `src/components/ReportPage.tsx` | 修改 | 顶层 isPdf 变量、Slide 4-8 按钮组 PDF 隐藏、case 1 语法修复 |
| `src/components/ReportProjectSlide.tsx` | 修改 | categoryTag PDF 隐藏 |
| `server.ts` | 修改（v1.4.4） | 协同同步 API 调整，注释掉 customProjectSlides 服务器覆盖 |
| `package.json` | 无变更 | 无需重新安装依赖 |
| 数据库 / report_storage.json | 无变更 | 无需迁移数据 |

### 部署步骤（⚠️ 必须严格按顺序执行，不可跳过）

```bash
# 1. 进入项目目录
cd /path/to/it-report

# 2. 拉取最新代码（必须确认 commit 为 8cb2916）
git pull origin main
git log --oneline -1
# ✅ 预期输出: 8cb2916 docs: 添加 v1.4.4+v1.4.5 完整运维部署清单
# ❌ 如果输出不是 8cb2916，说明拉取失败，立即停止并检查网络/Git配置

# 3. 清除浏览器缓存（关键！旧 JS 缓存会导致 PDF 按钮残留）
# 方法A: Ctrl+Shift+Delete 清除缓存后硬刷新 (Ctrl+F5)
# 方法B: 打开 DevTools → Network 标签 → 勾选 "Disable cache" → 刷新页面

# 4. 重新构建前端（必须执行，即使之前已构建过）
npx vite build
# ✅ 预期输出: ✓ built in X.XXs
#  如果报错，立即停止并截图反馈

# 5. 重启后端服务
# 若使用 PM2: pm2 restart it-report
# 若直接运行: 先 kill 旧进程，再 node server.ts
```

### ⚠️ 如果 PDF 中仍有按钮残留，按以下顺序排查

| 排查项 | 检查命令/操作 | 预期结果 |
|-------|-------------|---------|
| Git commit 是否正确 | `git log --oneline -1` | 必须是 `8cb2916` |
| 前端是否重新构建 | 检查 `dist/` 目录修改时间 | 应晚于 git pull 时间 |
| 浏览器是否清缓存 | DevTools → Application → Clear storage | 已清除 |
| ReportPage.tsx 是否有 `{!isPdf &&` | `grep -n "!isPdf" src/components/ReportPage.tsx` | 至少 5 处匹配 |
| 导出时是否用新页面 | 关闭所有旧标签页，重新打开月报 | 无旧实例干扰 |

### 验证要点

- [ ] 浏览器打开月报页面，切换到任意 Slide 4/5/6/7/8，点击"导出 PDF"，检查生成的 PDF 中是否还有操作按钮
- [ ] 新建一个重点项目专页，编辑右上角"项目专项"标签后导出 PDF，检查标签是否已隐藏
- [ ] 在新设备（无 localStorage 缓存）上打开月报，确认数据不为全 0
- [ ] 在一台设备上新增项目专页，另一台设备刷新后能看到该专页

---

## ⚠️ 注意事项

- **后端入口**：`server.ts`（单文件后端），无框架路由拆分
- **前端构建产物**：`dist/` 目录，由 `npx vite build` 生成
- **数据存储**：MySQL + `report_storage.json` 双持久化，本次更新不涉及数据结构变更
- **协同同步**：HTTP Heartbeat Polling（1.5秒间隔），项目专页数据不再参与服务器合流

---

## 📝 完整 Git 提交历史（本次交付包含）

```
c181f45 fix: PDF导出隐藏所有操作按钮及专项标签 (v1.4.5)
d456c3f fix: 修复跨设备数据全0及重点项目专页丢失问题 (v1.4.4)
```
