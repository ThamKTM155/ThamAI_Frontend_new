from flask import Flask, request, jsonify
import os

app = Flask(__name__)

@app.route("/")
def home():
    return "Chào mừng đến với ThamAI Backend!"

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_message = data.get("message", "")

    # Tạm thời phản hồi đơn giản – sau này thay bằng OpenAI
    assistant_reply = f"Bạn vừa nói: {user_message}"

    return jsonify({"response": assistant_reply})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
