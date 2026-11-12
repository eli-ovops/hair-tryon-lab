# GitHub 复用决策（2026-08-07）

需求关键词：`hair segmentation`、`face parsing`、`protected-region mask`、`masked inpainting`、`Apple Silicon / M4`。

| 候选 | 许可 / 维护证据 | 权重与 M4 适配 | 决策 |
|---|---|---|---|
| [YBIGTA/pytorch-hair-segmentation](https://github.com/YBIGTA/pytorch-hair-segmentation) | MIT；最近推送 2023-03；README 指向 checkpoint 目录。 | checkpoint 独立于代码许可，需另审；PyTorch/MPS 路径未作为本项目产物验证。 | 仅借鉴 hair-mask 输出形状；不下载、不引入。 |
| [zllrunning/face-parsing.PyTorch](https://github.com/zllrunning/face-parsing.PyTorch) | MIT；最近推送 2023-05；有外链预训练模型。 | 预训练权重是 Google Drive 外链，代码许可不等于权重许可；无 M4/iOS 交付链。 | 仅借鉴 face/ear/neck 分类思路；不引入。 |
| [facebookresearch/sam2](https://github.com/facebookresearch/sam2) | Apache-2.0；GitHub 元数据显示近期维护。 | checkpoint 需另取并审条款；通用 mask，不保证 hair/face 边界；权重下载超出本 Spike。 | 后续可作为交互式蒙版候选，当前不下载。 |
| [advimman/lama](https://github.com/advimman/lama) | Apache-2.0；2025 仍有推送。 | 预训练模型走外链，未取得独立权重许可证据；通用修补不保证身份/头发保持。 | 不采用。 |
| [apple/ml-stable-diffusion](https://github.com/apple/ml-stable-diffusion) | MIT；Apple Silicon / Core ML 路线明确。 | 需第三方基础权重条款；其 README 示例显示压缩 SDXL 仍约 1.46GB，超过本轮 100MB 限制。 | 仅作未来 M4 架构参考，不采用。 |

结论：**无可在当前授权与磁盘/下载边界内直接复用的生产方案**。本 Spike 自研最小验证器，复用的是“显式 segmentation + inpaint mask + protected-region diff gate”的架构，而不是任何候选代码或权重。

工具路由记录：`agent-reach doctor --json` 在本机退出 0 但 stdout 为空；`mcporter` 未配置 `exa` server。依照 agent-reach GitHub 路由，以已可用 `gh` 查询仓库/API；未把工具缺口写成“无方案”。
