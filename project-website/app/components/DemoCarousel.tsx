"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import YouTubePlayer from "./YouTubePlayer";

type DemoItem = {
  description: string;
  title: string;
  videoId: string;
};

type Direction = 1 | -1;
type CardSlot =
  | "left"
  | "center"
  | "right"
  | "enterLeft"
  | "enterRight"
  | "exitLeft"
  | "exitRight";

type TransitionState = {
  direction: Direction;
  previousActiveIndex: number;
} | null;

type DesktopCard = {
  index: number;
  initialSlot?: CardSlot;
  item: DemoItem;
  slot: CardSlot;
};

const swipeThreshold = 80;
const ease = [0.22, 1, 0.36, 1] as const;

function mod(index: number, length: number) {
  return (index + length) % length;
}

function outerSlotMotion(slot: CardSlot) {
  switch (slot) {
    case "left":
    case "enterLeft":
    case "exitLeft":
      return {
        left: "0%",
        width: "18%",
        zIndex: 10,
      };
    case "center":
      return {
        left: "22%",
        width: "56%",
        zIndex: 20,
      };
    case "right":
    case "enterRight":
    case "exitRight":
      return {
        left: "82%",
        width: "18%",
        zIndex: 10,
      };
  }
}

function innerSlotMotion(slot: CardSlot) {
  switch (slot) {
    case "center":
      return {
        filter: "grayscale(0)",
        opacity: 1,
        scale: 1,
      };
    case "left":
    case "right":
      return {
        filter: "grayscale(1)",
        opacity: 0.68,
        scale: 0.88,
      };
    case "enterLeft":
    case "enterRight":
      return {
        filter: "grayscale(1)",
        opacity: 0,
        scale: 0,
      };
    case "exitLeft":
    case "exitRight":
      return {
        filter: "grayscale(1)",
        opacity: 0,
        scale: 0,
      };
  }
}

function slotDirection(slot: CardSlot): Direction {
  return slot === "left" ? -1 : 1;
}

