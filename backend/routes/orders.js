// backend/routes/orders.js
import express from "express";
import { supabase } from "../supabaseClient.js";
import { randomUUID } from "crypto";
import dotenv from "dotenv";

dotenv.config();

// Mapea el ID de tu video (Supabase) al price_id de Paddle
const VIDEO_PRICE_MAP = {
  8: "pri_01kc39rk7fpk844r8hsvjk6xaf", // Módulo 1
  9: "pri_01kc39tsfqrhwzwae05t74mx1s", // Módulo 2
  10: "pri_01kc39xmp3pnych5gypst2twvc", // Módulo 3
  11: "pri_01kc39zdp3n8ja00rqg0n8qj1x", // Módulo 4
  12: "pri_01kc3a1x73q4ww0vdj84s9zjsz", // Módulo 5
};

const PADDLE_API_KEY = process.env.PADDLE_API_KEY;
const PADDLE_ENVIRONMENT = process.env.PADDLE_ENVIRONMENT || "sandbox";

const FRONTEND_BASE_URL =
  process.env.FRONTEND_BASE_URL || "https://proyecto-x-black.vercel.app";

const PADDLE_API_URL =
  PADDLE_ENVIRONMENT === "live"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";

if (!PADDLE_API_KEY) {
  console.warn("⚠️  Missing PADDLE_API_KEY in environment variables.");
}

const router = express.Router();

/**
 * GET /api/orders/videos
 * Obtener catálogo de videos
 */
router.get("/videos", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("videos")
      .select("id, titulo, descripcion, precio, url_privada")
      .order("id", { ascending: true });

    if (error) {
      console.error("Error consultando videos:", error);
      return res
        .status(500)
        .json({ message: "Error al obtener el catálogo de videos" });
    }

    const videos = data.map((v) => ({
      id: v.id,
      titulo: v.titulo,
      descripcion: v.descripcion,
      precio: Number(v.precio),
      url: v.url_privada,
    }));

    return res.json({ videos });
  } catch (err) {
    console.error("Error inesperado /videos:", err);
    return res
      .status(500)
      .json({ message: "Error inesperado al obtener los videos" });
  }
});

/**
 * POST /api/orders/checkout
 * Crear transacción en Paddle y devolver checkout URL
 */
