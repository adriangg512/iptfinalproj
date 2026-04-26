from flask import Flask, jsonify, request
from flask_cors import CORS

from tastebot_engine import get_tastebot_reply

app = Flask(__name__)
CORS(app)


@app.post("/chat")
def chat():
  data = request.get_json(silent=True) or {}
  message = (data.get("message") or "").strip()
  reply = get_tastebot_reply(message)
  return jsonify({"reply": reply})


@app.get("/")
def health():
  return jsonify({"status": "ok", "bot": "TasteBot"})


if __name__ == "__main__":
  # Run on port 5000 by default; you can change if needed.
  app.run(host="0.0.0.0", port=5000, debug=True)

