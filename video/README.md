# Video Gesture Pipeline

Minimal Python pipeline:

`Webcam -> OpenCV -> MediaPipe hand landmarks -> saved-gesture matching -> smoothing -> JSONL`

## Setup

```bash
cd video
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
python3 main.py
```

The script writes `gesture_events.jsonl` in the `video/` folder and shows the current JSON event at the top of the webcam feed.

If you want to tweak anything, edit the constants at the top of `main.py`.

## Save a Gesture

Capture a named gesture template with a 3-second countdown:

```bash
python3 save_gesture.py thumbs_up
```

This saves:

- `gesture_images/thumbs_up.png`
- `gestures/thumbs_up.json`

The JSON stores the landmark points and a `relative_points` version centered on the hand and normalized for size.

`main.py` loads saved gesture templates from `gestures/*.json` and matches the current hand against them.

## Output

```json
{"frame":42,"timestamp":1712345678.123,"gesture":"pinch","raw_gesture":"pinch","previous_gesture":"unknown","handedness":"Right","confidence":0.88}
```
