// ================= VERIFY OTP =================
async function verifyOTP() {
  const entered = document.getElementById("otpInput").value.trim();

  const otp = localStorage.getItem("otp");
  const time = localStorage.getItem("otpTime");

  if (!otp || !time) {
    document.getElementById("msg").innerText = "OTP not found.";
    return;
  }

  if (entered === otp) {
    document.getElementById("msg").innerText = "OTP Verified ✅";

    const failedAttempts = parseInt(localStorage.getItem("finalFailedAttempts")) || 0;

    await storeData(failedAttempts); // ✅ ONLY HERE

    localStorage.setItem("failedAttempts", 0);

    setTimeout(() => {
      window.location = "/home";
    }, 1000);

  } else {
    document.getElementById("msg").innerText = "Wrong OTP ❌";
  }
}

// ================= LOCATION =================
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

// ================= STORE DATA =================
async function storeData(failedAttempts) {
  const { db } = await import("/static/firebase.js");
  const { doc, setDoc, getDoc } = await import(
    "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js"
  );

  const uid = localStorage.getItem("uid");
  const email = localStorage.getItem("email");

  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const time = now.toLocaleTimeString();

  const device = /Android|iPhone/i.test(navigator.userAgent)
    ? "Mobile"
    : "Laptop";

  const location = await getLocation();

  const ref = doc(db, "activity", uid);
  const snap = await getDoc(ref);

  let loginCount = 1;
  if (snap.exists()) {
    loginCount = (snap.data().loginCount || 0) + 1;
  }

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
