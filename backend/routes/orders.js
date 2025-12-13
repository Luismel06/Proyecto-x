// backend/routes/orders.js
import express from "express";
import { supabase } from "../supabaseClient.js";
import { randomUUID, createHmac, timingSafeEqual } from "crypto";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// ====== CONFIG ======
const VIDEO_PRICE_MAP = {
  8: "pri_01kc39rk7fpk844r8hsvjk6xaf",
  9: "pri_01kc39tsfqrhwzwae05t74mx1s",
  10: "pri_01kc39xmp3pnych5gypst2twvc",
  11: "pri_01kc39zdp3n8ja00rqg0n8qj1x",
  12: "pri_01kc3a1x73q4ww0vdj84s9zjsz",
};

const PADDLE_API_KEY = process.env.PADDLE_API_KEY;
const PADDLE_ENVIRONMENT = process.env.PADDLE_ENVIRONMENT || "sandbox"; // sandbox | live
const FRONTEND_BASE_URL =
  process.env.FRONTEND_BASE_URL || "https://proyecto-x-black.vercel.app";

const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET || "";

const PADDLE_API_URL =
  PADDLE_ENVIRONMENT === "live"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";

function mustEnv(name, value) {
  if (!value) throw new Error(`Missing env var: ${name}`);
}

// ====== HELPERS ======
async function getOrCreateUserByEmail(userEmail) {
  let { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("email", userEmail)
    .single();

  if (userError && userError.code !== "PGRST116") {
    console.error("Error buscando usuario:", userError);
    throw new Error("Error al buscar usuario");
  }

  if (!user) {
    const { data: newUser, error: newUserError } = await supabase
      .from("users")
      .insert({ email: userEmail })
      .select()
      .single();

    if (newUserError) {
      console.error("Error creando usuario:", newUserError);
      throw new Error("Error al crear usuario");
    }
    user = newUser;
  }

  return user;
}

async function getVideoById(videoId) {
  const { data: video, error } = await supabase
    .from("videos")
    .select("*")
    .eq("id", videoId)
    .single();

  if (error || !video) return null;
  return video;
}

function verifyPaddleSignature({ rawBody, signatureHeader, secret }) {
  // En sandbox/dev puedes dejarlo vacío para no bloquearte,
  // pero en Render PROD es MUY recomendado configurarlo.
  if (!secret) return true;
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((kv) => kv.trim().split("="))
  );

  const ts = parts.ts;
  const h1 = parts.h1;
  if (!ts || !h1) return false;

  const signedPayload = `${ts}:${rawBody}`;
  const digest = createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(h1));
  } catch {
    return false;
  }
}

// ====== ROUTES ======

