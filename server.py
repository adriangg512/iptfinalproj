from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import random
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = Flask(__name__)
CORS(app)

# LOAD DATA
with open("intents.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# PREPARE DATA
X = []
y = []

for intent in data["intents"]:
    for pattern in intent["patterns"]:
        X.append(pattern.lower().strip())
        y.append(intent["tag"])

# VECTORIZE
vectorizer = TfidfVectorizer()
X_vec = vectorizer.fit_transform(X)

def get_response(message):
    if not message:
        return "Please type something 🙂"

    message = message.lower().strip()

    input_vec = vectorizer.transform([message])
    similarity = cosine_similarity(input_vec, X_vec)

    index = similarity.argmax()
    score = similarity[0][index]

    # 🔧 improved threshold (less strict, better responses)
    if score < 0.30:
        # fallback instead of always "don't understand"
        fallback = [
            "Hmm 🤔 I didn’t quite get that. Try asking differently.",
            "Can you rephrase that? I can help with recipes 🙂",
            "I’m not sure, but I can help you cook something 👍"
        ]
        return random.choice(fallback)

    tag = y[index]

    # find matching intent
    for intent in data["intents"]:
        if intent["tag"] == tag:
            return random.choice(intent["responses"])

    return "Sorry, I don't understand that."


# API ROUTE
@app.route("/chat", methods=["POST"])
def chat():
    data_req = request.get_json()

    if not data_req or "message" not in data_req:
        return jsonify({"reply": "No message received 😅"}), 400

    user_message = data_req["message"]
    response = get_response(user_message)

    return jsonify({"reply": response})


if __name__ == "__main__":
    app.run(debug=True)