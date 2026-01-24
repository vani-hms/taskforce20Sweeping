import express from "express";
import dotenv from "dotenv";
import { Server } from "http";
import authRouter from "./auth/router";
import hmsRouter from "./hms/router";
import cityRouter from "./city/router";
import taskforceRouter from "./modules/taskforce/router";
import iecRouter from "./modules/iec/router";
import recordsRouter from "./modules/recordsRouter";
import publicRouter from "./public/router";
import { errorHandler } from "./middleware/errorHandler";
import { prisma } from "./prisma";
import { syncAllCityModules } from "./utils/cityModuleSync";

dotenv.config();

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

// Manual CORS to ensure exact origin (no wildcard) when using credentials
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/public", publicRouter);
app.use("/auth", authRouter);
app.use("/hms", hmsRouter);
app.use("/city", cityRouter);
app.use("/modules", recordsRouter);
app.use("/modules/taskforce", taskforceRouter);
app.use("/modules/iec", iecRouter);

app.use(errorHandler);

const port = process.env.PORT || 4000;
let server: Server | null = null;

async function startServer() {
  try {
    await syncAllCityModules();
  } catch (err) {
    console.error("Failed to sync city modules on startup", err);
  }

  server = app.listen(port, () => {
    console.log(`HMS backend listening on ${port}`);
  });
}

startServer();

const shutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down gracefully...`);
  if (!server) {
    try {
      await prisma.$disconnect();
    } catch (err) {
      console.error("Error during Prisma disconnect", err);
    } finally {
      process.exit(0);
    }
    return;
  }
  server.close(async () => {
    try {
      await prisma.$disconnect();
    } catch (err) {
      console.error("Error during Prisma disconnect", err);
    } finally {
      process.exit(0);
    }
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});
