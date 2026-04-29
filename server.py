from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import random
import pickle
import os

from rapidfuzz import process
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = Flask(__name__)
CORS(app)

# =========================
# LOAD DATA
# =========================
with open("intents.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# =========================
# LOAD OR TRAIN
# =========================
if os.path.exists("vectorizer.pkl"):
    print("✅ Loading saved model...")
    vectorizer = pickle.load(open("vectorizer.pkl", "rb"))
    X_vec = pickle.load(open("X_vec.pkl", "rb"))
    X = pickle.load(open("X.pkl", "rb"))
    y = pickle.load(open("y.pkl", "rb"))

else:
    print("⚡ Training model...")

    X = []
    y = []

    for intent in data["intents"]:
        for pattern in intent["patterns"]:
            X.append(pattern.lower().strip())
            y.append(intent["tag"])

    vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4))
    X_vec = vectorizer.fit_transform(X)

    # SAVE AFTER TRAINING
    pickle.dump(vectorizer, open("vectorizer.pkl", "wb"))
    pickle.dump(X_vec, open("X_vec.pkl", "wb"))
    pickle.dump(X, open("X.pkl", "wb"))
    pickle.dump(y, open("y.pkl", "wb"))

    print("💾 Model saved!")

# =========================
# RESPONSE ENGINE
# =========================
def get_response(message):
    if not message:
        return "Please type something 🙂"

    message = message.lower().strip()

    # 1. FUZZY MATCH
    try:
        best_match, score, index = process.extractOne(message, X)

        if score > 85:
            tag = y[index]

            for intent in data["intents"]:
                if intent["tag"] == tag:
                    return random.choice(intent["responses"])
    except:
        pass

    # 2. TF-IDF MATCH
    input_vec = vectorizer.transform([message])
    similarity = cosine_similarity(input_vec, X_vec)

    index = similarity.argmax()
    score = similarity[0][index]

    if score < 0.25:
        return random.choice([
            "Hmm 🤔 I didn’t quite get that.",
            "Can you rephrase that? I can help 🙂",
            "Try asking in a different way 👍"
        ])

    tag = y[index]

    for intent in data["intents"]:
        if intent["tag"] == tag:
            return random.choice(intent["responses"])

    return "Sorry, I don't understand that."

# =========================
# API ROUTE
# =========================
@app.route("/chat", methods=["POST"])
def chat():
    data_req = request.get_json()

    if not data_req or "message" not in data_req:
        return jsonify({"reply": "No message received 😅"}), 400

    user_message = data_req["message"]
    response = get_response(user_message)

    return jsonify({"reply": response})

# =========================
# TERMINAL TEST MODE
# =========================
def terminal_chat():
    print("🤖 TasteBot is running (type 'exit' to quit)\n")
    while True:
        msg = input("You: ")
        if msg.lower() == "exit":
            break
        print("Bot:", get_response(msg))

# =========================
# RUN SERVER
# =========================
if __name__ == "__main__":
    import sys

    if "test" in sys.argv:
        terminal_chat()   # 👉 run: python server.py test
    else:
        app.run(debug=True)