# iPhone 17 / iOS 27 本轮可视点击

- 设备：`B146FAD8-F69A-4428-89A2-F4A2DE0EE935`（iPhone 17，iOS 27.0）；App：`com.cczij.hairtryonmvp`。
- 构建：`xcodebuild ... -destination 'platform=iOS Simulator,id=B146FAD8-F69A-4428-89A2-F4A2DE0EE935' build CODE_SIGNING_ALLOWED=NO`，日志 `catalog-p0-xcode-final-recheck.log` 为 `BUILD SUCCEEDED`。
- 安装：`xcrun simctl install` 成功；启动：`xcrun simctl launch` 返回 PID 9545。
- 真正 App 内点击：启动演示扫描 -> 女性 -> 长发（界面显示 `14 / 100`）-> 选择“长层次”；男性（界面显示 `8 / 100`）-> 选择“男士丸子头”；颜色 -> 深咖 -> 栗棕 -> 查看对比（正面页）。
- 截图：`catalog-p0-ios27-current.png`（100/100 目录）、`catalog-p0-ios27-female.png`（女性 50/100）、`catalog-p0-ios27-compare.png`（正面对比）。所有截图均由该 Simulator 的 `simctl io screenshot` 生成。
- 说明：目录卡明确显示“无缩略图·信息卡”；轮廓仅为原型模拟，未声称真实 AI 或真实染发结果。
