/**
 * THROWAWAY L0 logic prototype.
 * Question: can a user complete center -> left -> center -> right calibration
 * only when real landmark-derived pose samples remain valid and stable?
 */

export const ScanPhase = Object.freeze({
  WAITING_PERMISSION: "waiting_permission",
  LOADING_MODEL: "loading_model",
  CENTER: "center",
  LEFT: "left",
  RETURN_CENTER: "return_center",
  RIGHT: "right",
  COMPLETE: "complete",
  STOPPED: "stopped",
  ERROR: "error",
});

export const STABLE_MS = 900;

export const PHASE_COPY = Object.freeze({
  [ScanPhase.WAITING_PERMISSION]: { title: "摄像头尚未开启", cue: "先阅读隐私说明，再由你主动授权" },
  [ScanPhase.LOADING_MODEL]: { title: "正在加载本地关键点模型", cue: "模型资产来自本机 vendor，不上传画面" },
  [ScanPhase.CENTER]: { title: "正脸居中并保持", cue: "看向镜头，露出额头与耳侧" },
  [ScanPhase.LEFT]: { title: "缓慢向屏幕左侧转头", cue: "到约 20–35° 后稳定保持" },
  [ScanPhase.RETURN_CENTER]: { title: "缓慢回到正面", cue: "重新看向镜头并保持" },
  [ScanPhase.RIGHT]: { title: "缓慢向屏幕右侧转头", cue: "到约 20–35° 后稳定保持" },
  [ScanPhase.COMPLETE]: { title: "校准完成", cue: "现在可在约左右 40° 内观察轮廓跟随" },
  [ScanPhase.STOPPED]: { title: "摄像头已停止", cue: "没有保存视频帧或面部模板" },
  [ScanPhase.ERROR]: { title: "无法继续扫描", cue: "查看提示后可重试或回到三照片流程" },
});

const nextPhase = Object.freeze({
  [ScanPhase.CENTER]: ScanPhase.LEFT,
  [ScanPhase.LEFT]: ScanPhase.RETURN_CENTER,
  [ScanPhase.RETURN_CENTER]: ScanPhase.RIGHT,
  [ScanPhase.RIGHT]: ScanPhase.COMPLETE,
});

export function createInitialScanState() {
  return {
    phase: ScanPhase.WAITING_PERMISSION,
    stableSince: null,
    progress: 0,
    completed: [],
    warning: "",
    lastSample: null,
    error: "",
  };
}

export function reduceScan(state, event) {
  if (event.type === "permission_granted") {
    return { ...state, phase: ScanPhase.LOADING_MODEL, error: "", warning: "", progress: 0 };
  }
  if (event.type === "model_ready") {
    return { ...state, phase: ScanPhase.CENTER, stableSince: null, progress: 0, warning: "" };
  }
  if (event.type === "stop") {
    return {
      ...createInitialScanState(),
      phase: ScanPhase.STOPPED,
    };
  }
  if (event.type === "reset") return createInitialScanState();
  if (event.type === "error") {
    return { ...state, phase: ScanPhase.ERROR, stableSince: null, progress: 0, error: event.message || "未知错误" };
  }
  if (event.type !== "sample") return state;
  return advanceWithSample(state, event.sample, event.now);
}

export function advanceWithSample(state, sample, now) {
  if (![ScanPhase.CENTER, ScanPhase.LEFT, ScanPhase.RETURN_CENTER, ScanPhase.RIGHT, ScanPhase.COMPLETE].includes(state.phase)) {
    return { ...state, lastSample: sample };
  }

  const base = { ...state, lastSample: sample };
  if (!sample?.tracked) {
    return { ...base, stableSince: null, progress: 0, warning: "没有稳定识别到一张脸，请改善光线并回到画面中央" };
  }

  const commonWarning = getTrackingWarning(sample);
  if (state.phase === ScanPhase.COMPLETE) {
    return { ...base, warning: commonWarning };
  }

  const phaseValid = isSampleValidForPhase(state.phase, sample);
  if (!phaseValid) {
    return {
      ...base,
      stableSince: null,
      progress: 0,
      warning: commonWarning || getPhaseCorrection(state.phase, sample),
    };
  }

  const stableSince = state.stableSince ?? now;
  const progress = Math.min(1, (now - stableSince) / STABLE_MS);
  if (progress < 1) return { ...base, stableSince, progress, warning: "保持稳定，不要加速转头" };

  const completed = [...state.completed, state.phase];
  return {
    ...base,
    phase: nextPhase[state.phase],
    completed,
    stableSince: null,
    progress: 0,
    warning: "此关已通过",
  };
}

export function isSampleValidForPhase(phase, sample) {
  const centered = sample.centerX >= 0.34 && sample.centerX <= 0.66 && sample.centerY >= 0.3 && sample.centerY <= 0.68;
  const sized = sample.scale >= 0.2 && sample.scale <= 0.7;
  const level = Math.abs(sample.roll) <= 14;
  if (!centered || !sized || !level || Math.abs(sample.yaw) > 45) return false;

  if (phase === ScanPhase.CENTER || phase === ScanPhase.RETURN_CENTER) return Math.abs(sample.yaw) <= 9;
  if (phase === ScanPhase.LEFT) return sample.yaw <= -18 && sample.yaw >= -40;
  if (phase === ScanPhase.RIGHT) return sample.yaw >= 18 && sample.yaw <= 40;
  return true;
}

export function getTrackingWarning(sample) {
  if (Math.abs(sample.yaw) > 45) return "已超出原型跟踪范围，请转回约 ±40° 内";
  if (sample.centerX < 0.34 || sample.centerX > 0.66 || sample.centerY < 0.3 || sample.centerY > 0.68) return "请把脸移回取景框中央";
  if (sample.scale < 0.2) return "请靠近一点";
  if (sample.scale > 0.7) return "请稍微远离镜头";
  if (Math.abs(sample.roll) > 14) return "请减少歪头，保持眼线接近水平";
  return "";
}

function getPhaseCorrection(phase, sample) {
  if (phase === ScanPhase.CENTER || phase === ScanPhase.RETURN_CENTER) return sample.yaw < 0 ? "再向屏幕右侧回正一点" : "再向屏幕左侧回正一点";
  if (phase === ScanPhase.LEFT) return sample.yaw > -18 ? "继续缓慢向屏幕左侧转" : "转得太多，请稍微回一点";
  if (phase === ScanPhase.RIGHT) return sample.yaw < 18 ? "继续缓慢向屏幕右侧转" : "转得太多，请稍微回一点";
  return "调整头部姿态后重试";
}

export function stateSnapshot(state) {
  return {
    phase: state.phase,
    completed: [...state.completed],
    progress: Number(state.progress.toFixed(2)),
    warning: state.warning,
    sample: state.lastSample ? {
      tracked: state.lastSample.tracked,
      yaw: Number(state.lastSample.yaw.toFixed(1)),
      roll: Number(state.lastSample.roll.toFixed(1)),
      centerX: Number(state.lastSample.centerX.toFixed(3)),
      centerY: Number(state.lastSample.centerY.toFixed(3)),
      scale: Number(state.lastSample.scale.toFixed(3)),
    } : null,
  };
}
