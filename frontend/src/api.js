// frontend/src/api.js

// 🔹 Host del backend: toma de la env var, y si no existe usa localhost (modo dev)
const API_HOST = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

// 🔹 Base común para todas las rutas del backend
const API_BASE = `${API_HOST}/api/orders`;

// Crear checkout (Paddle o lo que uses en backend)
export async function createCheckout(userEmail, videoId) {
  const res = await fetch(`${API_BASE}/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userEmail, videoId }),
  });

  if (!res.ok) {
    throw new Error("Error al crear checkout");
  }

  return res.json(); // { paymentUrl: "..." } u otro formato que tengas
}

// Verificar si el usuario tiene acceso a un video
export async function checkAccess(userEmail, videoId) {
  const params = new URLSearchParams({ userEmail, videoId });
  const res = await fetch(`${API_BASE}/access/check?${params.toString()}`);

  if (!res.ok) {
    throw new Error("Error al verificar acceso");
  }

  return res.json();
}

// Obtener catálogo de videos
export async function getVideos() {
  const res = await fetch(`${API_BASE}/videos`);

  if (!res.ok) {
    throw new Error("Error al cargar el catálogo de videos");
  }

  const data = await res.json();

  // Si en backend devuelves { videos: [...] }
  const list = Array.isArray(data) ? data : data.videos || [];

  return list.map((v) => ({
    ...v,
    precio: Number(v.precio),
  }));
}
