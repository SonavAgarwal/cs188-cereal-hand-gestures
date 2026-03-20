# CS188 Final Project — Cereal Hand Gestures

This folder contains the CS188 final project. The main repo lives in `cs188-cereal-hand-gestures/`, which is split into two independent sub-projects: `video/` and `project-website/`.

---

## Folder Structure

```
final project/
├── cs188-cereal-hand-gestures/   # Main git repo (cloned from GitHub)
│   ├── video/                    # Python gesture recognition pipeline
│   └── project-website/          # Next.js frontend / demo site
├── cs188-cereal-hand-gestures-corrupted-backup/  # Backup copy (ignore)
└── cv.py                         # Scratch / experimental script
```

---

## `video/` — Python Gesture Recognition Pipeline

**What it does:** Captures webcam frames, detects hand landmarks using MediaPipe, matches them against saved gesture templates, and emits gesture events.

**Stack:** Python, OpenCV, MediaPipe

**Data flow:**
```
Webcam → OpenCV → MediaPipe hand landmarks → gesture matching → smoothing → JSONL file + TCP stream
```

Key files:
| File | Purpose |
|---|---|
| `main.py` | Entry point; runs the camera loop and wires everything together |
| `gesture_pipeline.py` | Smoothing and state machine logic (pending → active) |
| `gesture_recognizer.py` | Matches live landmarks against saved gesture templates |
| `save_gesture.py` | Utility to capture and save a new gesture template |
| `tcp.py` | TCP connection manager for streaming gesture events to other apps |
| `gestures/*.json` | Saved gesture landmark templates |
| `gesture_events.jsonl` | Output file written at runtime |

**To run:**
```bash
cd cs188-cereal-hand-gestures/video
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python3 main.py
```

---

## `project-website/` — Next.js Demo Site

**What it does:** A web frontend that visualizes or demonstrates the gesture recognition system.

**Stack:** Next.js (TypeScript), Tailwind CSS

**To run:**
```bash
cd cs188-cereal-hand-gestures/project-website
pnpm install
pnpm dev
# Open http://localhost:3000
```

---

## How the Two Halves Connect

The Python `video/` pipeline streams gesture events over TCP (default: `127.0.0.1:5000`). The `project-website/` frontend can connect to this stream to display live gesture data in the browser. Run `main.py` first to start the TCP server, then start the Next.js dev server.
