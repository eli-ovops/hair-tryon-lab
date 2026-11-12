import { FaceLandmarker, FilesetResolver } from "./vendor/mediapipe/tasks-vision/vision_bundle.mjs";
import { ScanPhase, PHASE_COPY, createInitialScanState, reduceScan, stateSnapshot } from "./scan-machine.js";

const $ = (selector) => document.querySelector(selector);
const params = new URL(location.href).searchParams;
const testMode = params.get("test");
const demoMode = ["scan", "style", "result"].includes(params.get("demo")) ? params.get("demo") : "scan";
const video = $("#camera");
const overlay = $("#hairCanvas");
const ctx = overlay.getContext("2d");
const fakeSource = $("#fakeSource");
const fakeCtx = fakeSource.getContext("2d");
const demoAssets = Object.freeze({ straightFront: "assets/ui-v2/scan-placeholder-front.png", shortFront: "assets/ui-v2/short-layers-demo-front.png", shortSide: "assets/ui-v2/short-layers-demo-side.png" });
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
let currentMode = demoMode;
const debugHistory = [];

if (testMode === "landmarks") {
  $("#testBanner").hidden = false;
  $("#testBanner").textContent = "自动化审计模式：仅用本地 fake media，不代表真人摄像头验收。";
} else if (testMode === "deny") {
  $("#testBanner").hidden = false;
  $("#testBanner").textContent = "自动化权限拒绝模式。";
}

function setMode(mode) {
  currentMode = mode;
  document.body.dataset.mode = mode;
  document.body.dataset.comparing = "false";
  if (mode === "result") document.body.dataset.sideView = "false";
  updateDemoImage();
  renderState();
}

function updateDemoImage() {
  const side = document.body.dataset.sideView === "true";
  const isScan = currentMode === "scan";
  $("#previewPlaceholder").src = isScan ? demoAssets.straightFront : side ? demoAssets.shortSide : demoAssets.shortFront;
  $("#previewPlaceholder").alt = isScan ? "示例正面照片，仅在摄像头未开启时显示" : side ? "短层次侧面示例，仅在摄像头未开启时显示" : "短层次正面示例，仅在摄像头未开启时显示";
}

new MutationObserver(updateDemoImage).observe(document.body, { attributes: true, attributeFilter: ["data-side-view"] });

function dispatch(event) {
  const previous = scanState.phase;
  scanState = reduceScan(scanState, event);
  if (previous === ScanPhase.CENTER && scanState.phase === ScanPhase.LEFT && neutralSamples.length) {
    neutralYawRaw = neutralSamples.reduce((sum, value) => sum + value, 0) / neutralSamples.length;
    neutralSamples = [];
  }
  if (previous !== scanState.phase) {
    debugHistory.push({ at: Math.round(performance.now()), from: previous, to: scanState.phase, snapshot: stateSnapshot(scanState) });
    if (scanState.phase === ScanPhase.COMPLETE && currentMode === "scan") setMode("style");
  }
  renderState();
}

function renderState() {
  const copy = PHASE_COPY[scanState.phase];
  $("#phaseTitle").textContent = copy.title.replace("摄像头尚未开启", "准备扫描");
  $("#phaseCue").textContent = scanState.phase === ScanPhase.WAITING_PERMISSION ? "请把头部放入椭圆引导内" : copy.cue;
  $("#feedback").textContent = scanState.error || scanState.warning || (scanState.phase === ScanPhase.COMPLETE ? "校准完成，可以开始试戴" : "");
  $("#progressBar").style.width = `${Math.round(scanState.progress * 100)}%`;
  $("#phaseCount").textContent = `${scanState.completed.length} / 4`;
  $("#retryScan").hidden = ![ScanPhase.ERROR, ScanPhase.STOPPED].includes(scanState.phase);
  $("#calibrationList").querySelectorAll("li").forEach((item) => {
    const phase = item.dataset.phase;
    item.classList.toggle("active", phase === scanState.phase);
    item.classList.toggle("done", scanState.completed.includes(phase));
  });
  const sample = scanState.lastSample;
  $("#yawValue").textContent = sample?.tracked ? `${sample.yaw.toFixed(1)}°` : "—";
  $("#rollValue").textContent = sample?.tracked ? `${sample.roll.toFixed(1)}°` : "—";
  $("#scaleValue").textContent = sample?.tracked ? sample.scale.toFixed(3) : "—";
  $("#fpsValue").textContent = visibleFps ? `${visibleFps} fps` : "—";
  $("#outRange").hidden = !(sample?.tracked && Math.abs(sample.yaw) > 45);
  const unlocked = scanState.phase === ScanPhase.COMPLETE || demoMode !== "scan";
  document.querySelectorAll(".style-option").forEach((button) => button.disabled = !unlocked);
  $("#viewResult").disabled = !unlocked;
  $("#hairOpacity").disabled = !unlocked;
  document.documentElement.dataset.scanPhase = scanState.phase;
}

