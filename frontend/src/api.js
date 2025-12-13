// frontend/src/api.js

// Host del backend: toma de la env var, y si no existe usa localhost (modo dev)
const RAW_HOST = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

// Normaliza (quita slash final)
const API_HOST = RAW_HOST.replace(/\/$/, "");

// Base común
const API_BASE = `${API_HOST}/api/orders`;

// Detectar ngrok (free)
const IS_NGROK =
  API_HOST.includes("ngrok-free.dev") ||
  API_HOST.includes("ngrok-free.app") ||
  API_HOST.includes("ngrok.io");

// Headers base
function buildHeaders(extra = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...extra,
  };

  // 🔥 Esto evita que ngrok te devuelva HTML "warning" en lugar del JSON
  if (IS_NGROK) {
    headers["ngrok-skip-browser-warning"] = "true";
  }

  return headers;
}

// Fetch JSON seguro (si llega HTML, te lo reporta)
async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: buildHeaders(options.headers || {}),
  });

  const contentType = res.headers.get("content-type") || "";
  const text = await res.text(); // leemos como texto primero

  // Si no es OK, intentamos extraer error JSON o damos el texto
  if (!res.ok) {
    let payload = null;
    try {
      payload = JSON.parse(text);
    } catch (_) {}

    const msg =
      payload?.error ||
      payload?.message ||
      `Request failed (${res.status})`;

    console.error("API ERROR:", {
      url,
      status: res.status,
      contentType,
      bodyPreview: text.slice(0, 200),
    });

    throw new Error(msg);
  }

  // OK, pero si es HTML, no es lo esperado
  if (!contentType.includes("application/json")) {
    console.error("Respuesta NO JSON:", {
      url,
      contentType,
      bodyPreview: text.slice(0, 200),
    });

    // típico caso ngrok warning
    if (text.includes("<!DOCTYPE") || text.includes("<html")) {
      throw new Error(
        "Backend returned HTML instead of JSON. If you're using ngrok, it may be returning a warning page. (Header ngrok-skip-browser-warning should fix it)."
      );
    }

    throw new Error("Backend response is not JSON.");
  }

  return JSON.parse(text);
}

/**
 * Crear checkout en el backend (que internamente habla con Paddle).
 * Esperamos { orderId, checkoutUrl }
 */
export async function createCheckout(userEmail, videoId) {
  return fetchJson(`${API_BASE}/checkout`, {
    method: "POST",
    body: JSON.stringify({ userEmail, videoId }),
  });
}

/**
 * Verificar acceso
 */
export async function checkAccess(userEmail, videoId) {
  const params = new URLSearchParams({ userEmail, videoId });
  return fetchJson(`${API_BASE}/access/check?${params.toString()}`, {
    method: "GET",
  });
}

/**
 * Obtener catálogo de videos
 */
export async function getVideos() {
  const data = await fetchJson(`${API_BASE}/videos`, { method: "GET" });

  const list = Array.isArray(data) ? data : data.videos || [];

  return list.map((v) => ({
    ...v,
    precio: Number(v.precio),
  }));
}
