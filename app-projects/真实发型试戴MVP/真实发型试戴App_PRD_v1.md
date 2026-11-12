# 真实发型试戴 App PRD v1

状态：执行草案  
日期：2026-08-07  
产品阶段：个人可测试 MVP → 真实用户验证  
暂定英文工作名：Before the Cut

## Product Summary

帮助用户在剪发或染发前，通过正面、左侧、右侧照片看到同一款发型在本人身上的现实预览；保留原脸、尊重真实发质与发量，并把最终选择整理成可交给发型师的参考卡。

产品不是泛美颜编辑器，也不承诺精确预测剪后结果。核心选择理由是：**看起来仍然是本人，而且这款发型在现实条件下可以讨论和执行。**

## Problem Statement

用户在决定剪刘海、长发剪短、尝试 Bob/Pixie、改变卷度或过渡灰发时，通常只能依靠明星照片、单张滤镜或想象。现有工具经常改变脸部、皮肤和头型，虚增发量，只展示正面，或者让不同角度看起来像不同发型。结果虽然“更漂亮”，却不能帮助用户判断是否值得剪，也难以作为与发型师沟通的依据。

用户真正需要回答的不是“我能不能生成一张好看的照片”，而是：

1. 这还是不是我本人？
2. 这款发型是否适合我的真实发量、发质、卷度和日常打理时间？
3. 正面、侧面和后脑轮廓是否一致？
4. 哪些部分可以直接剪成，哪些需要烫染、增发或留长？
5. 我能否把这组结果带给发型师继续判断？

## Solution

App 引导用户完成一次轻量扫描：正面通过后向左转、回正、再向右转。系统从采集结果中选择合格的正面、左侧和右侧画面，并让用户补充少量现实约束：发质粗细、卷度、密度、灰发情况、当前长度和每日打理时间。

用户从发型目录选择目标款式和颜色。系统生成共享同一人物和发型条件的三视角结果，保护原脸区域，并检测身份漂移、发量虚增、视角不一致和错误遮挡。用户可以切换正侧面、查看原图对比、比较 2–3 个方案、保存结果，并导出发型师参考卡。

首个真实生成版本只覆盖 Pixie、Bob、Coily/自然卷三个技术代表款。三款通过质量门槛后扩展到六款；六款稳定后再决定是否把现有男女各 50 款目录全部转成真实生成能力。

动态转头预览不是第一阶段前提。静态三视图通过后，才尝试有限角度的 2.5D/多帧预览；如果动态一致性未达标，产品诚实降级为可滑动三视图。

## Product Goals

1. 用户能在三分钟内完成采集、约束填写和首次款式选择。
2. 结果中的脸部、肤质、五官和脸型保持为用户本人，不进行隐性美颜。
3. 同一款发型的正面、左侧和右侧在发际线、长度、颜色、纹理和体积上保持一致。
4. 结果不无依据增加发量，并明确提示需要留长、烫发、染发、增发或高维护的情况。
5. 用户能完成比较、保存和发型师参考卡导出。
6. 用真实用户行为验证“现实可实现”是否比泛美颜拥有更强选择理由。

## Success Metrics

### 技术质量指标

- 三视图输入合格率：完成引导后无需重新采集即可进入生成的会话占比。
- 原脸保持通过率：脸部保护区差分、身份相似度报警与人工盲评同时通过。
- 三视角一致通过率：发际线、长度、颜色、纹理和侧面体积不存在硬失败。
- 现实发量通过率：人工评审认为结果没有明显无依据增厚或遮盖头皮。
- 遮挡通过率：不存在穿耳、盖眼、断颈、肩部冲突或漂浮发块。
- 生成成功率、P50/P95 延迟、失败恢复率、真机内存峰值和异常退出率。

具体数值阈值必须先用内部样本标定，不直接采用研究模型默认值。

### 用户行为指标

- 开始采集 → 完成三视图采集转化率。
- 完成采集 → 生成首个结果转化率。
- 查看正侧面、拖动对比、切换第二款的完成率。
- 保存结果或导出参考卡的比例。
- 一周内再次使用或为另一个发型重新生成的比例。
- 用户是否愿意把结果展示给发型师。
- 用户选择“更像本人且现实”而不是“更漂亮但不真实”的比例。

使用验证与商业化验证分开。下载、保存或分享不能替代付费证据。

## Target Users

首批目标用户是正在做高意图发型决定的普通成年人，不叠加过多身份条件：

