from flask import Flask, request, jsonify, render_template
import pickle
import pandas as pd
from datetime import datetime
import smtplib
from email.mime.text import MIMEText

app = Flask(__name__)

# ================= CONFIG =================
EMAIL_SENDER = "smart7mfa@gmail.com"
EMAIL_PASSWORD = "rnokxuzddimxpgob"  # no spaces

# ================= LOAD MODEL =================
with open("model.pkl", "rb") as f:
    model = pickle.load(f)


# ================= EMAIL FUNCTION =================
def send_email(to_email, otp):
    if not to_email or not otp:
        print("❌ Invalid email/otp")
        return False

    msg = MIMEText(f"Your OTP is: {otp}")
    msg["Subject"] = "OTP Verification"
    msg["From"] = EMAIL_SENDER
    msg["To"] = to_email

    try:
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(EMAIL_SENDER, EMAIL_PASSWORD)
        server.sendmail(EMAIL_SENDER, to_email, msg.as_string())
        server.quit()

        print(f"✅ OTP sent to {to_email}")
        return True

    except Exception as e:
        print("❌ Email error:", e)
        return False


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


# ================= OTP ROUTE =================
@app.route("/send-otp", methods=["POST"])
def send_otp():
    data = request.get_json() or {}

    email = data.get("email")
    otp = data.get("otp")

    if not email or not otp:
        return jsonify({"status": "error"}), 400

    send_email(email, otp)

    return jsonify({"status": "sent"})


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
        if ":" in time_str and "AM" not in time_str and "PM" not in time_str:
            return int(time_str.split(":")[0])

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
    data = request.get_json() or {}

    input_data = encode(data)

    pred = model.predict(input_data)[0]

    print("RAW INPUT:", data)
    print("PROCESSED:", input_data.to_dict())
    print("PREDICTION:", pred)

    return jsonify({"prediction": int(pred)})


# ================= RUN =================
if __name__ == "__main__":
    app.run(debug=True)
