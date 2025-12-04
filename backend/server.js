// backend/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import ordersRouter from "./routes/orders.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// 🔹 Orígenes permitidos (desarrollo + producción)
const FRONTEND_ORIGINS = [
  "http://localhost:5173",                // Vite dev
  "https://proyecto-x-black.vercel.app",  // ⬅️ CAMBIA esto si tu dominio es otro
];

// Middleware CORS
app.use(
  cors({
    origin: FRONTEND_ORIGINS,
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Proyecto X Backend OK");
});

app.use("/api/orders", ordersRouter);

app.listen(port, () => {
  console.log(`Backend escuchando en http://localhost:${port}`);
});
