# Video Gesture Pipeline

Minimal Python pipeline:

`Webcam -> OpenCV -> MediaPipe hand landmarks -> simple gesture label -> smoothing -> JSONL`

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

## Output

```json
{"frame":42,"timestamp":1712345678.123,"gesture":"pinch","raw_gesture":"pinch","previous_gesture":"unknown","handedness":"Right","confidence":0.88}
```