async function startScan() {
  stopRuntime(false);
  setMode("scan");
  dispatch({ type: "reset" });
  $("#startScan").disabled = true;
  $("#retryScan").hidden = true;
  $("#feedback").textContent = "正在请求摄像头权限";
  try {
    stream = await requestStream();
    dispatch({ type: "permission_granted" });
    $("#modelLoading").hidden = false;
    video.srcObject = stream;
    await video.play();
    document.body.dataset.cameraLive = "true";
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
    $("#startScan").disabled = false;
    dispatch({ type: "error", message: permissionErrorMessage(error) });
  }
}

async function requestStream() {
  if (testMode === "deny") throw new DOMException("automation permission denial", "NotAllowedError");
  if (testMode === "landmarks") { animateFakeCamera(); return fakeSource.captureStream(30); }
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("当前浏览器或地址不支持 getUserMedia；请使用 HTTPS 的现代手机浏览器");
  return navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
}

async function loadModel() {
  if (faceLandmarker) return;
  const vision = await FilesetResolver.forVisionTasks("./vendor/mediapipe/tasks-vision/wasm");
  faceLandmarker = await FaceLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: "./vendor/mediapipe/models/face_landmarker.task", delegate: "CPU" }, runningMode: "VIDEO", numFaces: 1, minFaceDetectionConfidence: .55, minFacePresenceConfidence: .55, minTrackingConfidence: .55, outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false });
}

function processFrame(now) {
  if (!stream) return;
  resizeOverlay();
  let sample = null;
  if (testMode === "landmarks") sample = fakeLandmarkSample(now - fakeStartedAt);
  else if (faceLandmarker && video.readyState >= 2 && video.currentTime !== lastVideoTime && now - lastDetectAt >= 40) {
    lastVideoTime = video.currentTime;
    lastDetectAt = now;
    const result = faceLandmarker.detectForVideo(video, now);
    sample = result.faceLandmarks?.[0] ? poseFromLandmarks(result.faceLandmarks[0]) : { tracked: false };
  }
  if (sample) {
    if (scanState.phase === ScanPhase.CENTER && sample.tracked && Math.abs(sample.yawRaw) < .2) { neutralSamples.push(sample.yawRaw); if (neutralSamples.length > 30) neutralSamples.shift(); }
    dispatch({ type: "sample", sample, now });
    if (sample.tracked) drawHair(sample); else clearHair();
    updateFps(now);
  }
  animationId = requestAnimationFrame(processFrame);
}

