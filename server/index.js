import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyrroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import downloadroutes from "./routes/download.js";
import subscriptionroutes from "./routes/subscription.js";
import http from "http";
import { Server } from "socket.io";
import { setupSocketHandlers } from "./socketHandler.js";
import { seedSampleVideos } from "./seedVideos.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from the server directory regardless of current working directory
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

setupSocketHandlers(io);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use("/uploads", express.static(uploadsDir));

app.get("/", (req, res) => {
  res.send("YouTube backend is working");
});

app.use(bodyParser.json());
app.use("/user", userroutes);
app.use("/video", videoroutes);
app.use("/like", likeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyrroutes);
app.use("/comment", commentroutes);
app.use("/download", downloadroutes);
app.use("/subscription", subscriptionroutes);
app.use("/api/subscription", subscriptionroutes);

const PORT = process.env.PORT || 5000;

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`[SERVER ERROR] Port ${PORT} is already in use by another process.`);
    console.error(`Please stop any running node processes or restart your terminal.`);
  } else {
    console.error("[SERVER ERROR]", error.message || error);
  }
});

server.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});

const DBURL = process.env.DB_URL || "mongodb://127.0.0.1:27017/youtube";
mongoose
  .connect(DBURL)
  .then(async () => {
    console.log("Mongodb connected to:", DBURL);
    await seedSampleVideos();
  })
  .catch((error) => {
    console.log("MongoDB connection note:", error.message || error);
    console.log("Server is running. Provide a valid DB_URL in server/.env if using MongoDB Atlas.");
  });
