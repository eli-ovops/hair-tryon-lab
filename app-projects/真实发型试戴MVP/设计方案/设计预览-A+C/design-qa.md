# Design QA — A+C 设计预览

**比较目标**

- 视觉真值：`/Users/USER/Documents/app/真实发型试戴MVP/设计方案/imagegen/A-编辑感松绿.png` 与 `C-清透原生蓝.png`，各为 1693×929 PNG。
- 实现：`设计预览-A+C/` 在 390×844 CSS viewport、device scale factor 1 下的四屏截图。
- 同一比较输入：`output/playwright/qa-ac-comparison.png`。它将 A/C 两张来源图与浏览器渲染的 Scan、Browse、Try-on、Salon card 同时排布，比较的是继承关系而非像素复制。

**Fidelity surfaces**

- 字体/层级：A 的人文展示字气质以 Georgia 小范围承接，操作文字使用原生系统 sans；标题、状态、主 CTA 的层级清楚。
- 间距/版式：C 的单任务手机屏、照片优先和底部操作区被保留；实现刻意只做四屏，不复刻参考图的设备外框。
- 色彩：使用温白、深松绿、少量陶土；无紫粉、玻璃、渐变或 AI 装饰。
- 图片：全部为用户提供 A/C Image Gen 图的可审计裁切，位于 `assets/`；无竞品素材、外部图片或 CSS/HTML 图像替代物。裁切后的三视图已复核，不再包含参考卡正文。
- 文案：中文最短任务词；每屏一主 CTA，唯一隐私句留在扫描页，设计预览仅全局出现一次。

**Findings**

- 无 P0/P1/P2。A 中“照片编辑感”通过人物占比、松绿底部行动和温白背景继承；C 中“原生低密度结构”通过单任务页、紧凑 filmstrip、三段角度切换继承。未复制参考中的英文、完整设备外壳、长说明或泛美妆模板。

**Open questions**

- 四个发型方向是视觉演示切换，不是实际生成/追踪结果；用户选择后才应决定是否应用到真实 `scan.html`。

**Implementation checklist**

- [x] 四屏顺序流程、返回和直达导航。
- [x] 375 / 390 / 430 / 横屏与焦点、reduced motion、资源和控制台验证。
- [x] A/C 对照截图及本报告。

**Follow-up polish**

- [P3] 获得真实用户素材/真实试戴结果后，再替换演示裁切图，不在此阶段扩展功能。

final result: passed
