import { db, FieldValue } from "../config/firebase";
import { AppError } from "../utils/AppError";
import { deleteAttachmentFile, refreshSignedUrl, uploadNoteAttachment } from "./storage.service";

const collection = db.collection("attachments");

// Signed URLs expire (see storage.service.ts), so every read regenerates a fresh one
// rather than trusting whatever was stored at upload time.
export async function listAttachmentsForNote(noteId: string) {
  const snapshot = await collection.where("noteId", "==", noteId).get();
  const attachments = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as any);
  attachments.sort((a, b) => a.createdAt?.toMillis?.() - b.createdAt?.toMillis?.());
  await Promise.all(
    attachments.map(async (attachment) => {
      attachment.url = await refreshSignedUrl(attachment.storagePath);
    })
  );
  return attachments;
}

export async function addAttachment(userId: string, noteId: string, file: Express.Multer.File) {
  const uploaded = await uploadNoteAttachment(userId, noteId, file);

  const docRef = collection.doc();
  const payload = {
    userId,
    noteId,
    storagePath: uploaded.storagePath,
    fileName: file.originalname,
    fileType: uploaded.fileType,
    fileSize: uploaded.fileSize,
    url: uploaded.url,
    createdAt: FieldValue.serverTimestamp(),
  };
  await docRef.set(payload);
  return { id: docRef.id, ...payload };
}

export async function deleteAttachment(userId: string, noteId: string, attachmentId: string) {
  const doc = await collection.doc(attachmentId).get();
  const data = doc.data();

  if (!doc.exists || data?.userId !== userId || data?.noteId !== noteId) {
    throw AppError.notFound("attachment");
  }

  await deleteAttachmentFile(data.storagePath);
  await collection.doc(attachmentId).delete();
}

export async function deleteAllAttachmentsForNote(noteId: string) {
  const snapshot = await collection.where("noteId", "==", noteId).get();
  await Promise.all(
    snapshot.docs.map(async (doc) => {
      await deleteAttachmentFile(doc.data().storagePath);
      await doc.ref.delete();
    })
  );
}
