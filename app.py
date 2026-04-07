from flask import Flask, request, jsonify, render_template
import pickle
import pandas as pd
from datetime import datetime
import smtplib
from email.mime.text import MIMEText
import os
import random

app = Flask(__name__)

# ================= LOAD MODEL =================
with open("model.pkl", "rb") as f:
    model = pickle.load(f)

# ================= EMAIL FUNCTION =================
def send_otp_email(to_email, otp):
    try:
        sender_email = os.environ.get("EMAIL")
        sender_password = os.environ.get("EMAIL_PASS")

        subject = "Your OTP Code"
        body = f"Your OTP is: {otp}"

        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = sender_email
        msg["To"] = to_email

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender_email, sender_password)
            server.send_message(msg)

    except Exception as e:
        print("EMAIL ERROR:", e)


# ================= SEND OTP ROUTE =================
@app.route("/send-otp", methods=["POST"])
def send_otp():
    try:
        data = request.json
        email = data.get("email")

        otp = str(random.randint(100000, 999999))

        send_otp_email(email, otp)

        return jsonify({"otp": otp})

    except Exception as e:
        print("OTP ROUTE ERROR:", e)

        # fallback OTP (prevents frontend crash)
        return jsonify({"otp": "123456"})


# ================= ROUTES =================
@app.route("/")
def login():
    return render_template("index.html")

@app.route("/signup")
def signup():
    return render_template("signup.html")

@app.route("/otp")
def otp():
    return render_template("otp.html")

@app.route("/home")
def home():
    return render_template("home.html")

# ================= KEEP SERVER AWAKE =================
@app.route("/ping")
def ping():
    return "OK"


# ================= SAFE PARSERS =================

def safe_int(value, default=0):
    try:
        return int(value)
    except:
        return default


def parse_time(time_str):
    if not time_str:
        return 12

    time_str = str(time_str).strip()

    try:
        # 24-hour format
        if ":" in time_str and "AM" not in time_str and "PM" not in time_str:
            return int(time_str.split(":")[0])

        # 12-hour format
        if "AM" in time_str or "PM" in time_str:
            try:
                return datetime.strptime(time_str, "%I:%M:%S %p").hour
            except:
                return datetime.strptime(time_str, "%I:%M %p").hour

    except:
        pass

    return 12


def parse_location(location):
    if not location:
        return 0

    loc = str(location).strip().lower()

    if loc in ["india", "unknown", ""]:
        return 0

    return 1


def parse_device(device):
    if not device:
        return 0

    dev = str(device).lower()

    if "mobile" in dev:
        return 1

    return 0


# ================= ENCODE =================
def encode(data):
    device = parse_device(data.get("device"))
    location = parse_location(data.get("location"))
    loginCount = safe_int(data.get("loginCount"), 1)
    failedAttempts = safe_int(data.get("failedAttempts"), 0)
    hour = parse_time(data.get("time"))

    df = pd.DataFrame(
        [[device, location, loginCount, hour, failedAttempts]],
        columns=["device", "location", "loginCount", "hour", "failedAttempts"]
    )

    return df


# ================= PREDICT =================
@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json

        input_data = encode(data)

        pred = model.predict(input_data)[0]

        print("RAW INPUT:", data)
        print("PROCESSED:", input_data.to_dict())
        print("PREDICTION:", pred)

        return jsonify({"prediction": int(pred)})

    except Exception as e:
        print("PREDICT ERROR:", e)
        return jsonify({"prediction": 0})  # fallback safe


# ================= RUN =================
if __name__ == "__main__":
    app.run(debug=True)
