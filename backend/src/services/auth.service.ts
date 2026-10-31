import { db, FieldValue } from "../config/firebase";
import { AppError } from "../utils/AppError";
import { comparePassword, hashPassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { LoginInput, Preferences, RegisterInput } from "../models/auth.model";
import { createHash } from "node:crypto";
import { normalizeReferralCode } from "../utils/referralCode";
import { referralCodes } from "./referralCodes.service";

const emailClaims = db.collection("emailClaims");

const usersCollection = db.collection("users");

export async function register(input: RegisterInput) {
  const code = normalizeReferralCode(input.referralCode);
  if (!/^[A-Z2-9]{8,32}$/.test(code)) {
    throw new AppError(403, "REFERRAL_INVALID", "This referral code is invalid or has been used up.");
  }

  // Friendly check first (accounts made before email claims existed have none).
  const existing = await usersCollection.where("email", "==", input.email).limit(1).get();
  if (!existing.empty) {
    throw AppError.conflict("An account with this email already exists", "EMAIL_TAKEN");
  }

  const passwordHash = await hashPassword(input.password);
  const userRef = usersCollection.doc();
  const codeRef = referralCodes.doc(code);
  const claimRef = emailClaims.doc(createHash("sha256").update(input.email).digest("hex"));
  const now = new Date().toISOString();

  // One all-or-nothing step: the code is checked and used, the email is claimed, and the account is
  // created together. Two sign-ups with the last use of a code (or the same email) can't both succeed.
  await db.runTransaction(async (tx) => {
    const codeDoc = await tx.get(codeRef);
    const data = codeDoc.data();
    const usable =
      codeDoc.exists &&
      data!.revoked !== true &&
      !(data!.expiresAt && Date.parse(data!.expiresAt) < Date.now()) &&
      (data!.uses ?? 0) < data!.maxUses;
    if (!usable) {
      throw new AppError(403, "REFERRAL_INVALID", "This referral code is invalid or has been used up.");
    }
    const claim = await tx.get(claimRef);
    if (claim.exists) {
      throw AppError.conflict("An account with this email already exists", "EMAIL_TAKEN");
    }

    tx.set(claimRef, { userId: userRef.id, email: input.email, createdAt: now });
    tx.set(userRef, {
      email: input.email,
      passwordHash,
      role: "user",
      disabled: false,
      sessionsValidFrom: 0,
      referralCodeId: code,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.update(codeRef, { uses: (data!.uses ?? 0) + 1, lastUsedAt: now });
    tx.set(codeRef.collection("redemptions").doc(userRef.id), { email: input.email, at: now });
  });

  const token = signToken({ userId: userRef.id, email: input.email });
  return { token, user: { id: userRef.id, email: input.email, name: null, role: "user" as const, preferences: {} } };
}

export async function login(input: LoginInput) {
  const snapshot = await usersCollection.where("email", "==", input.email).limit(1).get();

  if (snapshot.empty) {
    throw AppError.unauthorized("Invalid email or password");
  }

  const userDoc = snapshot.docs[0];
  const user = userDoc.data();

  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) {
    throw AppError.unauthorized("Invalid email or password");
  }
  if (user.disabled === true) {
    throw new AppError(403, "ACCOUNT_DISABLED", "This account has been disabled.");
  }

  const token = signToken({ userId: userDoc.id, email: user.email });
  return {
    token,
    user: { id: userDoc.id, email: user.email, name: user.name ?? null, role: user.role === "superadmin" ? ("superadmin" as const) : ("user" as const), preferences: user.preferences ?? {} },
  };
}

export async function getById(userId: string) {
  const doc = await usersCollection.doc(userId).get();
  if (!doc.exists) {
    throw AppError.notFound("user");
  }
  const data = doc.data()!;
  return {
    id: doc.id,
    email: data.email,
    name: data.name ?? null,
    role: data.role === "superadmin" ? ("superadmin" as const) : ("user" as const),
    preferences: (data.preferences ?? {}) as Preferences,
  };
}

export async function updateProfile(userId: string, input: { name?: string | null; preferences?: Preferences }) {
  const docRef = usersCollection.doc(userId);
  const doc = await docRef.get();
  if (!doc.exists) {
    throw AppError.notFound("user");
  }
  const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.preferences) {
    // Merge, so patching one preference never wipes the others.
    patch.preferences = { ...(doc.data()!.preferences ?? {}), ...input.preferences };
  }
  await docRef.update(patch);
  return getById(userId);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const docRef = usersCollection.doc(userId);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw AppError.notFound("user");
  }

  const valid = await comparePassword(currentPassword, doc.data()!.passwordHash);
  if (!valid) {
    throw AppError.unauthorized("Current password is incorrect");
  }

  const passwordHash = await hashPassword(newPassword);
  await docRef.update({ passwordHash, updatedAt: FieldValue.serverTimestamp() });
}
