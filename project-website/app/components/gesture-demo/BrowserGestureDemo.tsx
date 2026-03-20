"use client";
import {
    startTransition,
    useEffect,
    useEffectEvent,
    useRef,
    useState,
} from "react";
import GestureDemoCamera from "./GestureDemoCamera";
import GestureDemoVisualizer from "./GestureDemoVisualizer";
import {
    FilesetResolver as MediaPipeFilesetResolver,
    HandLandmarker as MediaPipeHandLandmarker,
} from "./mediapipe-runtime.js";
import {
    GestureSmoother,
    GestureStateMachine,
    HAND_CONNECTIONS,
    type DemoLetter,
    type DemoState,
    type GestureName,
    type LandmarkPoint,
    gestureToLetter,
    recognizeGesture,
} from "./recognizer";
import { GESTURE_TEMPLATES } from "./templates";

type CameraPhase = "error" | "idle" | "loading" | "ready";

type DemoUiState = {
    activeLetter: DemoLetter | null;
    handedness: string;
    pendingLetter: DemoLetter | null;
    rawConfidence: number;
    rawGesture: GestureName;
    state: DemoState;
};

type HandLandmarkerResult = {
    handednesses?: Array<Array<{ categoryName?: string }>>;
    landmarks?: LandmarkPoint[][];
};

type HandLandmarkerHandle = {
    close?: () => void;
    detectForVideo: (video: HTMLVideoElement, timestampMs: number) => HandLandmarkerResult;
};

const INITIAL_UI_STATE: DemoUiState = {
    activeLetter: null,
    handedness: "none",
    pendingLetter: null,
    rawConfidence: 0,
    rawGesture: "unknown",
    state: "idle",
};

const MODEL_PATH = "/models/hand_landmarker.task";
const VISION_WASM_URL = "/mediapipe";

function uiStateEquals(left: DemoUiState, right: DemoUiState) {
    return (
        left.activeLetter === right.activeLetter &&
        left.handedness === right.handedness &&
        left.pendingLetter === right.pendingLetter &&
        left.rawConfidence === right.rawConfidence &&
        left.rawGesture === right.rawGesture &&
        left.state === right.state
    );
}

