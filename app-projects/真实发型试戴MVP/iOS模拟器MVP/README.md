# iOS 模拟器 MVP

SwiftUI + `WKWebView` 本地容器。网页资源从 `../手机测试MVP` 只读复制到 `HairTryOnMVP/Web/`；不引用 tunnel，不上传数据，也没有第三方运行依赖。

- Scheme：`HairTryOnMVP`
- Bundle ID：`com.cczij.hairtryonmvp`
- 最低版本：iOS 17.0
- Simulator：自动使用本地 landmark 演示回退，界面会明确标明其不是摄像头 AR。
- 真机：不附加 demo query，保留网页内的真实 `getUserMedia` 与本地 MediaPipe 流程；自定义 scheme 下的真实相机权限仍需真机单独验收。
