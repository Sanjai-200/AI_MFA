// ================= OTP VERIFY =================
async function verifyOTP() {
  const entered = document.getElementById("otpInput").value.trim();

  const otp = localStorage.getItem("otp");
  const time = localStorage.getItem("otpTime");

  if (!otp || !time) {
    document.getElementById("msg").innerText = "OTP not found. Please login again.";
    return;
  }

  const otpTime = parseInt(time);
  const currentTime = Date.now();

  if (currentTime - otpTime > 3600000) {
    document.getElementById("msg").innerText = "OTP expired.";
    localStorage.removeItem("otp");
    localStorage.removeItem("otpTime");
    return;
  }

  if (entered === otp) {
    document.getElementById("msg").innerText = "OTP Verified ✅";

    await storeData();

    setTimeout(() => {
      window.location = "home.html";
    }, 1000);

  } else {
    document.getElementById("msg").innerText = "Wrong OTP ❌";
  }
}


// ================= RESEND OTP =================
function resendOTP() {
  const newOtp = Math.floor(100000 + Math.random() * 900000).toString();

  localStorage.setItem("otp", newOtp);
  localStorage.setItem("otpTime", Date.now().toString());

  alert("New OTP: " + newOtp);
}


// ================= LOCATION (YOUR WORKING VERSION) =================
async function getLocation() {
  let location = "Unknown";

  try {
    let res = await fetch("https://ipwho.is/?timestamp=" + Date.now(), {
      cache: "no-store"
    });

    let data = await res.json();

    if (data && data.success) {
      return data.country;
    }

    res = await fetch("https://api.ipify.org?format=json");
    const ipData = await res.json();

    res = await fetch(`https://ipapi.co/${ipData.ip}/json/?timestamp=${Date.now()}`, {
      cache: "no-store"
    });

    data = await res.json();

    if (data && data.country_name) {
      return data.country_name;
    }

  } catch (e) {
    console.log("Location fetch error:", e);
  }

  return location;
}


// ================= STORE DATA =================
async function storeData() {
  const { db } = await import("./firebase.js");
  const { doc, setDoc, getDoc } = await import(
    "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js"
  );

  const uid = localStorage.getItem("uid");
  const email = localStorage.getItem("email");

  const failedAttempts = parseInt(localStorage.getItem("finalFailedAttempts")) || 0;

  if (!uid || !email) return;

  // DEVICE
  let device = "Laptop";
  if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
    device = "Mobile";
  }

  // DATE & TIME
  const now = new Date();
  const date = now.toISOString().split("T")[0];

  let hours = now.getHours();
  let minutes = now.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12 || 12;
  minutes = minutes < 10 ? "0" + minutes : minutes;

  const time = `${hours}:${minutes} ${ampm}`;

  // LOCATION
  const location = await getLocation();

  const ref = doc(db, "activity", uid);
  const snap = await getDoc(ref);

  let loginCount = 1;

  if (snap.exists()) {
    const data = snap.data();
    if (data.date === date) {
      loginCount = (data.loginCount || 0) + 1;
    }
  }

  // FINAL SAVE
  await setDoc(ref, {
    email,
    location,
    device,
    date,
    time,
    loginCount,
    failedAttempts
  });
}
