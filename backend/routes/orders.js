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

const router = express.Router();

// GET /api/orders/videos - Obtener catálogo de videos
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

// POST /api/orders/checkout - Crear checkout con Paddle
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

    // Código de error de "row not found" en PostgREST
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

    // 2. Obtener info del video
    const { data: video, error: videoError } = await supabase
      .from("videos")
      .select("*")
      .eq("id", videoId)
      .single();

    if (videoError || !video) {
      console.error("Video no encontrado:", videoError);
      return res.status(404).json({ error: "Video no encontrado" });
    }

    const orderId = randomUUID();

    // 3. Crear orden "pendiente" en tu BD
    const { error: orderError } = await supabase.from("orders").insert({
      id: orderId,
      user_id: user.id,
      video_id: video.id,
      amount: video.precio,
      estado: "pendiente",
      provider: "paddle",
    });

    if (orderError) {
      console.error("Error al crear orden:", orderError);
      return res.status(500).json({ error: "Error al crear orden" });
    }

    // 4. Buscar el price_id de Paddle para este video
    const priceId = VIDEO_PRICE_MAP[videoId];
    if (!priceId) {
      console.error("No hay priceId configurado para videoId:", videoId);
      return res
        .status(500)
        .json({ error: "Price ID de Paddle no configurado para este módulo" });
    }

    // 5. Llamar a la API de Paddle (SANDBOX)
    const paddleRes = await fetch("https://sandbox-api.paddle.com/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
        "Paddle-Version": "1",
      },
      body: JSON.stringify({
        customer: {
          email: userEmail,
        },
        items: [
          {
            price_id: priceId,
            quantity: 1,
          },
        ],
        custom_data: {
          orderId,
          userId: user.id,
          videoId: video.id,
        },
        collection_mode: "automatic",
      }),
    });

    const body = await paddleRes.json();

    // Si Paddle responde con error (4xx / 5xx)
    if (!paddleRes.ok) {
      console.error("Paddle error:", JSON.stringify(body, null, 2));
      return res
        .status(500)
        .json({ error: "Error al crear el checkout con Paddle" });
    }

    // 👇 Aquí estaba el problema: hay que ir a body.data, no a body.checkout
    const tx = body.data;

    if (!tx || !tx.checkout || !tx.checkout.url) {
      console.error("Respuesta inválida de Paddle:", JSON.stringify(body, null, 2));
      return res.status(500).json({ error: "Respuesta inválida desde Paddle" });
    }

    // 6. Devolver la URL de pago al frontend
    return res.json({
      orderId,
      transactionId: tx.id,
      paymentUrl: tx.checkout.url,
    });
  } catch (err) {
    console.error("Error en /checkout:", err);
    return res.status(500).json({ error: "Error interno" });
  }
});



/**
 * POST /api/orders/webhook
 * (De momento sigue siendo genérico. Más adelante lo adaptamos a Paddle.)
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
        video_id: orderData.video_id,
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
 * GET /api/orders/access/check
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
