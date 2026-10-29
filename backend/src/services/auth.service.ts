import { db, FieldValue } from "../config/firebase";
import { AppError } from "../utils/AppError";
import { comparePassword, hashPassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { LoginInput, RegisterInput } from "../models/auth.model";

const usersCollection = db.collection("users");

export async function register(input: RegisterInput) {
  const existing = await usersCollection.where("email", "==", input.email).limit(1).get();

  if (!existing.empty) {
    throw AppError.conflict("An account with this email already exists", "EMAIL_TAKEN");
  }

  const passwordHash = await hashPassword(input.password);
  const docRef = usersCollection.doc();

  await docRef.set({
    email: input.email,
    passwordHash,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const token = signToken({ userId: docRef.id, email: input.email });
  return { token, user: { id: docRef.id, email: input.email, name: null } };
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

  const token = signToken({ userId: userDoc.id, email: user.email });
  return { token, user: { id: userDoc.id, email: user.email, name: user.name ?? null } };
}

export async function getById(userId: string) {
  const doc = await usersCollection.doc(userId).get();
  if (!doc.exists) {
    throw AppError.notFound("user");
  }
  const data = doc.data()!;
  return { id: doc.id, email: data.email, name: data.name ?? null };
}

export async function updateProfile(userId: string, name: string | null) {
  const docRef = usersCollection.doc(userId);
  const doc = await docRef.get();
  if (!doc.exists) {
    throw AppError.notFound("user");
  }
  await docRef.update({ name, updatedAt: FieldValue.serverTimestamp() });
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