function poseFromLandmarks(points) {
  const leftEye = points[33], rightEye = points[263], nose = points[1];
  if (!leftEye || !rightEye || !nose) return { tracked: false };
  const xs = points.map((point) => point.x), ys = points.map((point) => point.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const eyeDx = rightEye.x - leftEye.x, eyeDy = rightEye.y - leftEye.y, eyeDistance = Math.hypot(eyeDx, eyeDy) || .001;
  const eyeMidX = (leftEye.x + rightEye.x) / 2, yawRaw = (nose.x - eyeMidX) / eyeDistance, yaw = clamp(-(yawRaw - neutralYawRaw) * 62, -70, 70);
  return { tracked:true, yawRaw, yaw, roll:Math.atan2(eyeDy, eyeDx) * 180 / Math.PI, centerX:(minX + maxX) / 2, centerY:(minY + maxY) / 2, scale:maxX - minX, bounds:{minX,maxX,minY,maxY} };
}

function fakeLandmarkSample(elapsed) {
  let yaw = 0;
  if (scanState.phase === ScanPhase.LEFT) yaw = -26;
  else if (scanState.phase === ScanPhase.RIGHT) yaw = 26;
  else if (scanState.phase === ScanPhase.COMPLETE) { const cycleMs = elapsed % 8000; yaw = cycleMs < 1300 ? 0 : cycleMs < 2600 ? 25 : cycleMs < 3900 ? -24 : 52; }
  const t = elapsed / 1000;
  return { tracked:true, yawRaw:-yaw / 62, yaw, roll:Math.sin(t * 1.4) * 3, centerX:.5 + Math.sin(t * .8) * .018, centerY:.49 + Math.cos(t * .7) * .012, scale:.43 + Math.sin(t) * .008, bounds:{minX:.285,maxX:.715,minY:.21,maxY:.77} };
}

function drawHair(sample) {
  if (!sample.bounds) return;
  const w = overlay.width, h = overlay.height, faceW = sample.scale * w, centerX = sample.centerX * w, centerY = sample.centerY * h - faceW * .07, yawFactor = clamp(sample.yaw / 45, -1, 1);
  clearHair(); ctx.save(); ctx.translate(centerX, centerY); ctx.rotate(-sample.roll * Math.PI / 180); ctx.scale(1 - Math.abs(yawFactor) * .14, 1); ctx.translate(yawFactor * faceW * .08, 0); ctx.globalAlpha = opacity;
  const color = activeStyle === "short" ? "#3c302a" : "#49372f", highlight = activeStyle === "short" ? "#6c5549" : "#765a4d";
  ctx.fillStyle = color; ctx.beginPath();
  if (activeStyle === "short") { ctx.ellipse(0,-faceW*.22,faceW*.61,faceW*.55,0,Math.PI,Math.PI*2); ctx.quadraticCurveTo(faceW*.62,faceW*.02,faceW*.46,faceW*.23); ctx.quadraticCurveTo(0,faceW*.08,-faceW*.46,faceW*.23); ctx.quadraticCurveTo(-faceW*.62,faceW*.02,-faceW*.61,-faceW*.22); }
  else { ctx.ellipse(0,-faceW*.15,faceW*.67,faceW*.62,0,Math.PI,Math.PI*2); ctx.lineTo(faceW*.64,faceW*.73); ctx.quadraticCurveTo(faceW*.42,faceW*.87,faceW*.28,faceW*.62); ctx.lineTo(-faceW*.28,faceW*.62); ctx.quadraticCurveTo(-faceW*.42,faceW*.87,-faceW*.64,faceW*.73); ctx.closePath(); }
  ctx.fill(); ctx.globalCompositeOperation="destination-out"; ctx.globalAlpha=1; ctx.beginPath(); ctx.ellipse(yawFactor*faceW*.05,faceW*.13,faceW*.38,faceW*.52,0,0,Math.PI*2); ctx.fill(); ctx.globalCompositeOperation="source-over"; ctx.globalAlpha=opacity; ctx.fillStyle=highlight; ctx.beginPath(); ctx.moveTo(-faceW*.5,-faceW*.28); ctx.quadraticCurveTo(-faceW*.05,-faceW*.65,faceW*.5,-faceW*.25); ctx.quadraticCurveTo(faceW*.22,-faceW*.34,0,-faceW*.15); ctx.quadraticCurveTo(-faceW*.22,-faceW*.33,-faceW*.5,-faceW*.28); ctx.fill();
  if (activeStyle === "bob") { ctx.fillStyle=color; const nearSide=yawFactor>=0?1:-1; ctx.globalAlpha=opacity*.9; ctx.beginPath(); ctx.roundRect(nearSide*faceW*.34-faceW*.13,faceW*.08,faceW*.27,faceW*.63,faceW*.13); ctx.fill(); }
  ctx.restore();
}

function clearHair() { ctx.clearRect(0, 0, overlay.width, overlay.height); }
function resizeOverlay() { const width = Math.max(1, video.videoWidth || fakeSource.width || 960), height = Math.max(1, video.videoHeight || fakeSource.height || 720); if (overlay.width !== width || overlay.height !== height) { overlay.width=width; overlay.height=height; } }
function animateFakeCamera() { const draw = () => { if (!stream && testMode !== "landmarks") return; const w=fakeSource.width,h=fakeSource.height; fakeCtx.fillStyle="#b9c7c2";fakeCtx.fillRect(0,0,w,h);fakeCtx.fillStyle="#788e87";fakeCtx.fillRect(0,h*.72,w,h*.28);fakeCtx.fillStyle="#d5a37d";fakeCtx.beginPath();fakeCtx.ellipse(w/2,h*.48,w*.16,h*.28,0,0,Math.PI*2);fakeCtx.fill();fakeCtx.fillStyle="#40332d";fakeCtx.beginPath();fakeCtx.ellipse(w/2,h*.32,w*.18,h*.14,0,Math.PI,Math.PI*2);fakeCtx.fill(); if(testMode==="landmarks") requestAnimationFrame(draw); }; draw(); }
function stopRuntime(updateState=true) { if(animationId) cancelAnimationFrame(animationId);animationId=null;if(stream)stream.getTracks().forEach(track=>track.stop());stream=null;video.pause();video.srcObject=null;document.body.dataset.cameraLive="false";clearHair();setControlsRunning(false);$("#modelLoading").hidden=true;$("#startScan").disabled=false;$("#inputMode").textContent="等待摄像头";neutralYawRaw=0;neutralSamples=[];if(updateState)dispatch({type:"stop"}); }
function setControlsRunning(running) { $("#stopScan").disabled=!running;$("#stopTop").disabled=!running;$("#inputMode").textContent=running?(testMode==="landmarks"?"审计模拟 landmark":"真实摄像头 / 本地关键点"):"等待摄像头"; }
function permissionErrorMessage(error) { if(error?.name==="NotAllowedError")return "摄像头权限被拒绝。请在浏览器地址栏允许后重试。";if(error?.name==="NotFoundError")return "没有找到可用摄像头。";if(error?.name==="NotReadableError")return "摄像头可能正被其他应用占用。";return `启动失败：${error?.message||"未知错误"}`; }
function updateFps(now) { fpsFrames+=1;if(now-fpsWindowAt>=1000){visibleFps=Math.round(fpsFrames*1000/(now-fpsWindowAt));fpsFrames=0;fpsWindowAt=now;} }
function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
async function saveReference() { const canvas=document.createElement("canvas"), source=video.readyState>=2?video:$("#previewPlaceholder");canvas.width=source.videoWidth||source.naturalWidth||1086;canvas.height=source.videoHeight||source.naturalHeight||1448;const c=canvas.getContext("2d");try{c.drawImage(source,0,0,canvas.width,canvas.height);if(document.body.dataset.cameraLive==="true")c.drawImage(overlay,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));if(!blob)throw new Error("浏览器无法生成图片");const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="发型试戴参考.png";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);$("#feedback").textContent="已开始保存参考图片";}catch(error){$("#feedback").textContent=`无法保存参考：${error.message||"浏览器限制"}`;}}

