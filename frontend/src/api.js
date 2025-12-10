// frontend/src/api.js

// 🔹 Host del backend: toma de la env var, y si no existe usa localhost (modo dev)
const API_HOST = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

// 🔹 Base común para todas las rutas del backend
const API_BASE = `${API_HOST}/api/orders`;

/**
 * Crear checkout en el backend (que internamente habla con Paddle).
 */
export async function createCheckout(userEmail, videoId) {
  const res = await fetch(`${API_BASE}/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userEmail, videoId }),
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch (_) {
    // si no hay body JSON, lo dejamos en null
  }

  if (!res.ok) {
    console.error("Checkout error response:", payload);
    const msg =
      payload?.error || payload?.message || "Error creating checkout";
    throw new Error(msg);
  }

  // esperamos { orderId, checkoutUrl }
  return payload;
}

/**
 * Verificar si el usuario tiene acceso a un video
 */
export async function checkAccess(userEmail, videoId) {
  const params = new URLSearchParams({ userEmail, videoId });
  const res = await fetch(`${API_BASE}/access/check?${params.toString()}`);

  if (!res.ok) {
    throw new Error("Error checking access");
  }

  return res.json(); // { hasAccess: boolean }
}

/**
 * Obtener catálogo de videos
 */
export async function getVideos() {
  const res = await fetch(`${API_BASE}/videos`);

  if (!res.ok) {
    throw new Error("Error loading video catalog");
  }

  const data = await res.json();
  // En backend devolvemos { videos: [...] }
  const list = Array.isArray(data) ? data : data.videos || [];

  return list.map((v) => ({
    ...v,
    precio: Number(v.precio),
  }));
}
