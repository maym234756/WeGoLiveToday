// services/coming-soon/app.js
const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

// why: dev vs prod without rebuilds (prod assumes reverse-proxy on /api)
const API_BASE =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:3000"
    : "/api";

const form = document.getElementById("notify-form");
const email = document.getElementById("email");
const btn = document.getElementById("notify-btn");
const feedback = document.getElementById("feedback");
const honeypot = document.getElementById("hp"); // hidden input (optional)

let busy = false;

function setState(msg, disabled) {
  if (feedback) feedback.textContent = msg || "";
  if (btn) btn.disabled = !!disabled;
}

async function postJSON(url, body, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms); // why: avoid hanging
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    return res;
  } finally {
    clearTimeout(t);
  }
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (busy) return; // why: prevent double submit

  // simple bot trap
  if (honeypot && honeypot.value.trim() !== "") return;

  if (!email?.checkValidity()) {
    setState("Enter a valid email address.", false);
    email?.focus();
    return;
  }

  busy = true;
  setState("Submitting…", true);

  try {
    const res = await postJSON(`${API_BASE}/subscribe`, {
      email: email.value.trim(),
    });

    if (!res.ok) {
      // try to surface server error
      const data = await res.json().catch(() => ({}));
      const reason = data?.error || `Request failed (${res.status})`;
      setState(reason, false);
      busy = false;
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (data?.ok) {
      setState("Thanks! You’re on the list.", false);
      if (email) email.value = "";
    } else {
      setState("Something went wrong. Please try again.", false);
    }
  } catch (err) {
    setState("Network error. Please try again.", false);
  } finally {
    busy = false;
  }
});
