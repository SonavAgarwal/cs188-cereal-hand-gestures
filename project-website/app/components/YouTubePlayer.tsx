"use client";

import { useEffect, useRef } from "react";

type YouTubePlayerInstance = {
  destroy: () => void;
  getAvailablePlaybackRates?: () => number[];
  mute: () => void;
  playVideo: () => void;
  setPlaybackRate: (rate: number) => void;
};

type YouTubePlayerEvent = {
  target: YouTubePlayerInstance;
};

type YouTubeNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      events?: {
        onReady?: (event: YouTubePlayerEvent) => void;
      };
      playerVars?: Record<string, number | string>;
      videoId: string;
    },
  ) => YouTubePlayerInstance;
};

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YouTubeNamespace> | null = null;

function loadYouTubeApi() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API can only load in the browser."));
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (youtubeApiPromise) {
    return youtubeApiPromise;
  }

  youtubeApiPromise = new Promise((resolve) => {
    const previousReady = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      if (window.YT) {
        resolve(window.YT);
      }
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.body.appendChild(script);
    }
  });

  return youtubeApiPromise;
}

export default function YouTubePlayer({
  className = "",
  title,
  videoId,
}: {
  className?: string;
  title: string;
  videoId: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayerInstance | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadYouTubeApi().then((YT) => {
      if (cancelled || !containerRef.current) {
        return;
      }

      playerRef.current = new YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          loop: 1,
          mute: 1,
          modestbranding: 1,
          playsinline: 1,
          playlist: videoId,
          rel: 0,
        },
        events: {
          onReady: (event) => {
            event.target.mute();

            const rates = event.target.getAvailablePlaybackRates?.() ?? [];
            if (rates.includes(2)) {
              event.target.setPlaybackRate(2);
            }

            event.target.playVideo();
          },
        },
      });
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId]);

  return (
    <div className={`aspect-video w-full overflow-hidden rounded-[1.75rem] bg-gray-100 ${className}`}>
      <div
        ref={containerRef}
        aria-label={title}
        className="h-full w-full [&>iframe]:h-full [&>iframe]:w-full"
      />
    </div>
  );
}
