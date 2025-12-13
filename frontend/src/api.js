// frontend/src/api.js

const RAW_HOST = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const API_HOST = RAW_HOST.replace(/\/$/, "");
const API_BASE = `${API_HOST}/api/orders`;

const IS_NGROK =
  API_HOST.includes("ngrok-free.dev") ||
  API_HOST.includes("ngrok-free.app") ||
  API_HOST.includes("ngrok.io");

function buildHeaders(extra = {}) {
  const headers = { "Content-Type": "application/json", ...extra };
  if (IS_NGROK) headers["ngrok-skip-browser-warning"] = "true";
  return headers;
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: buildHeaders(options.headers || {}),
  });

  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

  if (!res.ok) {
    let payload = null;
    try {
      payload = JSON.parse(text);
    } catch (_) {}

    const msg =
      payload?.error || payload?.message || `Request failed (${res.status})`;

    console.error("API ERROR:", {
      url,
      status: res.status,
      contentType,
      bodyPreview: text.slice(0, 300),
    });

    throw new Error(msg);
  }

  if (!contentType.includes("application/json")) {
    console.error("NON-JSON response:", {
      url,
      contentType,
      bodyPreview: text.slice(0, 300),
    });

    if (text.includes("<!DOCTYPE") || text.includes("<html")) {
      throw new Error("Backend returned HTML instead of JSON.");
    }

    throw new Error("Backend response is not JSON.");
  }

  return JSON.parse(text);
}

export async function createCheckout(userEmail, videoId) {
  return fetchJson(`${API_BASE}/checkout`, {
    method: "POST",
    body: JSON.stringify({ userEmail, videoId }),
  });
}

export async function checkAccess(userEmail, videoId) {
  const params = new URLSearchParams({ userEmail, videoId });
  return fetchJson(`${API_BASE}/access/check?${params.toString()}`, {
    method: "GET",
  });
}

export async function getVideos() {
  const data = await fetchJson(`${API_BASE}/videos`, { method: "GET" });
  const list = Array.isArray(data) ? data : data.videos || [];

  return list.map((v) => ({
    ...v,
    precio: Number(v.precio),
  }));
}
