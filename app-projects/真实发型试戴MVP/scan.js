import { FaceLandmarker, FilesetResolver } from "./vendor/mediapipe/tasks-vision/vision_bundle.mjs";
import { ScanPhase, PHASE_COPY, createInitialScanState, reduceScan, stateSnapshot } from "./scan-machine.js";

const $ = (selector) => document.querySelector(selector);
const testMode = new URL(location.href).searchParams.get("test");
const video = $("#camera");
const overlay = $("#hairCanvas");
const ctx = overlay.getContext("2d");
const fakeSource = $("#fakeSource");
const fakeCtx = fakeSource.getContext("2d");

let scanState = createInitialScanState();
let stream = null;
let faceLandmarker = null;
let animationId = null;
let activeStyle = "short";
let opacity = 0.68;
let lastVideoTime = -1;
let lastDetectAt = 0;
let neutralYawRaw = 0;
let neutralSamples = [];
let fpsFrames = 0;
let fpsWindowAt = performance.now();
let visibleFps = 0;
let fakeStartedAt = 0;
const debugHistory = [];

const phaseOrder = [ScanPhase.CENTER, ScanPhase.LEFT, ScanPhase.RETURN_CENTER, ScanPhase.RIGHT];

if (testMode === "landmarks") {
  $("#testBanner").hidden = false;
  $("#testBanner").textContent = "自动化审计模式：使用本地 canvas fake media + 明示 landmark 序列；不是用户摄像头，也不证明真人跟踪质量。";
} else if (testMode === "deny") {
  $("#testBanner").hidden = false;
  $("#testBanner").textContent = "自动化拒绝模式：显式抛出 NotAllowedError，用于验证权限拒绝后的界面；不是系统真实拒绝记录。";
}

function dispatch(event) {
  const previous = scanState.phase;
  scanState = reduceScan(scanState, event);
  if (previous === ScanPhase.CENTER && scanState.phase === ScanPhase.LEFT && neutralSamples.length) {
    neutralYawRaw = neutralSamples.reduce((sum, value) => sum + value, 0) / neutralSamples.length;
    neutralSamples = [];
  }
  if (previous !== scanState.phase) {
    debugHistory.push({ at: Math.round(performance.now()), from: previous, to: scanState.phase, snapshot: stateSnapshot(scanState) });
  }
  renderState();
}

function renderState() {
  const copy = PHASE_COPY[scanState.phase];
  $("#phaseTitle").textContent = copy.title;
  $("#phaseCue").textContent = copy.cue;
  $("#feedback").textContent = scanState.error || scanState.warning || (scanState.phase === ScanPhase.COMPLETE ? "校准完成，轮廓正在持续跟随" : "等待有效姿态");
  $("#progressBar").style.width = `${Math.round(scanState.progress * 100)}%`;
  $("#phaseCount").textContent = `${scanState.completed.length} / 4`;
  $("#retryScan").hidden = ![ScanPhase.ERROR, ScanPhase.STOPPED].includes(scanState.phase);

  $("#calibrationList").querySelectorAll("li").forEach((item) => {
    const phase = item.dataset.phase;
    item.classList.toggle("active", phase === scanState.phase);
    item.classList.toggle("done", scanState.completed.includes(phase));
  });

  const sample = scanState.lastSample;
  $("#yawValue").textContent = sample?.tracked ? `${sample.yaw.toFixed(1)}° 估算` : "—";
  $("#rollValue").textContent = sample?.tracked ? `${sample.roll.toFixed(1)}°` : "—";
  $("#scaleValue").textContent = sample?.tracked ? sample.scale.toFixed(3) : "—";
  $("#fpsValue").textContent = visibleFps ? `${visibleFps} fps` : "—";
  $("#outRange").hidden = !(sample?.tracked && Math.abs(sample.yaw) > 45);

  const unlocked = scanState.phase === ScanPhase.COMPLETE;
  document.querySelectorAll(".style-option").forEach((button) => button.disabled = !unlocked);
  $("#hairOpacity").disabled = !unlocked;
  document.documentElement.dataset.scanPhase = scanState.phase;
}