function clearCanvas(canvas: HTMLCanvasElement | null) {
    if (!canvas) {
        return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
        return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
}

async function createHandLandmarker() {
    const fileset = await MediaPipeFilesetResolver.forVisionTasks(VISION_WASM_URL);

    for (const delegate of ["GPU", "CPU"] as const) {
        try {
            return await MediaPipeHandLandmarker.createFromOptions(fileset, {
                baseOptions: {
                    delegate,
                    modelAssetPath: MODEL_PATH,
                },
                minHandDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5,
                numHands: 1,
                runningMode: "VIDEO",
            });
        } catch (error) {
            if (delegate === "CPU") {
                throw error;
            }
        }
    }

    throw new Error("Unable to initialize the hand tracker.");
}

function prettyError(error: unknown) {
    if (error instanceof Error) {
        if (error.message.includes("Permission")) {
            return "Camera permission denied.";
        }

        return error.message;
    }

    return "The browser demo failed to start.";
}

function statusMessage({
    activeLetter,
    pendingLetter,
    state,
}: Pick<DemoUiState, "activeLetter" | "pendingLetter" | "state">) {
    if (state === "active" && activeLetter) {
        return `Confirmed ${activeLetter}`;
    }

    if (state === "pending" && pendingLetter) {
        return `Show a thumbs-up to confirm ${pendingLetter}`;
    }

    return "";
}

export default function BrowserGestureDemo() {
    const [cameraPhase, setCameraPhase] = useState<CameraPhase>("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [runtimeStatus, setRuntimeStatus] = useState("");
    const [uiState, setUiState] = useState(INITIAL_UI_STATE);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const handLandmarkerRef = useRef<HandLandmarkerHandle | null>(null);
    const lastVideoTimeRef = useRef(-1);
    const smootherRef = useRef(new GestureSmoother());
    const stateMachineRef = useRef(new GestureStateMachine());
    const stopDemoRef = useRef<() => void>(() => { });
    const streamRef = useRef<MediaStream | null>(null);

    const drawOverlay = useEffectEvent((landmarks: LandmarkPoint[]) => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) {
            return;
        }

        const width = video.videoWidth;
        const height = video.videoHeight;
        if (!width || !height) {
            return;
        }

        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        const context = canvas.getContext("2d");
        if (!context) {
            return;
        }

        context.clearRect(0, 0, width, height);
        if (!landmarks.length) {
            return;
        }

        context.lineWidth = 2;
        context.strokeStyle = "rgba(255,255,255,0.82)";
        context.fillStyle = "rgba(66,133,244,0.92)";

        for (const [start, end] of HAND_CONNECTIONS) {
            const from = landmarks[start];
            const to = landmarks[end];
            if (!from || !to) {
                continue;
            }

            context.beginPath();
            context.moveTo(from.x * width, from.y * height);
            context.lineTo(to.x * width, to.y * height);
            context.stroke();
        }

        for (const point of landmarks) {
            context.beginPath();
            context.arc(point.x * width, point.y * height, 4, 0, Math.PI * 2);
            context.fill();
        }
    });

    const applyDetection = useEffectEvent((result: HandLandmarkerResult) => {
        const landmarks = result.landmarks?.[0] ?? [];
        const handedness = result.handednesses?.[0]?.[0]?.categoryName ?? "unknown";
        drawOverlay(landmarks);

        let rawGesture: GestureName = "unknown";
        let rawConfidence = 0;

        if (landmarks.length === 21) {
            [rawGesture, rawConfidence] = recognizeGesture(landmarks, handedness, GESTURE_TEMPLATES);
        }

        const smoothedGesture = smootherRef.current.update(rawGesture);
        const machineState = stateMachineRef.current.update(smoothedGesture);
        const nextUiState: DemoUiState = {
            activeLetter: gestureToLetter(machineState.activeCommand),
            handedness,
            pendingLetter: gestureToLetter(machineState.pendingCommand),
            rawConfidence: Number(rawConfidence.toFixed(3)),
            rawGesture,
            state: machineState.state,
        };

        startTransition(() => {
            setUiState((previousState) =>
                uiStateEquals(previousState, nextUiState) ? previousState : nextUiState,
            );
        });
    });

    function stopDemo(
        nextPhase: CameraPhase = "idle",
        nextStatus = "",
    ) {
        if (animationFrameRef.current !== null) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        for (const track of streamRef.current?.getTracks() ?? []) {
            track.stop();
        }

        streamRef.current = null;
        handLandmarkerRef.current?.close?.();
        handLandmarkerRef.current = null;
        lastVideoTimeRef.current = -1;

        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.srcObject = null;
        }

        clearCanvas(canvasRef.current);
        smootherRef.current = new GestureSmoother();
        stateMachineRef.current = new GestureStateMachine();
        setUiState(INITIAL_UI_STATE);
        setCameraPhase(nextPhase);
        setRuntimeStatus(nextStatus);
    }

    stopDemoRef.current = stopDemo;

    const detectFrame = useEffectEvent(() => {
        const video = videoRef.current;
        const handLandmarker = handLandmarkerRef.current;

        if (
            !video ||
            !handLandmarker ||
            cameraPhase !== "ready" ||
            video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
        ) {
            animationFrameRef.current = requestAnimationFrame(detectFrame);
            return;
        }

        if (video.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = video.currentTime;
            applyDetection(handLandmarker.detectForVideo(video, performance.now()));
        }

        animationFrameRef.current = requestAnimationFrame(detectFrame);
    });

    useEffect(() => {
        if (cameraPhase !== "ready") {
            return;
        }

        animationFrameRef.current = requestAnimationFrame(detectFrame);
        return () => {
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [cameraPhase]);

    useEffect(() => {
        return () => {
            stopDemoRef.current();
        };
    }, []);

    async function startDemo() {
        if (cameraPhase === "loading") {
            return;
        }

        setCameraPhase("loading");
        setErrorMessage(null);
        setRuntimeStatus("Starting…");

        try {
            setRuntimeStatus("Starting…");
            handLandmarkerRef.current = await createHandLandmarker();

            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error("This browser does not support camera access.");
            }

            setRuntimeStatus("Waiting for permission…");
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    facingMode: "user",
                    height: { ideal: 720 },
                    width: { ideal: 960 },
                },
            });

            const video = videoRef.current;
            if (!video) {
                throw new Error("The video element was not ready.");
            }

            streamRef.current = stream;
            video.srcObject = stream;
            await video.play();

            smootherRef.current = new GestureSmoother();
            stateMachineRef.current = new GestureStateMachine();
            lastVideoTimeRef.current = -1;
            setRuntimeStatus("");
            setCameraPhase("ready");
        } catch (error) {
            stopDemo(
                "error",
                "Could not start camera.",
            );
            setErrorMessage(prettyError(error));
        }
    }

    return (
        <div className="grid gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-start">
            <GestureDemoCamera
                cameraPhase={cameraPhase}
                canvasRef={canvasRef}
                errorMessage={errorMessage}
                onStart={startDemo}
                onStop={stopDemo}
                statusMessage={cameraPhase === "ready" ? statusMessage(uiState) : runtimeStatus}
                videoRef={videoRef}
            />

      <GestureDemoVisualizer
        activeLetter={uiState.activeLetter}
        pendingLetter={uiState.pendingLetter}
        rawGesture={uiState.rawGesture}
      />
        </div>
    );
}
