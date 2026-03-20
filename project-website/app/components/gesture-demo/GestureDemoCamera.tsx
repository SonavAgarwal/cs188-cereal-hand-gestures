"use client";

import type { RefObject } from "react";

type CameraPhase = "error" | "idle" | "loading" | "ready";

export default function GestureDemoCamera({
    cameraPhase,
    canvasRef,
    errorMessage,
    onStart,
    onStop,
    statusMessage,
    videoRef,
}: {
    cameraPhase: CameraPhase;
    canvasRef: RefObject<HTMLCanvasElement | null>;
    errorMessage: string | null;
    onStart: () => void;
    onStop: () => void;
    statusMessage: string;
    videoRef: RefObject<HTMLVideoElement | null>;
}) {
    const showPlaceholder = cameraPhase !== "ready";
    const helperText =
        cameraPhase === "loading" || errorMessage ? (errorMessage ?? statusMessage) : null;
    const footerText = errorMessage ?? statusMessage;
    const showFooter = cameraPhase === "ready" || Boolean(errorMessage);

    return (
        <div>
            <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.08)]">
                <div className="relative aspect-[4/3] bg-[radial-gradient(circle_at_top,_rgba(66,133,244,0.18),_rgba(255,255,255,0.96)_52%)]">
                    <video
                        className="absolute inset-0 h-full w-full object-cover"
                        muted
                        playsInline
                        ref={videoRef}
                        style={{
                            opacity: cameraPhase === "ready" ? 1 : 0,
                            transform: "scaleX(-1)",
                        }}
                    />
                    <canvas
                        className="absolute inset-0 h-full w-full"
                        ref={canvasRef}
                        style={{
                            opacity: cameraPhase === "ready" ? 1 : 0,
                            transform: "scaleX(-1)",
                        }}
                    />

                    {showPlaceholder && (
                        <div className="absolute inset-0">
                            <div
                                className="absolute inset-0 scale-105 bg-center bg-cover blur-xl"
                                style={{ backgroundImage: "url('/jason.jpeg')" }}
                            />

                            <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
                                <button
                                    className="rounded-full bg-gray-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed cursor-pointer"
                                    disabled={cameraPhase === "loading"}
                                    onClick={() => onStart()}
                                    type="button"
                                >
                                    {cameraPhase === "loading" ? "Starting..." : "Start Camera"}
                                </button>
                                {helperText ? <p className="mt-4 text-sm text-white">{helperText}</p> : null}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showFooter ? (
                <div className="mt-4 flex items-center justify-between gap-4 border-t border-gray-200 pt-4">
                    <p className="text-sm text-gray-600">{footerText}</p>
                    {cameraPhase === "ready" ? (
                        <button
                            className="rounded-full border border-gray-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
                            onClick={() => onStop()}
                            type="button"
                        >
                            Stop
                        </button>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
