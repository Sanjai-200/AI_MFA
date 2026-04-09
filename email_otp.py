import smtplib
import random
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

EMAIL_SENDER = "smart7mfa@gmail.com"
EMAIL_PASSWORD = "rnokxuzddimxpgob"

# Generate OTP
def generate_otp():
    return str(random.randint(100000, 999999))

# Send OTP to email
def send_otp(receiver_email, otp):
    try:
        subject = "Your OTP Code"
        body = f"Your OTP is: {otp}"

        msg = MIMEMultipart()
        msg["From"] = EMAIL_SENDER
        msg["To"] = receiver_email
        msg["Subject"] = subject

        msg.attach(MIMEText(body, "plain"))

        # Connect to Gmail SMTP
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(EMAIL_SENDER, EMAIL_PASSWORD)

        server.sendmail(EMAIL_SENDER, receiver_email, msg.as_string())
        server.quit()

        print("✅ OTP sent successfully")
        return True

    except Exception as e:
        print("❌ Error sending OTP:", e)
        return False
