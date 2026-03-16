#!/usr/bin/env python3
"""
Connect to main.py (server mode) and print gesture events.

Usage:
  1. Run main.py in one terminal (with TCP enabled, server mode).
  2. Run this script in another: python3 test_tcp_client.py
"""
from tcp import ConnectionManager
import json

conn = ConnectionManager(ip="127.0.0.1", port=5000, mode="client")
print("Waiting for gesture events... (run main.py in another terminal)")
while True:
    conn.recv()
    for msg in conn.parse_buffer(msg_type="string"):
        event = json.loads(msg)
        print(f"  {event['gesture']} ({event['confidence']:.2f})")
