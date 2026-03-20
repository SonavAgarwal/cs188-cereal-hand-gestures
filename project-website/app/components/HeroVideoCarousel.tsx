"use client";

import { useState } from "react";
import YouTubePlayer from "./YouTubePlayer";

type Slide =
  | {
      caption: string;
      provider: "youtube";
      title: string;
      videoId: string;
    }
  | {
      caption: string;
      driveFileId: string;
      provider: "drive";
      title: string;
    };

function GoogleDrivePlayer({
  fileId,
  title,
}: {
  fileId: string;
  title: string;
}) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-[1.75rem] bg-gray-100">
      <iframe
        allow="autoplay; fullscreen"
        className="h-full w-full border-0"
        src={`https://drive.google.com/file/d/${fileId}/preview`}
        title={title}
      />
    </div>
  );
}

export default function HeroVideoCarousel({ slides }: { slides: Slide[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlide = slides[activeIndex];

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-[2.25rem] border border-gray-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        {activeSlide.provider === "youtube" ? (
          <YouTubePlayer
            className="rounded-none"
            title={activeSlide.title}
            videoId={activeSlide.videoId}
          />
        ) : (
          <GoogleDrivePlayer fileId={activeSlide.driveFileId} title={activeSlide.title} />
        )}
      </div>

      <div className="space-y-1 px-1">
        <p className="text-sm font-semibold text-gray-900">{activeSlide.title}</p>
        <p className="text-sm text-gray-500">{activeSlide.caption}</p>
      </div>

      <div className="flex items-center justify-center gap-2">
        {slides.map((slide, index) => (
          <button
            key={slide.title}
            aria-label={`Show hero video ${index + 1}`}
            aria-pressed={index === activeIndex}
            className={`h-2.5 rounded-full transition ${
              index === activeIndex
                ? "w-8 bg-gray-900"
                : "w-2.5 bg-gray-300 hover:bg-gray-400"
            }`}
            onClick={() => setActiveIndex(index)}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}
