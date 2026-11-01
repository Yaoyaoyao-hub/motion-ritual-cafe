import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import {
  Camera,
  ChevronRight,
  CircleHelp,
  Coffee,
  Egg,
  FileVideo,
  Flag,
  Hand,
  ImagePlus,
  LoaderCircle,
  Maximize2,
  Pause,
  PawPrint,
  Play,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Square,
  Trophy,
  Video,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { CafeScene } from "./CafeScene.jsx";
import { CUSTOMERS, INITIAL_ORDER, advanceOrder } from './orders.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const POSE_CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27],
  [24, 26], [26, 28], [27, 29], [29, 31], [28, 30], [30, 32],
];

const MOVEMENT_LABELS = {
  leanLeft: "Lean left",
  leanRight: "Lean right",
  stepForward: "Step closer",
  stepBack: "Step back",
  jump: "Squat and rise",
  interact: "Raise a hand",
};

const EMPTY_COUNTS = {
  leanLeft: 0,
  leanRight: 0,
  stepForward: 0,
  stepBack: 0,
  jump: 0,
  interact: 0,
};

const cameraErrorMessage = (error) => {
  const name = error?.name || "";

  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    return "Live camera access is not available inside this browser. Open this site in Safari or Chrome, or choose/record a video instead.";
  }
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Camera access is blocked. Allow Camera for this site in Safari or Chrome, then try again—or choose a video instead.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No camera was found. Connect or enable a camera, or choose a recorded video instead.";
  }
  if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") {
    return "The camera is busy or unavailable. Close other camera apps and try again, or choose a video instead.";
  }
  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
    return "This camera does not support the requested video mode. Try again with another camera, or choose a video instead.";
  }
  if (name === "TimeoutError") {
    return "This browser did not open a camera permission prompt. Open this site in Safari or Chrome, or choose/record a video instead.";
  }
  return "The camera could not be started here. Try Safari or Chrome, check the site’s camera permission, or choose a video instead.";
};

function VideoPreview({ videoRef, canvasRef, sourceType, sourceName, modelState, poseVisible, recording, hidden = false }) {
  return (
    <div className={`video-preview-wrap ${hidden ? "is-hidden" : ""}`} aria-hidden={hidden}>
      <video ref={videoRef} className="pose-video" muted playsInline loop={sourceType === "video"} />
      <canvas ref={canvasRef} className="pose-canvas" />
      <div className="preview-label">
        <span className={`status-dot ${poseVisible ? "is-live" : ""}`} />
        {recording ? "Recording" : poseVisible ? "Pose found" : modelState === "loading" ? "Loading model" : "Finding you"}
      </div>
      <div className="source-name">{sourceName}</div>
    </div>
  );
}

function MotionGuide({ gesture, calibrationState, controlValues }) {
  const isReady = calibrationState === "ready";
  return (
    <aside className="motion-guide" aria-label="Motion controls">
      <div className="eyebrow">MOTION GUIDE</div>
      <h2>{isReady ? gesture : "Stand in the frame."}</h2>
      <p>
        {calibrationState === "calibrating"
          ? "Hold a relaxed, neutral stance while we learn your position."
          : "Lean to steer. Step closer or farther to walk. Squat and rise to jump. Raise one hand to brew."}
      </p>
      <div className="motion-meter" aria-label="Movement input">
        <span className="meter-center" />
        <span
          className="meter-cursor"
          style={{ transform: `translate(${controlValues.x * 38}px, ${-controlValues.z * 18}px)` }}
        />
      </div>
    </aside>
  );
}

