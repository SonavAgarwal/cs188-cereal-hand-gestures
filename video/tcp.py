import socket

# Length of the message-size header in bytes (little-endian uint32)
LENGTH_LENGTH = 4


def _require_numpy():
    try:
        import numpy as np
    except ModuleNotFoundError as exc:
        raise ModuleNotFoundError(
            "NumPy is required for array TCP messages."
        ) from exc
    return np


class ConnectionManager:
    """Manager for a single TCP connection. Supports both server and client modes."""

    def __init__(self, ip=None, port=None, mode='server', shape=None):
        self.ip = ip
        self.port = port
        self.mode = mode  # 'server' or 'client'
        self.buffer = b''
        self.msg_len = None
        self.addr = None
        # Shape for array messages; use (-1,) to infer. Ignored for string messages.
        self.shape = shape if shape is not None else (-1,)

        if self.mode == 'server':
            self.server = socket.socket(family=socket.AF_INET, type=socket.SOCK_STREAM)
            self.server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.server.bind((self.ip, self.port))
            self.server.listen(1)
            self.server.setblocking(False)
            self.client = None
            self.conn = None
        elif self.mode == 'client':
            self.server = None
            self.client = None
            self.conn = None
            self._ensure_connection()
        else:
            raise ValueError("mode must be 'server' or 'client'")

    def _create_client_socket(self):
        return socket.socket(socket.AF_INET, socket.SOCK_STREAM)

    def _reset_connection(self):
        conn = self.conn
        self.conn = None
        self.addr = None
        self.msg_len = None
        self.buffer = b''

        if conn is not None:
            try:
                conn.close()
            except OSError:
                pass

        if self.mode == 'client':
            self.client = None

    def wait_for_client(self, blocking=True):
        """
        Server only: wait for a client to connect.
        Call this before the main loop so the connection is ready.
        """
        if self.mode != 'server' or self.conn is not None:
            return True
        if blocking:
            self.server.setblocking(True)
            self.conn, self.addr = self.server.accept()
            self.conn.setblocking(False)
            self.server.setblocking(False)
            print("Connection established!")
            return True
        return self._ensure_connection()

    def _ensure_connection(self):
        """Establish connection if not yet connected. Returns True if connected."""
        if self.conn is not None:
            return True
        try:
            if self.mode == 'server':
                self.conn, self.addr = self.server.accept()
                self.conn.setblocking(False)
            else:
                if self.client is None:
                    self.client = self._create_client_socket()
                self.client.connect((self.ip, self.port))
                self.conn = self.client
                self.conn.setblocking(False)
            print("Connection established!")
            return True
        except (BlockingIOError, ConnectionRefusedError, OSError):
            if self.mode == 'client' and self.client is not None and self.conn is None:
                try:
                    self.client.close()
                except OSError:
                    pass
                self.client = None
            return False

    def sendall(self, msg):
        """Send raw bytes. Returns True on success, False on failure."""
        if not self._ensure_connection():
            return False
        try:
            self.conn.sendall(msg)
            return True
        except (BrokenPipeError, ConnectionResetError, OSError):
            self._reset_connection()
            return False

    def recv(self, buffer_msg=True):
        """Receive bytes. If buffer_msg=True, append to internal buffer for parsing."""
        if not self._ensure_connection():
            return False
        try:
            msg = self.conn.recv(2**20)  # 1MB max per call (2**32 is excessive)
        except BlockingIOError:
            return False
        except (ConnectionResetError, OSError):
            self._reset_connection()
            return False
        if not msg:
            self._reset_connection()
            return False
        if buffer_msg:
            self.buffer += msg
        return msg

    def generate_header(self, msg):
        """Create 4-byte little-endian length header for a message."""
        return int.to_bytes(len(msg), LENGTH_LENGTH, 'little')

    def encode_str(self, s, encoding='utf-8', header=True):
        """Encode a string to bytes, optionally with length header."""
        out = s.encode(encoding)
        if header:
            out = self.generate_header(out) + out
        return out

    def encode_arr(self, arr, dtype=None, header=True):
        """Encode a NumPy array to bytes, optionally with length header."""
        np = _require_numpy()
        if dtype is None:
            dtype = np.float64
        out = arr.astype(dtype).tobytes()
        if header:
            out = self.generate_header(out) + out
        return out

    def parse_buffer(self, shape=None, use_len=True, msg_type='string', encoding='utf-8'):
        """
        Extract complete messages from the buffer.

        Args:
            shape: For arrays, the shape to reshape to. Defaults to self.shape.
            use_len: If True, use length-prefix header. If False, use fixed record size (arrays only).
            msg_type: 'string' or 'array' — how to decode the payload.
            encoding: String encoding when msg_type='string'.

        Returns:
            List of decoded messages (strings or NumPy arrays).
        """
        if shape is None:
            shape = self.shape
        msgs = []

        while True:
            if use_len:
                # Read length header if we don't have it yet
                if self.msg_len is None:
                    if len(self.buffer) < LENGTH_LENGTH:
                        break
                    self.msg_len = int.from_bytes(self.buffer[:LENGTH_LENGTH], 'little')
                    self.buffer = self.buffer[LENGTH_LENGTH:]

                # Read full payload when we have enough bytes
                if self.msg_len is not None:
                    if len(self.buffer) < self.msg_len:
                        break
                    payload = self.buffer[:self.msg_len]
                    self.buffer = self.buffer[self.msg_len:]
                    self.msg_len = None

                    if msg_type == 'string':
                        msgs.append(payload.decode(encoding))
                    else:
                        np = _require_numpy()
                        arr = np.frombuffer(payload, dtype=np.float64)
                        msgs.append(arr.reshape(shape))
            else:
                # Fixed-size records (arrays only)
                np = _require_numpy()
                if shape != (-1,):
                    record_size = 8 * np.abs(np.prod(shape))
                else:
                    record_size = 8
                n_records = len(self.buffer) // record_size
                if n_records >= 1:
                    payload = self.buffer[:n_records * record_size]
                    self.buffer = self.buffer[n_records * record_size:]
                    arr = np.frombuffer(payload, dtype=np.float64)
                    msgs.append(arr.reshape(shape))
                break

        return msgs
