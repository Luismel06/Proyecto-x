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
