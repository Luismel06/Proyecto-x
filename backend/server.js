// backend/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import ordersRouter from "./routes/orders.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

const FRONTEND_BASE_URL =
  process.env.FRONTEND_BASE_URL || "https://proyecto-x-black.vercel.app";

const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://localhost:3000",
  "https://proyecto-x-black.vercel.app",
  FRONTEND_BASE_URL,
]);

app.use(
  cors({
    origin: (origin, cb) => {
      // Permite requests sin origin (Postman, server-to-server, Paddle webhook, etc.)
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.has(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
  })
);


app.use("/api/orders/webhook", express.raw({ type: "application/json" }));


app.use(express.json());

app.get("/", (req, res) => res.send("Proyecto X Backend OK ✅"));
app.get("/health", (req, res) =>
  res.json({ ok: true, env: process.env.PADDLE_ENVIRONMENT || "sandbox" })
);

app.use("/api/orders", ordersRouter);

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
