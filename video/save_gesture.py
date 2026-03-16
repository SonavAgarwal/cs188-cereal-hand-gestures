from __future__ import annotations

import sys
from pathlib import Path
import time

import cv2
from mediapipe.tasks.python.core.base_options import BaseOptions
from mediapipe.tasks.python.vision.core.image import Image, ImageFormat
from mediapipe.tasks.python.vision.core.vision_task_running_mode import (
    VisionTaskRunningMode,
)
from mediapipe.tasks.python.vision.hand_landmarker import (
    HandLandmarker,
    HandLandmarkerOptions,
    HandLandmarksConnections,
)

from gesture_recognizer import GESTURE_IMAGES_DIR, save_gesture_template


CAMERA_INDEX = 0
MODEL_PATH = Path(__file__).with_name("hand_landmarker.task")
COUNTDOWN_SECONDS = 3

HAND_CONNECTIONS = [
    (connection.start, connection.end)
    for connection in HandLandmarksConnections.HAND_CONNECTIONS
]


def draw_hand_landmarks(frame, landmarks) -> None:
    height, width = frame.shape[:2]
    points = [
        (int(landmark.x * width), int(landmark.y * height))
        for landmark in landmarks
    ]

    for start, end in HAND_CONNECTIONS:
        cv2.line(frame, points[start], points[end], (80, 255, 80), 2)

    for point in points:
        cv2.circle(frame, point, 3, (255, 255, 255), -1)


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: python3 save_gesture.py <gesture_name>")

    gesture_name = sys.argv[1].strip()
    if not gesture_name:
        raise SystemExit("gesture_name must not be empty")

    if not MODEL_PATH.exists():
        raise RuntimeError(f"Missing model asset: {MODEL_PATH}")

    cap = cv2.VideoCapture(CAMERA_INDEX)
    if not cap.isOpened():
        raise RuntimeError(f"Unable to open camera index {CAMERA_INDEX}")

    hand_landmarker = HandLandmarker.create_from_options(
        HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=str(MODEL_PATH)),
            running_mode=VisionTaskRunningMode.VIDEO,
            num_hands=1,
        )
    )

    countdown_start = time.time()

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                raise RuntimeError("Unable to read a frame from the webcam")

            frame = cv2.flip(frame, 1)
            timestamp = time.time()
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            image = Image(image_format=ImageFormat.SRGB, data=rgb)
            results = hand_landmarker.detect_for_video(image, int(timestamp * 1000))

            seconds_left = COUNTDOWN_SECONDS - int(timestamp - countdown_start)
            seconds_left = max(seconds_left, 0)

            landmarks = None
            handedness = "unknown"
            if results.hand_landmarks and results.handedness:
                landmarks = results.hand_landmarks[0]
                handedness = results.handedness[0][0].category_name or "unknown"
                draw_hand_landmarks(frame, landmarks)

            cv2.putText(
                frame,
                f"capture {gesture_name} in {seconds_left}",
                (16, 32),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (255, 255, 255),
                2,
            )
            cv2.putText(
                frame,
                "hold still. q to quit",
                (16, 62),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (200, 200, 200),
                2,
            )
            cv2.imshow("save-gesture", frame)

            if timestamp - countdown_start >= COUNTDOWN_SECONDS:
                if landmarks is not None:
                    GESTURE_IMAGES_DIR.mkdir(exist_ok=True)
                    image_path = GESTURE_IMAGES_DIR / f"{gesture_name}.png"
                    cv2.imwrite(str(image_path), frame)
                    gesture_path = save_gesture_template(
                        gesture_name,
                        handedness,
                        landmarks,
                        image_path,
                    )
                    print(f"saved {gesture_name} -> {gesture_path}")
                    break
                countdown_start = time.time()

            key = cv2.waitKey(1) & 0xFF
            if key in (27, ord("q")):
                break
    finally:
        hand_landmarker.close()
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