- 正准备剪刘海、Bob、Pixie 或明显缩短长度的人。
- 对剪短后后悔风险敏感的人。
- 想染发或过渡灰发，但担心肤色、发根和维护成本的人。
- 细软、低密度、自然卷或紧卷发质，认为普通滤镜不真实的人。
- 剪发失败后，希望和下一位发型师准确沟通修正方向的人。

首轮不按种族、年龄、地区或发质同时切出极窄人群，但测试样本必须覆盖不同肤色、脸型、发质、密度和灰发情况。

## User Stories

### 首次进入与信任

1. As a first-time user, I want to understand the result I will get within one screen, so that I can decide whether the scan is worth doing.
2. As a privacy-conscious user, I want to know whether my photos stay on device or are uploaded before capture, so that I can make an informed choice.
3. As a user, I want camera and photo permissions requested only when needed, so that the App does not feel intrusive.
4. As a user who denied a permission, I want a clear recovery path, so that I can continue without reinstalling the App.
5. As a returning user, I want to resume or deliberately start over, so that an old unfinished session does not confuse my new decision.

### 扫描与照片采集

6. As a user, I want the App to tell me when my face is centered and far enough from the camera, so that the captured views are usable.
7. As a user, I want to pass the front view before turning left or right, so that I understand the scanning sequence.
8. As a user, I want simple left-turn and right-turn guidance, so that I can complete scanning without another person.
9. As a user, I want the App to detect excessive tilt, blur, obstruction, or poor lighting, so that bad input is corrected before generation.
10. As a user, I want to retake only the failed angle, so that I do not repeat the entire scan.
11. As a user without a usable live camera, I want to provide front, left, and right photos manually, so that I can still test the product.
12. As a user, I want photo orientation normalized correctly, so that side views are not rotated, mirrored, or swapped.
13. As a user, I want an obvious capture-complete state, so that I know when it is safe to move on.

### 现实头发档案

14. As a user, I want to describe my current hair length, so that the App does not recommend an immediately impossible result without explanation.
15. As a user, I want to specify fine, medium, or coarse strands, so that the preview respects how my hair carries volume.
16. As a user, I want to specify straight, wavy, curly, or coily texture, so that the preview does not silently replace my natural texture.
17. As a user, I want to specify low, medium, or high density, so that the preview does not invent hair.
18. As a gray-haired user, I want to preserve or transition my gray pattern, so that color previews remain relevant.
19. As a busy user, I want to specify daily styling time, so that high-maintenance looks are clearly marked.
20. As a user who does not know technical hair terms, I want visual examples and plain language, so that I can complete the profile confidently.

### 发型目录与选择

21. As a user, I want to browse by gender presentation without being permanently locked to it, so that I can explore any style.
22. As a user, I want to filter by length and texture compatibility, so that I can reduce a 100-style catalog to relevant choices.
23. As a user, I want every visible card to behave as an actual control, so that the interface never looks tappable while doing nothing.
24. As a user, I want to scroll smoothly to the end of the catalog, so that all available styles are reachable.
25. As a user, I want a selected-state indicator beyond color alone, so that selection is clear and accessible.
26. As a user, I want to choose a hair color independently where supported, so that shape and color decisions are not conflated.
27. As a user, I want to see whether a catalog item is a real generated style or only a future item, so that metadata is not mistaken for working try-on capability.
28. As a user, I want the App to recommend only a few relevant directions, so that I am not overwhelmed by 100 names.

### 真实生成

29. As a user, I want the App to preserve my eyes, nose, mouth, jaw, cheeks, skin texture, and face shape, so that the result still looks like me.
30. As a user with fine or low-density hair, I want the result to preserve visible limitations, so that I am not shown an impossible amount of hair.
31. As a curly or coily-haired user, I want curl pattern and shrinkage represented across views, so that the result does not turn into generic straight hair.
32. As a user, I want front, left, and right results generated as one session, so that they look like the same haircut.
33. As a user, I want ears, hairline, neck, and shoulders handled naturally, so that the result does not look like a sticker or wig.
34. As a user, I want generation progress that explains what is happening without fake precision, so that waiting feels understandable.
35. As a user, I want to cancel a generation, so that I remain in control of my photos and time.
36. As a user, I want a useful retry when generation fails, so that I do not lose my scan and selections.
37. As a user, I want the App to reject a bad result instead of presenting it confidently, so that quality failures do not become advice.
38. As a user, I want a clear indication when a look requires growing, curling, straightening, coloring, extensions, or intensive styling, so that the preview remains actionable.

### 浏览、对比与有限转头

