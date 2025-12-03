import express from "express";
import { supabase } from "../supabaseClient.js";
import { randomUUID } from "crypto";

const router = express.Router();

/**
 * POST /api/orders/checkout
 * Crea una orden y devuelve una URL de pago (simulada).
 * En la vida real aquí llamas a Bankful / Samus con la info.
 */
router.post("/checkout", async (req, res) => {
  try {
    const { userEmail, videoId } = req.body;

    if (!userEmail || !videoId) {
      return res.status(400).json({ error: "Faltan parámetros." });
    }

    // 1. Buscar o crear usuario por email
    let { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", userEmail)
      .single();

    if (userError && userError.code !== "PGRST116") {
      console.error(userError);
      return res.status(500).json({ error: "Error al buscar usuario" });
    }

    if (!user) {
      const { data: newUser, error: newUserError } = await supabase
        .from("users")
        .insert({ email: userEmail })
        .select()
        .single();

      if (newUserError) {
        console.error(newUserError);
        return res.status(500).json({ error: "Error al crear usuario" });
      }
      user = newUser;
    }

    // 2. Obtener info del video
    const { data: video, error: videoError } = await supabase
      .from("videos")
      .select("*")
      .eq("id", videoId)
      .single();

    if (videoError || !video) {
      console.error(videoError);
      return res.status(404).json({ error: "Video no encontrado" });
    }

    const orderId = randomUUID();

    // 3. Crear orden en DB
    const { error: orderError } = await supabase.from("orders").insert({
      id: orderId,
      user_id: user.id,
      video_id: video.id,
      amount: video.precio,
      estado: "pendiente",
      provider: "bankful"
    });

    if (orderError) {
      console.error(orderError);
      return res.status(500).json({ error: "Error al crear orden" });
    }

    // 4. Simular URL de pago (luego la cambias por el checkout real de Bankful)
    const paymentUrl = `https://sandbox.bankful.com/checkout/${orderId}`;

    return res.json({
      orderId,
      paymentUrl
    });
  } catch (err) {
    console.error("Error en /checkout:", err);
    return res.status(500).json({ error: "Error interno" });
  }
});

/**
 * POST /api/orders/webhook
 * Webhook que simula la respuesta del proveedor de pago.
 * En producción, Bankful llamará esta URL con la info real.
 */
router.post("/webhook", async (req, res) => {
  try {
    const { orderId, status } = req.body;

    // Aquí deberías validar la firma del proveedor (HMAC, token, etc.)
    // if (!firmaValida) return res.status(401).end();

    if (!orderId || !status) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const estado =
      status === "APPROVED" || status === "paid" ? "pagado" : "rechazado";

    // 1. Actualizar orden
    const { data: orderData, error: orderUpdateError } = await supabase
      .from("orders")
      .update({ estado })
      .eq("id", orderId)
      .select("user_id, video_id")
      .single();

    if (orderUpdateError || !orderData) {
      console.error(orderUpdateError);
      return res.status(500).json({ error: "Error al actualizar orden" });
    }

    // 2. Si está pagado, crear acceso
    if (estado === "pagado") {
      const { error: accessError } = await supabase.from("accesses").insert({
        user_id: orderData.user_id,
        video_id: orderData.video_id
      });

      if (accessError && accessError.code !== "23505") {
        // 23505 = unique violation (ya existe acceso)
        console.error(accessError);
        return res.status(500).json({ error: "Error al crear acceso" });
      }
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("Error en webhook:", err);
    return res.status(500).json({ error: "Error interno" });
  }
});

/**
 * GET /api/access/check
 * Verifica si un usuario (email) tiene acceso a un video.
 */
router.get("/access/check", async (req, res) => {
  try {
    const { userEmail, videoId } = req.query;

    if (!userEmail || !videoId) {
      return res.status(400).json({ error: "Faltan parámetros" });
    }

    // Buscar usuario
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", userEmail)
      .single();

    if (userError || !user) {
      return res.json({ hasAccess: false });
    }

    // Verificar acceso
    const { data: access, error: accessError } = await supabase
      .from("accesses")
      .select("id")
      .eq("user_id", user.id)
      .eq("video_id", videoId)
      .maybeSingle();

    if (accessError) {
      console.error(accessError);
      return res.status(500).json({ error: "Error al verificar acceso" });
    }

    return res.json({ hasAccess: !!access });
  } catch (err) {
    console.error("Error en /access/check:", err);
    return res.status(500).json({ error: "Error interno" });
  }
});

export default router;
