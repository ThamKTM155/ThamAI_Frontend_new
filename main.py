# main.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import openai
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

openai.api_key = os.getenv("OPENAI_API_KEY")


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_message = data.get("message", "")

    if not user_message:
        return jsonify({"reply": "⚠️ Bạn chưa nhập tin nhắn nào cả."})

    try:
        response = openai.ChatCompletion.create(model="gpt-3.5-turbo",
                                                messages=[{
                                                    "role":
                                                    "user",
                                                    "content":
                                                    user_message
                                                }])
        reply = response["choices"][0]["message"]["content"]
        return jsonify({"reply": reply})
    except Exception as e:
        print("Lỗi khi gọi OpenAI:", e)
        return jsonify({"reply": "⚠️ Đã xảy ra lỗi khi gọi API OpenAI."})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3000)