export function App() {
  const videoRef = useRef(null);
  const poseCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const objectUrlRef = useRef(null);
  const recorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const landmarkerRef = useRef(null);
  const animationRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);
  const baselineRef = useRef(null);
  const calibrationSamplesRef = useRef([]);
  const calibrationStartRef = useRef(0);
  const squatRef = useRef({ active: false, startedAt: 0 });
  const reachRef = useRef({ startedAt: 0, fired: false });
  const activePoseMovementRef = useRef(null);
  const lastMovementAtRef = useRef({});
  const aiVoiceAvailableRef = useRef(null);
  const petImageUrlRef = useRef(null);
  const controlRef = useRef({ x: 0, z: 0, jumpToken: 0, interactToken: 0 });

  const [sourceType, setSourceType] = useState("none");
  const [sourceName, setSourceName] = useState("No motion source");
  const [sourceError, setSourceError] = useState("");
  const [cameraStarting, setCameraStarting] = useState(false);
  const [modelState, setModelState] = useState("loading");
  const [poseVisible, setPoseVisible] = useState(false);
  const [calibrationState, setCalibrationState] = useState("waiting");
  const [gesture, setGesture] = useState("Hold still to calibrate");
  const [controlValues, setControlValues] = useState({ x: 0, z: 0 });
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [nearMachine, setNearMachine] = useState(false);
  const [brewCount, setBrewCount] = useState(0);
  const [resetToken, setResetToken] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showHelp, setShowHelp] = useState(true);
  const [toast, setToast] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [movementCounts, setMovementCounts] = useState(EMPTY_COUNTS);
  const [order, dispatchOrder] = useReducer(advanceOrder, INITIAL_ORDER);
  const customer = CUSTOMERS[order.customer];
  const [gameEnded, setGameEnded] = useState(false);
  const [coachDecision, setCoachDecision] = useState(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [showHatch, setShowHatch] = useState(false);
  const [pet, setPet] = useState(() => {
    try {
      const saved = window.localStorage.getItem("motion-ritual-pet");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [petDraft, setPetDraft] = useState({ name: "Mochi", species: "cat", color: "#d49a6a", imageUrl: "" });

  const clearToastSoon = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }, []);

  const speakWithBrowser = useCallback((label) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(label);
    utterance.rate = 0.96;
    utterance.pitch = 1.08;
    utterance.volume = 0.82;
    window.speechSynthesis.speak(utterance);
  }, []);

  const speakMovement = useCallback(async (label) => {
    if (!voiceEnabled) return;
    if (aiVoiceAvailableRef.current === false) {
      speakWithBrowser(label);
      return;
    }
    try {
      const response = await fetch("/api/speak", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: label }),
      });
      if (!response.ok) throw new Error("OpenAI voice unavailable");
      aiVoiceAvailableRef.current = true;
      const audioUrl = URL.createObjectURL(await response.blob());
      const audio = new Audio(audioUrl);
      audio.onended = () => URL.revokeObjectURL(audioUrl);
      await audio.play();
    } catch {
      aiVoiceAvailableRef.current = false;
      speakWithBrowser(label);
    }
  }, [speakWithBrowser, voiceEnabled]);

  const recordMovement = useCallback((key, spokenLabel = MOVEMENT_LABELS[key]) => {
    if (!key || !(key in MOVEMENT_LABELS) || gameEnded) return;
    const now = performance.now();
    if (now - (lastMovementAtRef.current[key] || 0) < 750) return;
    lastMovementAtRef.current[key] = now;
    setMovementCounts((counts) => ({ ...counts, [key]: counts[key] + 1 }));
    dispatchOrder({ key });
    speakMovement(spokenLabel);
  }, [gameEnded, speakMovement]);

  const handlePetImage = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (petImageUrlRef.current) URL.revokeObjectURL(petImageUrlRef.current);
    const imageUrl = URL.createObjectURL(file);
    petImageUrlRef.current = imageUrl;
    setPetDraft((draft) => ({ ...draft, imageUrl }));
  }, []);

  const hatchPet = useCallback(() => {
    const nextPet = {
      name: petDraft.name.trim() || "Mochi",
      species: petDraft.species,
      color: petDraft.color,
      imageUrl: petDraft.imageUrl,
    };
    setPet(nextPet);
    setShowHatch(false);
    clearToastSoon(`${nextPet.name} hatched and is ready to follow`);
  }, [clearToastSoon, petDraft]);

  useEffect(() => {
    try {
      if (pet) {
        const { imageUrl: _imageUrl, ...savedPet } = pet;
        window.localStorage.setItem("motion-ritual-pet", JSON.stringify(savedPet));
      }
    } catch {
      // Pet persistence is optional; the live pet remains available for this session.
    }
  }, [pet]);

  const stopCurrentSource = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current.removeAttribute("src");
      videoRef.current.load();
    }
  }, []);

  const resetCalibration = useCallback(() => {
    baselineRef.current = null;
    calibrationSamplesRef.current = [];
    calibrationStartRef.current = 0;
    setCalibrationState("calibrating");
    setGesture("Hold a neutral pose");
  }, []);

  const startCamera = useCallback(async () => {
    setSourceError("");
    setCameraStarting(true);
    let permissionTimeout;
    let requestExpired = false;
    try {
      stopCurrentSource();
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new DOMException("Camera API unavailable", "NotSupportedError");
      }
      const cameraRequest = navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then((stream) => {
        if (requestExpired) {
          stream.getTracks().forEach((track) => track.stop());
          throw new DOMException("Camera request expired", "TimeoutError");
        }
        return stream;
      });
      const stream = await Promise.race([
        cameraRequest,
        new Promise((_, reject) => {
          permissionTimeout = window.setTimeout(() => {
            requestExpired = true;
            reject(new DOMException("Camera permission prompt unavailable", "TimeoutError"));
          }, 7000);
        }),
      ]);
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new DOMException("Camera preview unavailable", "InvalidStateError");
      video.srcObject = stream;
      video.loop = false;
      await video.play();
      setSourceType("camera");
      setSourceName("Live camera");
      setPaused(false);
      setShowWelcome(false);
      resetCalibration();
    } catch (error) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setSourceError(cameraErrorMessage(error));
    } finally {
      window.clearTimeout(permissionTimeout);
      setCameraStarting(false);
    }
  }, [resetCalibration, stopCurrentSource]);

  const loadVideoBlob = useCallback(async (blob, name) => {
    stopCurrentSource();
    const url = URL.createObjectURL(blob);
    objectUrlRef.current = url;
    const video = videoRef.current;
    video.srcObject = null;
    video.src = url;
    video.loop = true;
    await video.play();
    setSourceType("video");
    setSourceName(name);
    setPaused(false);
    setShowWelcome(false);
    resetCalibration();
  }, [resetCalibration, stopCurrentSource]);

  const chooseVideo = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSourceError("");
    try {
      await loadVideoBlob(file, file.name);
    } catch {
      setSourceError("That video could not be played. Try an MP4, WebM, or a new recording.");
    }
    event.target.value = "";
  }, [loadVideoBlob]);

  const startRecording = useCallback(() => {
    if (!streamRef.current || typeof MediaRecorder === "undefined") {
      setSourceError("Recording is not available in this browser. You can upload a video instead.");
      return;
    }
    recordedChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorder.ondataavailable = (event) => {
      if (event.data.size) recordedChunksRef.current.push(event.data);
    };
    recorder.onstop = async () => {
      const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || "video/webm" });
      await loadVideoBlob(blob, "Recorded motion clip");
    };
    recorder.start(250);
    recorderRef.current = recorder;
    setRecording(true);
  }, [loadVideoBlob]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setRecording(false);
  }, []);

  const togglePause = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      await video.play();
      setPaused(false);
    } else {
      video.pause();
      setPaused(true);
      controlRef.current.x = 0;
      controlRef.current.z = 0;
    }
  }, []);

  const drawPose = useCallback((landmarks) => {
    const canvas = poseCanvasRef.current;
    if (!canvas) return;
    const width = 360;
    const height = 260;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, width, height);
    if (!landmarks) return;
    context.save();
    context.translate(width, 0);
    context.scale(-1, 1);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "rgba(255, 248, 224, .88)";
    context.lineWidth = 3;
    POSE_CONNECTIONS.forEach(([a, b]) => {
      const first = landmarks[a];
      const second = landmarks[b];
      if (!first || !second || (first.visibility ?? 1) < 0.35 || (second.visibility ?? 1) < 0.35) return;
      context.beginPath();
      context.moveTo(first.x * width, first.y * height);
      context.lineTo(second.x * width, second.y * height);
      context.stroke();
    });
    [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].forEach((index) => {
      const point = landmarks[index];
      if (!point || (point.visibility ?? 1) < 0.35) return;
      context.beginPath();
      context.fillStyle = index === 15 || index === 16 ? "#efd493" : "#6d8b75";
      context.arc(point.x * width, point.y * height, index === 15 || index === 16 ? 5 : 4, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "#fff8df";
      context.lineWidth = 1.5;
      context.stroke();
    });
    context.restore();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const initialise = async () => {
      setModelState("loading");
      try {
        const vision = await FilesetResolver.forVisionTasks("/wasm");
        let landmarker;
        try {
          landmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: "/models/pose_landmarker_lite.task", delegate: "GPU" },
            runningMode: "VIDEO",
            numPoses: 1,
            minPoseDetectionConfidence: 0.55,
            minPosePresenceConfidence: 0.55,
            minTrackingConfidence: 0.55,
          });
        } catch {
          landmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: "/models/pose_landmarker_lite.task", delegate: "CPU" },
            runningMode: "VIDEO",
            numPoses: 1,
            minPoseDetectionConfidence: 0.55,
            minPosePresenceConfidence: 0.55,
            minTrackingConfidence: 0.55,
          });
        }
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        setModelState("ready");
      } catch (error) {
        console.error("Pose model failed to load", error);
        setModelState("error");
        setSourceError("The pose model could not load. Keyboard controls remain available.");
      }
    };
    initialise();
    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    let lastUiUpdate = 0;
    const detect = (timestamp) => {
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      if (landmarker && video && !video.paused && video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        try {
          const result = landmarker.detectForVideo(video, timestamp);
          const landmarks = result.landmarks?.[0];
          if (landmarks) {
            setPoseVisible(true);
            drawPose(landmarks);
            const shoulderLeft = landmarks[11];
            const shoulderRight = landmarks[12];
            const hipLeft = landmarks[23];
            const hipRight = landmarks[24];
            const wristLeft = landmarks[15];
            const wristRight = landmarks[16];
            const centerX = (shoulderLeft.x + shoulderRight.x + hipLeft.x + hipRight.x) / 4;
            const shoulderWidth = Math.abs(shoulderLeft.x - shoulderRight.x);
            const hipY = (hipLeft.y + hipRight.y) / 2;

            if (!baselineRef.current) {
              if (!calibrationStartRef.current) calibrationStartRef.current = timestamp;
              calibrationSamplesRef.current.push({ centerX, shoulderWidth, hipY });
              setCalibrationState("calibrating");
              if (timestamp - calibrationStartRef.current > 1200 && calibrationSamplesRef.current.length > 8) {
                const samples = calibrationSamplesRef.current;
                baselineRef.current = samples.reduce((accumulator, sample) => ({
                  centerX: accumulator.centerX + sample.centerX / samples.length,
                  shoulderWidth: accumulator.shoulderWidth + sample.shoulderWidth / samples.length,
                  hipY: accumulator.hipY + sample.hipY / samples.length,
                }), { centerX: 0, shoulderWidth: 0, hipY: 0 });
                setCalibrationState("ready");
                setGesture("Neutral — ready to move");
                clearToastSoon("Motion controls calibrated");
              }
            } else {
              const baseline = baselineRef.current;
              const x = clamp((baseline.centerX - centerX) * 8.5, -1, 1);
              const z = clamp((shoulderWidth / Math.max(0.08, baseline.shoulderWidth) - 1) * 7.5, -1, 1);
              controlRef.current.x = Math.abs(x) < 0.12 ? 0 : x;
              controlRef.current.z = Math.abs(z) < 0.13 ? 0 : z;

              const squatting = hipY > baseline.hipY + 0.055;
              if (squatting && !squatRef.current.active) {
                squatRef.current = { active: true, startedAt: timestamp };
              } else if (!squatting && squatRef.current.active) {
                const duration = timestamp - squatRef.current.startedAt;
                if (duration > 170 && duration < 1800) {
                  controlRef.current.jumpToken += 1;
                  recordMovement("jump", "Squat and rise");
                }
                squatRef.current = { active: false, startedAt: 0 };
              }

              const leftRaised = wristLeft.y < shoulderLeft.y - 0.055 && (wristLeft.visibility ?? 1) > 0.5;
              const rightRaised = wristRight.y < shoulderRight.y - 0.055 && (wristRight.visibility ?? 1) > 0.5;
              const handRaised = leftRaised || rightRaised;
              if (handRaised) {
                if (!reachRef.current.startedAt) reachRef.current.startedAt = timestamp;
                if (!reachRef.current.fired && timestamp - reachRef.current.startedAt > 600) {
                  controlRef.current.interactToken += 1;
                  reachRef.current.fired = true;
                  recordMovement("interact", "Raise a hand");
                }
              } else {
                reachRef.current = { startedAt: 0, fired: false };
              }

              let nextGesture = "Neutral — ready to move";
              if (squatting) nextGesture = "Crouched — rise to jump";
              else if (handRaised) nextGesture = "Hand raised — interacting";
              else if (Math.abs(x) > 0.14) nextGesture = x > 0 ? "Leaning right" : "Leaning left";
              else if (z > 0.14) nextGesture = "Closer — walking forward";
              else if (z < -0.14) nextGesture = "Farther — walking back";

              let activeMovement = null;
              if (!squatting && !handRaised && x > 0.14) activeMovement = "leanRight";
              else if (!squatting && !handRaised && x < -0.14) activeMovement = "leanLeft";
              else if (!squatting && !handRaised && z > 0.14) activeMovement = "stepForward";
              else if (!squatting && !handRaised && z < -0.14) activeMovement = "stepBack";
              if (activeMovement && activePoseMovementRef.current !== activeMovement) recordMovement(activeMovement);
              activePoseMovementRef.current = activeMovement;

              if (timestamp - lastUiUpdate > 100) {
                lastUiUpdate = timestamp;
                setGesture(nextGesture);
                setControlValues({ x: controlRef.current.x, z: controlRef.current.z });
              }
            }
          } else {
            setPoseVisible(false);
            drawPose(null);
            controlRef.current.x = 0;
            controlRef.current.z = 0;
            activePoseMovementRef.current = null;
          }
        } catch (error) {
          console.warn("Pose frame skipped", error);
        }
      }
      animationRef.current = requestAnimationFrame(detect);
    };
    animationRef.current = requestAnimationFrame(detect);
    return () => cancelAnimationFrame(animationRef.current);
  }, [clearToastSoon, drawPose, recordMovement, sourceType]);

  useEffect(() => () => stopCurrentSource(), [stopCurrentSource]);

  const brew = useCallback(() => {
    if (!nearMachine) {
      clearToastSoon("Move closer to the glowing coffee machine");
      return;
    }
    setBrewCount((count) => {
      const next = Math.min(4, count + 1);
      clearToastSoon(next === 4 ? "Tray full — morning complete" : `${next} coffee${next === 1 ? "" : "s"} brewed`);
      return next;
    });
  }, [clearToastSoon, nearMachine]);

  const requestCoachDecision = useCallback(async (counts) => {
    const leastUsed = Object.entries(counts).sort(([, a], [, b]) => a - b)[0]?.[0] || "leanLeft";
    const fallback = {
      source: "local",
      headline: "A gentle, well-moved morning.",
      nextMovement: MOVEMENT_LABELS[leastUsed],
      encouragement: `Next round, give ${MOVEMENT_LABELS[leastUsed].toLowerCase()} a little more room.`,
    };
    setCoachLoading(true);
    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ counts, petName: pet?.name || null }),
      });
      if (!response.ok) throw new Error("Coach unavailable");
      const decision = await response.json();
      setCoachDecision(decision);
    } catch {
      setCoachDecision(fallback);
    } finally {
      setCoachLoading(false);
    }
  }, [pet?.name]);

  const finishMorning = useCallback(() => {
    if (gameEnded) return;
    controlRef.current.x = 0;
    controlRef.current.z = 0;
    setGameEnded(true);
    requestCoachDecision(movementCounts);
  }, [gameEnded, movementCounts, requestCoachDecision]);

  useEffect(() => {
    if (order.served !== CUSTOMERS.length || gameEnded) return undefined;
    const timer = window.setTimeout(finishMorning, 900);
    return () => window.clearTimeout(timer);
  }, [order.served, finishMorning, gameEnded]);

  const resetMorning = useCallback(() => {
    setBrewCount(0);
    setMovementCounts(EMPTY_COUNTS);
    dispatchOrder({ type: 'reset' });
    setGameEnded(false);
    setCoachDecision(null);
    lastMovementAtRef.current = {};
    setResetToken((value) => value + 1);
    clearToastSoon("A fresh morning begins");
  }, [clearToastSoon]);

  const movementTotal = Object.values(movementCounts).reduce((sum, count) => sum + count, 0);

  return (
    <main className="app-shell">
      <CafeScene controlRef={controlRef} onProximity={setNearMachine} onBrew={brew} onMovement={recordMovement} pet={pet} resetToken={resetToken} customerIndex={order.customer} gameEnded={gameEnded} />

      {!showWelcome && !gameEnded && customer && <section className="customer-card" aria-label="Customer request" aria-live="polite">
        <div className="eyebrow">ORDER {order.customer + 1} / {CUSTOMERS.length} · {order.served} SERVED</div>
        <div className="customer-heading"><span className="customer-monogram" style={{ background: customer.color }}>{customer.name[0]}</span><div><h2>{customer.name}</h2><small>{customer.title}</small></div></div>
        <h3>{customer.drink}</h3><p>“{customer.request}”</p>
        <ol>{customer.steps.map((step, index) => <li key={index} className={index < order.step ? 'done' : index === order.step ? 'current' : ''}><span>{index < order.step ? '✓' : index + 1}</span>{step.label}<strong>{index < order.step ? step.count : index === order.step ? order.reps : 0}/{step.count}</strong></li>)}</ol>
        {sourceType !== 'none' && <p>{calibrationState === 'ready' ? gesture : 'Stand still in frame to calibrate.'}</p>}
        {showHelp && <small>Complete in order. Return to neutral between repetitions.<br />Keyboard: A / D lean · W / S step · Space squat · E serve</small>}
      </section>}

      <header className="brand-lockup">
        <div className="brand-kicker">COFFEE FOR A MOVING WORLD</div>
        <h1>motion ritual</h1>
        <button className="pet-hatch-button" onClick={() => setShowHatch(true)}>
          {pet ? <PawPrint size={14} /> : <Egg size={14} />}
          {pet ? `${pet.name} is following` : "Hatch a companion"}
        </button>
      </header>

      {showHelp && sourceType !== "none" && !customer && (
        <MotionGuide gesture={gesture} calibrationState={calibrationState} controlValues={controlValues} />
      )}

      <section className="pose-panel" aria-label="Motion source">
        <div className="pose-panel-header">
          <div>
            <div className="eyebrow">MOTION SOURCE</div>
            <strong>{sourceType === "none" ? "Not connected" : sourceName}</strong>
          </div>
          {sourceType !== "none" && (
            <button className="icon-button" onClick={togglePause} aria-label={paused ? "Play motion source" : "Pause motion source"}>
              {paused ? <Play size={16} /> : <Pause size={16} />}
            </button>
          )}
        </div>

        <VideoPreview
          videoRef={videoRef}
          canvasRef={poseCanvasRef}
          sourceType={sourceType}
          sourceName={sourceName}
          modelState={modelState}
          poseVisible={poseVisible}
          recording={recording}
          hidden={sourceType === "none"}
        />
        {sourceType !== "none" ? (
          <>
            <div className="pose-actions">
              <button className="small-button" onClick={resetCalibration}><RefreshCw size={14} /> Calibrate</button>
              {sourceType === "camera" && (
                recording ? (
                  <button className="small-button recording" onClick={stopRecording}><Square size={13} /> Stop clip</button>
                ) : (
                  <button className="small-button" onClick={startRecording}><Video size={14} /> Record clip</button>
                )
              )}
              <label className="small-button file-button">
                <FileVideo size={14} /> New video
                <input type="file" accept="video/*" capture="user" onChange={chooseVideo} />
              </label>
            </div>
          </>
        ) : (
          <div className="empty-source"><Camera size={22} /><span>Choose a camera or video to begin.</span></div>
        )}
      </section>

      <section className="round-card" aria-label="Coffee tray">
        <div><span>THE MORNING ROUND</span><strong>{order.served} / 4 customers · {movementTotal} moves</strong></div>
        <div className="cup-row" aria-label={`${order.served} of 4 customers served`}>
          {[0, 1, 2, 3].map((index) => <Coffee key={index} size={18} className={index < order.served ? "filled" : ""} />)}
        </div>
      </section>

      <div className="bottom-controls">
        <button className={`primary-action ${nearMachine ? "is-ready" : ""}`} onClick={() => { controlRef.current.interactToken += 1; recordMovement("interact", "Raise a hand"); }}>
          <Hand size={18} /><span>Raise hand · serve order</span>
        </button>
        <button className="pill-action" onClick={() => { controlRef.current.jumpToken += 1; recordMovement("jump", "Squat and rise"); }}><Sparkles size={16} /> Jump</button>
        <button className="pill-action" aria-pressed={voiceEnabled} onClick={() => setVoiceEnabled((value) => !value)}>
          {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />} Voice
        </button>
        <button className="pill-action" onClick={() => setShowHelp((value) => !value)}><CircleHelp size={16} /> Guide</button>
        <button className="pill-action" onClick={finishMorning}><Flag size={15} /> Finish</button>
        <button className="pill-action" onClick={resetMorning}><RotateCcw size={15} /> Reset</button>
      </div>

      {toast && <div className="toast" role="status">{toast}</div>}

      {showWelcome && (
        <div className="welcome-backdrop">
          <section className="welcome-card" aria-labelledby="welcome-title">
            <button className="welcome-close" onClick={() => setShowWelcome(false)} aria-label="Close welcome panel"><X size={18} /></button>
            <div className="welcome-icon"><Maximize2 size={23} /></div>
            <div className="eyebrow">A LITTLE MOTION EXPERIMENT</div>
            <h2 id="welcome-title">Move your body.<br />Brew a quiet morning.</h2>
            <p>Four neighbours, four coffee orders. Follow each customer's movement recipe to serve them. Use a webcam or recorded video; your footage stays on this device.</p>
            <div className="source-choice-grid">
              <button className="source-choice" onClick={startCamera} disabled={cameraStarting}>
                {cameraStarting ? <LoaderCircle className="spinner" size={22} /> : <Camera size={22} />}
                <span><strong>{cameraStarting ? "Waiting for camera…" : "Use webcam"}</strong><small>{cameraStarting ? "Check for a permission prompt" : "Live pose controls"}</small></span>
              </button>
              <label className="source-choice">
                <FileVideo size={22} /><span><strong>Choose video</strong><small>Upload or record a clip</small></span>
                <input type="file" accept="video/*" capture="user" onChange={chooseVideo} />
              </label>
            </div>
            <div className="gesture-preview"><span>Lean</span><span>Step closer</span><span>Squat + rise</span><span>Raise a hand</span></div>
            {modelState === "loading" && <div className="model-note"><LoaderCircle className="spinner" size={15} /> Preparing the pose model…</div>}
            {sourceError && (
              <div className="source-error" role="alert">
                <span>{sourceError}</span>
                <button type="button" onClick={startCamera}><RefreshCw size={12} /> Try camera again</button>
              </div>
            )}
            <p className="browser-camera-note">Camera blocked in this preview? Open the public link in Safari or Chrome, or use <strong>Choose video</strong> to record/upload a clip.</p>
            <button className="keyboard-link" onClick={() => setShowWelcome(false)}>Or explore with WASD, Space and E</button>
          </section>
        </div>
      )}

      {showHatch && (
        <div className="welcome-backdrop">
          <section className="hatch-card" aria-labelledby="hatch-title">
            <button className="welcome-close" onClick={() => setShowHatch(false)} aria-label="Close pet hatch"><X size={18} /></button>
            <div className="hatch-preview" style={{ backgroundColor: petDraft.color }}>
              {petDraft.imageUrl ? <img src={petDraft.imageUrl} alt="Custom pet preview" /> : <PawPrint size={34} />}
            </div>
            <div className="eyebrow">COMPANION HATCHERY</div>
            <h2 id="hatch-title">Hatch a little follower.</h2>
            <p>Name your companion, choose its shape, or add your own picture. Custom images stay on this device.</p>
            <div className="hatch-form">
              <label>
                <span>Name</span>
                <input value={petDraft.name} maxLength={18} onChange={(event) => setPetDraft((draft) => ({ ...draft, name: event.target.value }))} />
              </label>
              <label>
                <span>Creature</span>
                <select value={petDraft.species} onChange={(event) => setPetDraft((draft) => ({ ...draft, species: event.target.value }))}>
                  <option value="cat">Moss cat</option>
                  <option value="dog">Cloud dog</option>
                  <option value="bird">Berry bird</option>
                </select>
              </label>
              <label>
                <span>Colour</span>
                <input type="color" value={petDraft.color} onChange={(event) => setPetDraft((draft) => ({ ...draft, color: event.target.value }))} />
              </label>
              <label className="pet-upload">
                <span>Own picture</span>
                <strong><ImagePlus size={14} /> Choose image</strong>
                <input type="file" accept="image/*" onChange={handlePetImage} />
              </label>
            </div>
            <button className="hatch-submit" onClick={hatchPet}><Egg size={17} /> Hatch {petDraft.name.trim() || "my pet"}</button>
          </section>
        </div>
      )}

      {gameEnded && (
        <div className="welcome-backdrop">
          <section className="results-card" aria-labelledby="results-title">
            <div className="results-trophy"><Trophy size={24} /></div>
            <div className="eyebrow">MORNING COMPLETE</div>
            <h2 id="results-title">You made {movementTotal} movement{movementTotal === 1 ? "" : "s"}.</h2>
            <p>{order.served} of {CUSTOMERS.length} customers served. {pet ? `${pet.name} followed every step.` : 'Every order was a little movement ritual.'}</p>
            <div className="movement-results">
              {Object.entries(MOVEMENT_LABELS).map(([key, label]) => (
                <div key={key}><span>{label}</span><strong>{movementCounts[key]}</strong></div>
              ))}
            </div>
            <div className="coach-card">
              <div className="coach-heading"><Sparkles size={15} /><span>{coachDecision?.source === "openai" ? "ChatGPT movement decision" : "Movement coach"}</span></div>
              {coachLoading ? (
                <div className="coach-loading"><LoaderCircle className="spinner" size={16} /> Choosing your next move…</div>
              ) : coachDecision ? (
                <>
                  <strong>{coachDecision.headline}</strong>
                  <p>{coachDecision.encouragement}</p>
                  <div className="next-move">Next challenge <ChevronRight size={14} /> {coachDecision.nextMovement}</div>
                </>
              ) : null}
            </div>
            <div className="results-actions">
              <button className="hatch-submit" onClick={resetMorning}><RotateCcw size={16} /> Play another morning</button>
              <button className="secondary-result" onClick={() => { setGameEnded(false); setShowHatch(true); }}><PawPrint size={15} /> Change pet</button>
            </div>
            <small className="ai-disclosure">When enabled, movement coaching and speech may be AI-generated. Browser voice is used when OpenAI speech is unavailable.</small>
          </section>
        </div>
      )}

      {!showWelcome && sourceError && (
        <div className="error-banner" role="alert"><span>{sourceError}</span><button onClick={() => setSourceError("")} aria-label="Dismiss error"><X size={15} /></button></div>
      )}
    </main>
  );
}
