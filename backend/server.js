import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import ordersRouter from "./routes/orders.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({ origin: "http://localhost:5173" })); // Vite dev
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Proyecto X Backend OK");
});

app.use("/api/orders", ordersRouter);

app.listen(port, () => {
  console.log(`Backend escuchando en http://localhost:${port}`);
});
