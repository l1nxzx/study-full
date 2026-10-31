import { db, FieldValue } from "../config/firebase";
import { AppError } from "../utils/AppError";
import { forgetAccountStatus } from "../utils/accountStatus";
import { hashPassword } from "../utils/password";
import { recordAdminAction } from "./adminAudit.service";

const users = db.collection("users");

export async function listUsers() {
  const snapshot = await users.get();
  return snapshot.docs
    .map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        email: d.email as string,
        name: (d.name ?? null) as string | null,
        role: (d.role ?? "user") as "user" | "superadmin",
        disabled: d.disabled === true,
        referralCodeId: (d.referralCodeId ?? null) as string | null,
        createdAt: (d.createdAt?.toDate?.() ?? null) as Date | null,
      };
    })
    .sort((a, b) => a.email.localeCompare(b.email));
}

async function targetOf(actorId: string, targetId: string) {
  const doc = await users.doc(targetId).get();
  if (!doc.exists) throw AppError.notFound("user");
  if (doc.id === actorId) throw AppError.badRequest("This is your own account; use another account.", "OWN_ACCOUNT");
  return doc;
}

export async function setUserPassword(actorId: string, targetId: string, password: string) {
  const doc = await targetOf(actorId, targetId);
  if (doc.data()!.role === "superadmin") {
    throw AppError.forbidden("A superadmin's password can only be changed by themselves.");
  }
  const passwordHash = await hashPassword(password);
  // Ends every session that existed before now: the old password's sessions stop working.
  await users.doc(targetId).update({ passwordHash, sessionsValidFrom: Date.now(), updatedAt: FieldValue.serverTimestamp() });
  forgetAccountStatus(targetId);
  await recordAdminAction(actorId, "user.password_reset", targetId);
}

export async function setUserDisabled(actorId: string, targetId: string, disabled: boolean) {
  const doc = await targetOf(actorId, targetId);
  if (doc.data()!.role === "superadmin") {
    throw AppError.forbidden("A superadmin account cannot be disabled from the admin panel.");
  }
  const patch: Record<string, unknown> = { disabled, updatedAt: FieldValue.serverTimestamp() };
  // Disabling ends the account's current sessions; enabling it again needs a new sign-in.
  if (disabled) patch.sessionsValidFrom = Date.now();
  await users.doc(targetId).update(patch);
  forgetAccountStatus(targetId);
  await recordAdminAction(actorId, disabled ? "user.disable" : "user.enable", targetId);
}
