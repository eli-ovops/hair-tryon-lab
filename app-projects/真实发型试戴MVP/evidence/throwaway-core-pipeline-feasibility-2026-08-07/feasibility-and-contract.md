# 无界面真实发型核心管线：本地可行性审计与云端契约

状态：**NO-GO（本机不下载、不运行）。** 目标路由为 Terra high；运行态无法回读，故只记录“目标已指定，实际未确认”。未调用 Reasonix。

## 第一性原理

可信的最小链必须同时拥有：

1. 能区分 hair、face、ears、neck、clothes、background 的真实 parsing/matting；
2. 接收**显式二值 edit mask**的 inpaint；
3. 强制保护非发像素，并用输出差异 gate 验收；
4. 对同一正/左/右输入有共同条件而非独立生成；
5. 可审计的代码与权重许可、M4 运行路径、下载/临时峰值和失败闭环。

此前证据已反证两条偷步路线：整图 ImageGen Bob 的脸保护区改变为正面 78.643%、左侧 67.245%；本地手工锁区虽把保护像素置为 0 差异，却留下硬接缝和长发残留。10 组静态生成样片的真实性门槛同样为 0/10。

## 实际本机盘点（2026-08-07 18:16 +0800）

- 可用空间：约 8.7 GiB（结束时仍需至少保留 5 GiB）。
- Python 3.9.6，只有 Pillow；`torch`、MPS runtime、CoreMLTools、onnxruntime、OpenCV 均未安装。
- 项目中没有 `.onnx`、`.mlmodel`、`.mlpackage`、`.pth`、`.pt`、`.ckpt` 或 `.safetensors` 模型。
- 不安装、不下载、不调用云端；因此没有伪造本地 headless pipeline 或空 adapter。

## GitHub / 官方仓库复用决策

| 候选 | 代码许可与维护 | 权重 / M4 事实 | 结论 |
|---|---|---|---|
| [zllrunning/face-parsing.PyTorch](https://github.com/zllrunning/face-parsing.PyTorch) | MIT；GitHub 显示最近推送 2023-05。 | README 预训练权重为 Google Drive 外链，未在本次拿到独立权重许可；需 PyTorch/MPS 实装。 | 不下载；只能借鉴区域分类。 |
| [thangtran480/hair-segmentation](https://github.com/thangtran480/hair-segmentation) | MIT；最近推送 2021-05。 | 未取得独立权重许可和 Apple Silicon 推理证据；只覆盖 hair，不能满足 face/ear/neck 保护。 | 不下载。 |
| [facebookresearch/sam2](https://github.com/facebookresearch/sam2) | Apache-2.0；GitHub 显示近期维护。 | checkpoint 条款须单独核；通用对象 mask 不能保证发丝/耳颈分区；本机无 PyTorch/MPS runtime。 | 后续交互标注候选，不构成完整管线。 |
| [mallman/CoreMLaMa](https://github.com/mallman/CoreMLaMa) | Apache-2.0；最近推送 2024-11。 | README 说明下载/转换 Big LaMa，且明确称 macOS GPU 设计、未见成功 iOS 部署报告；Big LaMa 权重许可须另审。 | 不下载；不保证发型或身份保持。 |
| [apple/ml-stable-diffusion](https://github.com/apple/ml-stable-diffusion) | MIT；最近推送 2025-07。 | Apple Silicon/Core ML 路线明确，但依赖第三方扩散权重条款；其 README 的 SDXL 示例压缩后约 1.46GB，且不提供 hair parsing 或身份 gate。 | 不下载；组合仍缺失 parsing/matting 与许可闭环。 |

`agent-reach doctor --json` 本机再次以空 stdout 返回；Exa MCP 也未配置。按 Skill 降级使用 GitHub CLI/官方 README 查询，未把工具缺口误记为无候选。

**复用决定：没有一个候选组合同时满足“明确代码+权重许可、M4 可运行、显式 mask inpaint、全保护区、预计新增 <=2GB、当前 8.7GiB 磁盘安全”。因此不下载。**

## 红队攻击与阻断证据

| 攻击 / 误用 | 本轮阻断 |
|---|---|
| 整图重绘冒充试戴 | 必须保存输入与 protected-region diff；前述 67–79% 脸差异为 FAIL。 |
| 独立三图冒充一致 | 输入必须有实际正/左/右，缺右即不生成/不验收右视。 |
| 手工 mask 贴图 | 仅可作为固定夹具机制验证；接缝/残发即 FAIL，不能产品化。 |
| 合成样本自证真人 | 样本永远标 synthetic，仅测视觉。 |
| 静默改脸 | face/ears/neck/clothes/background mask 的差异阈值为硬 gate。 |
| 代码许可外推到权重 | 代码与模型卡/权重发布条款必须分别记录。 |
| M4/CUDA 误配、磁盘爆满 | 下载前核 runtime/设备/大小/临时峰值；当前未满足即停止。 |
| API 上传、付费越权 | 本轮不调用任何云服务；以下契约只是待授权说明。 |

## 待授权云端 explicit-mask 契约（不得在本轮调用）

服务必须提供一个可审计的 `POST /v1/hair-inpaint/jobs`，而不是只接收 prompt：

```json
{
  "views": [
    {"id": "front", "image": "binary upload", "edit_mask": "1-bit PNG"},
    {"id": "left", "image": "binary upload", "edit_mask": "1-bit PNG"},
    {"id": "right", "image": "binary upload", "edit_mask": "1-bit PNG"}
  ],
  "protect_masks": {"face": "1-bit PNG", "ears": "1-bit PNG", "neck": "1-bit PNG", "clothes": "1-bit PNG", "background": "1-bit PNG"},
  "style": {"id": "bob", "version": "immutable-model-version"},
  "constraints": {"preserve_non_edit_pixels": true, "joint_multiview_seed": true, "return_masks_and_diff": true},
  "retention": {"days": 0, "training_opt_in": false}
}
```

服务返回必须包含每视图的结果、实际采纳 edit/protect mask、保护区 diff、模型/权重版本与许可证、运行时间、失败原因。客户端 gate：任何脸/耳/颈/衣服/背景差异超过校准阈值、无实际右视、发际线/耳颈遮挡/接缝人工 QA 不通过，均拒绝结果。

要进入下一轮，用户须另行明确授权：服务商与所在区域；本人照片上传；加密与留存/删除承诺；训练用途 opt-in/opt-out；单次和总费用；模型/权重许可证；以及真实正/左/右测试夹具。没有这些授权，不得上传、调用、付款或集成。