$("#startScan").addEventListener("click",startScan);$("#retryScan").addEventListener("click",startScan);$("#stopScan").addEventListener("click",()=>stopRuntime(true));$("#stopTop").addEventListener("click",()=>stopRuntime(true));$("#exitScan").addEventListener("click",()=>stopRuntime(true));$("#scanHelp").addEventListener("click",()=>{$("#feedback").textContent="正面、向左、回正、向右：每一步稳定保持片刻。";});$("#backToScan").addEventListener("click",()=>setMode("scan"));$("#backToStyle").addEventListener("click",()=>setMode("style"));$("#reselectStyle").addEventListener("click",()=>setMode("style"));$("#viewResult").addEventListener("click",()=>setMode("result"));$("#compareToggle").addEventListener("click",()=>{document.body.dataset.comparing=document.body.dataset.comparing!=="true"?"true":"false";$("#compareToggle").textContent=document.body.dataset.comparing==="true"?"显示试戴":"对比";});["#saveTop","#saveResult","#saveReference"].forEach(id=>$(id).addEventListener("click",saveReference));document.querySelectorAll(".style-option").forEach(button=>button.addEventListener("click",()=>{activeStyle=button.dataset.style;document.querySelectorAll(".style-option").forEach(item=>item.classList.toggle("selected",item===button));if(scanState.lastSample?.tracked)drawHair(scanState.lastSample);}));document.querySelectorAll(".result-tab").forEach(button=>button.addEventListener("click",()=>{const side=button.dataset.view==="side";document.body.dataset.sideView=String(side);document.querySelectorAll(".result-tab").forEach(item=>{const active=item===button;item.classList.toggle("active",active);item.setAttribute("aria-selected",String(active));});}));$("#hairOpacity").addEventListener("input",event=>{opacity=Number(event.target.value)/100;$("#opacityValue").textContent=`${event.target.value}%`;if(scanState.lastSample?.tracked)drawHair(scanState.lastSample);});window.addEventListener("pagehide",()=>stopRuntime(false));document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")stopRuntime(false);});window.__SCAN_DEBUG__={getState:()=>stateSnapshot(scanState),getHistory:()=>structuredClone(debugHistory),getUi:()=>({mode:currentMode,camera:Boolean(stream),style:activeStyle}),version:"imagegen-ui-v2"};setMode(demoMode);
