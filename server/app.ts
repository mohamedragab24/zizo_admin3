import express from "express";
import { authApiRouter } from "./authApi.js";
import { salonApiRouter } from "./salonApi.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "2mb" }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/api", authApiRouter);
  app.use("/api", salonApiRouter);
  app.use("/api", (_req, res) => res.status(404).json({ error: "not found" }));
  return app;
}