39. As a user, I want to switch between front, left, and right results, so that I can assess the whole silhouette.
40. As a user, I want to compare my original photo with the result, so that I can see exactly what changed.
41. As a user, I want to compare two or three candidate styles under the same views, so that I can make a decision rather than collect images.
42. As a user, I want limited head-turn preview only when it is genuinely consistent, so that animation does not create false confidence.
43. As a user, I want a static multi-view fallback when dynamic preview is unreliable, so that realism is prioritized over spectacle.
44. As a user, I want to return to the catalog without losing my valid scan, so that trying another style is fast.

### 保存与发型师交接

45. As a user, I want to save an individual result to Photos, so that I can review it later.
46. As a user, I want a visible success or failure response after saving, so that I know whether the action worked.
47. As a user, I want to export a stylist reference card containing the three views and selected constraints, so that a stylist can understand the intended direction.
48. As a user, I want to add a short note about what I like or fear, so that the card supports a real conversation.
49. As a stylist, I want the card to distinguish generated appearance from practical requirements, so that I can correct unrealistic assumptions.
50. As a user, I want to delete the current session and generated outputs, so that I can control retention of my face photos.

### 失败、安全与可访问性

51. As a user, I want all errors written in plain language with one next action, so that I am never trapped on a dead screen.
52. As a VoiceOver user, I want every button and selected state labeled correctly, so that the full decision flow is usable without sight.
53. As a user with larger text settings, I want controls and bottom sheets to remain reachable, so that text scaling does not hide actions.
54. As a user who reduces motion, I want movement replaced with simpler transitions, so that scanning and results remain comfortable.
55. As a user, I want the App to remain responsive during large-image processing, so that it does not appear frozen.
56. As a user, I want an explicit offline/online state when generation depends on a service, so that network failure is not mistaken for a broken camera.

## Core User Flow

1. 价值说明。
2. 选择实时扫描或上传三张照片。
3. 完成正面 → 左侧 → 右侧采集与质量检查。
4. 填写精简现实头发档案。
5. 浏览兼容发型方向并选择款式、颜色。
6. 生成三视角结果；系统执行身份、发量、一致性和遮挡检查。
7. 查看正/左/右、原图对比和现实要求。
8. 返回目录试第二款，或并排比较 2–3 款。
9. 保存单图或导出发型师参考卡。
10. 删除会话或保留在明确的本地历史中。

## Functional Requirements

### Capture

- 支持前置摄像头扫描和三照片导入两种入口。
- 每个角度独立保存质量状态，可单独重拍。
- 采集阶段显示唯一主动作，不用大量说明覆盖画面。
- 记录姿态、方向、脸框和基本质量信息。

### Hair Profile

- 必填项保持最少：当前长度、卷度、密度。
- 可选项：发丝粗细、灰发比例、每日打理时间、染烫接受度。
- 所有字段进入生成和参考卡，不做装饰性问卷。

### Catalog

- 保留女性 50 款、男性 50 款内容目录。
- 目录必须区分“可真实生成”“实验中”“仅目录占位”。
- 第一批可真实生成款只有 Pixie、Bob、Coily/自然卷。
- 支持性别呈现、长度、纹理与维护强度筛选。

### Generation

- 一次会话共享人物条件、发型条件、颜色条件和现实约束。
- 输出正面、左侧、右侧，并附质量状态与风险原因。
- 保护脸部区域，仅允许发际线窄过渡区参与融合。
- 任一硬失败不得以正常结果展示；允许重试、换参考或降级。
- 网络生成必须在采集前明确处理位置、删除规则和失败方式。

### Results and Comparison

- 结果页默认展示本人正面，不自动播放夸张动画。
- 支持视角切换、原图/结果滑动对比、款式切换和返回重选。
- 动态预览只在多视角一致性通过后开放。
- 结果必须展示现实要求，例如预计留长、烫发、染色或日常造型时间。

### Save and Reference Card

- 保存动作具有进行中、成功、拒绝、失败四种状态。
- 参考卡包含款式名、颜色、三视图、现实头发档案、实现要求和用户备注。
- 支持本地删除本次输入、结果和参考卡。

## Implementation Decisions