async function startScan() {
  stopRuntime(false);
  dispatch({ type: "reset" });
  $("#startScan").disabled = true;
  $("#retryScan").hidden = true;
  try {
    stream = await requestStream();
    dispatch({ type: "permission_granted" });
    $("#noCamera").hidden = true;
    $("#modelLoading").hidden = false;
    video.srcObject = stream;
    await video.play();
    video.style.display = "block";
    setControlsRunning(true);

    await loadModel();
    $("#modelLoading").hidden = true;
    dispatch({ type: "model_ready" });
    fakeStartedAt = performance.now();
    lastVideoTime = -1;
    animationId = requestAnimationFrame(processFrame);
  } catch (error) {
    stopRuntime(false);
    $("#modelLoading").hidden = true;
    $("#noCamera").hidden = false;
    $("#startScan").disabled = false;
    const message = permissionErrorMessage(error);
    dispatch({ type: "error", message });
  }
}

async function requestStream() {
  if (testMode === "deny") throw new DOMException("automation permission denial", "NotAllowedError");
  if (testMode === "landmarks") {
    animateFakeCamera();
    return fakeSource.captureStream(30);
  }
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("当前浏览器或地址不支持 getUserMedia；请使用 localhost/HTTPS 的现代浏览器");
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
}

async function loadModel() {
  if (faceLandmarker) return;
  const vision = await FilesetResolver.forVisionTasks("./vendor/mediapipe/tasks-vision/wasm");
  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: "./vendor/mediapipe/models/face_landmarker.task", delegate: "CPU" },
    runningMode: "VIDEO",
    numFaces: 1,
    minFaceDetectionConfidence: 0.55,
    minFacePresenceConfidence: 0.55,
    minTrackingConfidence: 0.55,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
  });
}

function processFrame(now) {
  if (!stream) return;
  resizeOverlay();

  let sample = null;
  if (testMode === "landmarks") {
    sample = fakeLandmarkSample(now - fakeStartedAt);
  } else if (faceLandmarker && video.readyState >= 2 && video.currentTime !== lastVideoTime && now - lastDetectAt >= 40) {
    lastVideoTime = video.currentTime;
    lastDetectAt = now;
    const result = faceLandmarker.detectForVideo(video, now);
    sample = result.faceLandmarks?.[0] ? poseFromLandmarks(result.faceLandmarks[0]) : { tracked: false };
  }

  if (sample) {
    if (scanState.phase === ScanPhase.CENTER && sample.tracked && Math.abs(sample.yawRaw) < 0.2) {
      neutralSamples.push(sample.yawRaw);
      if (neutralSamples.length > 30) neutralSamples.shift();
    }
    dispatch({ type: "sample", sample, now });
    if (sample.tracked) drawHair(sample);
    else clearHair();
    updateFps(now);
  }

  animationId = requestAnimationFrame(processFrame);
}

function poseFromLandmarks(points) {
  const leftEye = points[33];
  const rightEye = points[263];
  const nose = points[1];
  if (!leftEye || !rightEye || !nose) return { tracked: false };

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const eyeDx = rightEye.x - leftEye.x;
  const eyeDy = rightEye.y - leftEye.y;
  const eyeDistance = Math.hypot(eyeDx, eyeDy) || 0.001;
  const eyeMidX = (leftEye.x + rightEye.x) / 2;
  const yawRaw = (nose.x - eyeMidX) / eyeDistance;
  const yaw = clamp(-(yawRaw - neutralYawRaw) * 62, -70, 70);
  const roll = Math.atan2(eyeDy, eyeDx) * 180 / Math.PI;
  return {
    tracked: true,
    yawRaw,
    yaw,
    roll,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    scale: maxX - minX,
    bounds: { minX, maxX, minY, maxY },
  };
}

