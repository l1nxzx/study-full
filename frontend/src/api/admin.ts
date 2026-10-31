import { apiClient } from "./client";

// The admin panel's API. Every call is checked on the server, against the account's record.

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: "user" | "superadmin";
  disabled: boolean;
  referralCodeId: string | null;
  createdAt: string | null;
}

export interface ReferralCode {
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

export interface AuditEntry {
  id: string;
  actorId: string;
  action: string;
  target: string | null;
  detail: Record<string, unknown> | null;
  at: string;
}

export const listUsers = () => apiClient.get<AdminUser[]>("/admin/users").then((r) => r.data);
export const resetPassword = (id: string, password: string) => apiClient.post(`/admin/users/${id}/password`, { password });
export const setDisabled = (id: string, disabled: boolean) => apiClient.post(`/admin/users/${id}/disabled`, { disabled });
export const listCodes = () => apiClient.get<ReferralCode[]>("/admin/referral-codes").then((r) => r.data);
export const createCode = (input: { maxUses: number; expiresAt?: string; note?: string }) =>
  apiClient.post<ReferralCode>("/admin/referral-codes", input).then((r) => r.data);
export const revokeCode = (code: string) => apiClient.post<ReferralCode>(`/admin/referral-codes/${code}/revoke`).then((r) => r.data);
export const listAudit = () => apiClient.get<AuditEntry[]>("/admin/audit").then((r) => r.data);
