import serial
import serial.tools.list_ports
import json
import threading
import time
import signal
import sys
import logging
import re
from datetime import datetime, timezone
from collections import deque
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO

# ---------- Logging ----------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("aqua-sense")

# ---------- Flask ----------
app = Flask(__name__, static_folder=".", static_url_path="")
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

# ---------- State ----------
data_store = deque(maxlen=500)
lock = threading.Lock()
serial_conn = None
stop_event = threading.Event()

# Arduino sensor status tracking
arduino_status = {
    "connected": False,
    "port": None,
    "ds18b20_detected": False,
    "last_raw_line": "",
    "debug_messages": deque(maxlen=20),
    "last_data_time": None,
}

# ---------- Sensor validation (matches Arduino ranges) ----------
SENSOR_RANGES = {
    "ph":          (0.0, 14.0),
    "turbidity":   (0.0, 1000.0),   # Matches Arduino's constrain
    "tds":         (0.0, 5000.0),
    "temperature": (-10.0, 50.0),   # Matches Arduino's constrain
}

def clamp(name, value):
    lo, hi = SENSOR_RANGES[name]
    try:
        return max(lo, min(hi, float(value)))
    except (TypeError, ValueError):
        return (lo + hi) / 2

# ---------- Optional smoothing for noisy turbidity ----------
SMOOTHING_WINDOW = 5
turbidity_history = deque(maxlen=SMOOTHING_WINDOW)

def smooth_turbidity(value: float) -> float:
    turbidity_history.append(value)
    return sum(turbidity_history) / len(turbidity_history)

# ---------- Serial helpers ----------
def find_arduino():
    """Detect Arduino across Linux, macOS, Windows."""
    keywords = ("Arduino", "CH340", "CP210", "wchusbserial",
                "usbmodem", "ttyACM", "ttyUSB", "FTDI")
    for port in serial.tools.list_ports.comports():
        desc = f"{port.description or ''} {port.device or ''}".lower()
        if any(k.lower() in desc for k in keywords):
            return port.device
    return None

def close_serial():
    global serial_conn
    if serial_conn:
        try:
            serial_conn.close()
        except Exception:
            pass
        serial_conn = None
    arduino_status["connected"] = False
    arduino_status["port"] = None

# ---------- Line classification ----------
JSON_LINE_RE = re.compile(r"^\s*\{.*\}\s*$")

def is_json_line(line: str) -> bool:
    return bool(JSON_LINE_RE.match(line))

def handle_debug_line(line: str):
    """Track useful Arduino debug messages (non-JSON output)."""
    arduino_status["debug_messages"].append({
        "time": datetime.now(timezone.utc).isoformat(),
        "message": line,
    })

    # Detect DS18B20 status from Arduino setup messages
    if "DS18B20 detected" in line or "✅ DS18B20" in line:
        arduino_status["ds18b20_detected"] = True
    elif "No DS18B20 detected" in line or "⚠️" in line:
        arduino_status["ds18b20_detected"] = False

    log.debug(f"[ARDUINO] {line}")

def parse_arduino_json(line: str):
    """Parse Arduino's JSON into a sensor reading dict."""
    data = json.loads(line)

    turbidity = clamp("turbidity", data.get("turbidity", 0.0))
    turbidity = smooth_turbidity(turbidity)  # optional smoothing

    return {
        "ph":          round(clamp("ph",          data.get("ph", 7.0)), 2),
        "turbidity":   round(turbidity, 2),
        "tds":         round(clamp("tds",         data.get("tds", 350)), 1),
        "temperature": round(clamp("temperature", data.get("temperature", 22.0)), 2),
        "timestamp":   datetime.now(timezone.utc).isoformat(),
        "sensor_id":   str(data.get("sensor_id", "ARDUINO_1")),
        "device_id":   str(data.get("device_id", "device_1")),
        "location":    {"river": "Live River", "station": "Field Station"},
        "unit":        {"ph": "pH", "turbidity": "NTU", "tds": "ppm", "temperature": "°C"},
    }

current_reading_state = {}

def parse_arduino_text_line(line: str):
    """Parse text lines from Arduino and return a dict when a complete reading is formed."""
    global current_reading_state
    
    m = re.search(r"Temperature:\s*([\d\.]+)", line)
    if m:
        current_reading_state["temperature"] = float(m.group(1))
        return None
        
    m = re.search(r"Turbidity\s*:\s*([\d\.]+)", line)
    if m:
        current_reading_state["turbidity"] = float(m.group(1))
        return None
        
    m = re.search(r"pH\s*:\s*([\d\.]+)", line)
    if m:
        current_reading_state["ph"] = float(m.group(1))
        return None
        
    m = re.search(r"TDS\s*:\s*([\d\.]+)", line)
    if m:
        current_reading_state["tds"] = float(m.group(1))
        
        # We got TDS, assemble reading
        turbidity = clamp("turbidity", current_reading_state.get("turbidity", 0.0))
        turbidity = smooth_turbidity(turbidity)
        
        reading = {
            "ph":          round(clamp("ph",          current_reading_state.get("ph", 7.0)), 2),
            "turbidity":   round(turbidity, 2),
            "tds":         round(clamp("tds",         current_reading_state.get("tds", 350.0)), 1),
            "temperature": round(clamp("temperature", current_reading_state.get("temperature", 22.0)), 2),
            "timestamp":   datetime.now(timezone.utc).isoformat(),
            "sensor_id":   "ARDUINO_1",
            "device_id":   "device_1",
            "location":    {"river": "Live River", "station": "Field Station"},
            "unit":        {"ph": "pH", "turbidity": "NTU", "tds": "ppm", "temperature": "°C"},
        }
        current_reading_state.clear()
        return reading
        
    return None