router.post("/checkout", async (req, res) => {
  try {
    const { userEmail, videoId } = req.body;

    const videoIdNum = Number(videoId);

    if (!userEmail || !videoIdNum) {
      return res.status(400).json({ error: "Faltan parámetros." });
    }

    // 1) Buscar o crear usuario por email
    let { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", userEmail)
      .single();

    // "row not found" en PostgREST
    if (userError && userError.code !== "PGRST116") {
      console.error("Error al buscar usuario:", userError);
      return res.status(500).json({ error: "Error al buscar usuario" });
    }

    if (!user) {
      const { data: newUser, error: newUserError } = await supabase
        .from("users")
        .insert({ email: userEmail })
        .select()
        .single();

      if (newUserError) {
        console.error("Error al crear usuario:", newUserError);
        return res.status(500).json({ error: "Error al crear usuario" });
      }
      user = newUser;
    }

    // 2) Obtener info del video
    const { data: video, error: videoError } = await supabase
      .from("videos")
      .select("*")
      .eq("id", videoIdNum)
      .single();

    if (videoError || !video) {
      console.error("Video no encontrado:", videoError);
      return res.status(404).json({ error: "Video no encontrado" });
    }

    // 3) Crear orden pendiente
    const orderId = randomUUID();

    const { error: orderError } = await supabase.from("orders").insert({
      id: orderId,
      user_id: user.id,
      video_id: video.id,
      amount: video.precio,
      estado: "pendiente",
      provider: "paddle",
      provider_order_id: null,
    });

    if (orderError) {
      console.error("Error al crear orden:", orderError);
      return res.status(500).json({ error: "Error al crear orden" });
    }

    // 4) Obtener price_id
    const priceId = VIDEO_PRICE_MAP[videoIdNum];
    if (!priceId) {
      console.error("No hay priceId configurado para videoId:", videoIdNum);
      return res.status(500).json({
        error: "Price ID de Paddle no configurado para este módulo",
      });
    }

    // 5) Crear transacción en Paddle
    const paddleRes = await fetch(`${PADDLE_API_URL}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PADDLE_API_KEY}`,
        "Paddle-Version": "1",
      },
      body: JSON.stringify({
        customer: { email: userEmail },
        items: [{ price_id: priceId, quantity: 1 }],
        custom_data: {
          orderId,
          userId: user.id,
          videoId: video.id,
        },
        collection_mode: "automatic",

        // Si tu Hosted Checkout ya tiene success/cancel URL configurado,
        // puedes omitir esto. Si quieres forzarlo, puedes intentar:
        // checkout: {
        //   settings: {
        //     success_url: `${FRONTEND_BASE_URL}/thank-you?orderId=${orderId}`,
        //     cancel_url: `${FRONTEND_BASE_URL}/`,
        //   },
        // },
      }),
    });

    const body = await paddleRes.json();

    if (!paddleRes.ok) {
      console.error("Paddle error:", JSON.stringify(body, null, 2));
      return res
        .status(500)
        .json({ error: "Error al crear el checkout con Paddle" });
    }

    const tx = body?.data;

    if (!tx?.id || !tx?.checkout?.url) {
      console.error("Respuesta inválida de Paddle:", JSON.stringify(body, null, 2));
      return res.status(500).json({ error: "Respuesta inválida desde Paddle" });
    }

    // 6) Guardar transactionId en tu orden (para reconciliar)
    const { error: updateTxError } = await supabase
      .from("orders")
      .update({ provider_order_id: tx.id })
      .eq("id", orderId);

    if (updateTxError) {
      console.error("Error guardando provider_order_id:", updateTxError);
      // No bloqueamos el checkout por esto, pero es importante tenerlo.
    }

    // 7) Responder al frontend
    return res.json({
      orderId,
      transactionId: tx.id,
      paymentUrl: tx.checkout.url, // el frontend redirige aquí
    });
  } catch (err) {
    console.error("Error en /checkout:", err);
    return res.status(500).json({ error: "Error interno" });
  }
});

/**
 * POST /api/orders/webhook
 * Webhook real para Paddle v2.
 * IMPORTANTE: en Paddle selecciona eventos:
 * - transaction.paid
 * - transaction.completed
 */
router.post("/webhook", async (req, res) => {
  try {
    const eventType = req.body?.event_type;
    const data = req.body?.data;

    console.log("📩 Paddle webhook:", eventType);

    // Solo procesamos eventos que implican pago completado
    if (!["transaction.paid", "transaction.completed"].includes(eventType)) {
      return res.json({ ok: true });
    }

    const custom = data?.custom_data || {};
    const orderId = custom.orderId;
    const userId = custom.userId;
    const videoId = Number(custom.videoId);

    if (!orderId || !userId || !videoId) {
      console.error("❌ Webhook sin custom_data válido:", custom);
      return res.status(400).json({ error: "Missing custom_data" });
    }

    // 1) Marcar orden como pagada y asegurar provider_order_id
    const { error: orderUpdateError } = await supabase
      .from("orders")
      .update({
        estado: "pagado",
        provider_order_id: data?.id || null,
      })
      .eq("id", orderId);

    if (orderUpdateError) {
      console.error("❌ Error updating order:", orderUpdateError);
      return res.status(500).json({ error: "Order update failed" });
    }

    // 2) Crear acceso
    const { error: accessError } = await supabase.from("accesses").insert({
      user_id: userId,
      video_id: videoId,
    });

    // 23505 = unique violation (ya existía)
    if (accessError && accessError.code !== "23505") {
      console.error("❌ Error creating access:", accessError);
      return res.status(500).json({ error: "Access creation failed" });
    }

    console.log("✅ Access granted:", { userId, videoId, orderId });
    return res.json({ ok: true });
  } catch (err) {
    console.error("🔥 Webhook error:", err);
    return res.status(500).json({ error: "Webhook failed" });
  }
});

/**
 * GET /api/orders/access/check
 * Verifica si un usuario (email) tiene acceso a un video.
 */
router.get("/access/check", async (req, res) => {
  try {
    const { userEmail, videoId } = req.query;
    const videoIdNum = Number(videoId);

    if (!userEmail || !videoIdNum) {
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
      .eq("video_id", videoIdNum)
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
