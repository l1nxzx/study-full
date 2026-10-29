import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { z } from "zod";

dotenv.config();

// Render mounts uploaded "Secret Files" at /etc/secrets/<filename>. If one is present there,
// we're running on Render, so use it; otherwise fall back to the local path from .env.
const RENDER_SECRET_PATH = "/etc/secrets/serviceAccountKey.json";

const envSchema = z.object({
  PORT: z.string().default("3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  JWT_SECRET: z.string().min(10, "JWT_SECRET must be set to a long random string"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().default("./serviceAccountKey.json"),
  FIREBASE_STORAGE_BUCKET: z.string().min(1, "FIREBASE_STORAGE_BUCKET is required"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL_DEFAULT: z.string().default("gpt-4o-mini"),
  OPENAI_MODEL_ADVANCED: z.string().default("gpt-4o"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  PORT: parseInt(parsed.data.PORT, 10),
  isProduction: parsed.data.NODE_ENV === "production",
  FIREBASE_SERVICE_ACCOUNT_ABSOLUTE_PATH: fs.existsSync(RENDER_SECRET_PATH)
    ? RENDER_SECRET_PATH
    : path.isAbsolute(parsed.data.FIREBASE_SERVICE_ACCOUNT_PATH)
      ? parsed.data.FIREBASE_SERVICE_ACCOUNT_PATH
      : path.resolve(process.cwd(), parsed.data.FIREBASE_SERVICE_ACCOUNT_PATH),
  aiEnabled: Boolean(parsed.data.OPENAI_API_KEY),
};
