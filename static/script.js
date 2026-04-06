import { auth } from "/static/firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

// ROUTES
window.goSignup = () => window.location = "/signup";
window.goLogin = () => window.location = "/";

// EMAIL VALIDATION
function isValidEmail(email) {
  const regex = /^[a-z0-9]+([._%+-]?[a-z0-9]+)*@[a-z0-9-]+\.[a-z]{2,}$/;

  if (!regex.test(email)) return false;
  if (email.includes("..")) return false;
  if (email.includes("@.")) return false;

  const allowedDomains = ["gmail.com", "yahoo.com", "outlook.com"];
  const domain = email.split("@")[1];

  return allowedDomains.includes(domain);
}

// DEVICE
function getDevice() {
  if (
    navigator.userAgentData?.mobile ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    window.innerWidth <= 768
  ) return "Mobile";

  return "Laptop";
}

// LOCATION
async function getLocation() {
  let location = "Unknown";

  try {
    const res = await fetch("https://ipwho.is/?t=" + Date.now(), {
      cache: "no-store"
    });
    const data = await res.json();

    if (data.success) location = data.country;
  } catch {}

  return location;
}

// ================= SIGNUP =================
window.signup = async () => {
  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!isValidEmail(email)) {
    document.getElementById("msg").innerText = "Invalid email ❌";
    return;
  }

  try {
    const user = await createUserWithEmailAndPassword(auth, email, password);
    alert("Account created successfully!");
    window.location = "/";
  } catch (e) {
    document.getElementById("msg").innerText = e.message;
  }
};

// ================= LOGIN =================
window.login = async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  let failedAttempts = parseInt(localStorage.getItem("failedAttempts")) || 0;

  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);

    localStorage.setItem("uid", userCred.user.uid);
    localStorage.setItem("email", userCred.user.email);

    const device = getDevice();
    const location = await getLocation();

    const now = new Date();
    const time = now.toLocaleTimeString();

    // ML CALL
    const response = await fetch("/predict", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        device,
        location,
        loginCount: 1,
        failedAttempts,
        time
      })
    });

    const result = await response.json();

    if (result.prediction === 0) {
      // SAFE → go home (store handled separately)
      localStorage.setItem("failedAttempts", 0);
      window.location = "/home";
    } else {
      // RISK → OTP
      localStorage.setItem("finalFailedAttempts", failedAttempts);

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      localStorage.setItem("otp", otp);
      localStorage.setItem("otpTime", Date.now());

      alert("OTP: " + otp);
      window.location = "/otp";
    }

  } catch {
    failedAttempts++;
    localStorage.setItem("failedAttempts", failedAttempts);
    document.getElementById("msg").innerText =
      "Login failed ❌ (" + failedAttempts + ")";
  }
};
