# 100 款目录 P0 本地验证

> 2026-08-07 第二轮：本报告替代先前含 cloneNode 事件绕行的验收结论。手机版 `scan.js` 已直接重写为单一 `bind()` 注册表；`cloneNode` 为 false，关键静态控件各 1 次绑定。两份 Web 本轮结果分别位于 `catalog-p0-mobile-web/result.txt` 与 `catalog-p0-ios-web/result.txt`。

## 范围与边界

- 目录为 50 女性 + 50 男性参考条目；无任何缩略图请求或伪造图片。
- 选择仅映射到既有 `short` / `bob` 轮廓原型；不表示 100 种真实试戴、AI 生成或真实染发。
- 未触及证书、账号、Bundle ID、外部服务或真机。

## 自动检查

- `node --check`：手机与 iOS 内置 Web 的 `scan.js`、`catalog.js` 通过。
- JSON：总数 100、唯一 ID 100、女性 50、男性 50、必填筛选字段有效。
- Chrome 本地交互：女性长发 14、男性长发 8；首/中/末条目、两次颜色、对比、正侧、返回重选通过；`errors=[]`、`thumbnail_requests=[]`。
- iOS Web 副本用同一 Chrome 流程回归通过；结果见 `catalog-p0-ios-web/result.txt`。

## Xcode / Simulator

- iPhone 17 / iOS 27 构建：`** BUILD SUCCEEDED **`，日志为 `catalog-p0-xcode-build-final.log`。
- 构建包已包含 `Web/catalog.js`、`Web/assets/catalog/women-50.json`、`Web/assets/catalog/men-50.json`。
- 本轮增量构建再次为 `** BUILD SUCCEEDED **`（`catalog-p0-xcode-final-recheck.log`）；随后在 iPhone 17 / iOS 27 安装成功、`simctl launch` 返回 PID 9545，并完成真实 App 可视点击。该结果替代早先的 Shutdown 记录，不以旧截图或 Web 截图代替。
- 新界面与交互证据：`catalog-p0-ios27-current.png` 显示 100/100 的无缩略图信息卡目录；`catalog-p0-ios27-female.png` 显示女性 50/100；本轮短日志 `catalog-p0-ios27-visible-clicks.md` 记录女性长发 14、男性长发 8、两个颜色及对比页。`catalog-p0-ios27-compare.png` 为最终对比页截图。

## 实体设备纠正与安装状态

- 更正：上述 `ios27` 截图和 `simctl` 记录均是 Simulator 证据，不能称作真实 iPhone、实体设备安装或手机可视验收；`simctl` 的运行容器与实体设备独立，不能证明实体机上的安装、签名信任、权限弹窗或实际画面。
- 本轮改用 `devicectl` 识别唯一一台 Reality=physical 的已连接 iPhone 17（设备标识不写入报告）。现有自动签名、既有 Team 与 `com.cczij.hairtryonmvp` 保持不变，未新建/删除/撤销证书或 profile。
- 实体 Build：`catalog-p0-physical-device-build.log`，`xcodebuild_exit=0` / `BUILD SUCCEEDED`；实体安装：`catalog-p0-physical-device-install.log`，`devicectl_install_exit=0`；实体启动：`catalog-p0-physical-device-launch.log`，`devicectl_launch_exit=0`。
- `devicectl device info apps` 随后确认 app 已安装，版本 1.0（build 1），见 `catalog-p0-physical-device-app-info.log`。这些是设备部署证据；实体屏幕上的新版 100 款目录仍须由用户查看并反馈，当前不将命令成功替代为可视验收。

## 目录纵向触摸修复（2026-08-07）

- 根因（H2）：仅 iOS 内置 Web 的旧 `screen-state.css` 在 `app.css` 之后加载，以 `.style-options` 覆盖新版 `.catalog-options`，使目录变为 `display:flex`、`overflow-y:hidden`。因此目录可见但纵向 `scrollTop` 永远为 0。旧横拖 JS 已在 `catalog-options` 上早退（H1），相机/透明层层级（H3）及 `replaceChildren` 子节点重建（H4）均非根因。
- Reasonix：一次只读审计最终成功完成（约 158 秒；`subtype=success`；session_id 已留在本地审计 JSON），与独立 DOM/CSS 探针一致。等待期间曾有 0 字节中间态，但未被当作结论或重跑。
- 修复：`Web/screen-state.css` 仅增加 catalog 专用覆盖，恢复两列 grid、`overflow-y:auto`、`overflow-x:hidden`、`touch-action:pan-y` 和 iOS 惯性滚动，并取消 catalog 从旧 carousel 继承的 flex/snap；`手机测试MVP/app.css` 同步最小纵向触摸属性。未改 `scan.js` 横拖逻辑、颜色值、相机、对比或签名配置。
- 修复前 FAIL：`catalog-p0-scroll-before.json`（Chromium touch emulation）为 `overflowY=hidden`、`display=flex`、`scrollHeight=clientHeight=100`、`maxScrollTop=0`、纵滑后 `scrollTop=0`。
- 修复后 PASS：iOS 内置 Web 同一触摸回归见 `catalog-p0-scroll-after.json`（`scrollTop=255`、`maxScrollTop=5006`、第 100 条可点、两次颜色和对比均通过）；手机 Web 同一回归见 `catalog-p0-scroll-mobile-after.json`（`scrollTop=254`，其余断言通过）。Playwright 自带 WebKit/Chromium 未安装，未下载；使用已安装 Chrome 的 Chromium touch emulation，故仍不能替代实体手感验证。
- 实体更新包：以 `devicectl --json-output` 结构化识别唯一 Reality=physical iPhone 17（标识未写入证据），最终包的 `catalog-p0-physical-device-scroll-final-build.log`、`-install.log`、`-launch.log` 分别记录 Build/Install/Launch 均 exit 0。请用户在实体手机确认可纵滑至末条并选择；在该反馈前，不声明实体可视最终通过。

## Reasonix 与复用

- Reasonix 只读审计实际约 110 秒后成功完成：`/tmp/reasonix-hair-catalog-audit.json` 最终为 7,823 字节，`subtype=success`，session_id=`20260807-051429.506326000-deepseek-v4-flash`。执行者曾过早检查到 0 字节并漏等；后续有效结果识别出重复绑定、缩略图破图请求、颜色 tab 禁用与目录不可滚动，和独立审查一致。
- 已按 agent-reach/gh 发起 GitHub 复用搜索；本机 `gh search` 成功状态但无候选输出，故未引入依赖或第三方素材，自研最小 JSON 渲染与事件修复。
