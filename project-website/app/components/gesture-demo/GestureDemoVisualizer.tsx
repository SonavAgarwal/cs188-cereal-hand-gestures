"use client";

import Image from "next/image";
import type { DemoLetter, GestureName } from "./recognizer";
import { gestureToLetter } from "./recognizer";

const SIGNS: Array<{
    imageSrc: string;
    letter: DemoLetter;
}> = [
        { imageSrc: "/sign_a.png", letter: "A" },
        { imageSrc: "/sign_b.png", letter: "B" },
        { imageSrc: "/sign_c.png", letter: "C" },
        { imageSrc: "/sign_d.png", letter: "D" },
    ];

export default function GestureDemoVisualizer({
    activeLetter,
    pendingLetter,
    rawGesture,
}: {
    activeLetter: DemoLetter | null;
    pendingLetter: DemoLetter | null;
    rawGesture: GestureName;
}) {
    const detectedLetter = gestureToLetter(rawGesture);

    return (
        <div className="flex flex-col gap-4">
            {SIGNS.map((item) => {
                const isPending = pendingLetter === item.letter;
                const isActive = activeLetter === item.letter;
                const isDetected = detectedLetter === item.letter;

                return (
                    <div
                        className="rounded-[1.5rem] border p-2 pr-4 transition"
                        key={item.letter}
                        style={{
                            backgroundColor: isActive
                                ? "#f0fdf4"
                                : isPending
                                    ? "#fffbeb"
                                    : isDetected
                                        ? "#f8fafc"
                                        : "white",
                            borderColor: isActive ? "#34A853" : isPending ? "#FBBC05" : "#e5e7eb",
                            boxShadow: isActive
                                ? "0 0 0 3px rgba(52, 168, 83, 0.18)"
                                : isPending
                                    ? "0 0 0 3px rgba(251, 188, 5, 0.2)"
                                    : "none",
                        }}
                    >
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="relative h-20 w-20 overflow-hidden rounded-sm">
                                    <Image
                                        alt={`ASL ${item.letter}`}
                                        className="object-cover"
                                        fill
                                        sizes="80px"
                                        src={item.imageSrc}
                                    />
                                </div>
                                <div>
                                    <p className="text-3xl font-semibold leading-none text-gray-950">
                                        {item.letter}
                                    </p>
                                </div>
                            </div>
                            {(isActive || isPending) &&
                                <div
                                    className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                                    style={{
                                        backgroundColor: isActive ? "#dcfce7" : isPending ? "#fef3c7" : "#f3f4f6",
                                        color: isActive ? "#166534" : isPending ? "#92400e" : "#4b5563",
                                    }}
                                >
                                    {isActive ? "Confirmed" : isPending ? "Waiting" : "Idle"}
                                </div>
                            }
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