- 继续使用现有 iOS 容器和本地扫描能力完成近期 MVP，不在真实生成验证前重写整个 App。
- 扫描与姿态判断保持本地运行；不得破坏现有 MediaPipe 零网络路径。
- 将采集、档案、目录、生成、质量检查、结果、保存建模为明确状态，不以散落按钮事件隐式推进。
- 建立可替换的生成提供者接口，使研究模型、远程服务和未来本地模型不会直接耦合 UI。
- 生成请求以单一会话组织三视角，而不是对三张照片独立调用后拼接。
- 输入协议包含三张规范化照片、姿态、结构 mask、头发档案、style ID 和颜色 ID。
- 输出协议包含三张结果、模型版本、每视角质量状态、整体一致性状态、耗时和失败原因。
- 原脸保护、现实发量、多视角一致和遮挡检查是生成后的硬门禁，不是可选提示。
- 第一批只实现 Pixie、Bob、Coily/自然卷；通过后扩至六款，再决定 100 款投入。
- ImageGen 只可用于目录概念图或设计参考，不作为贴到用户头上的发型层。
- 不用脸部 mesh 推导发型体积；脸部跟踪只负责采集引导和有限角度定位。
- 有限转头优先使用同一多视角结果的分层深度/帧序列，不使用单张发型贴图刚性旋转。
- 动态结果未达标时，正式降级为三视图切换，产品文案同步降级。
- Stable-Hair 与 HairFastGAN 仅作为可运行基线；StableHairV2 许可不明，只能隔离研究，不进入分发产品。
- 当前照片本地处理承诺在远程推理接入前必须更新为明确选择；不得静默上传。
- 不在 MVP 中创建账号体系。会话数据默认最小留存，并提供删除动作。
- 不在本 PRD 阶段创建 App Store 记录、TestFlight、订阅、IAP 或支付能力。
- 首次使用采用单线任务流，不显示永久底部导航；首次结果后再开放“试戴、对比、参考卡”三项一级导航。
- 复用成熟照片编辑器的“全屏照片 + 底部选择器 + 常驻前后对比”，但不引入皮肤、脸型、身体等泛美颜工具。
- 生成前逐角度执行照片质量检查，避免在无效输入上消耗推理资源或 credits。
- 高级发型条件放在底部 sheet 中，并使用离散、可解释的现实选项，不使用暗示虚假精确度的连续滑杆。
- 默认浅色、温和、低饱和的现实决策视觉；相机与全屏结果可局部深色。拒绝通用黑紫渐变 AI 工具风。
- 首次完整结果前不展示订阅墙、升级卡或 credits 消耗；商业化在核心价值完成后单独验证。
- 所有页面返回时保留扫描、筛选、滚动、候选与比较状态。

## Generation State Contract

生成流程至少包含以下外部可观察状态：

1. `ready`：输入完整，可以生成。
2. `validatingInput`：检查角度、方向、清晰度与遮挡。
3. `generating`：生成三视角，可取消。
4. `checkingQuality`：检查身份、发量、一致性和遮挡。
5. `success`：三视角通过，可浏览、比较、保存。
6. `needsRetake`：指定角度输入不合格。
7. `qualityRejected`：生成完成但未通过硬门禁。
8. `failed`：网络、服务或本地处理失败，可重试。
9. `cancelled`：用户取消，不继续处理。
10. `deleted`：输入与结果已按当前会话删除。

## Testing Decisions

### 测试原则

- 以用户可观察行为为主，不测试模型或视图内部实现细节。
- 构建成功、API 返回成功、单张截图和 Owner 自述均不能代替完整验收。
- 自动指标负责发现异常，人工盲评负责判断“仍是本人、现实可实现、值得带给发型师”。
- Simulator 与实体 iPhone 证据分开；模拟器不能证明真相机、照片方向、权限、内存、温升和推理表现。

### 最高层测试缝隙

1. **采集缝隙**：用户能否完成三视角采集，坏角度能否单独重拍。
2. **生成缝隙**：完整输入是否得到同一会话的三张合格结果或明确失败。
3. **质量缝隙**：身份、发量、一致性和遮挡硬失败是否阻止结果进入成功页。
4. **决策缝隙**：用户能否比较、重选、保存并生成参考卡。
5. **恢复缝隙**：权限拒绝、网络失败、生成超时、质量拒绝和取消后是否有明确下一步。

### 自动化测试

- 采集状态机：正常序列、回正、单角度失败、重试、取消。
- 目录：性别呈现、长度和纹理过滤，滚动到末项，选择状态，颜色切换。
- 生成状态：成功、输入失败、超时、取消、质量拒绝、重试。
- 结果：三视角切换、原图对比、返回重选、比较第二款。
- 保存：首次授权、拒绝、设置恢复、成功、系统失败。
- 数据：照片方向、左右视角标记、会话删除、过期清理。
- 可访问性：VoiceOver 标签、动态字体、非颜色选中状态、减少动态效果。

