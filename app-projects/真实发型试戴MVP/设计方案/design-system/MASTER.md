# 剪之前 · 设计系统主文件

> 这是根据 `ui-ux-pro-max --design-system --persist` 结果经竞品审计后的产品专用覆写。脚本原始输出保留于 `design-system/default/MASTER.md`；未对它做伪造修改。

## 语气与不做的事

- 语气：冷静、具体、可商量。用“可以讨论”代替“你会变得更漂亮”。
- 不用 AI 紫粉、闪亮渐变、浮动水晶卡、滤镜网格或多个主 CTA。
- 不宣称“真实生成”、“任意角度”或“剪后保证”。

## Token

| 角色 | Token | 值 |
|---|---|---|
| 底色 | `--paper` | `#F6F3EC` |
| 浅表面 | `--surface` | `#FFFEFA` |
| 墨色正文 | `--ink` | `#1D211E` |
| 次级文字 | `--slate` | `#5F6962` |
| 主行动 | `--pine` | `#185C4A` |
| 辅助发色 | `--clay` | `#A9694B` |
| 边框 | `--line` | `#D8D5CB` |
| 警告 | `--warning` | `#B44832` |

**字体**：标题 `Newsreader, Georgia, serif`；UI/正文 `Inter, -apple-system, BlinkMacSystemFont, sans-serif`；数值标签 `ui-monospace` 。正文不小于 16px，标签 12px，行高 1.5–1.7。

**空间**：4/8/12/16/24/32/48/64px；屏幕边距 20px（375/390）；大屏可增至 28px。

**形状**：发型方向卡 20px；系统提示 14px；主行动按钮 14px；1px 边框；阴影只用 `0 8px 20px rgba(24, 34, 29, .08)` 作浅层级。

**动效**：150–220ms 的 opacity/transform 点击反馈；扫描进度可用 240ms 缓动；`prefers-reduced-motion: reduce` 时立即切换。

## 组件规则

- 每屏一个主 CTA；主 CTA 高 52px、宽度全列、外加 8px 间距。
- 底部导航 4 项，每项同时具备 SVG 图标与文字标签，触控区 ≥44px。
- “现实可实现性”使用文字 + 符号 + 色彩，不只靠红绿色。
- 所有图标为同一 1.8px 线性 SVG，无 emoji 结构图标。
- 每个状态文案包含“发生什么” + “如何恢复”。
