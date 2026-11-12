# 阶段 0+1：iOS 容器基线与审计（2026-08-07）

## 复用与工具边界

- GitHub 最小检索（agent-reach/`gh`）：`WKWebView getUserMedia camera permission iOS` 与 `WKWebView photo library save image bridge iOS` 均无仓库候选；不引入依赖或复制第三方实现。现有原生 WebKit/Photos 桥保留。
- 当前环境未提供 ios-debugger-agent、XcodeBuildMCP、ios-simulator-browser 或 sosumi MCP；降级为 Xcode、`devicectl`、`simctl`、本机 Simulator GUI 与 Playwright。未下载浏览器、模型或其他工具。

## 阶段 0 自动化与 Simulator 操作

- 代码级触摸回归：`catalog-p0-scroll-touch-regression.py`。iOS Web 和手机 Web 均 PASS：100 卡目录纵滑 `scrollTop > 0`、末条可选、两次颜色切换、进入对比。该回归使用本机 Chrome Chromium touch emulation；不是 WebKit 或实体触感证明。
- Simulator（iPhone 17 / iOS 26.5）Build 成功（`catalog-p0-stage01-simulator-build.log`）；Install 与 Launch 各 exit 0（`catalog-p0-stage01-simulator-install-launch.log`）。
- GUI 已完成：演示扫描进入目录、目录筛选/选中、颜色两次切换、查看对比、正/侧切换、返回重选。侧面对比截图：`catalog-p0-stage01-simulator-side.png`。Simulator GUI 对 Web 内容未暴露独立可滚动 AX 元素，实际触摸纵滑由上述代码级回归覆盖。
- 保存拒绝：系统照片权限弹窗点“ 不允许 ”后，App 显示“照片权限未开启，请到系统设置允许后重试”。保存允许：重置该 Simulator 内本 App 的 `photos-add` 权限后，系统弹窗点“允许”；未获得相册条目级独立查询证据，故只记为“允许请求已接受”，不记为保存成功。

## 实体设备状态（非可视验收）

- 通过 `devicectl --json-output` 结构化确认唯一一台 Reality=physical 的 iPhone 17；设备标识未写入日志。
- `devicectl device info apps` 显示 `com.cczij.hairtryonmvp` 已安装，版本 1.0（build 1）。最终打包后的 `Web/screen-state.css` 与源码 SHA-256 一致。
- 此状态仅说明已安装；不证明实体机画面、相机、照片保存或目录手感。用户仍需在实体机确认纵滑至末条、相机许可/实际画面与相册保存结果。

## SwiftUI / WKWebView 审计

### 已核实的正确项

- `ContentView.swift`：`WKWebViewConfiguration` 注册本地 `hairtryon` scheme 和 `saveImage` bridge；`dismantleUIView` 移除 message handler。Simulator 使用明确标注的假 landmark；实体不带 demo query。
- `Info.plist`：相机与“仅添加照片”用途文案齐全；JS 请求仅 `video`，`audio:false`，无需麦克风用途文案。方向锁定 portrait，与当前单栏 UI 一致。
- `LocalWebSchemeHandler.swift`：拒绝 `..` 路径并再核标准化路径前缀；HTML/CSS/JS/WASM/task/图片/JSON MIME 均已覆盖；本地 bundle 读取不出网。
- 保存桥：JS 防重复请求，Swift 将权限、Photos 写入结果经主线程回传 JS；拒绝路径经 Simulator 已观察到。

### 未修复的风险与原因

1. **P0 验收缺口（非已复现代码缺陷）**：实体机 `hairtryon://` origin 下的真实 `getUserMedia`、原始相机方向、拒绝/恢复与真实照片条目保存尚无用户可视证据。Simulator 固定走 fake media，不能替代。需要用户在实体机实际授权与操作。
2. **P1 候选，待真实压力复现**：`saveReference()` 以 PNG data URL 经 `WKScriptMessageHandler` 传递，峰值可能同时持有 Canvas、base64 字符串、`Data` 与 `UIImage`；当前没有 OOM/卡顿复现，故未臆测加入大小上限或重构桥。真机应观测大分辨率保存的内存、时延与失败恢复。
3. **P1 候选，待相机实测**：容器未显式实现 `WKUIDelegate` 的媒体捕获权限回调，当前依赖 WebKit 默认权限行为。没有实体相机失败证据，不在本轮改权限策略。
4. **P2 韧性候选**：`LocalWebSchemeHandler.stop` 为空；若任务在后台读取完成后已被取消，完成回调可能针对停止任务。未复现错误，保留现状并建议后续添加取消状态回归。

## 结论

本轮没有对 SwiftUI/WKWebView 壳层做推测性修改；已复现的目录触摸问题在此前 H2 修复后持续通过。Build、Install、Launch、模拟器 GUI 和实体可视验收保持分离。
