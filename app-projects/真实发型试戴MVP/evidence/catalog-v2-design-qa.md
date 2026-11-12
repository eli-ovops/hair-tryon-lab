# Catalog v2 设计 QA

final result: passed

## 比对对象

- 视觉来源：`设计方案/imagegen-ui-v2.png` 中间“发型/颜色”手机屏。
- 实现：`evidence/catalog-v2-ios-style.png`，iOS 内置 Web，393 × 852 CSS px、1x、`?demo=style&simulator=1`、女性/长发筛选状态。
- 合成比对：`evidence/catalog-v2-design-qa-comparison.png`。来源图已裁掉周边画布并归一到同一内容尺寸；来源自带设备外框，未把外框差异计入问题。

## 结论

参考图的相机主画面、顶部操作、底部圆角选择器、发型/颜色双 tab 和底部主操作层级均已对齐。实现按 MASTER 使用温白、炭黑、深松绿；没有引入黑紫 AI 渐变、emoji、ASCII/CSS 发型或虚构发型缩略图。

与来源刻意不同的部分是 P0 产品诚实性要求，而非视觉缺陷：目录卡显示“技术试验”或“仅目录”，而不是把来源的真人换发缩略图冒充 100 款真实结果；主按钮文案为“生成参考视图”，随后页面明确说明它是轮廓技术试验、未接真实 AI 换发。

## 检查项

- P0：无可见控件失效；首启无底部导航，结果后才出现三项导航。
- P1：44px 以上主要触点、选中/禁用/按压状态、筛选后的纵向滚动和返回状态均可用。
- P2：目录信息密度比来源更高，但在 393px 宽度下无横向溢出，文字和控件未裁切。

应用内 Browser MCP 不可用；此对照以本机 Playwright Chromium（mobile touch emulation）捕获。它不是实体设备可视验收。
