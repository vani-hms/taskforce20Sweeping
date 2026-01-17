import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "./auth/router";
import hmsRouter from "./hms/router";
import cityRouter from "./city/router";
import taskforceRouter from "./modules/taskforce/router";
import iecRouter from "./modules/iec/router";
import { errorHandler } from "./middleware/errorHandler";
import { prisma } from "./prisma";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/hms", hmsRouter);
app.use("/city", cityRouter);
app.use("/modules/taskforce", taskforceRouter);
app.use("/modules/iec", iecRouter);

app.use(errorHandler);

const port = process.env.PORT || 4000;
const server = app.listen(port, () => {
  console.log(`HMS backend listening on ${port}`);
});

const shutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down gracefully...`);
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
