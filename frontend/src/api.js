const API_URL = "http://localhost:4000";

export async function createCheckout(userEmail, videoId) {
  const res = await fetch(`${API_URL}/api/orders/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userEmail, videoId })
  });

  if (!res.ok) {
    throw new Error("Error al crear checkout");
  }

  return res.json();
}

export async function checkAccess(userEmail, videoId) {
  const params = new URLSearchParams({ userEmail, videoId });
  const res = await fetch(`${API_URL}/api/orders/access/check?${params}`);

  if (!res.ok) {
    throw new Error("Error al verificar acceso");
  }

  return res.json();
}
const API_BASE = "http://localhost:4000/api/orders"; // ya la usábamos

export async function getVideos() {
  const res = await fetch(`${API_BASE}/videos`);

  if (!res.ok) {
    throw new Error("Error al cargar el catálogo de videos");
  }

  const data = await res.json();
  // Aseguramos que el precio sea número
  return data.videos.map((v) => ({
    ...v,
    precio: Number(v.precio),
  }));
}