function fakeLandmarkSample(elapsed) {
  let yaw = 0;
  if (scanState.phase === ScanPhase.LEFT) yaw = -26;
  else if (scanState.phase === ScanPhase.RIGHT) yaw = 26;
  else if (scanState.phase === ScanPhase.COMPLETE) {
    const cycleMs = elapsed % 8000;
    yaw = cycleMs < 1300 ? 0 : cycleMs < 2600 ? 25 : cycleMs < 3900 ? -24 : 52;
  }
  const t = elapsed / 1000;
  return {
    tracked: true,
    yawRaw: -yaw / 62,
    yaw,
    roll: Math.sin(t * 1.4) * 3,
    centerX: 0.5 + Math.sin(t * 0.8) * 0.018,
    centerY: 0.49 + Math.cos(t * 0.7) * 0.012,
    scale: 0.43 + Math.sin(t) * 0.008,
    bounds: { minX: 0.285, maxX: 0.715, minY: 0.21, maxY: 0.77 },
  };
}

function drawHair(sample) {
  if (!sample.bounds) return;
  const w = overlay.width, h = overlay.height;
  const faceW = sample.scale * w;
  // Canvas and video are mirrored together in CSS; draw with source coordinates here.
  const centerX = sample.centerX * w;
  const centerY = sample.centerY * h - faceW * 0.07;
  const yawFactor = clamp(sample.yaw / 45, -1, 1);
  const style = activeStyle;
  clearHair();
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(-sample.roll * Math.PI / 180);
  ctx.scale(1 - Math.abs(yawFactor) * 0.14, 1);
  ctx.translate(yawFactor * faceW * 0.08, 0);
  ctx.globalAlpha = opacity;

  const color = style === "short" ? "#3c302a" : "#49372f";
  const highlight = style === "short" ? "#6c5549" : "#765a4d";
  ctx.fillStyle = color;
  ctx.beginPath();
  if (style === "short") {
    ctx.ellipse(0, -faceW * 0.22, faceW * 0.61, faceW * 0.55, 0, Math.PI, Math.PI * 2);
    ctx.quadraticCurveTo(faceW * 0.62, faceW * 0.02, faceW * 0.46, faceW * 0.23);
    ctx.quadraticCurveTo(0, faceW * 0.08, -faceW * 0.46, faceW * 0.23);
    ctx.quadraticCurveTo(-faceW * 0.62, faceW * 0.02, -faceW * 0.61, -faceW * 0.22);
  } else {
    ctx.ellipse(0, -faceW * 0.15, faceW * 0.67, faceW * 0.62, 0, Math.PI, Math.PI * 2);
    ctx.lineTo(faceW * 0.64, faceW * 0.73);
    ctx.quadraticCurveTo(faceW * 0.42, faceW * 0.87, faceW * 0.28, faceW * 0.62);
    ctx.lineTo(-faceW * 0.28, faceW * 0.62);
    ctx.quadraticCurveTo(-faceW * 0.42, faceW * 0.87, -faceW * 0.64, faceW * 0.73);
    ctx.closePath();
  }
  ctx.fill();

  // Approximate front/back layering by revealing the face oval from the hair mass.
  ctx.globalCompositeOperation = "destination-out";
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.ellipse(yawFactor * faceW * 0.05, faceW * 0.13, faceW * 0.38, faceW * 0.52, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = opacity;
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.moveTo(-faceW * 0.5, -faceW * 0.28);
  ctx.quadraticCurveTo(-faceW * 0.05, -faceW * 0.65, faceW * 0.5, -faceW * 0.25);
  ctx.quadraticCurveTo(faceW * 0.22, -faceW * 0.34, 0, -faceW * 0.15);
  ctx.quadraticCurveTo(-faceW * 0.22, -faceW * 0.33, -faceW * 0.5, -faceW * 0.28);
  ctx.fill();

  if (style === "bob") {
    ctx.fillStyle = color;
    const nearSide = yawFactor >= 0 ? 1 : -1;
    ctx.globalAlpha = opacity * 0.9;
    ctx.beginPath();
    ctx.roundRect(nearSide * faceW * 0.34 - faceW * 0.13, faceW * 0.08, faceW * 0.27, faceW * 0.63, faceW * 0.13);
    ctx.fill();
  }
  ctx.restore();
}

function clearHair() { ctx.clearRect(0, 0, overlay.width, overlay.height); }

function resizeOverlay() {
  const width = Math.max(1, video.videoWidth || fakeSource.width || 960);
  const height = Math.max(1, video.videoHeight || fakeSource.height || 720);
  if (overlay.width !== width || overlay.height !== height) {
    overlay.width = width;
    overlay.height = height;
  }
}

function animateFakeCamera() {
  const draw = () => {
    if (!stream && testMode !== "landmarks") return;
    const w = fakeSource.width, h = fakeSource.height;
    fakeCtx.fillStyle = "#b9c7c2";
    fakeCtx.fillRect(0, 0, w, h);
    fakeCtx.fillStyle = "#788e87";
    fakeCtx.fillRect(0, h * 0.72, w, h * 0.28);
    fakeCtx.fillStyle = "#d5a37d";
    fakeCtx.beginPath();
    fakeCtx.ellipse(w / 2, h * 0.48, w * 0.16, h * 0.28, 0, 0, Math.PI * 2);
    fakeCtx.fill();
    fakeCtx.fillStyle = "#40332d";
    fakeCtx.beginPath();
    fakeCtx.ellipse(w / 2, h * 0.32, w * 0.18, h * 0.14, 0, Math.PI, Math.PI * 2);
    fakeCtx.fill();
    fakeCtx.fillStyle = "rgba(255,255,255,.9)";
    fakeCtx.font = "700 26px sans-serif";
    fakeCtx.textAlign = "center";
    fakeCtx.fillText("AUTOMATION FAKE MEDIA · 非真人摄像头", w / 2, h - 38);
    if (testMode === "landmarks") requestAnimationFrame(draw);
  };
  draw();
}

function stopRuntime(updateState = true) {
  if (animationId) cancelAnimationFrame(animationId);
  animationId = null;
  if (stream) stream.getTracks().forEach((track) => track.stop());
  stream = null;
  video.pause();
  video.srcObject = null;
  video.style.display = "none";
  clearHair();
  setControlsRunning(false);
  $("#noCamera").hidden = false;
  $("#startScan").disabled = false;
  $("#modelLoading").hidden = true;
  $("#inputMode").textContent = "等待摄像头";
  neutralYawRaw = 0;
  neutralSamples = [];
  if (updateState) dispatch({ type: "stop" });
}

function setControlsRunning(running) {
  $("#stopScan").disabled = !running;
  $("#stopTop").disabled = !running;
  $("#inputMode").textContent = running ? (testMode === "landmarks" ? "审计模拟 landmark" : "真实摄像头 / 本地关键点") : "等待摄像头";
}

function permissionErrorMessage(error) {
  if (error?.name === "NotAllowedError") return "摄像头权限被拒绝。请在浏览器地址栏权限设置中允许，或改用三照片流程。";
  if (error?.name === "NotFoundError") return "没有找到可用摄像头。可连接摄像头后重试，或改用三照片流程。";
  if (error?.name === "NotReadableError") return "摄像头可能正被其他应用占用。关闭占用后重试。";
  return `启动失败：${error?.message || "未知错误"}`;
}

function updateFps(now) {
  fpsFrames += 1;
  if (now - fpsWindowAt >= 1000) {
    visibleFps = Math.round(fpsFrames * 1000 / (now - fpsWindowAt));
    fpsFrames = 0;
    fpsWindowAt = now;
  }
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

$("#startScan").addEventListener("click", startScan);
$("#retryScan").addEventListener("click", startScan);
$("#stopScan").addEventListener("click", () => stopRuntime(true));
$("#stopTop").addEventListener("click", () => stopRuntime(true));
document.querySelectorAll(".style-option").forEach((button) => button.addEventListener("click", () => {
  activeStyle = button.dataset.style;
  document.querySelectorAll(".style-option").forEach((item) => item.classList.toggle("selected", item === button));
  if (scanState.lastSample?.tracked) drawHair(scanState.lastSample);
}));
$("#hairOpacity").addEventListener("input", (event) => {
  opacity = Number(event.target.value) / 100;
  $("#opacityValue").textContent = `${event.target.value}%`;
  if (scanState.lastSample?.tracked) drawHair(scanState.lastSample);
});
window.addEventListener("pagehide", () => stopRuntime(false));
window.__SCAN_DEBUG__ = { getState: () => stateSnapshot(scanState), getHistory: () => structuredClone(debugHistory), version: "phase2-l0" };
renderState();
