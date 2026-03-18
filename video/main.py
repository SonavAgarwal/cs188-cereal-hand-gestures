from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import time
import textwrap

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

from gesture_recognizer import load_gesture_templates, recognize_gesture
from gesture_pipeline import (
    GestureSmoother,
    GestureStateMachine,
    UNKNOWN_GESTURE,
)
from tcp import ConnectionManager


DEFAULT_CAMERA_INDEX = 0
MAX_CAMERA_INDEX_TO_SCAN = 4
OUTPUT_PATH = "gesture_events.jsonl"
# TCP config: set TCP_IP to None to disable network streaming
TCP_IP = "127.0.0.1"  # Use "0.0.0.0" for server to accept any interface
TCP_PORT = 5000
TCP_MODE = "server"   # "server" = wait for clients to connect; "client" = connect to a server
MODEL_PATH = Path(__file__).with_name("hand_landmarker.task")
WINDOW_SIZE = 5
MIN_VOTES = 3
MIN_DETECTION_CONFIDENCE = 0.5
MIN_TRACKING_CONFIDENCE = 0.5


HAND_CONNECTIONS = [
    (connection.start, connection.end)
    for connection in HandLandmarksConnections.HAND_CONNECTIONS
]


STATE_COLORS = {
    "idle": (180, 180, 180),      # gray
    "pending": (0, 200, 255),     # orange/yellow
    "active": (0, 255, 100),      # green
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--camera-index",
        type=int,
        default=int(os.environ.get("GESTURE_CAMERA_INDEX", DEFAULT_CAMERA_INDEX)),
        help=(
            "Preferred camera index to open. "
            "Can also be set via GESTURE_CAMERA_INDEX."
        ),
    )
    return parser.parse_args()


def open_camera(preferred_index: int) -> tuple[cv2.VideoCapture, int]:
    candidate_indexes = [preferred_index]
    candidate_indexes.extend(
        index
        for index in range(MAX_CAMERA_INDEX_TO_SCAN + 1)
        if index != preferred_index
    )

    for camera_index in candidate_indexes:
        cap = cv2.VideoCapture(camera_index)
        if cap.isOpened():
            return cap, camera_index
        cap.release()

    tried = ", ".join(str(index) for index in candidate_indexes)
    raise RuntimeError(
        "Unable to open any camera. "
        f"Tried indexes: {tried}. "
        "Pass --camera-index N or set GESTURE_CAMERA_INDEX."
    )


def draw_overlay(frame, state_info: dict, event_json: str) -> None:
    state = state_info.get("state", "idle")
    active = state_info.get("active_command")
    pending = state_info.get("pending_command")
    color = STATE_COLORS.get(state, (255, 255, 255))

    if state == "idle":
        status_text = "Waiting for gesture..."
    elif state == "pending":
        status_text = f"Detected: {pending} -- show thumbs up to confirm"
    elif state == "active":
        status_text = f"Active command: {active}"
        if pending:
            status_text += f"  |  Pending: {pending}"
    else:
        status_text = state

    # Status banner
    cv2.rectangle(frame, (0, 0), (frame.shape[1], 36), (24, 24, 24), -1)
    cv2.putText(frame, status_text, (12, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.65, color, 2)

    # JSON detail below
    wrapped_lines = textwrap.wrap(event_json, width=72)[:2]
    y_offset = 40
    for line in wrapped_lines:
        cv2.putText(frame, line, (12, y_offset + 16), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (200, 200, 200), 1)
        y_offset += 18


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
    args = parse_args()

    if not MODEL_PATH.exists():
        raise RuntimeError(f"Missing model asset: {MODEL_PATH}")

    cap, camera_index = open_camera(args.camera_index)
    if camera_index != args.camera_index:
        print(
            f"Preferred camera index {args.camera_index} unavailable; "
            f"using camera index {camera_index}."
        )

    hand_landmarker = HandLandmarker.create_from_options(
        HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=str(MODEL_PATH)),
            running_mode=VisionTaskRunningMode.VIDEO,
            num_hands=1,
            min_hand_detection_confidence=MIN_DETECTION_CONFIDENCE,
            min_tracking_confidence=MIN_TRACKING_CONFIDENCE,
        )
    )

    templates = load_gesture_templates()
    smoother = GestureSmoother(window_size=WINDOW_SIZE, min_votes=MIN_VOTES)
    state_machine = GestureStateMachine()
    frame_index = 0

    # Optional TCP connection for streaming gesture events over the network
    tcp = None
    if TCP_IP is not None and TCP_PORT is not None:
        tcp = ConnectionManager(ip=TCP_IP, port=TCP_PORT, mode=TCP_MODE)
        if TCP_MODE == "server":
            print(f"TCP server ready on {TCP_IP}:{TCP_PORT}")
        else:
            print(f"TCP client connecting to {TCP_IP}:{TCP_PORT}")

    try:
        with open(OUTPUT_PATH, "w", encoding="utf-8", buffering=1) as output_file:
            while True:
                ok, frame = cap.read()
                if not ok:
                    raise RuntimeError("Unable to read a frame from the webcam")

                frame = cv2.flip(frame, 1)
                timestamp = time.time()
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                image = Image(image_format=ImageFormat.SRGB, data=rgb)
                results = hand_landmarker.detect_for_video(
                    image,
                    int(timestamp * 1000),
                )

                raw_gesture = UNKNOWN_GESTURE
                raw_confidence = 0.0
                handedness = "none"

                if results.hand_landmarks and results.handedness:
                    landmarks = results.hand_landmarks[0]
                    handedness = results.handedness[0][0].category_name or "unknown"
                    raw_gesture, raw_confidence = recognize_gesture(
                        landmarks,
                        handedness,
                        templates,
                    )
                    draw_hand_landmarks(frame, landmarks)

                smoothed_gesture = smoother.update(raw_gesture)
                state_info = state_machine.update(smoothed_gesture)
                emitted_gesture = state_info["active_command"] or UNKNOWN_GESTURE
                event = {
                    "frame": frame_index,
                    "timestamp": round(timestamp, 3),
                    "gesture": emitted_gesture,
                    "smoothed_gesture": smoothed_gesture,
                    "raw_gesture": raw_gesture,
                    "state": state_info["state"],
                    "active_command": state_info["active_command"],
                    "pending_command": state_info["pending_command"],
                    "handedness": handedness,
                    "confidence": round(raw_confidence, 3),
                }
                event_json = json.dumps(event)
                output_file.write(event_json + "\n")
                # Stream gesture events over TCP if connected
                if tcp is not None:
                    tcp.sendall(tcp.encode_str(event_json))
                draw_overlay(frame, state_info, event_json)
                cv2.imshow("gesture-events", frame)
                key = cv2.waitKey(1) & 0xFF
                if key in (27, ord("q")):
                    break

                frame_index += 1
    finally:
        hand_landmarker.close()
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