function DemoFrame({
  index,
  initialSlot,
  isMobile = false,
  item,
  onSelect,
  onSwipe,
  slot,
}: {
  index: number;
  initialSlot?: CardSlot;
  isMobile?: boolean;
  item: DemoItem;
  onSelect: (index: number, direction: Direction) => void;
  onSwipe: (direction: Direction) => void;
  slot: CardSlot;
}) {
  const isCenter = slot === "center";
  const isSelectableSide = slot === "left" || slot === "right";

  if (isMobile) {
    return (
      <div className="relative aspect-video overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.1)]">
        <YouTubePlayer className="rounded-none" title={item.title} videoId={item.videoId} />
        <motion.div
          className="absolute inset-0 z-20 cursor-grab active:cursor-grabbing"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.08}
          onDragEnd={(_, info) => {
            const swipe = info.offset.x + info.velocity.x * 0.2;

            if (swipe <= -swipeThreshold) {
              onSwipe(1);
            } else if (swipe >= swipeThreshold) {
              onSwipe(-1);
            }
          }}
        />
      </div>
    );
  }

  return (
    <motion.div
      animate={outerSlotMotion(slot)}
      className="absolute top-1/2"
      initial={initialSlot ? outerSlotMotion(initialSlot) : false}
      style={{ y: "-50%" }}
      transition={{ duration: 0.55, ease }}
    >
      <motion.div
        animate={innerSlotMotion(slot)}
        className="relative overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.1)]"
        initial={initialSlot ? innerSlotMotion(initialSlot) : false}
        transition={{ duration: 0.55, ease }}
      >
        <div className="relative aspect-video">
          <Image
            alt=""
            fill
            className="object-cover"
            sizes={slot === "center" ? "56vw" : "18vw"}
            src={`https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`}
          />
          <motion.div
            animate={{ opacity: isCenter ? 0.08 : 0.3 }}
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(17,24,39,0.38))]"
            transition={{ duration: 0.35, ease: "easeOut" }}
          />

          <AnimatePresence initial={false}>
            {isCenter && (
              <motion.div
                key={item.videoId}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 z-10"
                exit={{ opacity: 0, scale: 0.985 }}
                initial={{ opacity: 0, scale: 0.985 }}
                transition={{ duration: 0.35, ease }}
              >
                <YouTubePlayer
                  className="rounded-none"
                  title={item.title}
                  videoId={item.videoId}
                />
                <motion.div
                  className="absolute inset-0 z-20 cursor-grab active:cursor-grabbing"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.08}
                  onDragEnd={(_, info) => {
                    const swipe = info.offset.x + info.velocity.x * 0.2;

                    if (swipe <= -swipeThreshold) {
                      onSwipe(1);
                    } else if (swipe >= swipeThreshold) {
                      onSwipe(-1);
                    }
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {isSelectableSide && (
            <button
              aria-label={`Show ${item.title}`}
              className="absolute inset-0 z-20"
              onClick={() => onSelect(index, slotDirection(slot))}
              type="button"
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function DemoCarousel({ items }: { items: DemoItem[] }) {
  const [activeState, setActiveState] = useState<[number, Direction]>([0, 1]);
  const activeIndex = activeState[0];
  const [transitionState, setTransitionState] = useState<TransitionState>(null);
  const activeItem = items[activeIndex];

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (transitionState) {
        return;
      }

      const nextIndexValue = mod(activeIndex + 1, items.length);
      setTransitionState({
        direction: 1,
        previousActiveIndex: activeIndex,
      });
      setActiveState([nextIndexValue, 1]);
    }, 40000);

    return () => window.clearTimeout(timeoutId);
  }, [activeIndex, items.length, transitionState]);

  useEffect(() => {
    if (!transitionState) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setTransitionState(null);
    }, 560);

    return () => window.clearTimeout(timeoutId);
  }, [transitionState]);

  function goToIndex(nextIndexValue: number, nextDirection: Direction) {
    if (nextIndexValue === activeIndex || transitionState) {
      return;
    }

    setTransitionState({
      direction: nextDirection,
      previousActiveIndex: activeIndex,
    });
    setActiveState([nextIndexValue, nextDirection]);
  }

  function paginate(nextDirection: Direction) {
    if (transitionState) {
      return;
    }

    const nextIndexValue = mod(activeIndex + nextDirection, items.length);
    setTransitionState({
      direction: nextDirection,
      previousActiveIndex: activeIndex,
    });
    setActiveState([nextIndexValue, nextDirection]);
  }

  const desktopCards: DesktopCard[] = (() => {
    if (!transitionState) {
      const previousIndex = mod(activeIndex - 1, items.length);
      const nextIndex = mod(activeIndex + 1, items.length);

      return [
        { index: previousIndex, item: items[previousIndex], slot: "left" },
        { index: activeIndex, item: activeItem, slot: "center" },
        { index: nextIndex, item: items[nextIndex], slot: "right" },
      ];
    }

    if (transitionState.direction === 1) {
      const exitingLeftIndex = mod(transitionState.previousActiveIndex - 1, items.length);
      const enteringRightIndex = mod(activeIndex + 1, items.length);

      return [
        { index: exitingLeftIndex, item: items[exitingLeftIndex], slot: "exitLeft" },
        { index: transitionState.previousActiveIndex, item: items[transitionState.previousActiveIndex], slot: "left" },
        { index: activeIndex, item: activeItem, slot: "center" },
        {
          index: enteringRightIndex,
          initialSlot: "enterRight",
          item: items[enteringRightIndex],
          slot: "right",
        },
      ];
    }

    const enteringLeftIndex = mod(activeIndex - 1, items.length);
    const exitingRightIndex = mod(transitionState.previousActiveIndex + 1, items.length);

    return [
      {
        index: enteringLeftIndex,
        initialSlot: "enterLeft",
        item: items[enteringLeftIndex],
        slot: "left",
      },
      { index: activeIndex, item: activeItem, slot: "center" },
      { index: transitionState.previousActiveIndex, item: items[transitionState.previousActiveIndex], slot: "right" },
      { index: exitingRightIndex, item: items[exitingRightIndex], slot: "exitRight" },
    ];
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium tracking-[0.18em] text-gray-400">
          {String(activeIndex + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
        </p>
        <div className="flex items-center gap-2">
          <button
            aria-label="Show previous demo"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-lg text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
            onClick={() => paginate(-1)}
            type="button"
          >
            <span aria-hidden="true">←</span>
          </button>
          <button
            aria-label="Show next demo"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-lg text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
            onClick={() => paginate(1)}
            type="button"
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <div className="relative hidden h-[18rem] md:block lg:h-[24rem]">
        {desktopCards.map(({ index, initialSlot, item, slot }) => (
          <DemoFrame
            key={`${item.videoId}-${slot}`}
            index={index}
            initialSlot={initialSlot}
            item={item}
            onSelect={goToIndex}
            onSwipe={paginate}
            slot={slot}
          />
        ))}
      </div>

      <div className="md:hidden">
        <DemoFrame
          index={activeIndex}
          isMobile
          item={activeItem}
          onSelect={goToIndex}
          onSwipe={paginate}
          slot="center"
        />
      </div>

      <div className="relative min-h-[7.5rem]">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={`${activeItem.videoId}-copy`}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2 text-center"
            exit={{ opacity: 0, y: -10 }}
            initial={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.28, ease }}
          >
            <h3 className="text-2xl font-semibold text-gray-900">{activeItem.title}</h3>
            <p className="mx-auto max-w-2xl text-base leading-8 text-gray-600">
              {activeItem.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-2">
        {items.map((item, index) => (
          <button
            key={item.videoId}
            aria-label={`Show demo ${index + 1}`}
            aria-pressed={index === activeIndex}
            className={`h-2.5 rounded-full transition ${
              index === activeIndex
                ? "w-8 bg-gray-900"
                : "w-2.5 bg-gray-300 hover:bg-gray-400"
            }`}
            onClick={() => goToIndex(index, index > activeIndex ? 1 : -1)}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}