### 模型评测集

- Pixie、Bob、Coily/自然卷各自独立统计。
- 覆盖不同肤色、脸型、发际线、直/卷、细/粗、低/高密度和灰发。
- 同时包含对齐棚拍和普通手机生活照，禁止只测 FFHQ 风格人像。
- 保留现有轮廓原型作为低基线，并加入单张泛美颜结果作对照。
- 盲评至少回答：是否同一人、发量是否可信、三张是否同一次剪发、是否愿意交给发型师。

### 真机测试

- iPhone 17 前置摄像头方向、镜像与三视角顺序。
- 相机和相册首次允许、拒绝、设置恢复和重新安装状态。
- 大照片内存峰值、生成期间后台切换、低电量、弱网与中断恢复。
- 长时间使用温升、帧率、触摸滚动、底部安全区与动态字体。
- 保存照片与参考卡是否真实出现在照片库或文件系统中。

## Delivery Gates

### Gate 0：现有壳层可用

- 实体 iPhone 17 完成目录末项、颜色、正侧对比、返回与保存。
- 真相机采集方向正确，照片真实落盘。

### Gate 1：三款静态三视角

- Pixie、Bob、Coily/自然卷均通过原脸、发量、一致性和遮挡盲评。
- 任一款失败只停止该款，不以好看的单图替代。

### Gate 2：App 生成闭环

- App 能发起、取消、超时、重试和删除生成会话。
- 成功结果可比较、保存并进入参考卡。

### Gate 3：有限动态预览

- 只有静态结果达标后进入。
- 动态失败则采用三视图，不阻塞静态 MVP。

### Gate 4：六款扩展

- 从三款扩至六款，确认质量体系可以扩展而不是逐张手工挑图。

### Gate 5：真实用户验证

- 用户能独立下载安装、完成采集、生成、比较和保存。
- 记录再次使用、分享给发型师和现实性选择理由。
- 商业化另建付费验证，不在本 Gate 推断。

## Out of Scope

- 第一版不实现 360° 自由视角或完整 3D 发丝模拟。
- 第一版不承诺实时视频中每一帧都是生成式真实换发。
- 不保证最终剪发结果与生成图完全一致。
- 不替代理发师对发质、头皮、化学处理和可实现性的专业判断。
- 不把男女各 50 款目录一次性全部做成真实生成。
- 不进行隐形瘦脸、美肤、改五官或自动化妆。
- 不建设社交社区、关注、评论、公共作品墙或发型师市场。
- 不创建账号、跨设备云同步或永久云相册。
- 不创建 App Store Connect 记录、TestFlight、订阅、IAP、税务或收款流程。
- 不集成许可不清的代码、模型权重、参考图或发型素材。
- 不在未单独授权时上传用户真人照片到第三方服务。

## Further Notes

### 当前产品事实

- App 已有可安装的 iOS 原型、扫描引导、100 款目录元数据、颜色、对比、返回与保存桥。
- 当前可视发型仍是 Canvas 轮廓模拟，不是实际换发。
- Simulator 和自动化流程已覆盖主要壳层路径；实体 iPhone 仍需用户确认目录手感、真相机方向与相册真实落盘。
- 竞品流程与 UI 复用决策已记录于 `设计方案/竞品产品流与UI借鉴_2026-08-07.md`；实际设计应以该报告和现有 design system 共同约束。

### 当前技术事实

- HairFastGAN 代码为 MIT，官方权重目录约 7.73 GB，官方运行环境是 Linux + NVIDIA GPU。
- Stable-Hair 代码为 Apache-2.0，可作为单图扩散基线，但其公开模型主要面向对齐人脸。
- StableHairV2 最接近多视角目标，但仓库无 LICENSE，不能进入产品。
- 当前 Mac 可用空间不足以安全安装完整模型、依赖与缓存；真实生成 spike 需要独立计算环境决策。

### 开始真实生成前的授权门槛

需要用户单独确认以下事项：

1. 是否允许先使用公开或合成人像调用第三方远程 GPU 做技术验证。
2. 是否允许产生费用，以及单次/总预算上限。
3. 技术结果通过后，是否允许上传用户本人的三张照片；如允许，必须先明确服务方、保存期限、删除方式和训练用途。

### PRD 验收缝隙待确认

本 PRD 以“采集 → 三视角真实生成 → 质量门禁 → 比较/保存/参考卡”为最高层验收路径。动态转头和 100 款扩展均置于静态三视图达标之后。
