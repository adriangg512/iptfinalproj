import json
import random
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# LOAD DATA
with open("intents.json", "r") as f:
    data = json.load(f)

# PREPARE DATA
X = []
y = []

for intent in data["intents"]:
    for pattern in intent["patterns"]:
        X.append(pattern)
        y.append(intent["tag"])

# VECTORIZE
vectorizer = TfidfVectorizer()
X_vec = vectorizer.fit_transform(X)

# SMART CHAT FUNCTION
def chat(user_input):
    input_vec = vectorizer.transform([user_input])

    similarity = cosine_similarity(input_vec, X_vec)
    index = similarity.argmax()
    score = similarity[0][index]

    # MORE STRICT MATCHING (prevents wrong answers like adobo for egg/rice)
    if score < 0.35:
        return "I’m not sure. Try asking something like: 'egg recipes', 'rice meals', or 'easy dishes'."

    tag = y[index]

    for intent in data["intents"]:
        if intent["tag"] == tag:
            return random.choice(intent["responses"])

    return "Sorry, I don’t understand that."

# RUN CHATBOT
print("TasteBot is ready! Type 'exit' to stop.")

while True:
    msg = input("You: ")

    if msg.lower() == "exit":
        print("Bot: Bye!")
        break

    print("Bot:", chat(msg))