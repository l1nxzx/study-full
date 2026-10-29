import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import routes from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { apiRateLimiter } from "./middleware/rateLimit";

const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(morgan(env.isProduction ? "combined" : "dev"));
app.use(apiRateLimiter);

app.get(["/health", "/api/health"], (_req, res) => {
  res.json({ status: "ok", aiEnabled: env.aiEnabled });
});

app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