// GET /api/orders/videos
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

    const videos = (data || []).map((v) => ({
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

// POST /api/orders/checkout
router.post("/checkout", async (req, res) => {
  try {
    mustEnv("PADDLE_API_KEY", PADDLE_API_KEY);

    const { userEmail, videoId } = req.body;

    if (!userEmail || !videoId) {
      return res.status(400).json({ error: "Faltan parámetros." });
    }

    const numericVideoId = Number(videoId);
    const priceId = VIDEO_PRICE_MAP[numericVideoId];

    if (!priceId) {
      return res
        .status(400)
        .json({ error: "Price ID de Paddle no configurado para este módulo." });
    }

    // 1) user
    const user = await getOrCreateUserByEmail(userEmail);

    // 2) video
    const video = await getVideoById(numericVideoId);
    if (!video) return res.status(404).json({ error: "Video no encontrado" });

    // 3) create local order pending
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

    // 4) create Paddle transaction
    const redirectUrl = `${FRONTEND_BASE_URL}/thank-you?orderId=${orderId}`;

    const paddleRes = await fetch(`${PADDLE_API_URL}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PADDLE_API_KEY}`,
        "Paddle-Version": "1",
      },
      body: JSON.stringify({
        items: [{ price_id: priceId, quantity: 1 }],
        customer: { email: userEmail },
        custom_data: {
          orderId,
          userId: user.id,
          videoId: video.id,
          email: userEmail,
        },
        collection_mode: "automatic",
        checkout: { redirect_url: redirectUrl },
      }),
    });

    const body = await paddleRes.json().catch(() => null);

    if (!paddleRes.ok) {
      console.error("Paddle error:", JSON.stringify(body, null, 2));
      return res.status(500).json({ error: "Error creando checkout con Paddle" });
    }

    const tx = body?.data;
    const checkoutUrl = tx?.checkout?.url;

    if (!tx?.id || !checkoutUrl) {
      console.error("Respuesta inválida de Paddle:", JSON.stringify(body, null, 2));
      return res.status(500).json({ error: "Respuesta inválida desde Paddle" });
    }

    // 5) store transactionId in local order
    const { error: updErr } = await supabase
      .from("orders")
      .update({ provider_order_id: tx.id })
      .eq("id", orderId);

    if (updErr) {
      console.error("Error guardando provider_order_id:", updErr);
    }

    return res.json({
      orderId,
      transactionId: tx.id,
      checkoutUrl,
      paymentUrl: checkoutUrl, // compat
    });
  } catch (err) {
    console.error("Error en /checkout:", err);
    return res.status(500).json({ error: "Error interno" });
  }
});

/**
 * POST /api/orders/webhook
 * Recibe RAW body (Buffer) gracias a server.js
 */
router.post("/webhook", async (req, res) => {
  try {
    const raw = req.body; // Buffer
    const rawBody = Buffer.isBuffer(raw) ? raw.toString("utf8") : "";

    const signature =
      req.header("Paddle-Signature") || req.header("paddle-signature");

    const valid = verifyPaddleSignature({
      rawBody,
      signatureHeader: signature,
      secret: PADDLE_WEBHOOK_SECRET,
    });

    if (!valid) {
      console.error("Webhook signature invalid");
      return res.status(401).json({ error: "Invalid signature" });
    }

    const event = JSON.parse(rawBody);
    const eventType = event?.event_type;
    const data = event?.data;

    // Paddle v2 normalmente manda transaction.paid y/o transaction.completed
    const isPaid =
      eventType === "transaction.paid" || eventType === "transaction.completed";

    const transactionId = data?.id;
    const custom = data?.custom_data || {};
    const orderId = custom?.orderId;
    const videoId = custom?.videoId;
    const userId = custom?.userId;

    // Si no hay transactionId, ignoramos
    if (!transactionId) return res.status(200).json({ ok: true });

    // Buscar la orden por custom_data.orderId, o por provider_order_id
    let finalOrderId = orderId;

    if (!finalOrderId) {
      const { data: orderRow } = await supabase
        .from("orders")
        .select("id, user_id, video_id")
        .eq("provider_order_id", transactionId)
        .maybeSingle();

      finalOrderId = orderRow?.id || null;
    }

    if (!finalOrderId) {
      console.warn("Webhook: order not found for transaction:", transactionId);
      return res.status(200).json({ ok: true });
    }

    if (isPaid) {
      const { data: orderData, error: updErr } = await supabase
        .from("orders")
        .update({
          estado: "pagado",
          provider: "paddle",
          provider_order_id: transactionId,
        })
        .eq("id", finalOrderId)
        .select("user_id, video_id")
        .single();

      if (updErr || !orderData) {
        console.error("Webhook: error updating order:", updErr);
        return res.status(500).json({ error: "Error actualizando orden" });
      }

      const uId = orderData.user_id || userId;
      const vId = orderData.video_id || videoId;

      if (uId && vId) {
        const { error: accessError } = await supabase.from("accesses").insert({
          user_id: uId,
          video_id: vId,
        });

        if (accessError && accessError.code !== "23505") {
          console.error("Webhook: error creating access:", accessError);
          return res.status(500).json({ error: "Error creando acceso" });
        }
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Error en webhook:", err);
    return res.status(500).json({ error: "Error interno" });
  }
});

// GET /api/orders/access/check
router.get("/access/check", async (req, res) => {
  try {
    const { userEmail, videoId } = req.query;

    if (!userEmail || !videoId) {
      return res.status(400).json({ error: "Faltan parámetros" });
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", userEmail)
      .single();

    if (userError || !user) {
      return res.json({ hasAccess: false });
    }

    const { data: access, error: accessError } = await supabase
      .from("accesses")
      .select("id")
      .eq("user_id", user.id)
      .eq("video_id", Number(videoId))
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
