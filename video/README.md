# Video Gesture Pipeline

Minimal Python pipeline:

`Webcam -> OpenCV -> MediaPipe hand landmarks -> saved-gesture matching -> smoothing -> JSONL`

## Ensure you are running a Python version >= 3.13

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


## TCP Streaming

Gesture events can be streamed over TCP in addition to the JSON file. Configure at the top of `main.py`:

| Constant   | Description                                                                 |
| ---------- | --------------------------------------------------------------------------- |
| `TCP_IP`   | Server: `"0.0.0.0"` (accept any) or `"127.0.0.1"` (local only). Client: server IP. Set to `None` to disable TCP. |
| `TCP_PORT` | Port number (e.g. `5000`).                                                 |
| `TCP_MODE` | `"server"` = wait for clients to connect; `"client"` = connect to a server. |

By default, `main.py` starts a localhost TCP server on `127.0.0.1:5000`. Set `TCP_IP = None` if you want to disable streaming entirely.

**Server mode** (default): Run `main.py` first; it listens for connections. Other apps can connect at any time while the camera loop is running.

**Client mode**: Run `main.py`; it connects to an existing server at `TCP_IP:TCP_PORT`.

### Testing the TCP Connection

**Option 1: Python test client**

A test script is included. Run `main.py` in one terminal, then in another:

```bash
python3 test_tcp_client.py
```

You should see gesture events printed as you move your hand in front of the camera.

**Option 2: Quick check with netcat**

```bash
# Terminal 1: run main.py (server mode, port 5000)
python3 main.py

# Terminal 2: connect and watch raw bytes (you'll see length-prefixed JSON)
nc 127.0.0.1 5000
```

You'll see binary data (4-byte length + JSON payload). Use the Python client above for readable output.

### Recieving on the other side:

Here's an example client that receives gesture events from `main.py`:
```python
from tcp import ConnectionManager
import json

conn = ConnectionManager(ip="127.0.0.1", port=5000, mode="client")
while True:
    conn.recv()
    for msg in conn.parse_buffer(msg_type='string'):
        event = json.loads(msg)
        print(event["gesture"], event["confidence"])
```


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
{"frame":42,"timestamp":1712345678.123,"gesture":"unknown","smoothed_gesture":"sign_b","raw_gesture":"sign_b","state":"pending","active_command":null,"pending_command":"sign_b","handedness":"Right","confidence":0.88}
```
