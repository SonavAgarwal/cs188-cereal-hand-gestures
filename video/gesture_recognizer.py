from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Sequence


GESTURES_DIR = Path(__file__).with_name("gestures")
GESTURE_IMAGES_DIR = Path(__file__).with_name("gesture_images")
MATCH_THRESHOLD = 0.35


def landmarks_to_points(landmarks: Sequence[object]) -> list[list[float]]:
    return [[float(landmark.x), float(landmark.y)] for landmark in landmarks]


def normalize_points(points: Sequence[Sequence[float]]) -> list[list[float]]:
    if not points:
        return []

    center_x = sum(point[0] for point in points) / len(points)
    center_y = sum(point[1] for point in points) / len(points)
    centered = [[point[0] - center_x, point[1] - center_y] for point in points]
    scale = max(math.hypot(point[0], point[1]) for point in centered)
    scale = max(scale, 1e-6)
    return [[point[0] / scale, point[1] / scale] for point in centered]


def save_gesture_template(
    name: str,
    handedness: str,
    landmarks: Sequence[object],
    image_path: Path,
) -> Path:
    GESTURES_DIR.mkdir(exist_ok=True)
    points = landmarks_to_points(landmarks)
    relative_points = normalize_points(points)
    payload = {
        "name": name,
        "handedness": handedness,
        "image_path": image_path.name,
        "points": points,
        "relative_points": relative_points,
    }
    payload["normalized_points"] = relative_points

    gesture_path = GESTURES_DIR / f"{name}.json"
    gesture_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return gesture_path


def load_gesture_templates() -> list[dict]:
    if not GESTURES_DIR.exists():
        return []

    templates = []
    for path in sorted(GESTURES_DIR.glob("*.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        if "relative_points" in payload:
            payload["normalized_points"] = payload["relative_points"]
        elif "normalized_points" not in payload and "points" in payload:
            payload["normalized_points"] = normalize_points(payload["points"])
        payload["path"] = str(path)
        templates.append(payload)
    return templates


def _distance(points_a: Sequence[Sequence[float]], points_b: Sequence[Sequence[float]]) -> float:
    point_distance = 0.0
    center_distance = 0.0

    for point_a, point_b in zip(points_a, points_b):
        dx = point_a[0] - point_b[0]
        dy = point_a[1] - point_b[1]
        point_distance += math.hypot(dx, dy)

        radius_a = math.hypot(point_a[0], point_a[1])
        radius_b = math.hypot(point_b[0], point_b[1])
        center_distance += abs(radius_a - radius_b)

    point_distance /= len(points_a)
    center_distance /= len(points_a)
    return (0.7 * point_distance) + (0.3 * center_distance)


def _mirrored(points: Sequence[Sequence[float]]) -> list[list[float]]:
    return [[-point[0], point[1]] for point in points]


def recognize_gesture(
    landmarks: Sequence[object],
    handedness: str,
    templates: Sequence[dict],
) -> tuple[str, float]:
    if len(landmarks) != 21 or not templates:
        return "unknown", 0.0

    points = landmarks_to_points(landmarks)
    normalized_points = normalize_points(points)

    best_name = "unknown"
    best_distance = float("inf")

    for template in templates:
        template_points = template.get("normalized_points")
        if not template_points or len(template_points) != len(normalized_points):
            continue

        distance = _distance(normalized_points, template_points)
        if template.get("handedness") and template["handedness"] != handedness:
            mirrored_distance = _distance(_mirrored(normalized_points), template_points)
            distance = min(distance + 0.05, mirrored_distance)

        if distance < best_distance:
            best_distance = distance
            best_name = template.get("name", "unknown")

    if best_distance > MATCH_THRESHOLD:
        return "unknown", 0.0

    confidence = max(0.0, 1.0 - (best_distance / MATCH_THRESHOLD))
    return best_name, confidence
