from __future__ import annotations

from collections import Counter, deque
import math
from typing import Deque, Sequence


UNKNOWN_GESTURE = "unknown"


def _distance(point_a: object, point_b: object) -> float:
    dx = float(point_a.x) - float(point_b.x)
    dy = float(point_a.y) - float(point_b.y)
    return math.hypot(dx, dy)


def classify_gesture(
    landmarks: Sequence[object],
    handedness: str,
):
    if len(landmarks) != 21:
        return UNKNOWN_GESTURE, 0.0

    palm_size = max(_distance(landmarks[0], landmarks[9]), 1e-6)
    pinch_ratio = _distance(landmarks[4], landmarks[8]) / palm_size

    index_up = landmarks[8].y < landmarks[6].y
    middle_up = landmarks[12].y < landmarks[10].y
    ring_up = landmarks[16].y < landmarks[14].y
    pinky_up = landmarks[20].y < landmarks[18].y

    if handedness.lower() == "right":
        thumb_open = landmarks[4].x < landmarks[3].x
    else:
        thumb_open = landmarks[4].x > landmarks[3].x

    extended_count = sum([index_up, middle_up, ring_up, pinky_up])

    if pinch_ratio < 0.35:
        confidence = max(0.0, min(1.0, 1.0 - (pinch_ratio / 0.35)))
        return "pinch", confidence

    if index_up and not middle_up and not ring_up and not pinky_up:
        confidence = 0.75 + (0.15 if not thumb_open else 0.0)
        return "point", min(confidence, 1.0)

    if extended_count == 4 and thumb_open:
        return "open_palm", 0.95

    if extended_count == 0 and not thumb_open:
        return "fist", 0.95

    if extended_count >= 3:
        return "open_palm", 0.55

    if extended_count == 0:
        return "fist", 0.55

    return UNKNOWN_GESTURE, 0.0


class GestureSmoother:
    def __init__(self, window_size: int = 5, min_votes: int = 3) -> None:
        self.min_votes = min_votes
        self.labels: Deque[str] = deque(maxlen=window_size)

    def update(self, label: str) -> str:
        self.labels.append(label)
        votes = Counter(item for item in self.labels if item != UNKNOWN_GESTURE)
        if not votes:
            return UNKNOWN_GESTURE

        label, count = votes.most_common(1)[0]
        if count < self.min_votes:
            return UNKNOWN_GESTURE
        return label


class GestureStateMachine:
    def __init__(self) -> None:
        self.previous_label = UNKNOWN_GESTURE

    def update(self, gesture: str) -> str:
        previous = self.previous_label
        self.previous_label = gesture
        return previous
