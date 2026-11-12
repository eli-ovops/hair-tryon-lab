import Foundation
import WebKit

final class LocalWebSchemeHandler: NSObject, WKURLSchemeHandler {
    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        DispatchQueue.global(qos: .userInitiated).async {
            let requestURL = urlSchemeTask.request.url
            let requestedPath = requestURL?.path.removingPercentEncoding ?? ""
            let relativePath = requestedPath.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            let safePath = relativePath.isEmpty ? "index.html" : relativePath

            guard !safePath.split(separator: "/").contains(".."),
                  let root = Bundle.main.resourceURL?.appendingPathComponent("Web", isDirectory: true) else {
                self.finish(urlSchemeTask, status: 404, data: Data(), mimeType: "text/plain")
                return
            }

            let fileURL = root.appendingPathComponent(safePath).standardizedFileURL
            guard fileURL.path.hasPrefix(root.standardizedFileURL.path) else {
                self.finish(urlSchemeTask, status: 404, data: Data(), mimeType: "text/plain")
                return
            }

            do {
                let data = try Data(contentsOf: fileURL)
                self.finish(urlSchemeTask, status: 200, data: data, mimeType: Self.mimeType(for: fileURL.pathExtension))
            } catch {
                self.finish(urlSchemeTask, status: 404, data: Data(), mimeType: "text/plain")
            }
        }
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}

    private func finish(_ task: WKURLSchemeTask, status: Int, data: Data, mimeType: String) {
        DispatchQueue.main.async {
            let responseURL = task.request.url ?? URL(string: "hairtryon://local/")!
            let response = HTTPURLResponse(url: responseURL, statusCode: status, httpVersion: "HTTP/1.1", headerFields: ["Content-Type": mimeType])!
            task.didReceive(response)
            if !data.isEmpty { task.didReceive(data) }
            task.didFinish()
        }
    }

    private static func mimeType(for extensionName: String) -> String {
        switch extensionName.lowercased() {
        case "html": return "text/html"
        case "css": return "text/css"
        case "js", "mjs": return "text/javascript"
        case "wasm": return "application/wasm"
        case "task": return "application/octet-stream"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "svg": return "image/svg+xml"
        case "json": return "application/json"
        default: return "application/octet-stream"
        }
    }
}
