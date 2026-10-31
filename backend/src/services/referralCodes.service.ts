import { db, FieldValue } from "../config/firebase";
import { AppError } from "../utils/AppError";
import { formatReferralCode, generateReferralCode, normalizeReferralCode } from "../utils/referralCode";
import type { CreateReferralCodeInput } from "../models/admin.model";
import { recordAdminAction } from "./adminAudit.service";

// Codes are the document ids (the normalized code), so a code can exist only once.
export const referralCodes = db.collection("referralCodes");

export interface ReferralCodeView {
  code: string;
  display: string;
  note: string | null;
  maxUses: number;
  uses: number;
  revoked: boolean;
  expiresAt: string | null;
  status: "active" | "used_up" | "revoked" | "expired";
  createdAt: string;
  redemptions: { userId: string; email: string; at: string }[];
}

function statusOf(data: FirebaseFirestore.DocumentData): ReferralCodeView["status"] {
  if (data.revoked) return "revoked";
  if (data.expiresAt && Date.parse(data.expiresAt) < Date.now()) return "expired";
  if ((data.uses ?? 0) >= data.maxUses) return "used_up";
  return "active";
}

async function view(doc: FirebaseFirestore.DocumentSnapshot): Promise<ReferralCodeView> {
  const data = doc.data()!;
  const redemptions = await doc.ref.collection("redemptions").get();
  return {
    code: doc.id,
    display: formatReferralCode(doc.id),
    note: data.note ?? null,
    maxUses: data.maxUses,
    uses: data.uses ?? 0,
    revoked: data.revoked === true,
    expiresAt: data.expiresAt ?? null,
    status: statusOf(data),
    createdAt: data.createdAt,
    redemptions: redemptions.docs
      .map((r) => ({ userId: r.id, email: r.data().email, at: r.data().at }))
      .sort((a, b) => b.at.localeCompare(a.at)),
  };
}

export async function listReferralCodes(): Promise<ReferralCodeView[]> {
  const snapshot = await referralCodes.get();
  const views = await Promise.all(snapshot.docs.map(view));
  return views.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createReferralCode(actorId: string, input: CreateReferralCodeInput): Promise<ReferralCodeView> {
  // A free code is practically never repeated, but check anyway.
  let code = generateReferralCode();
  for (let attempt = 0; attempt < 5 && (await referralCodes.doc(code).get()).exists; attempt++) {
    code = generateReferralCode();
  }
  const now = new Date().toISOString();
  await referralCodes.doc(code).set({
    maxUses: input.maxUses,
    uses: 0,
    revoked: false,
    expiresAt: input.expiresAt ?? null,
    note: input.note ?? null,
    createdBy: actorId,
    createdAt: now,
  });
  await recordAdminAction(actorId, "referral_code.create", code, { maxUses: input.maxUses, expiresAt: input.expiresAt ?? null });
  return view(await referralCodes.doc(code).get());
}

export async function revokeReferralCode(actorId: string, rawCode: string): Promise<ReferralCodeView> {
  const code = normalizeReferralCode(rawCode);
  const ref = referralCodes.doc(code);
  const doc = await ref.get();
  if (!doc.exists) throw AppError.notFound("referral code");
  await ref.update({ revoked: true, revokedAt: FieldValue.serverTimestamp() });
  await recordAdminAction(actorId, "referral_code.revoke", code);
  return view(await ref.get());
}
