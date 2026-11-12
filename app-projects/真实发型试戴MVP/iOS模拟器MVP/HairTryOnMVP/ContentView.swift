import SwiftUI
import WebKit
import Photos
import UIKit

struct ContentView: View {
    var body: some View {
        LocalTryOnWebView()
            .background(Color.black)
            .ignoresSafeArea()
    }
}

private struct LocalTryOnWebView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.preferences.isTextInteractionEnabled = false
        configuration.setURLSchemeHandler(LocalWebSchemeHandler(), forURLScheme: "hairtryon")
        configuration.userContentController.add(context.coordinator, name: "saveImage")

        let webView = WKWebView(frame: .zero, configuration: configuration)
        context.coordinator.webView = webView
        webView.isOpaque = true
        webView.backgroundColor = .black
        webView.scrollView.backgroundColor = .black
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        #if targetEnvironment(simulator)
        let startURL = URL(string: "hairtryon://local/index.html?test=landmarks&simulator=1")!
        #else
        let startURL = URL(string: "hairtryon://local/index.html")!
        #endif
        webView.load(URLRequest(url: startURL))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "saveImage")
    }

    final class Coordinator: NSObject, WKScriptMessageHandler {
        weak var webView: WKWebView?

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            print("[HairTryOn] save request received")
            guard message.name == "saveImage",
                  let dataURL = message.body as? String,
                  let commaIndex = dataURL.firstIndex(of: ","),
                  let imageData = Data(base64Encoded: String(dataURL[dataURL.index(after: commaIndex)...])),
                  let image = UIImage(data: imageData) else {
                reportSaveResult(ok: false, message: "图片生成失败")
                return
            }

            PHPhotoLibrary.requestAuthorization(for: .addOnly) { [weak self] status in
                guard status == .authorized || status == .limited else {
                    let message = status == .denied || status == .restricted
                        ? "照片权限未开启，请到系统设置允许后重试"
                        : "未获得照片权限，请重试"
                    self?.reportSaveResult(ok: false, message: message)
                    return
                }

                PHPhotoLibrary.shared().performChanges {
                    PHAssetChangeRequest.creationRequestForAsset(from: image)
                } completionHandler: { success, error in
                    self?.reportSaveResult(ok: success, message: success ? "已保存到照片" : (error?.localizedDescription ?? "保存失败"))
                }
            }
        }

        private func reportSaveResult(ok: Bool, message: String) {
            print("[HairTryOn] save result ok=\(ok) message=\(message)")
            let payload: [String: Any] = ["ok": ok, "message": message]
            guard let data = try? JSONSerialization.data(withJSONObject: payload),
                  let json = String(data: data, encoding: .utf8) else { return }
            DispatchQueue.main.async { [weak self] in
                self?.webView?.evaluateJavaScript("window.__hairSaveResult(\(json))")
            }
        }
    }
}
