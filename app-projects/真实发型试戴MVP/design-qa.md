# 设计 QA：imagegen-ui-v2

## 对照目标与规格

- 视觉真值：`/Users/USER/Documents/app/真实发型试戴MVP/设计方案/imagegen-ui-v2.png`
- SHA-256：`f677ccce57a85d4dbab1d9adf835dfde4d6cf0f0684cf34245ef0c1a8c271060`
- 实现：`/Users/USER/Documents/app/真实发型试戴MVP/手机测试MVP-imagegen-staging/`
- 比较视口：393×852 CSS px，density 1；源稿 1473×1068 px 在同画布对照中按内容区域归一化。

## 浏览器渲染证据

- scan：`/Users/USER/Documents/app/真实发型试戴MVP/qa-scan-393x852.png`
- style（修复后稳定态）：`/Users/USER/Documents/app/真实发型试戴MVP/qa-style-fixed-stable-393x852.png`
- result（修复后稳定态）：`/Users/USER/Documents/app/真实发型试戴MVP/qa-result-fixed-stable-393x852.png`
- result 侧面交互：`/Users/USER/Documents/app/真实发型试戴MVP/qa-result-side-393x852.png`
- 源稿与实现同画布比较：`/Users/USER/Documents/app/真实发型试戴MVP/qa-comparison-final.png`

父任务以应用内浏览器在 393×852 完成 scan/style/result 对照：三态可见、无横向溢出，console warnings/errors 为 `[]`。style 的 Bob 选择可点击；result 的“侧面”tab 唯一可点击，点击后 `aria-selected=true` 且呈现短层次侧面图。

## 保真面结论

- 字体与层级：系统 SF/CJK 回退稳定；扫描标题、底部提示、白色抽屉与结果操作层级清晰，无异常截断。
- 间距与布局：相机主视觉、椭圆引导、底部扫描 dock、发型抽屉与结果操作区保持源稿的三段结构；393×852 无横向溢出。
- 颜色与表面：暗色扫描面、暖白试戴/结果面与玫红操作色一致；状态动效受 reduced-motion 约束。
- 图片与资产：scan 使用原直发正面示例；style/result 的未开相机示例使用独立短层次正/侧面 PNG。相机开启后示例隐藏，仍显示真人视频与现有本地 overlay。
- 文案与交互：无营销首屏或 prototype switcher；真实扫描保留本地 MediaPipe 和四步状态机；结果的侧面切换与保存参考都有明确响应。

## 比较历史

- [P1] 示例未显示发型：早期 `?demo=style` 与 `?demo=result` 使用原始直发占位图，核心试戴价值不清晰。
  - 修复：加入 `short-layers-demo-front.png` 与 `short-layers-demo-side.png`；scan 保持原直发正面，style/result 默认短层次正面，结果侧面缩略图及“侧面”tab 使用短层次侧面。
  - 修复后证据：style、result、result-side 三张稳定态浏览器截图及最终同画布比较如上。

## 可接受的有意差异

- 真实扫描状态机包含“回正”，所以扫描导引为四步；源稿抽象为三段。
- MVP 只有两款实际发型，抽屉仅两项缩略图。
- 真人相机背景由用户现场决定，不能强制复制静态源稿背景。

## 交互与静态验证

- `scan.js` 语法、四步状态机和 stop reset 已通过；关键 MediaPipe JS/WASM/model 及 demo 图片资源可加载。
- 静态检查未发现 `fetch`、XHR、WebSocket、表单上传或分析代码；`getUserMedia` 固定 `facingMode:user`、`audio:false`。

## Implementation Checklist

1. 已修复 P1 示例结果缺失。
2. 已完成应用内浏览器同画布视觉对照。
3. 无剩余 P0/P1/P2；后续真人摄像头验收独立进行。

final result: passed
