import multer from "multer";
import { AppError } from "../utils/AppError";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(AppError.badRequest(`Unsupported file type: ${file.mimetype}`, "UNSUPPORTED_FILE_TYPE"));
      return;
    }
    cb(null, true);
  },
});
