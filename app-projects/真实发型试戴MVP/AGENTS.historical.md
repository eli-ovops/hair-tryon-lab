# 真实发型试戴MVP — 「剪之前」真实发型决策原型

> 不是「换一张更美的脸」，而是把问题问清楚：上传正面与左右侧面，写下真实发质和打理预算，对比 2–3 个现实方向，带一张参考卡去见发型师。含 MediaPipe 本地实时扫描（无网络依赖）。

## 目录地图

- `index.html` + `styles.css` — 决策主流程（三视图 → 现实约束 → 候选比较 → 发型师参考卡）。
- `scan.html` + `scan.js` + `scan-machine.js`（状态机）+ `scan.css` — 实时扫描 AR（MediaPipe 人脸 landmark）。
- `vendor/mediapipe/` — 本地 `face_landmarker.task` + WASM（vision_bundle.mjs、3 套 wasm），**零网络依赖，不要换路径/改加载方式**。
- `手机测试MVP/` — 手机版（ui-v2 视觉）；`手机测试MVP-imagegen-staging/` — staging 版。两者是独立副本。
- `iOS模拟器MVP/` — SwiftUI + `WKWebView` 本地容器：`HairTryOnMVP.xcodeproj`，Scheme `HairTryOnMVP`，Bundle ID `com.cczij.hairtryonmvp`，iOS 17+。Web 资源从 `../手机测试MVP` **只读复制**到 `HairTryOnMVP/Web/`，以 `hairtryon://` 自定义 scheme 提供（`WKURLSchemeHandler` 显式 MIME：JS/WASM/model/PNG）。无 CocoaPods/SPM/第三方运行依赖（复用决策见 `iOS模拟器MVP/复用决策.md`）。
- `设计方案/` — 产品体验蓝图、竞品视觉与体验审计、设计预览（A/B/C 方案）、design-system。
- 根目录 `qa-*.png`、`*.png` — QA 与设计对比截图。

## 运行

- Web：本地静态服务器打开根目录 `index.html` / `scan.html`（如 `python3 -m http.server`），或直接打开文件。
- iOS 容器：Xcode 打开 `iOS模拟器MVP/HairTryOnMVP.xcodeproj`。
  - 模拟器：自动使用本地 landmark 演示回退，界面明确标明不是摄像头 AR。
  - 真机：不附加 demo query，保留网页内真实 `getUserMedia` + 本地 MediaPipe；自定义 scheme 下的真实相机权限**仍需真机单独验收**。

## 当前状态与边界

- 原型阶段（THROWAWAY MVP）：本页**没有接入换发 AI**，预览是叠加在原图的交互模拟轮廓，不代表剪后效果 —— 界面必须有此声明。
- 照片仅在此浏览器内存中处理，不上传；无账号、无后端。
- 任何改动不要破坏「本地 vendor 零网络」约束（iOS 容器尤其依赖它）。

## 相关研究（在上级目录，本工作区外，需手动引用）

`真实发型试戴海外机会深研.md`、`三个App自然流量与首批100用户研究_2026-07-31.md`、`美国区AppStore增长型轻量App机会池_2026-08-01.md`。