# ---------- Main serial reader loop ----------
def read_serial():
    global serial_conn

    while not stop_event.is_set():
        # --- Connected: read data ---
        if serial_conn and serial_conn.is_open:
            try:
                if serial_conn.in_waiting:
                    raw = serial_conn.readline().decode("utf-8", errors="ignore").strip()
                    if not raw:
                        continue

                    arduino_status["last_raw_line"] = raw

                    if is_json_line(raw):
                        try:
                            reading = parse_arduino_json(raw)
                            with lock:
                                data_store.append(reading)
                            arduino_status["last_data_time"] = reading["timestamp"]
                            socketio.emit("new_sensor_data", reading)

                            log.info(
                                f"pH:{reading['ph']:>5.2f} | "
                                f"Turb:{reading['turbidity']:>6.2f} NTU | "
                                f"TDS:{reading['tds']:>6.1f} ppm | "
                                f"Temp:{reading['temperature']:>5.2f}°C"
                            )
                        except json.JSONDecodeError as e:
                            log.warning(f"Invalid JSON: {e} | line={raw!r}")
                    else:
                        # Arduino debug/info message
                        handle_debug_line(raw)
                        
                        # Try to parse text reading
                        reading = parse_arduino_text_line(raw)
                        if reading:
                            with lock:
                                data_store.append(reading)
                            arduino_status["last_data_time"] = reading["timestamp"]
                            socketio.emit("new_sensor_data", reading)

                            log.info(
                                f"[TEXT PARSED] pH:{reading['ph']:>5.2f} | "
                                f"Turb:{reading['turbidity']:>6.2f} NTU | "
                                f"TDS:{reading['tds']:>6.1f} ppm | "
                                f"Temp:{reading['temperature']:>5.2f}°C"
                            )
                else:
                    time.sleep(0.02)

            except (serial.SerialException, OSError) as e:
                log.error(f"Serial error: {e}. Reconnecting...")
                close_serial()

        # --- Not connected: try to connect ---
        else:
            port = find_arduino()
            if port:
                try:
                    log.info(f"Connecting to Arduino on {port}...")
                    serial_conn = serial.Serial(
                        port=port,
                        baudrate=9600,          # matches Arduino's SERIAL_BAUD
                        timeout=1,
                        write_timeout=1,
                    )
                    # ⚠️ Arduino resets on DTR — wait for boot
                    time.sleep(2)
                    serial_conn.reset_input_buffer()

                    arduino_status["connected"] = True
                    arduino_status["port"] = port
                    log.info(f"✅ Connected to Arduino on {port}")
                except Exception as e:
                    log.error(f"Connection failed: {e}")
                    close_serial()
                    time.sleep(2)
            else:
                log.info("Waiting for Arduino...")
                time.sleep(2)

# ---------- Routes ----------
@app.route("/")
def index():
    return send_from_directory(".", "index.html")

@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(".", filename)

@app.route("/api/data", methods=["GET"])
def get_data():
    with lock:
        if data_store:
            return jsonify(data_store[-1])
    return jsonify({
        "error": "No data yet",
        "ph": 7.0, "turbidity": 0.0, "tds": 350, "temperature": 22.0,
    })

@app.route("/api/history", methods=["GET"])
def get_history():
    n = max(1, min(request.args.get("n", 60, type=int), 500))
    with lock:
        return jsonify({"readings": list(data_store)[-n:]})

@app.route("/api/status", methods=["GET"])
def get_status():
    return jsonify({
        "connected":        arduino_status["connected"],
        "port":             arduino_status["port"],
        "ds18b20_detected": arduino_status["ds18b20_detected"],
        "buffered_readings": len(data_store),
        "last_data_time":   arduino_status["last_data_time"],
        "last_raw_line":    arduino_status["last_raw_line"],
        "server_time":      datetime.now(timezone.utc).isoformat(),
    })

@app.route("/api/debug", methods=["GET"])
def get_debug():
    """Returns the last ~20 Arduino debug/status messages."""
    return jsonify({"messages": list(arduino_status["debug_messages"])})

@socketio.on("connect")
def handle_connect():
    log.info("WebSocket client connected")
    with lock:
        if data_store:
            socketio.emit("new_sensor_data", data_store[-1])

# ---------- Graceful shutdown ----------
def shutdown(*_):
    log.info("Shutting down...")
    stop_event.set()
    close_serial()
    sys.exit(0)

signal.signal(signal.SIGINT, shutdown)
signal.signal(signal.SIGTERM, shutdown)

# ---------- Main ----------
if __name__ == "__main__":
    print("\n" + "=" * 55)
    print("  🌊 AQUA SENSE - BACKEND (Arduino-compatible)")
    print("=" * 55)
    print("  Baud: 9600 | Port: auto-detect")
    print("  Expects Arduino JSON or Text format from your sketch")
    print("=" * 55 + "\n")

    serial_thread = threading.Thread(target=read_serial, daemon=True)
    serial_thread.start()

    socketio.run(
        app,
        host="0.0.0.0",
        port=5000,
        debug=False,
        use_reloader=False,
        allow_unsafe_werkzeug=True,
    )