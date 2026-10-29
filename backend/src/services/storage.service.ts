import sharp from "sharp";
import { randomUUID } from "crypto";
import { bucket } from "../config/firebase";

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const MAX_IMAGE_DIMENSION = 2000;

interface UploadResult {
  storagePath: string;
  url: string;
  fileType: string;
  fileSize: number;
}

// Optimizes images with Sharp before storing; PDFs are stored as-is (never processed with Sharp).
export async function uploadNoteAttachment(
  userId: string,
  noteId: string,
  file: Express.Multer.File
): Promise<UploadResult> {
  const isImage = IMAGE_MIME_TYPES.has(file.mimetype);
  const safeId = randomUUID();

  let buffer = file.buffer;
  let contentType = file.mimetype;
  let extension = isImage ? "jpg" : "pdf";

  if (isImage) {
    buffer = await sharp(file.buffer)
      .rotate()
      .resize({ width: MAX_IMAGE_DIMENSION, height: MAX_IMAGE_DIMENSION, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    contentType = "image/jpeg";
  }

  const storagePath = `users/${userId}/notes/${noteId}/${safeId}.${extension}`;
  const fileRef = bucket.file(storagePath);

  await fileRef.save(buffer, {
    contentType,
    metadata: { cacheControl: "private, max-age=31536000" },
  });

  const [url] = await fileRef.getSignedUrl({
    action: "read",
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  });

  return { storagePath, url, fileType: contentType, fileSize: buffer.length };
}

export async function deleteAttachmentFile(storagePath: string) {
  await bucket.file(storagePath).delete({ ignoreNotFound: true });
}

export async function refreshSignedUrl(storagePath: string) {
  const [url] = await bucket.file(storagePath).getSignedUrl({
    action: "read",
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
  });
  return url;
}
